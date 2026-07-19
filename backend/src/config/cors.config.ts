export function getAllowedOrigins() {
  const configured = [
    process.env.FRONTEND_URL,
    process.env.CORS_ORIGINS,
  ]
    .filter(Boolean)
    .flatMap((value) => String(value).split(','))
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (configured.length > 0) {
    return [...new Set(configured)];
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('FRONTEND_URL or CORS_ORIGINS is required in production.');
  }

  return ['http://localhost:5173', 'http://localhost:5174', 'http://localhost:3000'];
}
