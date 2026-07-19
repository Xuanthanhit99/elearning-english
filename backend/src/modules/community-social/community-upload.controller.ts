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
        const allowed = file.mimetype.startsWith('image/');

        if (!allowed) {
          callback(new BadRequestException('Chỉ hỗ trợ file ảnh'), false);
          return;
        }

        callback(null, true);
      },
    }),
  )
  upload(@UploadedFile() file: Express.Multer.File, @Req() req: Request) {
    if (!file) {
      throw new BadRequestException('Không nhận được file ảnh');
    }

    const configuredBaseUrl = process.env.API_PUBLIC_URL?.replace(/\/$/, '');

    const requestBaseUrl = `${req.protocol}://${req.get('host')}`;

    const baseUrl = configuredBaseUrl || requestBaseUrl;

    return {
      type: 'IMAGE',
      name: file.originalname,
      fileName: file.filename,
      relativeUrl: `/uploads/community/${file.filename}`,
      url: `${baseUrl}/uploads/community/${file.filename}`,
    };
  }
}
