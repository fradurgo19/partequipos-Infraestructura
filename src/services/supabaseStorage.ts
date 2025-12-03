import { supabase } from '../lib/supabase';

/**
 * Upload file to Supabase Storage
 */
export const uploadFile = async (
  bucket: string,
  file: File,
  path: string
): Promise<{ url: string; path: string } | null> => {
  try {
    const fileExt = file.name.split('.').pop();
    const fileName = `${path}/${Date.now()}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, file, {
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
  path: string
): Promise<string[]> => {
  const uploadPromises = files.map((file) => uploadFile(bucket, file, path));
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

