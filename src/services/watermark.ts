import { supabase } from '../lib/supabase';

const BUCKET = 'general';
const FOLDER = 'watermarked';
const LOGO_URL = 'https://res.cloudinary.com/dbufrzoda/image/upload/v1750457354/Captura_de_pantalla_2025-06-20_170819_wzmyli.png';
const MAX_DIMENSION = 1920;

/** Carga una imagen desde URL (para el logo). */
function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

/** Convierte File a HTMLImageElement. */
function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('No se pudo cargar la imagen'));
    };
    img.src = url;
  });
}

/** Dibuja marca de agua (fecha y opcionalmente logo) en canvas; devuelve blob JPEG. */
async function drawWatermarkAndGetBlob(imageFile: File): Promise<Blob> {
  const img = await fileToImage(imageFile);
  const w = img.naturalWidth;
  const h = img.naturalHeight;

  const scale = w > MAX_DIMENSION || h > MAX_DIMENSION
    ? Math.min(MAX_DIMENSION / w, MAX_DIMENSION / h)
    : 1;
  const cw = Math.round(w * scale);
  const ch = Math.round(h * scale);

  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('No se pudo obtener contexto del canvas');

  ctx.drawImage(img, 0, 0, cw, ch);

  const dateStr = new Date().toLocaleDateString('es-CO', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  // Fecha abajo a la derecha
  const fontSize = Math.max(12, Math.floor(cw * 0.02));
  ctx.font = `bold ${fontSize}px Arial, sans-serif`;
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  ctx.fillRect(cw - ctx.measureText(dateStr).width - 20, ch - fontSize - 16, ctx.measureText(dateStr).width + 16, fontSize + 12);
  ctx.fillStyle = 'white';
  ctx.textAlign = 'right';
  ctx.fillText(dateStr, cw - 10, ch - 10);

  // Logo arriba a la derecha (opcional, si carga)
  try {
    const logoImg = await Promise.race([
      loadImage(LOGO_URL),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), 4000)),
    ]);
    const logoSize = Math.max(24, Math.min(80, Math.floor(cw * 0.1)));
    ctx.drawImage(logoImg, cw - logoSize - 12, 12, logoSize, logoSize);
  } catch {
    // Sin logo si falla carga o CORS
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Error al generar imagen'))),
      'image/jpeg',
      0.9
    );
  });
}

/**
 * Aplica marca de agua en el cliente (Canvas) y sube a Supabase Storage.
 * No usa API serverless → evita 504 FUNCTION_INVOCATION_TIMEOUT.
 */
export const addWatermarkToImage = async (imageFile: File): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    const msg = 'Sesión expirada. Inicia sesión de nuevo.';
    console.error('addWatermarkToImage:', msg);
    throw new Error(msg);
  }

  let blob: Blob;
  try {
    blob = await drawWatermarkAndGetBlob(imageFile);
  } catch (error) {
    console.error('addWatermarkToImage (canvas):', error);
    throw new Error(error instanceof Error ? error.message : 'Error al procesar la imagen');
  }

  const fileName = `${FOLDER}/${Date.now()}-${Math.random().toString(36).substring(7)}.jpg`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(fileName, blob, {
      contentType: 'image/jpeg',
      upsert: false,
    });

  if (error) {
    console.error('addWatermarkToImage (upload):', error);
    throw new Error(error.message || 'Error al subir la imagen');
  }

  const { data: { publicUrl } } = supabase.storage.from(BUCKET).getPublicUrl(fileName);
  return publicUrl;
};
