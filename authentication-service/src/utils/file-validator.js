const path = require('path');
const crypto = require('crypto');

const ALLOWED_IMAGE_EXTENSIONS = ['.jpg', '.jpeg', '.png', '.webp'];
const ALLOWED_CONTENT_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB

/**
 * Valida un archivo de imagen de perfil (multer file object).
 * @returns {{ isValid: boolean, errorMessage: string|null }}
 */
function validateImage(file) {
  if (!file || file.size === 0) {
    return { isValid: false, errorMessage: 'File is required' };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return {
      isValid: false,
      errorMessage: `File size cannot exceed ${MAX_FILE_SIZE_BYTES / (1024 * 1024)}MB`,
    };
  }

  const extension = path.extname(file.originalname).toLowerCase();
  if (!ALLOWED_IMAGE_EXTENSIONS.includes(extension)) {
    return {
      isValid: false,
      errorMessage: `Only the following file types are allowed: ${ALLOWED_IMAGE_EXTENSIONS.join(', ')}`,
    };
  }

  const contentType = (file.mimetype || '').toLowerCase();
  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
    return { isValid: false, errorMessage: 'Invalid file type' };
  }

  return { isValid: true, errorMessage: null };
}

function generateSecureFileName(originalFileName) {
  const extension = path.extname(originalFileName).toLowerCase();
  const uniqueId = crypto.randomBytes(8).toString('hex').slice(0, 12); // 12 caracteres únicos
  return `profile-${uniqueId}${extension}`;
}

module.exports = { validateImage, generateSecureFileName, MAX_FILE_SIZE_BYTES };
