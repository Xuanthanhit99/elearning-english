import {
  CommunityDocumentModerationResult,
  DocumentChunkModerationResult,
  DocumentRiskLevelValue,
} from './document-moderation.types';

// Manual structural validators for untrusted Gemini JSON output — this
// codebase has no zod/ajv dependency (see GeminiService.extractJson),
// so every field is checked by hand and the whole payload is rejected
// (never partially trusted) if anything is malformed. Callers must treat
// a validation failure as "send to manual admin review", never as
// "assume safe".

const RISK_LEVELS: DocumentRiskLevelValue[] = ['LOW', 'MEDIUM', 'HIGH'];
const DECISIONS = ['APPROVE', 'REVIEW', 'REJECT'];

function isRisk(value: unknown): value is DocumentRiskLevelValue {
  return (
    typeof value === 'string' &&
    RISK_LEVELS.includes(value as DocumentRiskLevelValue)
  );
}

function clampScore(value: unknown, fallback = 0): number {
  const n = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(0, Math.min(100, n));
}

function toStringArray(value: unknown, max = 20): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((v): v is string => typeof v === 'string')
    .map((v) => v.slice(0, 500))
    .slice(0, max);
}

function toOptionalString(value: unknown, max = 500): string | undefined {
  return typeof value === 'string' && value.trim()
    ? value.slice(0, max)
    : undefined;
}

export class DocumentModerationValidationError extends Error {}

export function validateChunkModerationResult(
  raw: unknown,
): DocumentChunkModerationResult {
  if (!raw || typeof raw !== 'object') {
    throw new DocumentModerationValidationError(
      'Chunk moderation result is not an object',
    );
  }
  const r = raw as Record<string, unknown>;

  if (
    !isRisk(r.unsafeContentRisk) ||
    !isRisk(r.personalDataRisk) ||
    !isRisk(r.copyrightRisk) ||
    !isRisk(r.spamRisk)
  ) {
    throw new DocumentModerationValidationError(
      'Chunk moderation risk fields invalid',
    );
  }

  return {
    hasPolicyViolation: Boolean(r.hasPolicyViolation),
    unsafeContentRisk: r.unsafeContentRisk,
    personalDataRisk: r.personalDataRisk,
    copyrightRisk: r.copyrightRisk,
    spamRisk: r.spamRisk,
    promptInjectionDetected: Boolean(r.promptInjectionDetected),
    notes: toStringArray(r.notes, 10),
  };
}

export function validateFinalModerationResult(
  raw: unknown,
): CommunityDocumentModerationResult {
  if (!raw || typeof raw !== 'object') {
    throw new DocumentModerationValidationError(
      'Moderation result is not an object',
    );
  }
  const r = raw as Record<string, unknown>;

  if (typeof r.decision !== 'string' || !DECISIONS.includes(r.decision)) {
    throw new DocumentModerationValidationError(
      `Invalid decision: ${String(r.decision)}`,
    );
  }
  if (
    !isRisk(r.copyrightRisk) ||
    !isRisk(r.personalDataRisk) ||
    !isRisk(r.unsafeContentRisk) ||
    !isRisk(r.spamRisk) ||
    !isRisk(r.promptInjectionRisk)
  ) {
    throw new DocumentModerationValidationError(
      'Moderation risk fields invalid',
    );
  }
  if (typeof r.summary !== 'string' || !r.summary.trim()) {
    throw new DocumentModerationValidationError('Moderation summary missing');
  }

  return {
    decision: r.decision as CommunityDocumentModerationResult['decision'],
    confidence: Math.max(0, Math.min(1, Number(r.confidence) || 0)),
    qualityScore: clampScore(r.qualityScore),
    completenessScore: clampScore(r.completenessScore),
    languageAccuracyScore: clampScore(r.languageAccuracyScore),
    levelSuitabilityScore: clampScore(r.levelSuitabilityScore),
    detectedLanguage: toOptionalString(r.detectedLanguage, 20) ?? 'unknown',
    detectedLevel: toOptionalString(r.detectedLevel, 10),
    suggestedCategory: toOptionalString(r.suggestedCategory, 100),
    suggestedSkills: toStringArray(r.suggestedSkills, 10),
    summary: r.summary.slice(0, 2000),
    suggestedTitle: toOptionalString(r.suggestedTitle, 200),
    suggestedDescription: toOptionalString(r.suggestedDescription, 2000),
    copyrightRisk: r.copyrightRisk,
    personalDataRisk: r.personalDataRisk,
    unsafeContentRisk: r.unsafeContentRisk,
    spamRisk: r.spamRisk,
    promptInjectionRisk: r.promptInjectionRisk,
    warnings: toStringArray(r.warnings, 20),
    rejectionReasons: toStringArray(r.rejectionReasons, 20),
    requiredChanges: toStringArray(r.requiredChanges, 20),
  };
}

/** Escalates risk A to the higher of A/B — used to fold per-chunk risk
 * levels into a single worst-case-wins aggregate. */
export function maxRisk(
  a: DocumentRiskLevelValue,
  b: DocumentRiskLevelValue,
): DocumentRiskLevelValue {
  const rank: Record<DocumentRiskLevelValue, number> = {
    LOW: 0,
    MEDIUM: 1,
    HIGH: 2,
  };
  return rank[a] >= rank[b] ? a : b;
}
