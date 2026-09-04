const crypto = require('crypto');

// Alfabeto seguro (sin 0, O, I, l para evitar confusión) - idéntico al original .NET
const ALPHABET = '123456789ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz';

function generateShortUUID() {
  const bytes = crypto.randomBytes(12);
  let result = '';
  for (let i = 0; i < 12; i += 1) {
    result += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return result;
}

function generateUserId() {
  return `usr_${generateShortUUID()}`;
}

function generateRoleId() {
  return `rol_${generateShortUUID()}`;
}

function isValidUserId(id) {
  if (!id) return false;
  if (id.length !== 16 || !id.startsWith('usr_')) return false;
  const idPart = id.slice(4);
  return [...idPart].every((c) => ALPHABET.includes(c));
}

module.exports = {
  generateShortUUID,
  generateUserId,
  generateRoleId,
  isValidUserId,
};
