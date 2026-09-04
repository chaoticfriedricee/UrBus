const multer = require('multer');

/**
 * Configuración de subida de archivos en memoria (equivalente a IFormFile en .NET,
 * usado luego por FileValidator + CloudinaryService).
 * La validación real de tipo/tamaño se hace en src/utils/file-validator.js
 * para mantener el mismo mensaje de error que el proyecto .NET.
 */
const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB, igual que [RequestSizeLimit(10 * 1024 * 1024)] en AuthController
  },
});

module.exports = upload;
