import { EventEmitter } from "events";
import pino from "pino";
import NodeCache from "@cacheable/node-cache";
import makeWASocket, {
  DisconnectReason,
  fetchLatestBaileysVersion,
  getAggregateVotesInPollMessage,
  makeCacheableSignalKeyStore,
  useMultiFileAuthState,
  Browsers,
  proto,
  WAMessageContent,
  WAMessageKey,
  downloadMediaMessage,
} from "../src/index";
import { readFileSync } from "fs";
import { Sticker } from "wa-sticker-formatter";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import mime from "mime-types";
import utils from "./utils";
import { join } from "path";
import fs from "fs-extra";

interface Args {
  debug?: boolean;
  name?: string;
  usePairingCode?: boolean;
  phoneNumber?: string | null;
  gifPlayback?: boolean;
  dir?: string;
  [key: string]: any;
}

type SendMessageOptions = {
  keyword?: string;
  refresh?: string;
  answer?: string;
  options: {
    capture?: boolean;
    child?: any;
    delay?: number;
    nested?: any[];
    keyword?: any;
    callback?: boolean;
    buttons?: { body: string }[];
    media?: string;
  };
  refSerialize?: string;
};

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

const msgRetryCounterCache = new NodeCache();

export class BaileysClass extends EventEmitter {
  private vendor: any;
  private store: any;
  private globalVendorArgs: Args;
  private sock: any;
  private NAME_DIR_SESSION: string;
  private plugin: boolean;
  private connectionState: string = "close";

  constructor(args: Args = {}) {
    super();
    this.vendor = null;
    this.store = null;
    this.globalVendorArgs = {
      name: "bot",
      usePairingCode: false,
      phoneNumber: null,
      gifPlayback: false,
      dir: "./",
      ...args,
    };
    this.NAME_DIR_SESSION = `${this.globalVendorArgs.dir}${this.globalVendorArgs.name}_sessions`;
    this.initBailey();

    // is plugin?
    const err = new Error();
    const stack = err.stack;
    this.plugin = stack?.includes("createProvider") ?? false;
  }

  getMessage = async (
    key: WAMessageKey
  ): Promise<WAMessageContent | undefined> => {
    return proto.Message.fromObject({});
  };

  getInstance = (): any => this.vendor;

  initBailey = async (): Promise<void> => {
    console.log("Starting initBailey process...");
    const logger = pino({
      level: "fatal",
      enabled: false,
    });
    console.log("Creating auth state...");
    const { state, saveCreds } = await useMultiFileAuthState(
      this.NAME_DIR_SESSION
    );
    console.log("Fetching latest Baileys version...");
    const { version, isLatest } = await fetchLatestBaileysVersion();

    console.log(`using WA v${version.join(".")}, isLatest: ${isLatest}`);

    try {
      console.log("Setting up Baileys socket...");
      this.setUpBaileySock({ version, logger, state, saveCreds });
      console.log("Baileys socket setup complete");
    } catch (e) {
      console.error("Error setting up Baileys socket:", e);
      this.emit("auth_failure", e);
    }
  };

  downloadMediaMessage = async (message: any) => {
    const buffer = await downloadMediaMessage(
      message,
      "buffer",
      {},
      { reuploadRequest: this.sock.updateMediaMessages, logger: pino() }
    );
    return buffer;
  };

