# 🤖 Bot Simple de WhatsApp

Bot de WhatsApp con Baileys - Versión limpia y funcional.

---

## 📁 Archivos

- `index.ts` - Archivo principal del bot
- `BaileysClass.ts` - Clase de conexión con WhatsApp
- `utils.ts` - Funciones auxiliares

---

## ⚙️ Configuración

### Número permitido
Edita `index.ts` línea 6:

```typescript
const NUMERO_PERMITIDO = "59895541080"; // Tu número
```

---

## 🚀 Uso

### Iniciar bot:
```bash
npm run bot
```

### Conectar:
1. Escanea el QR que aparece en la terminal
2. O abre la imagen: `mi-bot.qr.png`

### Comandos disponibles:
- `hola` - Saludo
- `menu` - Ver comandos
- `ping` - Verificar conexión

---

## 📝 Personalizar

Edita `index.ts` líneas 70-110 para agregar tus propios comandos.

---

## 🔒 Sesiones

Las credenciales se guardan en: `./mi-bot_sessions/`

Para reconectar desde cero:
```bash
rmdir /s mi-bot_sessions
```
