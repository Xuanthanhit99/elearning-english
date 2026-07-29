// src/lib/admin-documents-api.ts
//
// Admin-only Document Library API client. Kept separate from
// `src/lib/documents-api.ts` (owned by the public-facing /documents pages)
// to avoid merge conflicts — this file only talks to the `/admin/documents`
// routes, all of which require JwtAuthGuard + RolesGuard(ADMIN) on the
// backend. The role check in the UI is a UX convenience only; the backend
// is the real gate.
import { api } from "@/src/lib/axios";

// ---------------------------------------------------------------------------
// Shared enums / constants
// ---------------------------------------------------------------------------

export const DOCUMENT_STATUSES = [
  "DRAFT",
  "PROCESSING",
  "GENERATING",
  "PENDING_ADMIN_REVIEW",
  "READY_FOR_REVIEW",
  "NEEDS_CHANGES",
  "REJECTED",
  "APPROVED",
  "PUBLISHED",
  "HIDDEN",
  "REMOVED",
  "ARCHIVED",
  "FAILED",
] as const;

export const DOCUMENT_SOURCES = ["beaconvie", "community"] as const;
export type DocumentSourceFilter = (typeof DOCUMENT_SOURCES)[number];

export const DOCUMENT_CREATION_TYPES = [
  "ADMIN_UPLOAD",
  "GEMINI_GENERATED",
  "USER_UPLOAD",
] as const;
export type DocumentCreationType = (typeof DOCUMENT_CREATION_TYPES)[number] | string;

export const DOCUMENT_LEVELS = ["A1", "A2", "B1", "B2", "C1", "C2"] as const;
export type DocumentLevel = (typeof DOCUMENT_LEVELS)[number];

export type ModerationRiskLevel = "LOW" | "MEDIUM" | "HIGH" | string;

// ---------------------------------------------------------------------------
// Shared / list types
// ---------------------------------------------------------------------------

export type AdminDocumentAuthor = {
  id: string;
  fullname: string;
  email: string;
};

export type AdminDocumentActiveVersion = {
  id?: string;
  versionNumber: number;
  status: string;
} | null;

export type AdminDocumentModerationSummary = {
  decision: string;
  qualityScore?: number | null;
  [key: string]: unknown;
} | null;

export type AdminDocumentSummary = {
  id: string;
  slug: string;
  title: string;
  description?: string | null;
  category: string;
  level?: string | null;
  skills?: string[] | null;
  source: string;
  creationType: DocumentCreationType;
  status: string;
  hasAnswerKey?: boolean | null;
  hasAudio?: boolean | null;
  allowDownload?: boolean | null;
  isFeatured?: boolean | null;
  downloadCount?: number | null;
  viewCount?: number | null;
  createdAt: string;
  updatedAt: string;
  author: AdminDocumentAuthor;
  activeVersion: AdminDocumentActiveVersion;
  moderation: AdminDocumentModerationSummary;
};

export type AdminPaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type AdminDocumentListResponse = {
  items: AdminDocumentSummary[];
  meta: AdminPaginationMeta;
};

export type ListAdminDocumentsParams = {
  status?: string;
  source?: DocumentSourceFilter;
  creationType?: string;
  authorId?: string;
  category?: string;
  keyword?: string;
  page?: number;
  limit?: number;
};

export async function listAdminDocuments(params?: ListAdminDocumentsParams) {
  const response = await api.get<AdminDocumentListResponse>("/admin/documents", { params });
  return response.data;
}

// ---------------------------------------------------------------------------
// Upload (official BeaconVie document)
// ---------------------------------------------------------------------------

export type UploadAdminDocumentPayload = {
  file: File;
  title: string;
  description?: string;
  category: string;
  level?: string;
  skills?: string[];
  hasAnswerKey?: boolean;
  hasAudio?: boolean;
  allowDownload?: boolean;
};

export type UploadAdminDocumentResponse = {
  documentId: string;
  versionId: string;
  slug: string;
};

export async function uploadAdminDocument(payload: UploadAdminDocumentPayload) {
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("title", payload.title);
  if (payload.description) formData.append("description", payload.description);
  formData.append("category", payload.category);
  if (payload.level) formData.append("level", payload.level);
  if (payload.skills?.length) {
    payload.skills.forEach((skill) => formData.append("skills[]", skill));
  }
  if (payload.hasAnswerKey !== undefined) {
    formData.append("hasAnswerKey", String(payload.hasAnswerKey));
  }
  if (payload.hasAudio !== undefined) {
    formData.append("hasAudio", String(payload.hasAudio));
  }
  if (payload.allowDownload !== undefined) {
    formData.append("allowDownload", String(payload.allowDownload));
  }

  const response = await api.post<UploadAdminDocumentResponse>("/admin/documents", formData);
  return response.data;
}

