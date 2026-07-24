import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';
import { getJwtAccessSecret } from './auth-secrets.util';

// AES-256-GCM at-rest encryption for TOTP secrets. The key is derived by
// hashing TWO_FACTOR_ENCRYPTION_KEY so any string length works and we never
// crash on a misconfigured env var length. Falls back to the JWT access
// secret (itself mandatory in production, randomly generated per-boot in
// dev via getJwtAccessSecret()) rather than a hardcoded string, so there is
// no static fallback key reachable in any environment.
function getKey(): Buffer {
  const raw = process.env.TWO_FACTOR_ENCRYPTION_KEY?.trim() || getJwtAccessSecret();
  return createHash('sha256').update(raw).digest();
}

export function encryptSecret(plainText: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getKey(), iv);
  const encrypted = Buffer.concat([
    cipher.update(plainText, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();

  return [
    iv.toString('hex'),
    authTag.toString('hex'),
    encrypted.toString('hex'),
  ].join(':');
}

export function decryptSecret(payload: string): string {
  const [ivHex, authTagHex, dataHex] = payload.split(':');
  if (!ivHex || !authTagHex || !dataHex) {
    throw new Error('Invalid encrypted secret payload');
  }

  const decipher = createDecipheriv(
    'aes-256-gcm',
    getKey(),
    Buffer.from(ivHex, 'hex'),
  );
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataHex, 'hex')),
    decipher.final(),
  ]);

  return decrypted.toString('utf8');
}

export function generateRecoveryCodes(count = 8): string[] {
  const codes: string[] = [];
  for (let i = 0; i < count; i++) {
    codes.push(randomBytes(5).toString('hex').toUpperCase());
  }
  return codes;
}
