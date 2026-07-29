-- CreateEnum
CREATE TYPE "LearningDocumentSource" AS ENUM ('BEACONVIE', 'COMMUNITY');

-- CreateEnum
CREATE TYPE "LearningDocumentCreationType" AS ENUM ('ADMIN_UPLOAD', 'GEMINI_GENERATED', 'USER_UPLOAD');

-- CreateEnum
CREATE TYPE "LearningDocumentStatus" AS ENUM ('DRAFT', 'UPLOADING', 'PROCESSING', 'AI_REVIEWING', 'PENDING_ADMIN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'PUBLISHED', 'REJECTED', 'HIDDEN', 'REMOVED', 'FAILED');

-- CreateEnum
CREATE TYPE "DocumentVersionStatus" AS ENUM ('DRAFT', 'GENERATING', 'PROCESSING', 'VALIDATING', 'READY_FOR_REVIEW', 'APPROVED', 'PUBLISHED', 'REJECTED', 'FAILED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "DocumentModerationDecision" AS ENUM ('APPROVE', 'REVIEW', 'REJECT');

-- CreateEnum
CREATE TYPE "DocumentRiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "DocumentReportStatus" AS ENUM ('OPEN', 'REVIEWING', 'RESOLVED', 'DISMISSED');

-- CreateEnum
CREATE TYPE "DocumentReportReason" AS ENUM ('COPYRIGHT', 'INAPPROPRIATE_CONTENT', 'WRONG_INFORMATION', 'SPAM', 'MALICIOUS_FILE', 'PERSONAL_INFORMATION', 'BROKEN_FILE', 'OTHER');

-- CreateEnum
CREATE TYPE "DocumentGenerationSectionStatus" AS ENUM ('PENDING', 'GENERATING', 'COMPLETED', 'FAILED', 'NEEDS_ADMIN_ACTION');

-- CreateEnum
CREATE TYPE "DocumentPublishMode" AS ENUM ('SAVE_AS_DRAFT', 'REQUIRE_ADMIN_REVIEW', 'PUBLISH_AFTER_APPROVAL');

-- CreateTable
CREATE TABLE "LearningDocument" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "summary" TEXT,
    "learningObjectives" JSONB,
    "tableOfContents" JSONB,
    "source" "LearningDocumentSource" NOT NULL,
    "creationType" "LearningDocumentCreationType" NOT NULL,
    "status" "LearningDocumentStatus" NOT NULL DEFAULT 'DRAFT',
    "category" TEXT NOT NULL,
    "level" TEXT,
    "language" TEXT NOT NULL DEFAULT 'vi',
    "explanationLanguage" TEXT,
    "skills" JSONB,
    "tags" JSONB,
    "documentType" TEXT,
    "coverStorageKey" TEXT,
    "coverUrl" TEXT,
    "hasAnswerKey" BOOLEAN NOT NULL DEFAULT false,
    "hasAudio" BOOLEAN NOT NULL DEFAULT false,
    "allowDownload" BOOLEAN NOT NULL DEFAULT true,
    "isFeatured" BOOLEAN NOT NULL DEFAULT false,
    "aiAssisted" BOOLEAN NOT NULL DEFAULT false,
    "activeVersionId" TEXT,
    "authorId" TEXT,
    "viewCount" INTEGER NOT NULL DEFAULT 0,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "bookmarkCount" INTEGER NOT NULL DEFAULT 0,
    "ratingAverage" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "reportCount" INTEGER NOT NULL DEFAULT 0,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LearningDocumentVersion" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "versionNumber" INTEGER NOT NULL,
    "status" "DocumentVersionStatus" NOT NULL DEFAULT 'DRAFT',
    "originalFileName" TEXT,
    "storageKey" TEXT,
    "sourceStorageKey" TEXT,
    "contentStorageKey" TEXT,
    "previewStorageKey" TEXT,
    "mimeType" TEXT,
    "fileSize" INTEGER,
    "pageCount" INTEGER,
    "checksum" TEXT,
    "contentHash" TEXT,
    "generationConfig" JSONB,
    "outline" JSONB,
    "assembledContent" JSONB,
    "validationReport" JSONB,
    "qualityReport" JSONB,
    "generationProgress" INTEGER NOT NULL DEFAULT 0,
    "currentStep" TEXT,
    "repairRounds" INTEGER NOT NULL DEFAULT 0,
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "generatedByJobId" TEXT,
    "generatedByModel" TEXT,
    "promptVersion" TEXT,
    "approvedById" TEXT,
    "approvedAt" TIMESTAMP(3),
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LearningDocumentVersion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentGenerationSection" (
    "id" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "sectionKey" TEXT NOT NULL,
    "sectionType" TEXT NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "title" TEXT,
    "required" BOOLEAN NOT NULL DEFAULT true,
    "status" "DocumentGenerationSectionStatus" NOT NULL DEFAULT 'PENDING',
    "content" JSONB,
    "validationReport" JSONB,
    "promptVersion" TEXT,
    "modelName" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "failureCode" TEXT,
    "failureMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentGenerationSection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentModeration" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "decision" "DocumentModerationDecision" NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "qualityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "completenessScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "languageAccuracyScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "levelSuitabilityScore" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "detectedLanguage" TEXT,
    "detectedLevel" TEXT,
    "suggestedCategory" TEXT,
    "suggestedSkills" JSONB,
    "summary" TEXT,
    "suggestedTitle" TEXT,
    "suggestedDescription" TEXT,
    "copyrightRisk" "DocumentRiskLevel" NOT NULL DEFAULT 'LOW',
    "personalDataRisk" "DocumentRiskLevel" NOT NULL DEFAULT 'LOW',
    "unsafeContentRisk" "DocumentRiskLevel" NOT NULL DEFAULT 'LOW',
    "spamRisk" "DocumentRiskLevel" NOT NULL DEFAULT 'LOW',
    "promptInjectionRisk" "DocumentRiskLevel" NOT NULL DEFAULT 'LOW',
    "warnings" JSONB,
    "rejectionReasons" JSONB,
    "requiredChanges" JSONB,
    "duplicateOfDocumentId" TEXT,
    "modelName" TEXT,
    "promptVersion" TEXT,
    "durationMs" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentModeration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentModerationHistory" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "actorId" TEXT,
    "isSystemActor" BOOLEAN NOT NULL DEFAULT false,
    "internalReason" TEXT,
    "userFacingReason" TEXT,
    "requiredChanges" JSONB,
    "allowResubmission" BOOLEAN NOT NULL DEFAULT true,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentModerationHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentBookmark" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentBookmark_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentRating" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "value" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DocumentRating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentDownload" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "versionId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "ipHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentDownload_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentReport" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "reporterId" TEXT NOT NULL,
    "reason" "DocumentReportReason" NOT NULL,
    "description" TEXT,
    "status" "DocumentReportStatus" NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolvedById" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DocumentProcessingEvent" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "versionId" TEXT,
    "step" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "progress" INTEGER NOT NULL DEFAULT 0,
    "message" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DocumentProcessingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LearningDocument_slug_key" ON "LearningDocument"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "LearningDocument_activeVersionId_key" ON "LearningDocument"("activeVersionId");

-- CreateIndex
CREATE INDEX "LearningDocument_status_source_idx" ON "LearningDocument"("status", "source");

-- CreateIndex
CREATE INDEX "LearningDocument_category_level_idx" ON "LearningDocument"("category", "level");

-- CreateIndex
CREATE INDEX "LearningDocument_publishedAt_idx" ON "LearningDocument"("publishedAt");

-- CreateIndex
CREATE INDEX "LearningDocument_authorId_status_idx" ON "LearningDocument"("authorId", "status");

-- CreateIndex
CREATE INDEX "LearningDocument_isFeatured_status_idx" ON "LearningDocument"("isFeatured", "status");

-- CreateIndex
CREATE INDEX "LearningDocumentVersion_documentId_status_idx" ON "LearningDocumentVersion"("documentId", "status");

-- CreateIndex
CREATE INDEX "LearningDocumentVersion_contentHash_idx" ON "LearningDocumentVersion"("contentHash");

-- CreateIndex
CREATE INDEX "LearningDocumentVersion_checksum_idx" ON "LearningDocumentVersion"("checksum");

-- CreateIndex
CREATE UNIQUE INDEX "LearningDocumentVersion_documentId_versionNumber_key" ON "LearningDocumentVersion"("documentId", "versionNumber");

-- CreateIndex
CREATE INDEX "DocumentGenerationSection_versionId_status_idx" ON "DocumentGenerationSection"("versionId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentGenerationSection_versionId_sectionKey_key" ON "DocumentGenerationSection"("versionId", "sectionKey");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentModeration_documentId_key" ON "DocumentModeration"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentModeration_versionId_key" ON "DocumentModeration"("versionId");

-- CreateIndex
CREATE INDEX "DocumentModeration_decision_idx" ON "DocumentModeration"("decision");

-- CreateIndex
CREATE INDEX "DocumentModerationHistory_documentId_createdAt_idx" ON "DocumentModerationHistory"("documentId", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentModerationHistory_actorId_createdAt_idx" ON "DocumentModerationHistory"("actorId", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentBookmark_documentId_idx" ON "DocumentBookmark"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentBookmark_userId_documentId_key" ON "DocumentBookmark"("userId", "documentId");

-- CreateIndex
CREATE INDEX "DocumentRating_documentId_idx" ON "DocumentRating"("documentId");

-- CreateIndex
CREATE UNIQUE INDEX "DocumentRating_userId_documentId_key" ON "DocumentRating"("userId", "documentId");

-- CreateIndex
CREATE INDEX "DocumentDownload_documentId_userId_createdAt_idx" ON "DocumentDownload"("documentId", "userId", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentDownload_documentId_createdAt_idx" ON "DocumentDownload"("documentId", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentReport_documentId_status_idx" ON "DocumentReport"("documentId", "status");

-- CreateIndex
CREATE INDEX "DocumentReport_reporterId_createdAt_idx" ON "DocumentReport"("reporterId", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentProcessingEvent_versionId_createdAt_idx" ON "DocumentProcessingEvent"("versionId", "createdAt");

-- CreateIndex
CREATE INDEX "DocumentProcessingEvent_documentId_createdAt_idx" ON "DocumentProcessingEvent"("documentId", "createdAt");

-- AddForeignKey
ALTER TABLE "LearningDocument" ADD CONSTRAINT "LearningDocument_activeVersionId_fkey" FOREIGN KEY ("activeVersionId") REFERENCES "LearningDocumentVersion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningDocument" ADD CONSTRAINT "LearningDocument_authorId_fkey" FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningDocumentVersion" ADD CONSTRAINT "LearningDocumentVersion_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "LearningDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LearningDocumentVersion" ADD CONSTRAINT "LearningDocumentVersion_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentGenerationSection" ADD CONSTRAINT "DocumentGenerationSection_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "LearningDocumentVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentModeration" ADD CONSTRAINT "DocumentModeration_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "LearningDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentModeration" ADD CONSTRAINT "DocumentModeration_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "LearningDocumentVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentModerationHistory" ADD CONSTRAINT "DocumentModerationHistory_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "LearningDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentModerationHistory" ADD CONSTRAINT "DocumentModerationHistory_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentBookmark" ADD CONSTRAINT "DocumentBookmark_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "LearningDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentBookmark" ADD CONSTRAINT "DocumentBookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRating" ADD CONSTRAINT "DocumentRating_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "LearningDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentRating" ADD CONSTRAINT "DocumentRating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentDownload" ADD CONSTRAINT "DocumentDownload_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "LearningDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentDownload" ADD CONSTRAINT "DocumentDownload_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentReport" ADD CONSTRAINT "DocumentReport_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "LearningDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentReport" ADD CONSTRAINT "DocumentReport_reporterId_fkey" FOREIGN KEY ("reporterId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentReport" ADD CONSTRAINT "DocumentReport_resolvedById_fkey" FOREIGN KEY ("resolvedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentProcessingEvent" ADD CONSTRAINT "DocumentProcessingEvent_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "LearningDocument"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DocumentProcessingEvent" ADD CONSTRAINT "DocumentProcessingEvent_versionId_fkey" FOREIGN KEY ("versionId") REFERENCES "LearningDocumentVersion"("id") ON DELETE CASCADE ON UPDATE CASCADE;

