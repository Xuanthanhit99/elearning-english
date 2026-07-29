import { api } from "@/src/lib/axios";

export type DocumentSource = "BEACONVIE" | "COMMUNITY";
export type DocumentCreationType = "ADMIN_UPLOAD" | "GEMINI_GENERATED" | "USER_UPLOAD";
export type DocumentLevel = "A1" | "A2" | "B1" | "B2" | "C1" | "C2";

export type LearningDocumentStatus =
  | "DRAFT"
  | "UPLOADING"
  | "PROCESSING"
  | "AI_REVIEWING"
  | "PENDING_ADMIN_REVIEW"
  | "CHANGES_REQUESTED"
  | "APPROVED"
  | "PUBLISHED"
  | "REJECTED"
  | "HIDDEN"
  | "REMOVED"
  | "FAILED";

export type DocumentVersionStatus =
  | "DRAFT"
  | "GENERATING"
  | "PROCESSING"
  | "VALIDATING"
  | "READY_FOR_REVIEW"
  | "APPROVED"
  | "PUBLISHED"
  | "REJECTED"
  | "FAILED"
  | "ARCHIVED";

export type DocumentReportReason =
  | "COPYRIGHT"
  | "INAPPROPRIATE_CONTENT"
  | "WRONG_INFORMATION"
  | "SPAM"
  | "MALICIOUS_FILE"
  | "PERSONAL_INFORMATION"
  | "BROKEN_FILE"
  | "OTHER";

export type DocumentSort = "newest" | "popular" | "most_downloaded" | "top_rated" | "featured";
export type DocumentSourceFilter = "beaconvie" | "community";

export type DocumentAuthor = {
  id: string;
  fullname: string;
  avatar?: string | null;
} | null;

export type DocumentVersionCardInfo = {
  mimeType: string | null;
  pageCount: number | null;
  fileSize: number | null;
  versionNumber: number;
} | null;

export type DocumentCard = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  source: DocumentSource;
  creationType: DocumentCreationType;
  category: string;
  level: string | null;
  skills: string[] | null;
  documentType: string | null;
  coverUrl: string | null;
  hasAnswerKey: boolean;
  hasAudio: boolean;
  allowDownload: boolean;
  isFeatured: boolean;
  aiAssisted: boolean;
  viewCount: number;
  downloadCount: number;
  ratingAverage: number;
  ratingCount: number;
  publishedAt: string | null;
  author: DocumentAuthor;
  activeVersion: DocumentVersionCardInfo;
  isBookmarked: boolean;
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type DocumentListResponse = {
  items: DocumentCard[];
  meta: PaginationMeta;
};

export type DocumentListParams = {
  source?: DocumentSourceFilter;
  category?: string;
  level?: string;
  skill?: string;
  documentType?: string;
  format?: string;
  hasAnswerKey?: boolean;
  hasAudio?: boolean;
  allowDownload?: boolean;
  explanationLanguage?: string;
  sort?: DocumentSort;
  keyword?: string;
  page?: number;
  limit?: number;
};

