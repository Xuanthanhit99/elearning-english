const targetUrl = process.env.LOAD_TARGET_URL ?? 'http://localhost:3002/health';
const durationSeconds = positiveInt(process.env.LOAD_DURATION_SECONDS, 30);
const concurrency = positiveInt(process.env.LOAD_CONCURRENCY, 10);
const maxErrorRate = Number(process.env.MAX_ERROR_RATE ?? 0.01);
const maxP95Ms = Number(process.env.MAX_P95_MS ?? 750);

const deadline = Date.now() + durationSeconds * 1000;
const latencies = [];
let total = 0;
let failed = 0;

await Promise.all(
  Array.from({ length: concurrency }, async (_, workerId) => {
    while (Date.now() < deadline) {
      const startedAt = performance.now();
      try {
        const response = await fetch(targetUrl, {
          headers: { 'X-Request-Id': `baseline-load-${workerId}-${total}` },
        });
        if (!response.ok) {
          failed += 1;
        }
      } catch {
        failed += 1;
      } finally {
        latencies.push(performance.now() - startedAt);
        total += 1;
      }
    }
  }),
);

latencies.sort((a, b) => a - b);
const p95 = percentile(latencies, 0.95);
const errorRate = total === 0 ? 1 : failed / total;
const requestsPerSecond = total / durationSeconds;

const summary = {
  targetUrl,
  durationSeconds,
  concurrency,
  total,
  failed,
  errorRate: Number(errorRate.toFixed(4)),
  p95Ms: Math.round(p95),
  requestsPerSecond: Number(requestsPerSecond.toFixed(2)),
  maxErrorRate,
  maxP95Ms,
};

console.table([summary]);

if (errorRate > maxErrorRate || p95 > maxP95Ms) {
  console.error('Baseline load check failed release thresholds.');
  process.exit(1);
}

console.log('Baseline load check passed.');

function percentile(values, fraction) {
  if (values.length === 0) return Number.POSITIVE_INFINITY;
  const index = Math.ceil(values.length * fraction) - 1;
  return values[Math.max(0, Math.min(index, values.length - 1))];
}

function positiveInt(value, fallback) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
}