// ---------------------------------------------------------------------------
// Detail
// ---------------------------------------------------------------------------

export type AdminDocumentVersion = {
  id: string;
  versionNumber: number;
  status: string;
  storageKey?: string | null;
  fileName?: string | null;
  originalFileName?: string | null;
  fileSize?: number | null;
  mimeType?: string | null;
  pageCount?: number | null;
  createdAt: string;
  updatedAt?: string;
  [key: string]: unknown;
};

export type AdminDocumentModeration = {
  id?: string;
  decision: string;
  createdAt?: string;
  warnings?: string[] | null;
  rejectionReasons?: string[] | null;
  requiredChanges?: string[] | null;
  [key: string]: unknown;
};

export type AdminDocumentModerationHistoryEntry = {
  id?: string;
  action: string;
  fromStatus: string;
  toStatus: string;
  actorId?: string | null;
  internalReason?: string | null;
  userFacingReason?: string | null;
  requiredChanges?: string[] | null;
  allowResubmission?: boolean | null;
  createdAt: string;
};

export type AdminDocumentProcessingEvent = {
  id?: string;
  step: string;
  status: string;
  progress?: number | null;
  message?: string | null;
  createdAt: string;
};

export type AdminDocumentReport = {
  id: string;
  reason: string;
  description?: string | null;
  status: string;
  reporter: { id: string; fullname: string };
  createdAt: string;
};

export type AdminDocumentDetail = AdminDocumentSummary & {
  author: AdminDocumentAuthor;
  versions: AdminDocumentVersion[];
  moderation: AdminDocumentModeration | null;
  moderationHistory: AdminDocumentModerationHistoryEntry[];
  processingEvents: AdminDocumentProcessingEvent[];
  reports: AdminDocumentReport[];
};

export async function getAdminDocumentDetail(id: string) {
  const response = await api.get<AdminDocumentDetail>(`/admin/documents/${id}`);
  return response.data;
}

export type AdminDocumentReviewDownload = {
  version: AdminDocumentVersion;
  url: string;
};

export async function getAdminDocumentReviewDownload(id: string, versionId: string) {
  const response = await api.get<AdminDocumentReviewDownload>(
    `/admin/documents/${id}/versions/${versionId}/review-download`,
  );
  return response.data;
}

// ---------------------------------------------------------------------------
// Metadata update
// ---------------------------------------------------------------------------

export type UpdateAdminDocumentPayload = {
  title?: string;
  description?: string;
  category?: string;
  level?: string;
  skills?: string[];
  allowDownload?: boolean;
  isFeatured?: boolean;
  hasAnswerKey?: boolean;
  hasAudio?: boolean;
};

export async function updateAdminDocument(id: string, payload: UpdateAdminDocumentPayload) {
  const response = await api.patch<AdminDocumentSummary>(`/admin/documents/${id}`, payload);
  return response.data;
}

// ---------------------------------------------------------------------------
// Moderation actions
// ---------------------------------------------------------------------------

export async function approveAdminDocument(id: string, publishImmediately: boolean = true) {
  const response = await api.post(`/admin/documents/${id}/approve`, { publishImmediately });
  return response.data;
}

export async function rejectAdminDocument(
  id: string,
  payload: { userFacingReason: string; internalReason?: string; allowResubmission?: boolean },
) {
  const response = await api.post(`/admin/documents/${id}/reject`, payload);
  return response.data;
}

export async function requestChangesAdminDocument(
  id: string,
  payload: { requiredChanges: string[]; userFacingReason?: string },
) {
  const response = await api.post(`/admin/documents/${id}/request-changes`, payload);
  return response.data;
}

export async function publishAdminDocument(id: string) {
  const response = await api.post(`/admin/documents/${id}/publish`);
  return response.data;
}

export async function unpublishAdminDocument(id: string) {
  const response = await api.post(`/admin/documents/${id}/unpublish`);
  return response.data;
}

export async function hideAdminDocument(id: string) {
  const response = await api.post(`/admin/documents/${id}/hide`);
  return response.data;
}

export async function removeAdminDocument(id: string) {
  const response = await api.post(`/admin/documents/${id}/remove`);
  return response.data;
}