export type DocumentDetailVersion = {
  id: string;
  documentId: string;
  versionNumber: number;
  status: DocumentVersionStatus;
  originalFileName: string | null;
  mimeType: string | null;
  fileSize: number | null;
  pageCount: number | null;
  generationProgress: number;
  currentStep: string | null;
  failureCode: string | null;
  failureMessage: string | null;
  approvedAt: string | null;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DocumentMyRating = {
  value: number;
  comment: string | null;
} | null;

export type DocumentDetail = DocumentCard & {
  summary: string | null;
  learningObjectives: string[] | null;
  tableOfContents: unknown;
  language: string;
  explanationLanguage: string | null;
  tags: string[] | null;
  createdAt: string;
  updatedAt: string;
  activeVersion: DocumentDetailVersion | null;
  myRating: DocumentMyRating;
};

export type DocumentModerationSummary = {
  decision: "APPROVE" | "REVIEW" | "REJECT";
  rejectionReasons: string[] | null;
  requiredChanges: string[] | null;
} | null;

export type MyDocumentVersionSummary = {
  versionNumber: number;
  status: DocumentVersionStatus;
  pageCount: number | null;
} | null;

export type MyDocumentSummary = {
  id: string;
  title: string;
  slug: string;
  description: string | null;
  summary: string | null;
  source: DocumentSource;
  creationType: DocumentCreationType;
  status: LearningDocumentStatus;
  category: string;
  level: string | null;
  language: string;
  explanationLanguage: string | null;
  skills: string[] | null;
  tags: string[] | null;
  documentType: string | null;
  coverUrl: string | null;
  hasAnswerKey: boolean;
  hasAudio: boolean;
  allowDownload: boolean;
  isFeatured: boolean;
  aiAssisted: boolean;
  viewCount: number;
  downloadCount: number;
  bookmarkCount: number;
  ratingAverage: number;
  ratingCount: number;
  reportCount: number;
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
  activeVersionId: string | null;
  activeVersion: MyDocumentVersionSummary;
  moderation: DocumentModerationSummary;
};

export type DocumentModerationHistoryItem = {
  id: string;
  documentId: string;
  action: string;
  fromStatus: string | null;
  toStatus: string | null;
  isSystemActor: boolean;
  userFacingReason: string | null;
  requiredChanges: string[] | null;
  allowResubmission: boolean;
  createdAt: string;
};

export type DocumentProcessingEventItem = {
  id: string;
  documentId: string;
  versionId: string | null;
  step: string;
  status: string;
  progress: number;
  message: string | null;
  createdAt: string;
};

export type DocumentModerationFull = {
  id: string;
  documentId: string;
  versionId: string;
  decision: "APPROVE" | "REVIEW" | "REJECT";
  confidence: number;
  qualityScore: number;
  completenessScore: number;
  languageAccuracyScore: number;
  levelSuitabilityScore: number;
  detectedLanguage: string | null;
  detectedLevel: string | null;
  suggestedCategory: string | null;
  suggestedSkills: string[] | null;
  summary: string | null;
  suggestedTitle: string | null;
  suggestedDescription: string | null;
  copyrightRisk: "LOW" | "MEDIUM" | "HIGH";
  personalDataRisk: "LOW" | "MEDIUM" | "HIGH";
  unsafeContentRisk: "LOW" | "MEDIUM" | "HIGH";
  spamRisk: "LOW" | "MEDIUM" | "HIGH";
  promptInjectionRisk: "LOW" | "MEDIUM" | "HIGH";
  warnings: string[] | null;
  rejectionReasons: string[] | null;
  requiredChanges: string[] | null;
  createdAt: string;
  updatedAt: string;
} | null;

export type MyDocumentDetail = Omit<MyDocumentSummary, "moderation"> & {
  versions: DocumentDetailVersion[];
  moderation: DocumentModerationFull;
  moderationHistory: DocumentModerationHistoryItem[];
  processingEvents: DocumentProcessingEventItem[];
};

export type MyDocumentsListResponse = {
  items: MyDocumentSummary[];
  meta: PaginationMeta;
};

export type DocumentBookmarkListItem = {
  document: {
    id: string;
    title: string;
    slug: string;
    coverUrl: string | null;
    category: string;
    level: string | null;
    source: DocumentSource;
    ratingAverage: number;
    downloadCount: number;
  };
  createdAt: string;
};

export type DocumentBookmarksResponse = {
  items: DocumentBookmarkListItem[];
  meta: PaginationMeta;
};

export type CreateDocumentUploadPayload = {
  file: File;
  title: string;
  description?: string;
  category: string;
  level?: DocumentLevel;
  skills?: string[];
  explanationLanguage?: string;
  hasAnswerKey?: boolean;
  hasAudio?: boolean;
  allowDownload?: boolean;
  tags?: string[];
  confirmOwnership: true;
  agreeToTerms: true;
};

export type DocumentUploadResult = {
  documentId: string;
  versionId: string;
  status: "PROCESSING";
};

function buildQueryParams(params: DocumentListParams) {
  const query: Record<string, string> = {};
  if (params.source) query.source = params.source;
  if (params.category) query.category = params.category;
  if (params.level) query.level = params.level;
  if (params.skill) query.skill = params.skill;
  if (params.documentType) query.documentType = params.documentType;
  if (params.format) query.format = params.format;
  if (params.hasAnswerKey !== undefined) query.hasAnswerKey = String(params.hasAnswerKey);
  if (params.hasAudio !== undefined) query.hasAudio = String(params.hasAudio);
  if (params.allowDownload !== undefined) query.allowDownload = String(params.allowDownload);
  if (params.explanationLanguage) query.explanationLanguage = params.explanationLanguage;
  if (params.sort) query.sort = params.sort;
  if (params.keyword?.trim()) query.keyword = params.keyword.trim();
  query.page = String(params.page ?? 1);
  query.limit = String(params.limit ?? 12);
  return query;
}

export async function listDocuments(params: DocumentListParams = {}) {
  const response = await api.get<DocumentListResponse>("/documents", {
    params: buildQueryParams(params),
  });
  return response.data;
}

export async function getRelatedDocuments(documentId: string) {
  const response = await api.get<DocumentCard[]>(`/documents/${documentId}/related`);
  return response.data;
}

export async function recordDocumentView(documentId: string) {
  const response = await api.post<{ counted: boolean }>(`/documents/${documentId}/view`);
  return response.data;
}

export async function getDocumentBySlug(slug: string) {
  const response = await api.get<DocumentDetail>(`/documents/${encodeURIComponent(slug)}`);
  return response.data;
}

export async function requestDocumentDownload(documentId: string) {
  const response = await api.post<{ url: string; expiresInSeconds: number }>(
    `/documents/${documentId}/download`,
  );
  return response.data;
}

export async function bookmarkDocument(documentId: string) {
  const response = await api.post<{ bookmarked: boolean }>(`/documents/${documentId}/bookmark`);
  return response.data;
}

export async function unbookmarkDocument(documentId: string) {
  const response = await api.delete<{ bookmarked: boolean }>(`/documents/${documentId}/bookmark`);
  return response.data;
}

export async function rateDocument(documentId: string, value: number, comment?: string) {
  const response = await api.post<{ rated: true }>(`/documents/${documentId}/rating`, {
    value,
    comment,
  });
  return response.data;
}

export async function reportDocument(
  documentId: string,
  reason: DocumentReportReason,
  description?: string,
) {
  const response = await api.post<{ reported: true }>(`/documents/${documentId}/report`, {
    reason,
    description,
  });
  return response.data;
}

function appendUploadFormData(payload: CreateDocumentUploadPayload) {
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("title", payload.title);
  if (payload.description) formData.append("description", payload.description);
  formData.append("category", payload.category);
  if (payload.level) formData.append("level", payload.level);
  if (payload.skills?.length) formData.append("skills", JSON.stringify(payload.skills));
  if (payload.explanationLanguage) formData.append("explanationLanguage", payload.explanationLanguage);
  if (payload.hasAnswerKey !== undefined) formData.append("hasAnswerKey", String(payload.hasAnswerKey));
  if (payload.hasAudio !== undefined) formData.append("hasAudio", String(payload.hasAudio));
  if (payload.allowDownload !== undefined) formData.append("allowDownload", String(payload.allowDownload));
  if (payload.tags?.length) formData.append("tags", JSON.stringify(payload.tags));
  formData.append("confirmOwnership", "true");
  formData.append("agreeToTerms", "true");
  return formData;
}

export async function uploadDocument(
  payload: CreateDocumentUploadPayload,
  onUploadProgress?: (percent: number) => void,
) {
  const formData = appendUploadFormData(payload);
  const response = await api.post<DocumentUploadResult>("/documents/uploads", formData, {
    onUploadProgress: (event) => {
      if (!onUploadProgress || !event.total) return;
      onUploadProgress(Math.round((event.loaded / event.total) * 100));
    },
  });
  return response.data;
}

export async function resubmitDocument(
  documentId: string,
  file: File,
  onUploadProgress?: (percent: number) => void,
) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post<DocumentUploadResult>(
    `/documents/uploads/${documentId}/resubmit`,
    formData,
    {
      onUploadProgress: (event) => {
        if (!onUploadProgress || !event.total) return;
        onUploadProgress(Math.round((event.loaded / event.total) * 100));
      },
    },
  );
  return response.data;
}

