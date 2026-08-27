import multer from 'multer';
import { v2 as cloudinary } from 'cloudinary';
import { CloudinaryStorage } from 'multer-storage-cloudinary';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: async (req, file) => {
    let folder = 'gastos/screenshots';
    let resource_type = 'image';

    if (file.fieldname === 'icon') {
      folder = 'gastos/icons';
    } else if (file.fieldname === 'banner') {
      folder = 'gastos/banners';
    } else if (file.fieldname === 'apk') {
      folder = 'gastos/apks';
      resource_type = 'raw';
    } else if (file.fieldname === 'video') {
      folder = 'gastos/videos';
      resource_type = 'video';
    }

    return {
      folder,
      resource_type,
      public_id: `${file.fieldname}-${Date.now()}-${Math.round(Math.random() * 1e9)}`,
    };
  },
});

const fileFilter = (req, file, cb) => {
  const ext = file.originalname.substring(file.originalname.lastIndexOf('.')).toLowerCase();

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
    fileSize: 150 * 1024 * 1024,
  },
});

export const appSubmissionUpload = upload.fields([
  { name: 'icon', maxCount: 1 },
  { name: 'banner', maxCount: 1 },
  { name: 'screenshots', maxCount: 8 },
  { name: 'video', maxCount: 1 },
  { name: 'apk', maxCount: 1 },
]);

export const versionUpload = upload.single('apk');
export { cloudinary };
