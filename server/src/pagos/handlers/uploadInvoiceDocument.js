import { uploadInvoiceFile } from '../storage.js';

export const uploadPagosInvoiceDocument = async (pagosUser, file) => {
  if (!file) {
    const error = new Error('No se proporcionó ningún archivo');
    error.statusCode = 400;
    throw error;
  }

  const result = await uploadInvoiceFile(file, pagosUser.id);

  return {
    url: result.url,
    filename: result.filename,
    size: file.size,
    path: result.path,
  };
};
