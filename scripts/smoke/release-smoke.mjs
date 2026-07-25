const apiBaseUrl = normalizeBaseUrl(process.env.API_BASE_URL ?? 'http://localhost:3002');
const frontendBaseUrl = process.env.FRONTEND_BASE_URL
  ? normalizeBaseUrl(process.env.FRONTEND_BASE_URL)
  : null;

const checks = [
  {
    name: 'api health',
    url: `${apiBaseUrl}/health`,
    expectedStatus: 200,
  },
  {
    name: 'api readiness',
    url: `${apiBaseUrl}/health/ready`,
    expectedStatus: 200,
  },
];

if (frontendBaseUrl) {
  checks.push({
    name: 'frontend shell',
    url: frontendBaseUrl,
    expectedStatus: 200,
  });
}

const results = [];

for (const check of checks) {
  const startedAt = performance.now();
  try {
    const response = await fetch(check.url, {
      headers: { 'X-Request-Id': `release-smoke-${Date.now()}` },
    });
    const elapsedMs = Math.round(performance.now() - startedAt);
    const requestId = response.headers.get('x-request-id');
    results.push({
      ...check,
      status: response.status,
      elapsedMs,
      requestId,
      ok: response.status === check.expectedStatus,
    });
  } catch (error) {
    results.push({
      ...check,
      status: 0,
      elapsedMs: Math.round(performance.now() - startedAt),
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

console.table(
  results.map(({ name, url, status, elapsedMs, requestId, ok, error }) => ({
    name,
    url,
    status,
    elapsedMs,
    requestId: requestId ?? '',
    ok,
    error: error ?? '',
  })),
);

const failed = results.filter((result) => !result.ok);
if (failed.length > 0) {
  console.error(`Release smoke failed: ${failed.map((item) => item.name).join(', ')}`);
  process.exit(1);
}

console.log('Release smoke passed.');

function normalizeBaseUrl(value) {
  return value.replace(/\/+$/, '');
}
