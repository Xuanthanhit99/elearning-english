import { randomBytes, createHash } from 'crypto';

/**
 * Shared token generation for password-reset / email-verification links.
 * Only the SHA-256 hash is ever persisted (`hashToken`) — the raw token
 * exists only in the emailed URL, never at rest, so a DB read alone (backup
 * leak, read-replica compromise, etc.) can never be used to complete a
 * reset/verification.
 */
export function generateRawToken(): string {
  return randomBytes(32).toString('hex');
}

export function hashToken(rawToken: string): string {
  return createHash('sha256').update(rawToken).digest('hex');
}
