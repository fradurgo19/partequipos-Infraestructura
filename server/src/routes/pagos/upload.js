import express from 'express';
import multer from 'multer';
import { authenticatePagosToken } from '../../middleware/pagosAuth.js';
import { uploadInvoiceFile } from '../../pagos/storage.js';

const router = express.Router();

const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (allowedTypes.has(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Tipo de archivo no permitido. Solo PDF, JPG y PNG.'));
    }
  },
});

router.post('/', authenticatePagosToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No se proporcionó ningún archivo' });
    }

    const result = await uploadInvoiceFile(req.file, req.pagosUser.id);
    res.json({
      url: result.url,
      filename: result.filename,
      size: req.file.size,
      path: result.path,
    });
  } catch (error) {
    console.error('Error al subir factura:', error);
    res.status(500).json({ error: 'Error al subir archivo' });
  }
});

export default router;
