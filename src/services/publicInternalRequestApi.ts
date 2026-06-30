import { InternalRequestFormData } from '../types/internalRequestForm';
import { supabase } from '../lib/supabase';

const getApiBaseUrl = (): string =>
  import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api' : 'http://localhost:3000/api');

export interface PublicSiteOption {
  id: string;
  name: string;
}

const fetchSitesFromSupabase = async (): Promise<PublicSiteOption[]> => {
  const { data, error } = await supabase.from('sites').select('id, name').order('name');
  if (error || !data) {
    throw new Error('No se pudieron cargar las sedes');
  }
  return data;
};

export const fetchPublicInternalRequestSites = async (): Promise<PublicSiteOption[]> => {
  try {
    const response = await fetch(`${getApiBaseUrl()}/internal-requests/public/sites`);
    if (response.ok) {
      return response.json();
    }
  } catch (error) {
    console.warn('API de sedes públicas no disponible, usando Supabase:', error);
  }

  return fetchSitesFromSupabase();
};

export const submitPublicInternalRequest = async (payload: InternalRequestFormData): Promise<void> => {
  const response = await fetch(`${getApiBaseUrl()}/internal-requests/public`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Error al enviar la solicitud');
  }
};

export const uploadPublicInternalRequestFile = async (
  file: File,
  bucket: string,
  folder: string
): Promise<string> => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('bucket', bucket);
  formData.append('folder', folder);

  const response = await fetch(`${getApiBaseUrl()}/upload/public/file`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || 'Error al subir el archivo');
  }

  const data = await response.json();
  return data.url as string;
};
