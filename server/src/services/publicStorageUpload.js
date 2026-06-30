import { supabase } from '../lib/supabaseClient.js';

const PUBLIC_UPLOAD_FOLDERS = new Set(['internal-requests', 'designs', 'public-internal-requests']);

export const uploadPublicStorageFile = async (file, bucket = 'general', folder = 'public-internal-requests') => {
  if (!file?.buffer) {
    const error = new Error('No se proporcionó ningún archivo');
    error.statusCode = 400;
    throw error;
  }

  if (bucket !== 'general' || !PUBLIC_UPLOAD_FOLDERS.has(folder)) {
    const error = new Error('Destino de archivo no permitido');
    error.statusCode = 400;
    throw error;
  }

  if (!supabase) {
    const error = new Error('Almacenamiento no configurado en el servidor');
    error.statusCode = 500;
    throw error;
  }

  const fileExt = file.originalname?.split('.').pop() || 'bin';
  const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

  const { error } = await supabase.storage.from(bucket).upload(fileName, file.buffer, {
    contentType: file.mimetype || 'application/octet-stream',
    upsert: false,
  });

  if (error) {
    console.error('Public storage upload error:', error);
    const uploadError = new Error('Error al subir el archivo');
    uploadError.statusCode = 500;
    throw uploadError;
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(fileName);

  return { url: publicUrl, path: fileName, bucket };
};
