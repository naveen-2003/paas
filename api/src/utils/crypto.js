const crypto = require('crypto');

const KEY = Buffer.from(process.env.ENCRYPTION_KEY || 'a'.repeat(64), 'hex');
const ALGO = 'aes-256-gcm';

function encrypt(text) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGO, KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${tag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(text) {
  // console.log(text);
  if (!text || typeof text !== 'string') {
    throw new Error('Invalid encrypted text');
  }

  const parts = text.split(':');
  // console.log(parts);
  if (parts.length !== 3) {
    throw new Error('Malformed encrypted payload');
  }

  const [ivHex, tagHex, encHex] = parts;

  if (!ivHex || !tagHex || !encHex) {
    throw new Error('Missing encryption components');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const tag = Buffer.from(tagHex, 'hex');
  const encrypted = Buffer.from(encHex, 'hex');

  if (iv.length !== 12 && iv.length !== 16) {
    throw new Error(`Invalid IV length: ${iv.length}`);
  }

  const decipher = crypto.createDecipheriv(ALGO, KEY, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([
    decipher.update(encrypted),
    decipher.final()
  ]).toString('utf8');
}

module.exports = { encrypt, decrypt };