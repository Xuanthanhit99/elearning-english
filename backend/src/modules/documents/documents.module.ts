import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { PrismaModule } from '../../prisma/prisma.module';
import { GeminiModule } from '../gemini/gemini.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { NotificationsModule } from '../notifications/notifications.module';
import {
  DOCUMENT_CLEANUP_QUEUE,
  DOCUMENT_GENERATION_QUEUE,
  DOCUMENT_PROCESSING_QUEUE,
} from './documents.constants';

import { DocumentStorageModule } from './storage/document-storage.module';

import { DocumentsService } from './documents.service';
import { DocumentInteractionsService } from './document-interactions.service';
import { DocumentAccessPolicyService } from './document-access-policy.service';
import { DocumentPublishService } from './document-publish.service';
import { MyDocumentsService } from './my-documents.service';

import { DocumentUploadController } from './upload/document-upload.controller';
import { DocumentUploadService } from './upload/document-upload.service';
import { FileValidationService } from './upload/file-validation.service';

import { ContentExtractionService } from './processing/content-extraction.service';
import { DuplicateCheckService } from './processing/duplicate-check.service';
import { CommunityDocumentProcessor } from './processing/community-document.processor';

import { DocumentModerationService } from './moderation/document-moderation.service';

import { DocumentGenerationService } from './generation/document-generation.service';
import { DocumentGenerationProcessor } from './generation/document-generation.processor';
import { GenerationContentService } from './generation/generation-content.service';
import { GenerationValidatorService } from './generation/generation-validator.service';
import { AdminGenerationController } from './generation/admin-generation.controller';

import { PdfRenderService } from './pdf/pdf-render.service';
import { PdfValidationService } from './pdf/pdf-validate.service';

import { AdminDocumentsController } from './admin/admin-documents.controller';
import { AdminDocumentsService } from './admin/admin-documents.service';

import { DocumentProgressGateway } from './realtime/document-progress.gateway';
import { DocumentProgressService } from './realtime/document-progress.service';
import { DocumentNotificationsService } from './notifications/document-notifications.service';

import { DocumentCleanupService } from './cleanup/document-cleanup.service';

import { MyDocumentsController } from './my-documents.controller';
import { DocumentsController } from './documents.controller';

@Module({
  imports: [
    PrismaModule,
    GeminiModule,
    AuditLogModule,
    NotificationsModule,
    DocumentStorageModule,
    BullModule.registerQueue(
      { name: DOCUMENT_PROCESSING_QUEUE },
      { name: DOCUMENT_GENERATION_QUEUE },
      { name: DOCUMENT_CLEANUP_QUEUE },
    ),
  ],
  controllers: [
    // Order matters — see the route-ordering note in each controller.
    // Literal-segment controllers must be registered before the
    // catch-all `:slug`/`:id` controllers so Nest's Express router
    // matches the literal route first.
    AdminGenerationController,
    AdminDocumentsController,
    MyDocumentsController,
    DocumentUploadController,
    DocumentsController,
  ],
  providers: [
    DocumentsService,
    DocumentInteractionsService,
    DocumentAccessPolicyService,
    DocumentPublishService,
    MyDocumentsService,

    DocumentUploadService,
    FileValidationService,

    ContentExtractionService,
    DuplicateCheckService,
    CommunityDocumentProcessor,

    DocumentModerationService,

    DocumentGenerationService,
    DocumentGenerationProcessor,
    GenerationContentService,
    GenerationValidatorService,

    PdfRenderService,
    PdfValidationService,

    AdminDocumentsService,

    DocumentProgressGateway,
    DocumentProgressService,
    DocumentNotificationsService,

    DocumentCleanupService,
  ],
})
export class DocumentsModule {}
