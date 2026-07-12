import {
  Body,
  Controller,
  Param,
  ParseFilePipeBuilder,
  Post,
  Req,
  UnauthorizedException,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import type { Request } from 'express';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PlacementResponseService } from './placement-response.service';
import { SubmitPlacementWritingDto } from './dto/submit-placement-writing.dto';
import { SubmitPlacementSpeakingDto } from './dto/submit-placement-speaking.dto';
import { SkipPlacementSpeakingDto } from './dto/skip-placement-speaking.dto';

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
  };
};

@Controller('placement/tests')
@UseGuards(JwtAuthGuard)
export class PlacementResponseController {
  constructor(
    private readonly placementResponseService: PlacementResponseService,
  ) {}

  @Post(':sessionId/speaking')
  @UseInterceptors(
    FileInterceptor('audio', {
      limits: {
        fileSize: 15 * 1024 * 1024,
      },
    }),
  )
  async submitSpeaking(
    @Req() req: AuthenticatedRequest,
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitPlacementSpeakingDto,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addFileTypeValidator({
          fileType: /(audio\/webm|audio\/wav|audio\/mpeg|audio\/mp4)/,
        })
        .addMaxSizeValidator({
          maxSize: 15 * 1024 * 1024,
        })
        .build({
          fileIsRequired: true,
        }),
    )
    audio: Express.Multer.File,
  ) {
    return {
      success: true,
      message: 'Đã lưu bài nói.',
      data: await this.placementResponseService.submitSpeaking({
        userId: this.getUserId(req),
        sessionId,
        questionId: dto.questionId,
        spentSeconds: Number(dto.spentSeconds),
        audio,
      }),
    };
  }

  @Post(':sessionId/speaking/skip')
  async skipSpeaking(
    @Req() req: AuthenticatedRequest,
    @Param('sessionId') sessionId: string,
    @Body() dto: SkipPlacementSpeakingDto,
  ) {
    return {
      success: true,
      message:
        dto.action === 'DEFERRED'
          ? 'Đã lưu để đánh giá Speaking sau.'
          : 'Đã bỏ qua phần Speaking.',
      data: await this.placementResponseService.skipSpeaking({
        userId: this.getUserId(req),
        sessionId,
        questionId: dto.questionId,
        action: dto.action,
        spentSeconds: dto.spentSeconds ?? 0,
      }),
    };
  }

  @Post(':sessionId/writing')
  async submitWriting(
    @Req() req: AuthenticatedRequest,
    @Param('sessionId') sessionId: string,
    @Body() dto: SubmitPlacementWritingDto,
  ) {
    return {
      success: true,
      message: 'Đã lưu bài viết.',
      data: await this.placementResponseService.submitWriting({
        userId: this.getUserId(req),
        sessionId,
        questionId: dto.questionId,
        content: dto.content,
        spentSeconds: dto.spentSeconds,
      }),
    };
  }

  private getUserId(req: AuthenticatedRequest): string {
    const userId = req.user?.id;

    if (!userId) {
      throw new UnauthorizedException(
        'Không xác định được người dùng đăng nhập.',
      );
    }

    return userId;
  }
}
