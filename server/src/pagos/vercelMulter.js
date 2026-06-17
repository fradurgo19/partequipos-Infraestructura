import multer from 'multer';

const allowedTypes = new Set(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']);

export const pagosUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (allowedTypes.has(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new Error('Tipo de archivo no permitido. Solo PDF, JPG y PNG.'));
  },
}).single('file');

export const runMiddleware = (req, res, fn) =>
  new Promise((resolve, reject) => {
    fn(req, res, (result) => {
      if (result instanceof Error) {
        reject(result);
        return;
      }
      resolve(result);
    });
  });
