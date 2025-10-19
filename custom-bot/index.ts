import axios from "axios";
import { BaileysClass } from "./BaileysClass";
import validator from "validator";

// 🔧 Función para detectar herramientas ejecutadas en respuestas del MCP
function detectExecutedTools(responseData: any, result: string): string[] | null {
  // Buscar campos específicos de herramientas en la respuesta
  if (responseData && typeof responseData === 'object') {
    // Buscar campos específicos de herramientas
    if (responseData.tools_executed || responseData.tool_calls || responseData.tools || responseData.toolName) {
      return responseData.tools_executed || responseData.tool_calls || responseData.tools || [responseData.toolName];
    }
    
    // Detectar por patrones en la respuesta
    const responseStr = JSON.stringify(responseData);
    if (responseStr.includes('finishReason') && responseStr.includes('usage')) {
      // Es una respuesta de herramienta ejecutada, intentar extraer el nombre
      if (responseData.toolName) {
        return [responseData.toolName];
      }
      if (responseData.toolExecuted) {
        return ["Herramienta MCP"];
      }
    }
  }
  
  // Buscar en el texto del resultado
  if (result) {
    const toolPatterns = [
      /Web_Search/gi,
      /webSearch/gi,
      /search.*web/gi,
      /exa.*search/gi,
      /herramienta.*ejecutada/gi,
      /tool.*executed/gi
    ];
    
    const foundTools: string[] = [];
    toolPatterns.forEach(pattern => {
      const matches = result.match(pattern);
      if (matches) {
        foundTools.push(...matches);
      }
    });
    
    if (foundTools.length > 0) {
      return [...new Set(foundTools)];
    }
  }
  
  return null;
}

// 📧 Función para validar emails en el texto
function validateEmailsInText(text: string): { isValid: boolean; invalidEmails: string[] } {
  // Buscar cualquier secuencia que contenga @ (posibles emails)
  const emailRegex = /\S*@\S*/g;
  const potentialEmails = text.match(emailRegex) || [];
  
  const invalidEmails: string[] = [];
  
  potentialEmails.forEach(email => {
    // Limpiar espacios y validar
    const cleanEmail = email.trim();
    if (cleanEmail.includes('@') && !validator.isEmail(cleanEmail)) {
      invalidEmails.push(cleanEmail);
    }
  });
  
  return {
    isValid: invalidEmails.length === 0,
    invalidEmails
  };
}

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
        "¡Hola! 👋\n\nSoy un Uni, tu asistense personal. Escribe *menu* para ver las funcionalidades disponibles."
      );
      return;
    }

    // Comando: menu
    if (textLower === "menu" || textLower === "Menu") {
      await bot.sendText(
        msg.from,
        "🤖 *MENÚ*\n\n" +
          "• Enviar emails a través de gmail\n" +
          "• Agendar citas en tu google calendar\n" +
          "• Más funcionalidad: comming soon...\n"
      );
      return;
    }


    // Mensaje no reconocido → se envía al MCP-Chat
    if (originalText && !originalText.startsWith("_event_")) {
      console.log("   🤖 Enviando mensaje al MCP-Chat...", { MCP_URL });

      // 📧 Validar emails antes de enviar al MCP
      const emailValidation = validateEmailsInText(originalText);
      if (!emailValidation.isValid) {
        console.log("   ❌ Email inválido detectado:", emailValidation.invalidEmails);
        await bot.sendText(
          msg.from,
          `❌ *Error de validación de email*\n\n` +
          `Los siguientes emails no son válidos:\n` +
          `• ${emailValidation.invalidEmails.join('\n• ')}\n\n` +
          `Por favor, verifica que los emails estén escritos correctamente y vuelve a intentar.`
        );
        return;
      }

      try {
        const payload: Record<string, any> = { message: originalText };
        if (DEFAULT_CHAT_ID) payload.chatId = DEFAULT_CHAT_ID;

        const response = await axios.post(MCP_URL, payload);
        
        // Debug: mostrar qué devuelve el MCP
        console.log("   🔍 Respuesta completa del MCP:");
        console.log("   📊 Tipo de respuesta:", typeof response.data);
        console.log("   📋 Contenido:", JSON.stringify(response.data, null, 2));
        
        // Manejar diferentes formatos de respuesta del MCP
        let result = "✅ Acción ejecutada correctamente.";
        
        // Si la respuesta es un string que contiene JSON
        if (typeof response.data === 'string') {
          try {
            const parsedData = JSON.parse(response.data);
            result = parsedData.content || parsedData.result || parsedData.text || response.data;
          } catch (e) {
            // Si no es JSON válido, usar el string directamente
            result = response.data;
          }
        } else if (typeof response.data === 'object') {
          // Si es un objeto, extraer el contenido
          result = response.data.content || response.data.result || response.data.text || JSON.stringify(response.data);
        }
        
        // Detectar herramientas ejecutadas usando la función especializada
        const toolsExecuted = detectExecutedTools(response.data, result);
        
        // Enviar mensaje de éxito al usuario si se ejecutaron herramientas
        if (toolsExecuted && toolsExecuted.length > 0) {
          const successMessage = `✅ *Herramienta ejecutada exitosamente*\n\n` +
            `🔧 *Herramienta utilizada:* ${toolsExecuted.join(', ')}\n\n` +
            `📋 *Resultado:*\n${result}`;
          
          console.log("   🔧 Herramienta ejecutada:", toolsExecuted);
          await bot.sendText(msg.from, successMessage);
        } else {
          // Si no hay herramientas, enviar respuesta normal
          console.log("   🧠 Respuesta del MCP procesada");
          await bot.sendText(msg.from, result);
        }
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
