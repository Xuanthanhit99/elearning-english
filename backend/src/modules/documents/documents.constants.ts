// Central name/constant registry for the Document Library feature —
// mirrors the convention in community.constants.ts / notifications.constants.ts
// (queue name, job-name enum, and deterministic jobId builders all live in
// one place so processors/services/tests import the same strings).

export const DOCUMENT_PROCESSING_QUEUE = 'document-processing';
export const DOCUMENT_GENERATION_QUEUE = 'document-generation';
export const DOCUMENT_CLEANUP_QUEUE = 'document-cleanup';

export enum CommunityDocumentJobName {
  SCAN_FILE = 'SCAN_FILE',
  EXTRACT_CONTENT = 'EXTRACT_CONTENT',
  CHECK_DUPLICATE = 'CHECK_DUPLICATE',
  AI_MODERATE = 'AI_MODERATE',
  GENERATE_PREVIEW = 'GENERATE_PREVIEW',
  PREPARE_ADMIN_REVIEW = 'PREPARE_ADMIN_REVIEW',
}

export enum DocumentGenerationJobName {
  GENERATE_OUTLINE = 'GENERATE_OUTLINE',
  GENERATE_SECTION = 'GENERATE_SECTION',
  GENERATE_FINAL_TEST = 'GENERATE_FINAL_TEST',
  GENERATE_ANSWER_KEY = 'GENERATE_ANSWER_KEY',
  GENERATE_SUMMARY = 'GENERATE_SUMMARY',
  GENERATE_STUDY_PLAN = 'GENERATE_STUDY_PLAN',
  ASSEMBLE_DOCUMENT = 'ASSEMBLE_DOCUMENT',
  AI_QUALITY_REVIEW = 'AI_QUALITY_REVIEW',
  VALIDATE_CONTENT = 'VALIDATE_CONTENT',
  RENDER_PDF = 'RENDER_PDF',
  VALIDATE_PDF = 'VALIDATE_PDF',
  FINALIZE_VERSION = 'FINALIZE_VERSION',
}

export enum DocumentCleanupJobName {
  SWEEP = 'SWEEP',
}

export const DocumentJobId = {
  scan: (documentId: string) => `community-document:${documentId}:scan`,
  extract: (documentId: string) => `community-document:${documentId}:extract`,
  duplicate: (documentId: string) =>
    `community-document:${documentId}:duplicate`,
  moderate: (documentId: string) => `community-document:${documentId}:moderate`,
  preview: (documentId: string) => `community-document:${documentId}:preview`,
  prepareReview: (documentId: string) =>
    `community-document:${documentId}:prepare-review`,

  outline: (documentId: string, version: number) =>
    `generated-document:${documentId}:version:${version}:outline`,
  section: (documentId: string, version: number, sectionKey: string) =>
    `generated-document:${documentId}:version:${version}:section:${sectionKey}`,
  finalTest: (documentId: string, version: number) =>
    `generated-document:${documentId}:version:${version}:final-test`,
  answerKey: (documentId: string, version: number) =>
    `generated-document:${documentId}:version:${version}:answer-key`,
  summary: (documentId: string, version: number) =>
    `generated-document:${documentId}:version:${version}:summary`,
  studyPlan: (documentId: string, version: number) =>
    `generated-document:${documentId}:version:${version}:study-plan`,
  assemble: (documentId: string, version: number) =>
    `generated-document:${documentId}:version:${version}:assemble`,
  qualityReview: (documentId: string, version: number) =>
    `generated-document:${documentId}:version:${version}:quality-review`,
  validateContent: (documentId: string, version: number) =>
    `generated-document:${documentId}:version:${version}:validate-content`,
  render: (documentId: string, version: number) =>
    `generated-document:${documentId}:version:${version}:render`,
  validatePdf: (documentId: string, version: number) =>
    `generated-document:${documentId}:version:${version}:validate-pdf`,
  finalize: (documentId: string, version: number) =>
    `generated-document:${documentId}:version:${version}:finalize`,
};

export const DEFAULT_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: 'exponential' as const, delay: 5000 },
  removeOnComplete: 100,
  removeOnFail: 500,
};

/** Progress mapping for community-upload pipeline (spec §29). */
export const COMMUNITY_PROGRESS = {
  UPLOAD: 15,
  SCAN: 25,
  EXTRACT: 45,
  DUPLICATE: 55,
  MODERATE: 80,
  PREVIEW: 90,
  READY_FOR_REVIEW: 95,
  PUBLISHED: 100,
};

/** Progress mapping for Gemini generation pipeline (spec §29). */
export const GENERATION_PROGRESS = {
  OUTLINE: 10,
  LESSONS: 65,
  FINAL_TEST: 72,
  ANSWER_KEY: 78,
  SUMMARY_STUDY_PLAN: 82,
  ASSEMBLE: 86,
  QUALITY_REVIEW: 90,
  VALIDATE_CONTENT: 93,
  RENDER_PDF: 97,
  VALIDATE_PDF: 99,
  READY: 100,
};
