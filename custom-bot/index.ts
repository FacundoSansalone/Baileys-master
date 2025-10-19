import { BaileysClass } from "./BaileysClass";

console.log("🤖 Iniciando Bot de WhatsApp...\n");

// 🔐 CONFIGURACIÓN: Número permitido (solo este número recibirá respuestas)
const NUMERO_PERMITIDO = "59895541080"; // Número: +598 95 541 080

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
    console.log(`   ⛔ Mensaje ignorado - No es del número permitido (${NUMERO_PERMITIDO})`);
    return;
  }

  console.log(`   ✅ Mensaje del número permitido - Procesando...`);

  // Respuestas automáticas
  try {
    const text = msg.body?.toLowerCase() || "";

    // Comando: hola
    if (text === "hola") {
      await bot.sendText(
        msg.from,
        "¡Hola! 👋\n\nSoy un bot de WhatsApp. Escribe *menu* para ver los comandos."
      );
    }

    // Comando: menu
    else if (text === "menu") {
      await bot.sendText(
        msg.from,
        "🤖 *MENÚ*\n\n" +
        "• *hola* - Saludo\n" +
        "• *menu* - Ver este menú\n" +
        "• *ping* - Verificar conexión"
      );
    }

    // Comando: ping
    else if (text === "ping") {
      await bot.sendText(msg.from, "🏓 Pong! El bot está funcionando.");
    }

    // Responder a imágenes
    else if (msg.type === "image") {
      await bot.sendText(msg.from, "📸 Imagen recibida.");
    }

    // Responder a audios
    else if (msg.type === "voice") {
      await bot.sendText(msg.from, "🎤 Nota de voz recibida.");
    }

    // Responder a ubicaciones
    else if (msg.type === "location") {
      await bot.sendText(msg.from, "📍 Ubicación recibida.");
    }

    // Responder a archivos
    else if (msg.type === "file") {
      await bot.sendText(msg.from, "📄 Archivo recibido.");
    }

   // Mensaje no reconocido → se envía al MCP-Chat
else if (text && !text.startsWith("_event_")) {
  console.log("   🤖 Enviando mensaje al MCP-Chat...");

  try {
    const axios = await import("axios");
    const response = await axios.default.post("http://localhost:3000/api/mcp", {
      message: text,
    });

    const result = response.data.result || "✅ Acción ejecutada correctamente.";

    console.log("   🧠 Respuesta del MCP-Chat:", result);

    await bot.sendText(msg.from, result);
  } catch (error: any) {
    console.error("   ❌ Error al contactar al MCP:", error.message);
    await bot.sendText(
      msg.from,
      "⚙️ No pude contactar al asistente por ahora. Intenta más tarde."
    );
  }
}


  } catch (error) {
    console.error("   ❌ Error procesando mensaje:", error);
  }
});

// Manejo de errores
process.on("unhandledRejection", (error) => {
  console.error("\n❌ Error no capturado:", error);
});

console.log("⏳ Esperando conexión...\n");
