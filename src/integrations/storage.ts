import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { v2 as cloudinary } from 'cloudinary';
import { config } from '../config/index.js';

// Ensure uploads directory exists
if (!fs.existsSync(config.uploads.dir)) {
  fs.mkdirSync(config.uploads.dir, { recursive: true });
}

// Configure Cloudinary if credentials provided
if (config.cloudinary.cloudName && config.cloudinary.apiKey && config.cloudinary.apiSecret) {
  cloudinary.config({
    cloud_name: config.cloudinary.cloudName,
    api_key: config.cloudinary.apiKey,
    api_secret: config.cloudinary.apiSecret
  });
}

// Multer disk storage for local handling
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, config.uploads.dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `ruuted-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP image files are allowed.'));
  }
};

export const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter
});

export async function processUploadedFile(
  file: Express.Multer.File,
  reqHost: string
): Promise<string> {
  // If Cloudinary is configured, upload to Cloudinary CDN
  if (config.cloudinary.cloudName && config.cloudinary.apiKey) {
    try {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'ruuted/produce'
      });
      // Remove local temp file
      fs.unlinkSync(file.path);
      return result.secure_url;
    } catch (err) {
      console.warn('[Storage] Cloudinary upload failed, falling back to local file:', err);
    }
  }

  // Otherwise return local URL served statically
  const filename = path.basename(file.path);
  const protocol = reqHost.includes('localhost') ? 'http' : 'https';
  return `${protocol}://${reqHost}/uploads/${filename}`;
}
