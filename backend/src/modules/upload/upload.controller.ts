import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { UploadService } from './upload.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UserRole } from '@prisma/client';

@Controller('upload')
@UseGuards(JwtAuthGuard, RolesGuard)
export class UploadController {
  constructor(private uploadService: UploadService) {}

  @Post('image')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 5 * 1024 * 1024,
      },
    }),
  )
  async uploadImage(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn ảnh');
    }

    if (!file.mimetype.startsWith('image/')) {
      throw new BadRequestException('File phải là ảnh');
    }

    const result: any = await this.uploadService.uploadFile(
      file,
      'english-platform/images',
      'image',
    );

    return {
      url: result.secure_url,
      publicId: result.public_id,
      type: 'IMAGE',
    };
  }

  @Post('video')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: {
        fileSize: 200 * 1024 * 1024,
      },
    }),
  )
  async uploadVideo(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('Vui lòng chọn video');
    }

    if (!file.mimetype.startsWith('video/')) {
      throw new BadRequestException('File phải là video');
    }

    const result: any = await this.uploadService.uploadFile(
      file,
      'english-platform/videos',
      'video',
    );

    return {
      url: result.secure_url,
      publicId: result.public_id,
      type: 'VIDEO',
    };
  }
}
