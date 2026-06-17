import { supabase } from '../lib/supabaseClient.js';

export const uploadInvoiceFile = async (file, userId) => {
  const fileExt = file.originalname.split('.').pop();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${fileExt}`;
  const filePath = `${userId}/${fileName}`;

  const { error } = await supabase.storage.from('invoices').upload(filePath, file.buffer, {
    contentType: file.mimetype,
    upsert: false,
  });

  if (error) {
    throw error;
  }

  const { data: publicUrl } = supabase.storage.from('invoices').getPublicUrl(filePath);

  return {
    url: publicUrl.publicUrl,
    filename: file.originalname,
    path: filePath,
  };
};

export const fetchConsumptionsByBillIds = async (billIds) => {
  if (!billIds?.length) return [];
  const { data, error } = await supabase.from('bill_consumptions').select('*').in('bill_id', billIds);
  if (error) throw error;
  return data || [];
};
