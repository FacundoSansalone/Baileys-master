import { createWriteStream } from "fs";
import { promisify } from "util";
import { pipeline } from "stream";
import axios from "axios";
import ffmpeg from "fluent-ffmpeg";
import ffmpegInstaller from "@ffmpeg-installer/ffmpeg";
import qrcode from "qrcode-terminal";
import { writeFile } from "fs/promises";
import QRCode from "qrcode";

const streamPipeline = promisify(pipeline);

ffmpeg.setFfmpegPath(ffmpegInstaller.path);

/**
 * Formatea un número de teléfono a formato WhatsApp
 * @param phone - Número de teléfono
 * @param isPlugin - Si es un plugin
 * @returns Número formateado
 */
export const formatPhone = (phone: string, isPlugin: boolean = false): string => {
  if (!phone) return "";
  
  // Remover caracteres no numéricos
  let cleaned = phone.replace(/\D/g, "");
  
  // Si no tiene código de país, asumir que es local (ajusta según tu país)
  if (!cleaned.startsWith("1") && !cleaned.startsWith("+")) {
    // Puedes cambiar esto según tu código de país
    // cleaned = "1" + cleaned; // Para USA/Canada
  }
  
  // Agregar @s.whatsapp.net si no lo tiene
  if (!phone.includes("@")) {
    return cleaned + "@s.whatsapp.net";
  }
  
  return phone;
};

/**
 * Genera una referencia única para eventos
 * @param event - Nombre del evento
 * @returns Referencia única
 */
export const generateRefprovider = (event: string): string => {
  return `_event_${event}_${Date.now()}`;
};

/**
 * Descarga un archivo desde una URL
 * @param url - URL del archivo
 * @returns Ruta del archivo descargado
 */
export const generalDownload = async (url: string): Promise<string> => {
  try {
    // Si es una ruta local, retornarla directamente
    if (!url.startsWith("http")) {
      return url;
    }

    const response = await axios({
      url,
      method: "GET",
      responseType: "stream",
    });

    const fileName = `tmp_${Date.now()}_${url.split("/").pop() || "file"}`;
    const filePath = `./tmp/${fileName}`;

    // Crear directorio tmp si no existe
    const fs = require("fs");
    if (!fs.existsSync("./tmp")) {
      fs.mkdirSync("./tmp");
    }

    await streamPipeline(response.data, createWriteStream(filePath));

    return filePath;
  } catch (error) {
    console.error("Error descargando archivo:", error);
    throw error;
  }
};

/**
 * Convierte un archivo de audio a formato compatible con WhatsApp (opus)
 * @param filePath - Ruta del archivo de audio
 * @returns Ruta del archivo convertido
 */
export const convertAudio = async (filePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const outputPath = filePath.replace(/\.[^/.]+$/, "") + ".opus";

    ffmpeg(filePath)
      .audioCodec("libopus")
      .audioBitrate("128k")
      .format("opus")
      .on("end", () => {
        resolve(outputPath);
      })
      .on("error", (err) => {
        console.error("Error convirtiendo audio:", err);
        reject(err);
      })
      .save(outputPath);
  });
};

/**
 * Genera una imagen QR y la guarda en un archivo
 * @param qrData - Datos del QR
 * @param fileName - Nombre del archivo
 */
export const baileyGenerateImage = async (
  qrData: string,
  fileName: string
): Promise<void> => {
  try {
    // Mostrar QR en terminal
    console.log("\n📱 ESCANEA ESTE CÓDIGO QR CON WHATSAPP:\n");
    qrcode.generate(qrData, { small: true });
    console.log("\n⏱️  El código expira en 30 segundos.\n");

    // Guardar QR como imagen
    await QRCode.toFile(fileName, qrData, {
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
      width: 300,
    });
    
    console.log(`💾 QR guardado en: ${fileName}`);
  } catch (error) {
    console.error("Error generando imagen QR:", error);
  }
};

/**
 * Limpia archivos temporales
 */
export const cleanTempFiles = (): void => {
  const fs = require("fs");
  const path = require("path");
  const tmpDir = "./tmp";

  if (fs.existsSync(tmpDir)) {
    const files = fs.readdirSync(tmpDir);
    files.forEach((file: string) => {
      const filePath = path.join(tmpDir, file);
      fs.unlinkSync(filePath);
    });
  }
};

export default {
  formatPhone,
  generateRefprovider,
  generalDownload,
  convertAudio,
  baileyGenerateImage,
  cleanTempFiles,
};