  setUpBaileySock = async ({ version, logger, state, saveCreds }) => {
    console.log("Creating WA Socket with options:", {
      printQRInTerminal: true,
      browser: Browsers.macOS("Desktop"),
      generateHighQualityLinkPreview: true,
    });

    this.sock = makeWASocket({
      version,
      logger,
      printQRInTerminal: !this.globalVendorArgs.usePairingCode,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      browser: Browsers.macOS("Desktop"),
      msgRetryCounterCache,
      generateHighQualityLinkPreview: true,
      getMessage: this.getMessage,
    });

    console.log("Socket created...");

    if (this.globalVendorArgs.usePairingCode) {
      console.log("Using pairing code authentication...");
      if (this.globalVendorArgs.phoneNumber) {
        await this.sock.waitForConnectionUpdate((update) => !!update.qr);
        const code = await this.sock.requestPairingCode(
          this.globalVendorArgs.phoneNumber
        );
        if (this.plugin) {
          this.emit("require_action", {
            instructions: [
              `Acepta la notificación del WhatsApp ${this.globalVendorArgs.phoneNumber} en tu celular 👌`,
              `El token para la vinculación es: ${code}`,
              "Necesitas ayuda: https://link.codigoencasa.com/DISCORD",
            ],
          });
        } else {
          this.emit("pairing_code", code);
        }
      } else {
        this.emit("auth_failure", "phoneNumber is empty");
      }
    }

    console.log("Setting up event handlers...");
    this.sock.ev.on("connection.update", this.handleConnectionUpdate);
    this.sock.ev.on("creds.update", saveCreds);

    const recentCallers = new Set();
    this.sock.ev.on("call", async (call) => {
      console.log(call);
      const callersPhone = call[0]?.from;
    });
  };

  handleConnectionUpdate = async (update: any): Promise<void> => {
    console.log("Connection update received:", JSON.stringify(update, null, 2));
    const { connection, lastDisconnect, qr } = update;
    const statusCode = lastDisconnect?.error?.output?.statusCode;

    if (connection) {
      this.connectionState = connection;
    }

    if (connection === "close") {
      console.log("lastDisconnect: ", lastDisconnect);
      console.log("Connection closed, status code:", statusCode);
      this.vendor = null;

      if (
        statusCode === DisconnectReason.loggedOut ||
        statusCode === DisconnectReason.badSession
      ) {
        console.log("Clearing session due to:", statusCode);
        this.clearSessionAndRestart();
      } else {
        console.log(
          "Temporary disconnection, reconnecting with existing session..."
        );
        setTimeout(() => {
          this.initBailey();
        }, 3000);
      }
    }

    if (connection === "open") {
      console.log("Connection opened successfully");
      this.vendor = this.sock;
      this.initBusEvents(this.sock);
      this.emit("ready", true);
    }

    if (qr) {
      console.log("QR code received, length:", qr.length);
      if (!this.globalVendorArgs.usePairingCode) {
        console.log("QR CODE DETECTED - EMITTING EVENT");
        
        // Mostrar y guardar QR visualmente SIEMPRE
        await utils.baileyGenerateImage(
          qr,
          `${this.globalVendorArgs.name}.qr.png`
        );
        
        if (this.plugin) {
          this.emit("require_action", {
            instructions: [
              `Debes escanear el QR Code 👌 ${this.globalVendorArgs.name}.qr.png`,
              "Recuerda que el QR se actualiza cada minuto ",
              "Necesitas ayuda: https://link.codigoencasa.com/DISCORD",
            ],
          });
        }
        
        this.emit("qr", qr);
      } else {
        console.log("QR code received but usePairingCode is enabled");
      }
    } else {
      console.log("No QR code in connection update");
    }
  };

  clearSessionAndRestart = (): void => {
    const PATH_BASE = join(process.cwd(), this.NAME_DIR_SESSION);
    fs.remove(PATH_BASE)
      .then(() => {
        this.initBailey();
      })
      .catch((err) => {
        console.error("Error to delete directory:", err);
      });
  };

