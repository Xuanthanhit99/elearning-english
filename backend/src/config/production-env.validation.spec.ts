import { validateProductionEnvironment } from './production-env.validation';

describe('validateProductionEnvironment', () => {
  const REQUIRED_BASE = {
    NODE_ENV: 'production',
    DATABASE_URL: 'postgresql://user:pass@db.internal:5432/app',
    JWT_ACCESS_SECRET: 'access-secret-value',
    JWT_REFRESH_SECRET: 'refresh-secret-value',
    FRONTEND_URL: 'https://beaconvie.com',
    GEMINI_API_KEY: 'gemini-key-value',
    AUTH_COOKIE_DOMAIN: '.beaconvie.com',
    REDIS_URL: 'redis://redis.internal:6379',
  };

  const REQUIRED_R2 = {
    R2_ACCOUNT_ID: 'account-id-value',
    R2_ACCESS_KEY_ID: 'access-key-value',
    R2_SECRET_ACCESS_KEY: 'secret-key-value',
    R2_BUCKET_NAME: 'beaconvie-documents',
  };

  const ENV_KEYS = [
    ...Object.keys(REQUIRED_BASE),
    ...Object.keys(REQUIRED_R2),
    'DOCUMENTS_ENABLED',
    'DOCUMENT_STORAGE_PROVIDER',
    'CORS_ORIGINS',
  ];

  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    originalEnv = { ...process.env };
    for (const key of ENV_KEYS) delete process.env[key];
  });

  afterEach(() => {
    for (const key of ENV_KEYS) delete process.env[key];
    Object.assign(process.env, originalEnv);
  });

  it('production + r2 + full env → passes', () => {
    Object.assign(process.env, REQUIRED_BASE, REQUIRED_R2);
    process.env.DOCUMENT_STORAGE_PROVIDER = 'r2';
    expect(() => validateProductionEnvironment()).not.toThrow();
  });

  it('production + DOCUMENT_STORAGE_PROVIDER=local → throws (never allowed, even with everything else set)', () => {
    Object.assign(process.env, REQUIRED_BASE, REQUIRED_R2);
    process.env.DOCUMENT_STORAGE_PROVIDER = 'local';
    expect(() => validateProductionEnvironment()).toThrow(/DOCUMENT_STORAGE_PROVIDER=local is not allowed/);
  });

  it('production + r2 + missing R2 credentials → throws', () => {
    Object.assign(process.env, REQUIRED_BASE);
    process.env.DOCUMENT_STORAGE_PROVIDER = 'r2';
    // R2_* deliberately left unset.
    expect(() => validateProductionEnvironment()).toThrow(/R2_ACCOUNT_ID is required/);
  });

  it('development + local → passes (validation is a no-op outside production)', () => {
    process.env.NODE_ENV = 'development';
    process.env.DOCUMENT_STORAGE_PROVIDER = 'local';
    expect(() => validateProductionEnvironment()).not.toThrow();
  });

  it('production + DOCUMENTS_ENABLED=false + local → passes (feature disabled, no storage requirement at all)', () => {
    Object.assign(process.env, REQUIRED_BASE);
    process.env.DOCUMENTS_ENABLED = 'false';
    process.env.DOCUMENT_STORAGE_PROVIDER = 'local';
    expect(() => validateProductionEnvironment()).not.toThrow();
  });

  it('production + r2 + partial R2 credentials → throws naming only the missing ones', () => {
    Object.assign(process.env, REQUIRED_BASE);
    process.env.DOCUMENT_STORAGE_PROVIDER = 'r2';
    process.env.R2_ACCOUNT_ID = 'account-id-value';
    process.env.R2_BUCKET_NAME = 'beaconvie-documents';
    // R2_ACCESS_KEY_ID / R2_SECRET_ACCESS_KEY left unset.
    expect(() => validateProductionEnvironment()).toThrow(/R2_ACCESS_KEY_ID is required/);
    expect(() => validateProductionEnvironment()).toThrow(/R2_SECRET_ACCESS_KEY is required/);
  });
});
