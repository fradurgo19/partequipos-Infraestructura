import express from 'express';
import { authenticatePagosToken } from '../../middleware/pagosAuth.js';
import { pagosUploadMiddleware } from '../../pagos/vercelMulter.js';
import { uploadPagosInvoiceDocument } from '../../pagos/handlers/uploadInvoiceDocument.js';

const router = express.Router();

router.post('/', authenticatePagosToken, pagosUploadMiddleware, async (req, res) => {
  try {
    const payload = await uploadPagosInvoiceDocument(req.pagosUser, req.file);
    res.json(payload);
  } catch (error) {
    console.error('Error al subir factura:', error);
    const status = error?.statusCode || 500;
    res.status(status).json({ error: error.message || 'Error al subir archivo' });
  }
});

export default router;
