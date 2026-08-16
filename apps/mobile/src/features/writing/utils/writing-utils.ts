export function countWritingWords(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function clampWritingScore(value?: number | null) {
  if (!Number.isFinite(value ?? NaN)) return 0;
  return Math.max(0, Math.min(100, Math.round(value ?? 0)));
}

export function normalizeStringArray(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

export function shouldPollWritingStatus(status?: string | null) {
  return status === 'QUEUED' || status === 'PROCESSING';
}

export function formatWritingTime(seconds?: number | null) {
  const safe = Math.max(0, Math.floor(seconds ?? 0));
  const minutes = Math.floor(safe / 60);
  const remain = safe % 60;
  return `${minutes}:${String(remain).padStart(2, '0')}`;
}
