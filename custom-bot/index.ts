import axios from "axios";
import { BaileysClass } from "./BaileysClass";

console.log("🤖 Iniciando Bot de WhatsApp...\n");

// 🔐 CONFIGURACIÓN: Número permitido (solo este número recibirá respuestas)
const NUMERO_PERMITIDO = "59895541080"; // Número: +598 95 541 080

// 🔗 MCP Endpoint y Chat ID (opcional)
const MCP_URL = process.env.MCP_URL ?? "http://localhost:3000/api/mcp";
const DEFAULT_CHAT_ID = process.env.DEFAULT_CHAT_ID ?? ""; // ej: "0e2c02c0-c819-4f47-bc70-8e4bf5014d9e"

// Crear instancia del bot
const bot = new BaileysClass({
  name: "mi-bot",
  usePairingCode: false, // false = QR Code, true = Pairing Code
  phoneNumber: null,
  gifPlayback: false,
  dir: "./",
});

// Evento: QR generado
bot.on("qr", (qr) => {
  console.log("\n✅ ¡Código QR generado y mostrado arriba!");
  console.log("📱 Escanea el código QR de la terminal con WhatsApp");
  console.log("💾 También puedes abrir la imagen: mi-bot.qr.png\n");
});

// Evento: Código de emparejamiento
bot.on("pairing_code", (code) => {
  console.log("\n✅ Código de emparejamiento generado!");
  console.log(`📱 Ingresa este código en WhatsApp: ${code}\n`);
});

// Evento: Bot listo
bot.on("ready", () => {
  console.log("\n✅ ¡Bot conectado y listo!\n");
  console.log("📱 Puedes empezar a enviar mensajes al bot\n");
});

// Evento: Error de autenticación
bot.on("auth_failure", (error) => {
  console.error("\n❌ Error de autenticación:", error);
});

// Evento: Mensaje recibido
bot.on("message", async (msg) => {
  console.log("\n📩 Nuevo mensaje:");
  console.log(`   De: ${msg.from}`);
  console.log(`   Tipo: ${msg.type}`);
  console.log(`   Contenido: ${msg.body}`);

  // 🔐 FILTRO: Solo responder al número permitido
  const numeroRemitente = msg.from.replace(/[^0-9]/g, "");
  console.log(`   🔍 Número extraído: ${numeroRemitente}`);

  if (!numeroRemitente.includes(NUMERO_PERMITIDO)) {
    console.log(
      `   ⛔ Mensaje ignorado - No es del número permitido (${NUMERO_PERMITIDO})`
    );
    return;
  }

  console.log(`   ✅ Mensaje del número permitido - Procesando...`);

  try {
    // Usamos ambas variantes:
    // - originalText: lo que enviaremos al MCP (no tocado)
    // - textLower: para comparar comandos
    const originalText = msg.body || "";
    const textLower = originalText.toLowerCase();

    // Comando: hola
    if (textLower === "hola") {
      await bot.sendText(
        msg.from,
        "¡Hola! 👋\n\nSoy un bot de WhatsApp. Escribe *menu* para ver los comandos."
      );
      return;
    }

    // Comando: menu
    if (textLower === "menu") {
      await bot.sendText(
        msg.from,
        "🤖 *MENÚ*\n\n" +
          "• *hola* - Saludo\n" +
          "• *menu* - Ver este menú\n" +
          "• *ping* - Verificar conexión"
      );
      return;
    }

    // Comando: ping
    if (textLower === "ping") {
      await bot.sendText(msg.from, "🏓 Pong! El bot está funcionando.");
      return;
    }

    // Responder a imágenes
    if (msg.type === "image") {
      await bot.sendText(msg.from, "📸 Imagen recibida.");
      return;
    }

    // Responder a audios
    if (msg.type === "voice") {
      await bot.sendText(msg.from, "🎤 Nota de voz recibida.");
      return;
    }

    // Responder a ubicaciones
    if (msg.type === "location") {
      await bot.sendText(msg.from, "📍 Ubicación recibida.");
      return;
    }

    // Responder a archivos
    if (msg.type === "file") {
      await bot.sendText(msg.from, "📄 Archivo recibido.");
      return;
    }

    // Mensaje no reconocido → se envía al MCP-Chat
    if (originalText && !originalText.startsWith("_event_")) {
      console.log("   🤖 Enviando mensaje al MCP-Chat...", { MCP_URL });

      try {
        const payload: Record<string, any> = { message: originalText };
        if (DEFAULT_CHAT_ID) payload.chatId = DEFAULT_CHAT_ID;

        const response = await axios.post(MCP_URL, payload);
        const result =
          response.data?.result || "✅ Acción ejecutada correctamente.";

        console.log("   🧠 Respuesta del MCP-Chat:", result);
        await bot.sendText(msg.from, result);
      } catch (error: any) {
        console.error("   ❌ Error al contactar al MCP:", error?.message || error);
        await bot.sendText(
          msg.from,
          "⚙️ No pude contactar al asistente por ahora. Intenta más tarde."
        );
      }
      return;
    }

    // Si llegó acá, no hubo texto útil
    await bot.sendText(
      msg.from,
      "❓ No entiendo ese comando. Escribe *menu* para ver opciones."
    );
  } catch (error) {
    console.error("   ❌ Error procesando mensaje:", error);
  }
});

// Manejo de errores
process.on("unhandledRejection", (error) => {
  console.error("\n❌ Error no capturado:", error);
});

console.log("⏳ Esperando conexión...\n");
