const argon2 = require('argon2');

/**
 * Hashing de contraseñas con Argon2id.
 * Los parámetros coinciden exactamente con PasswordHashService.cs (.NET):
 *   t=2 (iterations), m=102400 KB (memoria), p=8 (paralelismo)
 * `argon2` (node-argon2) produce/verifica directamente el formato estándar
 * "$argon2id$v=19$m=...,t=...,p=...$salt$hash", por lo que los hashes generados
 * por cualquiera de las dos implementaciones son intercambiables.
 */
const ARGON2_OPTIONS = {
  type: argon2.argon2id,
  memoryCost: 102400, // KB
  timeCost: 2,
  parallelism: 8,
  hashLength: 32,
  saltLength: 16,
};

async function hashPassword(password) {
  return argon2.hash(password, ARGON2_OPTIONS);
}

/**
 * Verifica una contraseña. Soporta:
 *  - Formato estándar Argon2 ($argon2id$...), generado por Node o por .NET.
 *  - Formato "legacy" heredado (Base64 simple: salt(16) + hash(32) con los
 *    mismos parámetros fijos), igual que VerifyLegacyFormat en el original.
 */
async function verifyPassword(password, hashedPassword) {
  try {
    if (hashedPassword.startsWith('$argon2id$')) {
      return await argon2.verify(hashedPassword, password);
    }
    return await verifyLegacyFormat(password, hashedPassword);
  } catch (err) {
    return false;
  }
}

async function verifyLegacyFormat(password, hashedPassword) {
  const hashBytes = Buffer.from(hashedPassword, 'base64');
  const salt = hashBytes.subarray(0, 16);
  const expectedHash = hashBytes.subarray(16, 16 + 32);

  const computedHash = await argon2.hash(password, {
    ...ARGON2_OPTIONS,
    salt,
    raw: true,
  });

  return Buffer.compare(expectedHash, computedHash) === 0;
}

module.exports = { hashPassword, verifyPassword };
