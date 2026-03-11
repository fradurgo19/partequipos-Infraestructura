import { supabase } from '../lib/supabase';

const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) return envUrl;
  return import.meta.env.PROD ? '/api' : 'http://localhost:3000/api';
};

// Servicio para agregar marca de agua a imágenes usando el backend
export const addWatermarkToImage = async (imageFile: File): Promise<string> => {
  const formData = new FormData();
  formData.append('image', imageFile);

  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token;
  if (!token) {
    const msg = 'Sesión expirada. Inicia sesión de nuevo.';
    console.error('addWatermarkToImage:', msg);
    throw new Error(msg);
  }

  let response: Response;
  try {
    response = await fetch(`${getApiBaseUrl()}/upload/image/watermark`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
  } catch (networkError) {
    console.error('Error en addWatermarkToImage (red):', networkError);
    throw new Error('Error de conexión. Comprueba la red e inténtalo de nuevo.');
  }

  const contentType = response.headers.get('content-type') ?? '';
  const isJson = contentType.includes('application/json');

  if (!response.ok) {
    let message = 'Error al procesar imagen con marca de agua';
    if (isJson) {
      try {
        const body = await response.json();
        message = body.error || body.message || message;
      } catch {
        // usar message por defecto
      }
    } else {
      try {
        const text = await response.text();
        if (text.length < 200) message = text;
      } catch {
        // usar message por defecto
      }
    }
    console.error('addWatermarkToImage:', response.status, message);
    throw new Error(message);
  }

  if (!isJson) {
    console.error('addWatermarkToImage: respuesta no JSON', response.status);
    throw new Error('Respuesta inválida del servidor');
  }

  const data = await response.json();
  if (data.url && typeof data.url === 'string') {
    return data.url;
  }
  console.error('addWatermarkToImage: sin URL en respuesta', data);
  throw new Error('No se recibió URL de la imagen');
};

