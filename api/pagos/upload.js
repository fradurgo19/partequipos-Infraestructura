import { resolvePagosUserFromRequest } from '../../server/src/pagos/vercelAuth.js';
import { pagosUploadMiddleware, runMiddleware } from '../../server/src/pagos/vercelMulter.js';
import { uploadPagosInvoiceDocument } from '../../server/src/pagos/handlers/uploadInvoiceDocument.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST' });
  }

  try {
    const pagosUser = await resolvePagosUserFromRequest(req);
    await runMiddleware(req, res, pagosUploadMiddleware);
    const payload = await uploadPagosInvoiceDocument(pagosUser, req.file);

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(payload);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error al subir archivo';
    const isValidationError =
      message.includes('permitido') || message.includes('No se proporcionó ningún archivo');
    const status = error?.statusCode || (isValidationError ? 400 : 500);

    return res.status(status).json({ error: message });
  }
}
