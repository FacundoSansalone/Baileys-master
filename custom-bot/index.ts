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

  try {
    const text = msg.body?.toLowerCase() || "";

    // 👋 ÚNICO COMANDO HARDCODEADO: "hola"
    if (text === "hola") {
      await bot.sendText(
        msg.from,
        "¡Hola! 👋\n\nSoy Javier tu asistente personal. Pregúntame lo que quieras y te ayudaré."
      );
      return; // No enviar a MCP Chat
    }

    // 🤖 TODO LO DEMÁS → ENVIAR A MCP CHAT (OpenAI responde)
    if (msg.body && !msg.body.startsWith("_event_")) {
      console.log("   🤖 Enviando al MCP Chat (OpenAI)...");
      
      try {
        const axios = (await import("axios")).default;
        
        // Enviar mensaje a tu MCP Chat
        const response = await axios.post("http://localhost:3000/api/chat", {
          message: msg.body, // Mensaje original (no lowercase)
        }, {
          timeout: 30000, // 30 segundos
          headers: {
            'Content-Type': 'application/json'
          }
        });
        
        // Extraer respuesta de OpenAI
        // Ajusta según la estructura de respuesta de tu MCP Chat
        const respuestaIA = response.data.response || 
                           response.data.message || 
                           response.data.result ||
                           response.data;
        
        console.log("   ✅ Respuesta recibida de OpenAI");
        
        // Enviar respuesta al usuario
        if (respuestaIA && typeof respuestaIA === 'string') {
          await bot.sendText(msg.from, respuestaIA);
        } else {
          console.log("   ⚠️ Formato de respuesta inesperado:", respuestaIA);
          await bot.sendText(msg.from, "🤔 Procesé tu mensaje pero no pude formular una respuesta.");
        }
        
      } catch (error: any) {
        console.error("   ❌ Error con MCP Chat:", error.message);
        
        if (error.code === 'ECONNREFUSED') {
          await bot.sendText(
            msg.from,
            "⚠️ El asistente de IA no está disponible. Asegúrate de que el MCP Chat esté corriendo en puerto 3000."
          );
        } else if (error.response) {
          console.error("   Status:", error.response.status);
          console.error("   Data:", error.response.data);
          await bot.sendText(
            msg.from,
            "❌ Hubo un problema al procesar tu mensaje. Intenta de nuevo."
          );
        } else {
          await bot.sendText(
            msg.from,
            "❌ Error de conexión. Verifica que el MCP Chat esté corriendo."
          );
        }
      }
    }

  } catch (error) {
    console.error("   ❌ Error general:", error);
  }
});

// Manejo de errores
process.on("unhandledRejection", (error) => {
  console.error("\n❌ Error no capturado:", error);
});

console.log("⏳ Esperando conexión...\n");
