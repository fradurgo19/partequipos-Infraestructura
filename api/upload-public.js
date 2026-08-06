import { runMiddleware, publicUploadMiddleware } from '../server/src/pagos/vercelMulter.js';
import { uploadPublicStorageFile } from '../server/src/services/publicStorageUpload.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Use POST' });
  }

  try {
    await runMiddleware(req, res, publicUploadMiddleware);

    const bucket = req.body?.bucket || 'general';
    const folder = req.body?.folder || 'public-internal-requests';
    const payload = await uploadPublicStorageFile(req.file, bucket, folder);

    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).json(payload);
  } catch (error) {
    const status = error?.statusCode || 500;
    console.error('Public upload handler error:', error);
    return res.status(status).json({
      error: error instanceof Error ? error.message : 'Error al subir el archivo',
    });
  }
}