export async function createDocumentRevision(
  documentId: string,
  file: File,
  onUploadProgress?: (percent: number) => void,
) {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post<DocumentUploadResult>(
    `/documents/uploads/${documentId}/create-revision`,
    formData,
    {
      onUploadProgress: (event) => {
        if (!onUploadProgress || !event.total) return;
        onUploadProgress(Math.round((event.loaded / event.total) * 100));
      },
    },
  );
  return response.data;
}

export async function listMyDocuments(params: { page?: number; limit?: number } = {}) {
  const response = await api.get<MyDocumentsListResponse>("/documents/me", {
    params: { page: params.page ?? 1, limit: params.limit ?? 20 },
  });
  return response.data;
}

export async function getMyDocument(documentId: string) {
  const response = await api.get<MyDocumentDetail>(`/documents/me/${documentId}`);
  return response.data;
}

export async function listMyBookmarks(params: { page?: number } = {}) {
  const response = await api.get<DocumentBookmarksResponse>("/documents/me/bookmarks", {
    params: { page: params.page ?? 1 },
  });
  return response.data;
}

export async function updateMyDocument(
  documentId: string,
  payload: { title?: string; description?: string; category?: string; level?: string },
) {
  const response = await api.patch<MyDocumentSummary>(`/documents/me/${documentId}`, payload);
  return response.data;
}

export async function deleteMyDocument(documentId: string) {
  const response = await api.delete<{ removed: boolean }>(`/documents/me/${documentId}`);
  return response.data;
}
