import { v2 as cloudinary } from 'cloudinary';
import { config } from '../../config/env.js';

cloudinary.config({
  cloud_name: config.CLOUDINARY_CLOUD_NAME,
  api_key: config.CLOUDINARY_API_KEY,
  api_secret: config.CLOUDINARY_API_SECRET,
});

// Contract: upload(buffer, {filename, mimetype}) => { url, publicId }; remove(publicId) => void
export const cloudinaryAdapter = {
  name: 'cloudinary',

  upload(buffer) {
    return new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        { folder: 'eventforge/events' },
        (err, result) => {
          if (err) return reject(err);
          resolve({ url: result.secure_url, publicId: result.public_id });
        }
      );
      stream.end(buffer);
    });
  },

  async remove(publicId) {
    await cloudinary.uploader.destroy(publicId);
  },
};
