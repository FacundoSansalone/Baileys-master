# 🎨 Ejemplos de Personalización de Mensajes

## Ubicación: `custom-bot/index.ts` líneas 60-120

---

## 📝 Ejemplo 1: Bot de Restaurante

```typescript
// Comando: menu
if (text === "menu") {
  await bot.sendText(
    msg.from,
    "🍕 *MENÚ DEL DÍA*\n\n" +
    "1️⃣ Pizza Margherita - $15\n" +
    "2️⃣ Pasta Carbonara - $12\n" +
    "3️⃣ Ensalada César - $10\n\n" +
    "Escribe el número para ordenar"
  );
}

// Respuesta a opción 1
else if (text === "1") {
  await bot.sendText(
    msg.from,
    "✅ *Pizza Margherita seleccionada*\n\n" +
    "💰 Precio: $15\n" +
    "⏱️ Tiempo de preparación: 20 min\n\n" +
    "¿Confirmas tu orden? (sí/no)"
  );
}

else if (text === "sí" || text === "si") {
  await bot.sendText(
    msg.from,
    "🎉 *Orden confirmada*\n\n" +
    "Estamos preparando tu pizza.\n" +
    "Te avisaremos cuando esté lista.\n\n" +
    "¡Gracias por tu compra! 😊"
  );
}
```

---

## 📝 Ejemplo 2: Bot de Soporte Técnico

```typescript
if (text === "hola") {
  await bot.sendText(
    msg.from,
    "👋 ¡Hola! Bienvenido a Soporte Técnico\n\n" +
    "¿En qué puedo ayudarte?\n\n" +
    "📱 *OPCIONES RÁPIDAS:*\n" +
    "• *problema* - Reportar problema\n" +
    "• *estado* - Verificar estado de ticket\n" +
    "• *horarios* - Ver horarios de atención"
  );
}

else if (text === "problema") {
  await bot.sendText(
    msg.from,
    "🔧 *REPORTAR PROBLEMA*\n\n" +
    "Por favor describe tu problema y un técnico te contactará pronto.\n\n" +
    "Escribe tu mensaje a continuación:"
  );
}

else if (text === "estado") {
  await bot.sendText(
    msg.from,
    "🎫 *ESTADO DE TU TICKET*\n\n" +
    "Ticket #12345\n" +
    "Estado: 🟢 En proceso\n" +
    "Asignado a: Juan Pérez\n" +
    "Tiempo estimado: 2 horas"
  );
}
```

---

## 📝 Ejemplo 3: Bot de Citas/Reservas

```typescript
if (text === "reservar" || text === "cita") {
  await bot.sendText(
    msg.from,
    "📅 *RESERVAR CITA*\n\n" +
    "¿Para qué día?\n\n" +
    "• *hoy* - Hoy\n" +
    "• *mañana* - Mañana\n" +
    "• *fecha* - Otra fecha"
  );
}

else if (text === "mañana") {
  await bot.sendText(
    msg.from,
    "⏰ *HORARIOS DISPONIBLES MAÑANA*\n\n" +
    "1️⃣ 09:00 - 10:00\n" +
    "2️⃣ 11:00 - 12:00\n" +
    "3️⃣ 14:00 - 15:00\n" +
    "4️⃣ 16:00 - 17:00\n\n" +
    "Escribe el número de tu preferencia"
  );
}

else if (text === "1" || text === "2" || text === "3" || text === "4") {
  const horarios = {
    "1": "09:00 - 10:00",
    "2": "11:00 - 12:00",
    "3": "14:00 - 15:00",
    "4": "16:00 - 17:00"
  };
  
  await bot.sendText(
    msg.from,
    `✅ *CITA CONFIRMADA*\n\n` +
    `📅 Fecha: Mañana\n` +
    `⏰ Hora: ${horarios[text]}\n\n` +
    `Te esperamos! 😊`
  );
}
```

---

## 📝 Ejemplo 4: Variables dinámicas

```typescript
// Usar información del mensaje
if (text.startsWith("mi nombre es ")) {
  const nombre = text.replace("mi nombre es ", "");
  await bot.sendText(
    msg.from,
    `Encantado de conocerte, ${nombre}! 😊\n\n` +
    `¿En qué puedo ayudarte hoy?`
  );
}

// Mostrar hora actual
else if (text === "hora") {
  const horaActual = new Date().toLocaleTimeString('es-UY');
  await bot.sendText(
    msg.from,
    `🕐 La hora actual es: ${horaActual}`
  );
}

// Mostrar fecha
else if (text === "fecha") {
  const fechaActual = new Date().toLocaleDateString('es-UY', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  await bot.sendText(
    msg.from,
    `📅 Hoy es: ${fechaActual}`
  );
}
```

---

## 📝 Ejemplo 5: Mensajes con múltiples respuestas

```typescript
// Responder con varios mensajes seguidos
if (text === "tutorial") {
  await bot.sendText(msg.from, "📚 *TUTORIAL - PARTE 1*\n\nPrimero, descarga la app...");
  
  // Esperar 2 segundos
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await bot.sendText(msg.from, "📚 *TUTORIAL - PARTE 2*\n\nLuego, configura tu cuenta...");
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  await bot.sendText(msg.from, "📚 *TUTORIAL - PARTE 3*\n\n¡Listo! Ya puedes usar la app.");
}
```

---

## 🎯 Plantilla lista para copiar y pegar

```typescript
// Agrega esto en index.ts después de la línea 85

// TU COMANDO AQUÍ
else if (text === "tucomando") {
  await bot.sendText(
    msg.from,
    "Tu mensaje aquí\n\n" +
    "Puedes usar varias líneas\n" +
    "*Negrita* _cursiva_ ~tachado~"
  );
}
```

---

## 🎨 Tips de formato

### Saltos de línea:
```typescript
"Línea 1\n" +
"Línea 2\n\n" + // Doble \n = línea en blanco
"Línea 3"
```

### Formato WhatsApp:
```typescript
"*Negrita*"
"_Cursiva_"
"~Tachado~"
"```Código```"
```

### Emojis comunes:
```typescript
✅ ❌ ⚠️ ℹ️ 📱 💬 🔔 ⏰ 📅 🎉 👋 😊 🤖 🔥 ⭐
```

---

## 📋 Ubicaciones exactas para editar:

| Qué quieres cambiar | Línea en index.ts |
|---------------------|-------------------|
| Saludo "hola" | 67 |
| Menú de comandos | 75-78 |
| Respuesta "ping" | 84 |
| Respuesta a imagen | 89 |
| Respuesta a audio | 94 |
| Mensaje no reconocido | 110-120 |

---

**¿Quieres que te ayude a crear mensajes específicos para tu caso de uso?** Dime qué tipo de bot necesitas (ventas, soporte, reservas, etc.) y te creo los mensajes personalizados. 🚀