  busEvents = (): any[] => [
    {
      event: "messages.upsert",
      func: ({ messages, type }) => {
        if (type !== "notify") return;

        const [messageCtx] = messages;
        let payload = {
          ...messageCtx,
          body:
            messageCtx?.message?.extendedTextMessage?.text ??
            messageCtx?.message?.conversation,
          from: messageCtx?.key?.remoteJid,
          type: "text",
        };

        if (messageCtx.message?.pollUpdateMessage) return;
        if (payload.from === "status@broadcast") return;
        if (payload?.key?.fromMe) return;

        if (messageCtx.message?.locationMessage) {
          const { degreesLatitude, degreesLongitude } =
            messageCtx.message.locationMessage;
          if (
            typeof degreesLatitude === "number" &&
            typeof degreesLongitude === "number"
          ) {
            payload = {
              ...payload,
              body: utils.generateRefprovider("event_location"),
              type: "location",
            };
          }
        }

        if (messageCtx.message?.imageMessage) {
          payload = {
            ...payload,
            body: utils.generateRefprovider("event_media"),
            type: "image",
          };
        }

        if (messageCtx.message?.documentMessage) {
          payload = {
            ...payload,
            body: utils.generateRefprovider("event_document"),
            type: "file",
          };
        }

        if (messageCtx.message?.audioMessage) {
          payload = {
            ...payload,
            body: utils.generateRefprovider("event_voice_note"),
            type: "voice",
          };
        }

        if (!utils.formatPhone(payload.from)) {
          return;
        }

        const btnCtx =
          payload?.message?.buttonsResponseMessage?.selectedDisplayText;
        if (btnCtx) payload.body = btnCtx;

        const listRowId = payload?.message?.listResponseMessage?.title;
        if (listRowId) payload.body = listRowId;

        payload.from = utils.formatPhone(payload.from, this.plugin);
        this.emit("message", payload);
      },
    },
    {
      event: "messages.update",
      func: async (message) => {
        for (const { key, update } of message) {
          if (update.pollUpdates) {
            const pollCreation = await this.getMessage(key);
            if (pollCreation) {
              const pollMessage = await getAggregateVotesInPollMessage({
                message: pollCreation,
                pollUpdates: update.pollUpdates,
              });
              const [messageCtx] = message;

              let payload = {
                ...messageCtx,
                body:
                  pollMessage.find((poll) => poll.voters.length > 0)?.name ||
                  "",
                from: utils.formatPhone(key.remoteJid, this.plugin),
                voters: pollCreation,
                type: "poll",
              };

              this.emit("message", payload);
            }
          }
        }
      },
    },
  ];

  initBusEvents = (_sock: any): void => {
    this.vendor = _sock;
    const listEvents = this.busEvents();

    for (const { event, func } of listEvents) {
      this.vendor.ev.on(event, func);
    }
  };

  sendMedia = async (
    number: string,
    mediaUrl: string,
    text: string
  ): Promise<any> => {
    try {
      const fileDownloaded = await utils.generalDownload(mediaUrl);
      const mimeType = mime.lookup(fileDownloaded);

      if (typeof mimeType === "string" && mimeType.includes("image"))
        return this.sendImage(number, fileDownloaded, text);
      if (typeof mimeType === "string" && mimeType.includes("video"))
        return this.sendVideo(number, fileDownloaded, text);
      if (typeof mimeType === "string" && mimeType.includes("audio")) {
        const fileOpus = await utils.convertAudio(fileDownloaded);
        return this.sendAudio(number, fileOpus);
      }

      return this.sendFile(number, fileDownloaded);
    } catch (error) {
      console.error(`Error enviando media: ${error}`);
      throw error;
    }
  };

  sendImage = async (
    number: string,
    filePath: string,
    text: string
  ): Promise<any> => {
    if (!this.vendor) {
      throw new Error(
        "WhatsApp connection not established. Please wait for reconnection."
      );
    }
    const numberClean = utils.formatPhone(number);
    return this.vendor.sendMessage(numberClean, {
      image: readFileSync(filePath),
      caption: text ?? "",
    });
  };

  sendVideo = async (
    number: string,
    filePath: string,
    text: string
  ): Promise<any> => {
    if (!this.vendor) {
      throw new Error(
        "WhatsApp connection not established. Please wait for reconnection."
      );
    }
    const numberClean = utils.formatPhone(number);
    return this.vendor.sendMessage(numberClean, {
      video: readFileSync(filePath),
      caption: text,
      gifPlayback: this.globalVendorArgs.gifPlayback,
    });
  };

  sendAudio = async (number: string, audioUrl: string): Promise<any> => {
    if (!this.vendor) {
      throw new Error(
        "WhatsApp connection not established. Please wait for reconnection."
      );
    }
    const numberClean = utils.formatPhone(number);
    return this.vendor.sendMessage(numberClean, {
      audio: { url: audioUrl },
      ptt: true,
    });
  };

  sendText = async (number: string, message: string): Promise<any> => {
    if (!this.vendor) {
      throw new Error(
        "WhatsApp connection not established. Please wait for reconnection."
      );
    }
    const numberClean = utils.formatPhone(number);
    return this.vendor.sendMessage(numberClean, { text: message });
  };

