const crypto = require('crypto');

function generateSecureToken(length = 32) {
  return crypto
    .randomBytes(length)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function generateEmailVerificationToken() {
  return generateSecureToken(32); // 32 bytes = 256 bits
}

function generatePasswordResetToken() {
  return generateSecureToken(32);
}

module.exports = {
  generateSecureToken,
  generateEmailVerificationToken,
  generatePasswordResetToken,
};
