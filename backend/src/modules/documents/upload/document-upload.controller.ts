import {
  BadRequestException,
  Body,
  Controller,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { DocumentUploadService } from './document-upload.service';
import { CreateDocumentUploadDto } from '../dto/document-upload.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';
import { getDocumentMaxFileSizeMb } from '../../../config/document-storage.config';
import { CommunityDocumentUploadGuard } from './community-upload.guard';

// Registered before DocumentsController in DocumentsModule so the
// literal `/documents/uploads` segment is matched before that
// controller's `GET /documents/:slug` catch-all.
// The app-wide ValidationPipe (main.ts) does not set `transform: true`,
// so `@Transform`-decorated fields on CreateDocumentUploadDto (booleans,
// arrays coming from multipart string fields) would validate correctly
// but reach the handler untransformed — this local override ensures the
// handler actually receives real booleans/arrays, not raw strings.
//
// CommunityDocumentUploadGuard applies to every method here (upload,
// resubmit, create-revision) — all three can introduce a new file into
// the community pipeline, so the internal-beta allowlist gates all of
// them, not just the initial upload. Must come after JwtAuthGuard.
@Controller('documents/uploads')
@UseGuards(JwtAuthGuard, CommunityDocumentUploadGuard)
@UsePipes(
  new ValidationPipe({
    transform: true,
    whitelist: true,
    forbidNonWhitelisted: true,
  }),
)
export class DocumentUploadController {
  constructor(private readonly uploadService: DocumentUploadService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: getDocumentMaxFileSizeMb() * 1024 * 1024 },
    }),
  )
  async upload(
    @CurrentUser('id') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: CreateDocumentUploadDto,
  ) {
    if (!file) throw new BadRequestException('Không nhận được file.');
    return this.uploadService.uploadNew(userId, file, dto);
  }

  @Post(':documentId/resubmit')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async resubmit(
    @CurrentUser('id') userId: string,
    @Param('documentId') documentId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Không nhận được file.');
    return this.uploadService.createNewVersion(
      userId,
      documentId,
      file,
      'resubmit',
    );
  }

  @Post(':documentId/create-revision')
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async createRevision(
    @CurrentUser('id') userId: string,
    @Param('documentId') documentId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Không nhận được file.');
    return this.uploadService.createNewVersion(
      userId,
      documentId,
      file,
      'revision',
    );
  }
}
