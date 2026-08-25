import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseUploadDir = path.resolve(__dirname, '..', 'uploads');

// Ensure base subdirectories exist
['icons', 'banners', 'screenshots', 'videos', 'apks'].forEach(sub => {
  const dir = path.join(baseUploadDir, sub);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Configure disk storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let subfolder = 'screenshots';
    if (file.fieldname === 'icon') subfolder = 'icons';
    else if (file.fieldname === 'banner') subfolder = 'banners';
    else if (file.fieldname === 'apk') subfolder = 'apks';
    else if (file.fieldname === 'video') subfolder = 'videos';

    const uploadPath = path.join(baseUploadDir, subfolder);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
  },
});

// File filter validation
const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();

  if (file.fieldname === 'icon' || file.fieldname === 'banner' || file.fieldname === 'screenshots') {
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(ext)) {
      return cb(new Error(`Invalid image type for ${file.fieldname}. Allowed: JPG, PNG, WEBP`));
    }
  } else if (file.fieldname === 'apk') {
    if (ext !== '.apk') {
      return cb(new Error('Invalid app package. File must have .apk extension.'));
    }
  } else if (file.fieldname === 'video') {
    if (!['.mp4', '.webm', '.mov'].includes(ext)) {
      return cb(new Error('Invalid video type. Allowed: MP4, WEBM, MOV'));
    }
  }
  cb(null, true);
};

export const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 150 * 1024 * 1024, // Max 150MB for APKs / Videos
  },
});

// Predefined upload configurations
export const appSubmissionUpload = upload.fields([
  { name: 'icon', maxCount: 1 },
  { name: 'banner', maxCount: 1 },
  { name: 'screenshots', maxCount: 8 },
  { name: 'video', maxCount: 1 },
  { name: 'apk', maxCount: 1 },
]);

export const versionUpload = upload.single('apk');
