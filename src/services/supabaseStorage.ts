import { supabase } from '../lib/supabase';
import { compressImageFile, isImageFile } from './imageCompression';

const uniqueStoragePath = (folder: string, extension: string): string =>
  `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${extension}`;

export interface UploadOptions {
  compressImages?: boolean;
}

const prepareFile = async (file: File, compressImages?: boolean): Promise<File> => {
  if (!compressImages || !isImageFile(file)) {
    return file;
  }
  try {
    return await compressImageFile(file);
  } catch (error) {
    console.warn('Compresión omitida, se sube original:', file.name, error);
    return file;
  }
};

/**
 * Upload file to Supabase Storage
 */
export const uploadFile = async (
  bucket: string,
  file: File,
  path: string,
  options?: UploadOptions
): Promise<{ url: string; path: string } | null> => {
  try {
    const prepared = await prepareFile(file, options?.compressImages);
    const ext = prepared.type === 'image/jpeg' ? 'jpg' : prepared.name.split('.').pop() || 'bin';
    const fileName = uniqueStoragePath(path, ext);

    const { error } = await supabase.storage.from(bucket).upload(fileName, prepared, {
      contentType: prepared.type || 'application/octet-stream',
      cacheControl: '3600',
      upsert: false,
    });

    if (error) throw error;

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(fileName);

    return {
      url: publicUrl,
      path: fileName,
    };
  } catch (error) {
    console.error('Error uploading file:', error);
    return null;
  }
};

/**
 * Upload multiple files to Supabase Storage
 */
export const uploadFiles = async (
  bucket: string,
  files: File[],
  path: string,
  options?: UploadOptions
): Promise<string[]> => {
  const uploadPromises = files.map((file) => uploadFile(bucket, file, path, options));
  const results = await Promise.all(uploadPromises);
  return results.filter((r): r is { url: string; path: string } => r !== null).map((r) => r.url);
};

/**
 * Delete file from Supabase Storage
 */
export const deleteFile = async (bucket: string, path: string): Promise<boolean> => {
  try {
    const { error } = await supabase.storage.from(bucket).remove([path]);
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error deleting file:', error);
    return false;
  }
};

/**
 * Get public URL for a file
 */
export const getPublicUrl = (bucket: string, path: string): string => {
  const {
    data: { publicUrl },
  } = supabase.storage.from(bucket).getPublicUrl(path);
  return publicUrl;
};

