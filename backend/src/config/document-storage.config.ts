// Single source of truth for Document Library storage/env configuration —
// mirrors the convention in redis.config.ts / static-assets.config.ts
// (one getter per concern, sane defaults, never throw outside production
// validation).

export type DocumentStorageProvider = 'r2' | 'local';

export function getDocumentStorageProvider(): DocumentStorageProvider {
  const configured = process.env.DOCUMENT_STORAGE_PROVIDER?.trim().toLowerCase();
  return configured === 'local' ? 'local' : 'r2';
}

export function getR2Config() {
  return {
    accountId: process.env.R2_ACCOUNT_ID ?? '',
    accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
    bucket: process.env.R2_BUCKET_NAME ?? '',
    endpoint:
      process.env.R2_ENDPOINT ||
      (process.env.R2_ACCOUNT_ID
        ? `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`
        : ''),
    region: process.env.R2_REGION || 'auto',
  };
}

export function getDocumentSignedUrlTtlSeconds(): number {
  const raw = Number(process.env.DOCUMENT_SIGNED_URL_TTL_SECONDS);
  return Number.isFinite(raw) && raw > 0 ? raw : 300;
}

export function getDocumentLocalStorageDir(): string {
  return process.env.DOCUMENT_LOCAL_STORAGE_DIR?.trim() || 'private-storage/documents';
}

export function getDocumentMaxFileSizeMb(): number {
  const raw = Number(process.env.DOCUMENT_MAX_FILE_SIZE_MB);
  return Number.isFinite(raw) && raw > 0 ? raw : 25;
}

export function getDocumentMaxPageCount(): number {
  const raw = Number(process.env.DOCUMENT_MAX_PAGE_COUNT);
  return Number.isFinite(raw) && raw > 0 ? raw : 300;
}

export function getDocumentMaxExtractedCharacters(): number {
  const raw = Number(process.env.DOCUMENT_MAX_EXTRACTED_CHARACTERS);
  return Number.isFinite(raw) && raw > 0 ? raw : 500_000;
}

export function getDocumentAllowedMimeTypes(): string[] {
  const raw = process.env.DOCUMENT_ALLOWED_MIME_TYPES?.trim();
  if (!raw) {
    return [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'text/plain',
    ];
  }
  return raw.split(',').map((v) => v.trim()).filter(Boolean);
}

export function getDocumentUserDailyUploadLimit(): number {
  const raw = Number(process.env.DOCUMENT_USER_DAILY_UPLOAD_LIMIT);
  return Number.isFinite(raw) && raw >= 0 ? raw : 3;
}

export function getDocumentUserMaxActiveUploads(): number {
  const raw = Number(process.env.DOCUMENT_USER_MAX_ACTIVE_UPLOADS);
  return Number.isFinite(raw) && raw >= 0 ? raw : 2;
}

export function isDocumentAutoPublishEnabled(): boolean {
  return process.env.DOCUMENT_AUTO_PUBLISH_ENABLED?.trim().toLowerCase() === 'true';
}

export function getDocumentAutoApproveConfidence(): number {
  const raw = Number(process.env.DOCUMENT_AUTO_APPROVE_CONFIDENCE);
  return Number.isFinite(raw) && raw > 0 && raw <= 1 ? raw : 0.95;
}

export function getDocumentMinQualityScore(): number {
  const raw = Number(process.env.DOCUMENT_MIN_QUALITY_SCORE);
  return Number.isFinite(raw) && raw >= 0 ? raw : 80;
}

export function getDocumentGenerationModel(): string | undefined {
  return process.env.DOCUMENT_GENERATION_MODEL?.trim() || undefined;
}

export function getDocumentModerationModel(): string | undefined {
  return process.env.DOCUMENT_MODERATION_MODEL?.trim() || undefined;
}

export function getDocumentGenerationMaxRepairRounds(): number {
  const raw = Number(process.env.DOCUMENT_GENERATION_MAX_REPAIR_ROUNDS);
  return Number.isFinite(raw) && raw >= 0 ? raw : 2;
}

export function getDocumentGenerationJobAttempts(): number {
  const raw = Number(process.env.DOCUMENT_GENERATION_JOB_ATTEMPTS);
  return Number.isFinite(raw) && raw > 0 ? raw : 3;
}

export function getDocumentGenerationJobTimeoutMs(): number {
  const raw = Number(process.env.DOCUMENT_GENERATION_JOB_TIMEOUT_MS);
  return Number.isFinite(raw) && raw > 0 ? raw : 300_000;
}

export function getDocumentTempRetentionHours(): number {
  const raw = Number(process.env.DOCUMENT_TEMP_RETENTION_HOURS);
  return Number.isFinite(raw) && raw > 0 ? raw : 24;
}

export function getDocumentFailedRetentionDays(): number {
  const raw = Number(process.env.DOCUMENT_FAILED_RETENTION_DAYS);
  return Number.isFinite(raw) && raw > 0 ? raw : 7;
}

export function getDocumentArchivedVersionRetentionDays(): number {
  const raw = Number(process.env.DOCUMENT_ARCHIVED_VERSION_RETENTION_DAYS);
  return Number.isFinite(raw) && raw > 0 ? raw : 90;
}

export function isDocumentsEnabled(): boolean {
  const raw = process.env.DOCUMENTS_ENABLED?.trim().toLowerCase();
  return raw !== 'false';
}
