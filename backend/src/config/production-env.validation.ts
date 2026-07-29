const REQUIRED_PRODUCTION_ENV = [
  'DATABASE_URL',
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'FRONTEND_URL',
  'GEMINI_API_KEY',
  'AUTH_COOKIE_DOMAIN',
];

// Document Library storage: only required when documents are enabled and
// the provider is R2 (the production default — see
// document-storage.config.ts). Skipped entirely when
// DOCUMENTS_ENABLED=false or DOCUMENT_STORAGE_PROVIDER=local, so this
// never blocks deploys of environments that haven't turned the feature on.
const REQUIRED_R2_ENV = [
  'R2_ACCOUNT_ID',
  'R2_ACCESS_KEY_ID',
  'R2_SECRET_ACCESS_KEY',
  'R2_BUCKET_NAME',
];

const PLACEHOLDER_PATTERNS = [
  /replace-with/i,
  /example\.com/i,
  /changeme/i,
  /localhost/i,
  /127\.0\.0\.1/i,
];

export function validateProductionEnvironment() {
  if (process.env.NODE_ENV !== 'production') {
    return;
  }

  const missing = REQUIRED_PRODUCTION_ENV.filter(
    (name) => !String(process.env[name] ?? '').trim(),
  );

  const insecure = REQUIRED_PRODUCTION_ENV.filter((name) => {
    const value = String(process.env[name] ?? '');
    return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(value));
  });

  const corsValues = [process.env.FRONTEND_URL, process.env.CORS_ORIGINS]
    .filter(Boolean)
    .flatMap((value) => String(value).split(','))
    .map((origin) => origin.trim())
    .filter(Boolean);

  const nonHttpsOrigins = corsValues.filter(
    (origin) => !origin.startsWith('https://'),
  );

  const cookieDomain = String(process.env.AUTH_COOKIE_DOMAIN ?? '').trim();
  const invalidCookieDomain =
    cookieDomain && !cookieDomain.startsWith('.') && cookieDomain.includes('.');

  const duplicatedSecrets =
    process.env.JWT_ACCESS_SECRET &&
    process.env.JWT_REFRESH_SECRET &&
    process.env.JWT_ACCESS_SECRET === process.env.JWT_REFRESH_SECRET;

  const hasRedisConfig =
    Boolean(process.env.REDIS_URL?.trim()) ||
    Boolean(process.env.REDIS_HOST?.trim());

  const documentsEnabled = process.env.DOCUMENTS_ENABLED?.trim().toLowerCase() !== 'false';
  const documentStorageProvider = (
    process.env.DOCUMENT_STORAGE_PROVIDER?.trim().toLowerCase() || 'r2'
  );
  const missingR2 =
    documentsEnabled && documentStorageProvider !== 'local'
      ? REQUIRED_R2_ENV.filter((name) => !String(process.env[name] ?? '').trim())
      : [];

  const problems = [
    ...missing.map((name) => `${name} is required`),
    ...insecure.map((name) => `${name} still looks like a placeholder`),
    ...nonHttpsOrigins.map((origin) => `${origin} must use https://`),
    ...(!hasRedisConfig
      ? ['REDIS_URL or REDIS_HOST is required in production']
      : []),
    ...(invalidCookieDomain
      ? ['AUTH_COOKIE_DOMAIN should be a parent domain such as .beaconvie.com']
      : []),
    ...(duplicatedSecrets
      ? ['JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be different']
      : []),
    ...missingR2.map(
      (name) => `${name} is required (DOCUMENTS_ENABLED=true, DOCUMENT_STORAGE_PROVIDER=r2)`,
    ),
  ];

  if (problems.length > 0) {
    throw new Error(
      `Production environment validation failed: ${problems.join('; ')}`,
    );
  }
}
