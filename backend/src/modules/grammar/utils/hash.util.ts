// src/grammar-job/utils/hash.util.ts

import crypto from 'crypto';

export function normalizeText(text: string) {
  return text
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[^\w\s']/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function createSentenceHash(sentence: string) {
  return crypto
    .createHash('sha256')
    .update(normalizeText(sentence))
    .digest('hex');
}