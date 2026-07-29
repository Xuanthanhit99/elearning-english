export type DocumentModerationDecisionValue = 'APPROVE' | 'REVIEW' | 'REJECT';
export type DocumentRiskLevelValue = 'LOW' | 'MEDIUM' | 'HIGH';

export interface CommunityDocumentModerationResult {
  decision: DocumentModerationDecisionValue;
  confidence: number;
  qualityScore: number;
  completenessScore: number;
  languageAccuracyScore: number;
  levelSuitabilityScore: number;

  detectedLanguage: string;
  detectedLevel?: string;
  suggestedCategory?: string;
  suggestedSkills: string[];

  summary: string;
  suggestedTitle?: string;
  suggestedDescription?: string;

  copyrightRisk: DocumentRiskLevelValue;
  personalDataRisk: DocumentRiskLevelValue;
  unsafeContentRisk: DocumentRiskLevelValue;
  spamRisk: DocumentRiskLevelValue;
  promptInjectionRisk: DocumentRiskLevelValue;

  warnings: string[];
  rejectionReasons: string[];
  requiredChanges: string[];
}

/** Per-chunk moderation pass — a lighter-weight subset used to build up
 * the final aggregated result across multiple text chunks. */
export interface DocumentChunkModerationResult {
  hasPolicyViolation: boolean;
  unsafeContentRisk: DocumentRiskLevelValue;
  personalDataRisk: DocumentRiskLevelValue;
  copyrightRisk: DocumentRiskLevelValue;
  spamRisk: DocumentRiskLevelValue;
  promptInjectionDetected: boolean;
  notes: string[];
}

export const MODERATION_PROMPT_VERSION = 'document-moderation.v1';
