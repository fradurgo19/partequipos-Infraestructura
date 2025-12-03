import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import { supabase } from '../index.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

// Upload file to Supabase Storage
router.post('/file', authenticateToken, upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file provided' });
    }

    const { bucket = 'general', folder = 'uploads' } = req.body;
    const fileExt = req.file.originalname.split('.').pop();
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { data, error } = await supabase.storage.from(bucket).upload(fileName, req.file.buffer, {
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
router.post('/image/watermark', authenticateToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No image provided' });
    }

    const { bucket = 'images', folder = 'watermarked' } = req.body;

    // Create watermark with logo and date
    const watermark = await sharp({
      create: {
        width: 400,
        height: 100,
        channels: 4,
        background: { r: 207, g: 27, b: 34, alpha: 0.8 }, // Company red with transparency
      },
    })
      .composite([
        {
          input: Buffer.from(
            `<svg width="400" height="100">
              <text x="200" y="50" font-family="Arial" font-size="20" fill="white" text-anchor="middle" font-weight="bold">MAINTENANCE SYSTEM</text>
              <text x="200" y="75" font-family="Arial" font-size="14" fill="white" text-anchor="middle">${new Date().toLocaleDateString('es-ES')}</text>
            </svg>`
          ),
        },
      ])
      .png()
      .toBuffer();

    // Apply watermark to image
    const watermarkedImage = await sharp(req.file.buffer)
      .composite([
        {
          input: watermark,
          gravity: 'southeast',
        },
      ])
      .jpeg({ quality: 90 })
      .toBuffer();

    const fileExt = 'jpg';
    const fileName = `${folder}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(fileName, watermarkedImage, {
        contentType: 'image/jpeg',
        upsert: false,
      });

    if (error) {
      console.error('Watermark upload error:', error);
      return res.status(500).json({ error: 'Failed to upload watermarked image' });
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
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;

