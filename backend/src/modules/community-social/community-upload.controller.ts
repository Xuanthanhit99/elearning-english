import {
  BadRequestException,
  Controller,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { randomUUID } from 'node:crypto';
import { extname } from 'node:path';
import { diskStorage } from 'multer';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

const DOCUMENT_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

// Matches CreateCommunityMediaDto's declared `IMAGE | AUDIO | VIDEO |
// DOCUMENT` union (create-community-post.dto.ts) — the upload endpoint
// previously only accepted images, silently making audio/video/document
// posts impossible to attach real media to.
function resolveMediaType(mimetype: string): 'IMAGE' | 'AUDIO' | 'VIDEO' | 'DOCUMENT' | null {
  if (mimetype.startsWith('image/')) return 'IMAGE';
  if (mimetype.startsWith('audio/')) return 'AUDIO';
  if (mimetype.startsWith('video/')) return 'VIDEO';
  if (DOCUMENT_MIME_TYPES.has(mimetype)) return 'DOCUMENT';
  return null;
}

@Controller('community')
@UseGuards(JwtAuthGuard)
export class CommunityUploadController {
  @Post('uploads')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads/community',

        filename: (_req, file, callback) => {
          const extension = extname(file.originalname).toLowerCase();

          callback(null, `${randomUUID()}${extension}`);
        },
      }),

      limits: {
        fileSize: 20 * 1024 * 1024,
      },

      fileFilter: (_req, file, callback) => {
        const allowed = resolveMediaType(file.mimetype) !== null;

        if (!allowed) {
          callback(new BadRequestException('Định dạng file không được hỗ trợ'), false);
          return;
        }

        callback(null, true);
      },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    if (!file) {
      throw new BadRequestException('Không nhận được file');
    }

    const configuredBaseUrl = process.env.API_PUBLIC_URL?.replace(/\/$/, '');

    const requestBaseUrl = `${req.protocol}://${req.get('host')}`;

    const baseUrl = configuredBaseUrl || requestBaseUrl;

    return {
      type: resolveMediaType(file.mimetype) ?? 'DOCUMENT',
      name: file.originalname,
      fileName: file.filename,
      relativeUrl: `/uploads/community/${file.filename}`,
      url: `${baseUrl}/uploads/community/${file.filename}`,
    };
  }
}
