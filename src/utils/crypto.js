const crypto = require('crypto');

const ITERATIONS = 100_000;
const KEY_LENGTH = 64;
const DIGEST    = 'sha512';

/**
 * Hash a plain-text password.
 * Returns a string in the format:  salt:hash  (both hex-encoded)
 */
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto
    .pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST)
    .toString('hex');
  return `${salt}:${hash}`;
}

/**
 * Compare a plain-text password against a stored hash string.
 * @param {string} password   - the raw password to verify
 * @param {string} storedHash - the "salt:hash" string from the DB
 */
function verifyPassword(password, storedHash) {
  const [salt, originalHash] = storedHash.split(':');
  const hash = crypto
    .pbkdf2Sync(password, salt, ITERATIONS, KEY_LENGTH, DIGEST)
    .toString('hex');
  // Constant-time comparison to prevent timing attacks
  return crypto.timingSafeEqual(
    Buffer.from(hash, 'hex'),
    Buffer.from(originalHash, 'hex')
  );
}

module.exports = { hashPassword, verifyPassword };

