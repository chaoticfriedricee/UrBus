const { v2: cloudinary } = require('cloudinary');
const env = require('../../configs/env.config');

cloudinary.config({
  cloud_name: env.cloudinary.cloudName,
  api_key: env.cloudinary.apiKey,
  api_secret: env.cloudinary.apiSecret,
});

/**
 * Sube la imagen de perfil a Cloudinary con la misma transformación
 * (400x400, crop fill, gravity face, calidad/formato automáticos)
 * usada en CloudinaryService.cs.
 * @param {Express.Multer.File} file
 * @param {string} fileName - nombre generado por file-validator.generateSecureFileName
 * @returns {Promise<string>} el fileName (public id relativo), igual que en .NET
 */
async function uploadImageAsync(file, fileName) {
  try {
    const publicId = `${env.cloudinary.folder}/${fileName}`;

    await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          public_id: publicId,
          folder: env.cloudinary.folder,
          transformation: [
            { width: 400, height: 400, crop: 'fill', gravity: 'face' },
            { quality: 'auto', fetch_format: 'auto' },
          ],
        },
        (error, result) => {
          if (error) return reject(error);
          return resolve(result);
        },
      );
      uploadStream.end(file.buffer);
    });

    return fileName;
  } catch (err) {
    throw new Error(`Error uploading the imagen to Cloudinary: ${err.message}`);
  }
}

async function deleteImageAsync(publicId) {
  try {
    const result = await cloudinary.uploader.destroy(publicId);
    return result?.result === 'ok';
  } catch (err) {
    return false;
  }
}

function getDefaultAvatarUrl() {
  const defaultPath = env.cloudinary.defaultAvatarPath || 'avatarDefault-1749508519496.png';
  if (defaultPath.includes('/')) return defaultPath.split('/').pop();
  return defaultPath;
}

function getFullImageUrl(imagePath) {
  const baseUrl = env.cloudinary.baseUrl || 'https://res.cloudinary.com/';
  const folder = env.cloudinary.folder || 'auth_ks_in6av/profiles';
  const defaultPath = env.cloudinary.defaultAvatarPath || 'avatarDefault-1749508519496.png';

  let pathToUse = imagePath || defaultPath;
  if (!pathToUse.includes('/')) pathToUse = `${folder}/${pathToUse}`;

  return `${baseUrl}${pathToUse}`;
}

module.exports = {
  uploadImageAsync,
  deleteImageAsync,
  getDefaultAvatarUrl,
  getFullImageUrl,
};
