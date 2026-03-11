import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { supabase } from '../index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const MAX_FILE_SIZE = 4 * 1024 * 1024; // 4MB (por debajo del límite de Vercel)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
});

// Upload file to Supabase Storage
router.post('/file', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { bucket = 'general', folder = 'uploads' } = req.body;
    const fileExt = req.file.originalname.split('.').pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error } = await supabase.storage.from(bucket).upload(fileName, req.file.buffer, {
      contentType: req.file.mimetype,
      upsert: false,
    });

    if (error) {
      console.error('Upload error:', error);
      return res.status(500).json({ error: 'Failed to upload file' });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(fileName);

    res.json({
      url: publicUrl,
      path: fileName,
      bucket,
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Upload and watermark image
router.post('/image/watermark', authenticateToken, (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (err?.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ error: 'La imagen supera el tamaño máximo (4 MB)' });
    }
    if (err) return next(err);
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const { bucket = 'general', folder = 'watermarked' } = req.body || {};
    const LOGO_URL = 'https://res.cloudinary.com/dbufrzoda/image/upload/v1750457354/Captura_de_pantalla_2025-06-20_170819_wzmyli.png';

    // Download logo (con timeout para no bloquear)
    let logoBuffer;
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const logoResponse = await fetch(LOGO_URL, { signal: controller.signal });
      clearTimeout(timeoutId);
      logoBuffer = Buffer.from(await logoResponse.arrayBuffer());
    } catch (error) {
      if (error.name !== 'AbortError') console.error('Error downloading logo:', error);
      // Si falla o timeout, continuar sin logo
    }

    // Get image metadata (con fallback si width no viene)
    const image = sharp(req.file.buffer);
    const metadata = await image.metadata();
    const width = metadata.width && Number.isFinite(metadata.width) ? metadata.width : 800;
    const logoSize = Math.max(20, Math.min(120, Math.floor(width * 0.1)));

    // Create date text
    const now = new Date();
    const dateStr = now.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });

    // Create date watermark
    const dateWatermark = await sharp({
      create: {
        width: 300,
        height: 40,
        channels: 4,
        background: { r: 0, g: 0, b: 0, alpha: 0.5 },
      },
    })
      .composite([
        {
          input: Buffer.from(
            `<svg width="300" height="40">
              <text x="150" y="25" font-family="Arial" font-size="16" fill="white" text-anchor="middle" font-weight="bold">${dateStr}</text>
            </svg>`
          ),
        },
      ])
      .png()
      .toBuffer();

    // Apply watermarks to image
    const composite = [];
    
    // Add logo in top right
    if (logoBuffer) {
      const resizedLogo = await sharp(logoBuffer)
        .resize(logoSize, logoSize, { fit: 'contain' })
        .png()
        .toBuffer();
      
      composite.push({
        input: resizedLogo,
        gravity: 'northeast',
        top: 20,
        left: 20,
      });
    }

    // Add date in bottom right
    composite.push({
      input: dateWatermark,
      gravity: 'southeast',
      top: 20,
      left: 20,
    });

    const watermarkedImage = await image
      .composite(composite)
      .jpeg({ quality: 90 })
      .toBuffer();

    const fileExt = 'jpg';
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(fileName, watermarkedImage, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) {
      console.error('Watermark upload error:', error);
      const message = error.message || 'Error al subir la imagen con marca de agua';
      return res.status(500).json({ error: message });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from(bucket).getPublicUrl(fileName);

    res.json({
      url: publicUrl,
      path: fileName,
      bucket,
    });
  } catch (error) {
    console.error('Watermark error:', error);
    const message = error.message || 'Error al procesar la imagen';
    res.status(500).json({ error: message });
  }
});

export default router;