  sendFile = async (number: string, filePath: string): Promise<any> => {
    if (!this.vendor) {
      throw new Error(
        "WhatsApp connection not established. Please wait for reconnection."
      );
    }
    const numberClean = utils.formatPhone(number);
    const mimeType = mime.lookup(filePath);
    const fileName = filePath.split("/").pop();
    return this.vendor.sendMessage(numberClean, {
      document: { url: filePath },
      mimetype: mimeType,
      fileName: fileName,
    });
  };

  sendButtons = async (
    number: string,
    text: string,
    buttons: any[]
  ): Promise<any> => {
    if (!this.vendor) {
      throw new Error(
        "WhatsApp connection not established. Please wait for reconnection."
      );
    }
    const numberClean = utils.formatPhone(number);

    const templateButtons = buttons.map((btn, i) => ({
      buttonId: `id-btn-${i}`,
      buttonText: { displayText: btn.body },
      type: 1,
    }));

    const buttonMessage = {
      text,
      footer: "",
      buttons: templateButtons,
      headerType: 1,
    };

    return this.vendor.sendMessage(numberClean, buttonMessage);
  };

  sendPoll = async (
    number: string,
    text: string,
    poll: any
  ): Promise<boolean> => {
    if (!this.vendor) {
      throw new Error(
        "WhatsApp connection not established. Please wait for reconnection."
      );
    }
    const numberClean = utils.formatPhone(number);

    if (poll.options.length < 2) return false;

    const pollMessage = {
      name: text,
      values: poll.options,
      selectableCount: 1,
    };
    return this.vendor.sendMessage(numberClean, { poll: pollMessage });
  };

  sendMessage = async (
    numberIn: string,
    message: string,
    options: SendMessageOptions
  ): Promise<any> => {
    const number = utils.formatPhone(numberIn);

    if (options.options.buttons?.length) {
      return this.sendPoll(number, message, {
        options: options.options.buttons.map((btn, i) => btn.body) ?? [],
      });
    }
    if (options.options?.media)
      return this.sendMedia(number, options.options.media, message);
    return this.sendText(number, message);
  };

  sendLocation = async (
    remoteJid: string,
    latitude: string,
    longitude: string,
    messages: any = null
  ): Promise<{ status: string }> => {
    await this.vendor.sendMessage(
      remoteJid,
      {
        location: {
          degreesLatitude: latitude,
          degreesLongitude: longitude,
        },
      },
      { quoted: messages }
    );

    return { status: "success" };
  };

  sendContact = async (
    remoteJid: string,
    contactNumber: string,
    displayName: string,
    messages: any = null
  ): Promise<{ status: string }> => {
    const cleanContactNumber = contactNumber.replace(/ /g, "");
    const waid = cleanContactNumber.replace("+", "");

    const vcard =
      "BEGIN:VCARD\n" +
      "VERSION:3.0\n" +
      `FN:${displayName}\n` +
      "ORG:Ashoka Uni;\n" +
      `TEL;type=CELL;type=VOICE;waid=${waid}:${cleanContactNumber}\n` +
      "END:VCARD";

    await this.vendor.sendMessage(
      remoteJid,
      {
        contacts: {
          displayName: displayName,
          contacts: [{ vcard }],
        },
      },
      { quoted: messages }
    );

    return { status: "success" };
  };

  sendPresenceUpdate = async (
    remoteJid: string,
    WAPresence: string
  ): Promise<void> => {
    await this.vendor.sendPresenceUpdate(WAPresence, remoteJid);
  };

  sendSticker = async (
    remoteJid: string,
    url: string,
    stickerOptions: any,
    messages: any = null
  ): Promise<void> => {
    const number = utils.formatPhone(remoteJid);
    const sticker = new Sticker(url, {
      ...stickerOptions,
      quality: 50,
      type: "crop",
    });

    const buffer = await sticker.toMessage();

    await this.vendor.sendMessage(number, buffer, { quoted: messages });
  };

  getConnectionState = (): string => {
    return this.connectionState;
  };
}

