import { randomBytes } from 'crypto';

const devSecretCache = new Map<string, string>();

function getSecret(name: string) {
  const value = process.env[name]?.trim();

  if (value) {
    return value;
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error(`${name} is required in production.`);
  }

  if (!devSecretCache.has(name)) {
    devSecretCache.set(name, randomBytes(48).toString('hex'));
  }

  return devSecretCache.get(name) as string;
}

export function getJwtAccessSecret() {
  return getSecret('JWT_ACCESS_SECRET');
}

export function getJwtRefreshSecret() {
  return getSecret('JWT_REFRESH_SECRET');
}

export function getJwtModuleSecret() {
  return process.env.JWT_SECRET?.trim() || getJwtAccessSecret();
}
