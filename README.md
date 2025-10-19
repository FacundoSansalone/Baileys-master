# 🤖 Bot WhatsApp con IA (OpenAI vía MCP Chat)

Bot de WhatsApp que se conecta con MCP Chat para responder con OpenAI.

---

## 🎯 Funcionamiento

- `"Hola"` → Respuesta hardcodeada del bot
- `"Menu"`→ Respuesta hardcodeada del bot
- **Todo lo demás** → Se envía a MCP Chat (OpenAI responde)

---

## ⚙️ Configuración

### 1. Número permitido
Edita `index.ts` línea 6:
```typescript
const NUMERO_PERMITIDO = "Pongan uno de sus numeros para que solo pueda hablar 1 y no conteste todos los msj, el formato es el siguiente: numero uruguayo: 598sunumero,numero argentino:593sunumero";
```

### 2. MCP Chat
Debe estar corriendo en: `http://localhost:3001`

---

## Uso

### 1. Inicia tu MCP Chat (puerto 3000):
```bash

```

### 2. Inicia el bot (puerto 3001):
```bash
npm install
npm run bot
```

### 3. Escanea el QR con WhatsApp

### 4. Envía mensajes:
- `"Hola"` → Respuesta fija del bot
- `"Agenda reunión mañana 15:00"` → OpenAI procesa y responde


---

##Flujo

```
Usuario → Bot → MCP Chat → OpenAI → MCP Chat → Bot → Usuario
```



