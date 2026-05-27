import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 15 * 1024 * 1024 } });

export function uploadToCloudinary(buffer, options = {}) {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: 'DeliveryOS/packages',
        allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'heic'],
        transformation: [{ width: 1200, height: 1200, crop: 'limit', quality: 'auto' }],
        ...options,
      },
      (err, result) => err ? reject(err) : resolve(result)
    );
    stream.end(buffer);
  });
}

export async function deletePhoto(publicId) {
  if (!publicId) return;
  try { await cloudinary.uploader.destroy(publicId); } catch {}
}