export async function restoreAdminDocument(id: string) {
  const response = await api.post(`/admin/documents/${id}/restore`);
  return response.data;
}

export async function retryAdminDocument(id: string) {
  const response = await api.post(`/admin/documents/${id}/retry`);
  return response.data;
}

export async function rollbackAdminDocument(id: string, versionId: string) {
  const response = await api.post(`/admin/documents/${id}/rollback/${versionId}`);
  return response.data;
}

export async function resolveAdminDocumentReport(
  reportId: string,
  payload: { status: "RESOLVED" | "DISMISSED"; resolution?: string },
) {
  const response = await api.post(`/admin/documents/reports/${reportId}/resolve`, payload);
  return response.data;
}

// ---------------------------------------------------------------------------
// Gemini generator
// ---------------------------------------------------------------------------

export type GenerateDocumentPublishMode =
  | "SAVE_AS_DRAFT"
  | "REQUIRE_ADMIN_REVIEW"
  | "PUBLISH_AFTER_APPROVAL";

export type CreateDocumentGenerationPayload = {
  title: string;
  englishTitle?: string;
  topic: string;
  description?: string;
  category: string;
  level: DocumentLevel;
  skills?: string[];
  targetAudience?: string;
  explanationLanguage?: string;
  lessonCount: number;
  vocabularyPerLesson: number;
  estimatedPageCount?: number;
  includeIpa?: boolean;
  includeTranslation?: boolean;
  includeDialogues?: boolean;
  includeGrammar?: boolean;
  includeExercises?: boolean;
  includeAnswerKey?: boolean;
  includeFinalTest?: boolean;
  includeStudyPlan?: boolean;
  allowDownload?: boolean;
  featured?: boolean;
  publishMode: GenerateDocumentPublishMode;
};

export type CreateDocumentGenerationResponse = {
  documentId: string;
  versionId: string;
  slug: string;
  status: string;
};

export async function generateAdminDocument(payload: CreateDocumentGenerationPayload) {
  const response = await api.post<CreateDocumentGenerationResponse>(
    "/admin/documents/generate",
    payload,
  );
  return response.data;
}

export type AdminDocumentGenerationSummary = AdminDocumentSummary & {
  latestVersion?: AdminDocumentVersion | null;
};

export type AdminDocumentGenerationListResponse = {
  items: AdminDocumentGenerationSummary[];
  meta: AdminPaginationMeta;
};

export async function listAdminDocumentGenerations(params?: { page?: number; limit?: number }) {
  const response = await api.get<AdminDocumentGenerationListResponse>(
    "/admin/documents/generations",
    { params },
  );
  return response.data;
}

export type DocumentGenerationSectionType = "LESSON" | "FINAL_TEST" | "STUDY_PLAN" | string;
export type DocumentGenerationSectionStatus =
  | "PENDING"
  | "GENERATING"
  | "COMPLETED"
  | "FAILED"
  | "NEEDS_ADMIN_ACTION"
  | string;

export type DocumentGenerationSection = {
  id?: string;
  sectionKey: string;
  sectionType: DocumentGenerationSectionType;
  orderIndex: number;
  title: string;
  required: boolean;
  status: DocumentGenerationSectionStatus;
  content?: unknown;
  validationReport?: unknown;
  attemptCount?: number | null;
  failureMessage?: string | null;
};

export type AdminDocumentGenerationVersion = AdminDocumentVersion & {
  sections: DocumentGenerationSection[];
};

export type AdminDocumentGenerationDetail = AdminDocumentSummary & {
  author: AdminDocumentAuthor;
  versions: AdminDocumentGenerationVersion[];
  processingEvents: AdminDocumentProcessingEvent[];
};

export async function getAdminDocumentGeneration(id: string) {
  const response = await api.get<AdminDocumentGenerationDetail>(
    `/admin/documents/generations/${id}`,
  );
  return response.data;
}

export async function cancelAdminDocumentGeneration(id: string) {
  const response = await api.post(`/admin/documents/generations/${id}/cancel`);
  return response.data;
}

export async function retryAdminDocumentGeneration(id: string) {
  const response = await api.post(`/admin/documents/generations/${id}/retry`);
  return response.data;
}

export async function retryAdminDocumentGenerationSection(id: string, sectionKey: string) {
  const response = await api.post(
    `/admin/documents/generations/${id}/retry-section/${sectionKey}`,
  );
  return response.data;
}
