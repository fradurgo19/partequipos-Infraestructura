const MAX_DIMENSION = 1920;
const JPEG_QUALITY = 0.82;

const fileToImage = (file: File): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`No se pudo procesar: ${file.name}`));
    };
    img.src = url;
  });

const canvasToJpegBlob = (canvas: HTMLCanvasElement): Promise<Blob> =>
  new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Error al comprimir la imagen'))),
      'image/jpeg',
      JPEG_QUALITY
    );
  });

/** Redimensiona y comprime imágenes para subida optimizada a Storage. */
export const compressImageFile = async (file: File): Promise<File> => {
  if (!file.type.startsWith('image/')) {
    return file;
  }

  const img = await fileToImage(file);
  const w = img.naturalWidth;
  const h = img.naturalHeight;
  if (!w || !h) {
    return file;
  }

  const scale = Math.min(1, MAX_DIMENSION / Math.max(w, h));
  const cw = Math.max(1, Math.round(w * scale));
  const ch = Math.max(1, Math.round(h * scale));

  const canvas = document.createElement('canvas');
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return file;
  }

  ctx.drawImage(img, 0, 0, cw, ch);
  const blob = await canvasToJpegBlob(canvas);
  const baseName = file.name.replace(/\.[^.]+$/, '') || 'foto';
  return new File([blob], `${baseName}.jpg`, { type: 'image/jpeg', lastModified: Date.now() });
};

export const isImageFile = (file: File): boolean =>
  file.type.startsWith('image/') || /\.(jpe?g|png|gif|webp|bmp|heic|heif)$/i.test(file.name);
