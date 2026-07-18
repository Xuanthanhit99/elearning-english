import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { ListeningAudioBackfillService } from './listening-audio-backfill.service';
import { ListeningJobService } from './listening-job.service';

/*
 * BẢO MẬT: endpoint này trigger Gemini + Google TTS hàng loạt (tốn phí).
 * Trước đây @Roles('ADMIN') bị comment nên RolesGuard cho qua mọi user
 * đã đăng nhập (RolesGuard trả true khi không có metadata roles).
 * Đã bật lại để chỉ ADMIN được gọi, giống các admin controller khác.
 */
@Controller('admin/listening-jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class ListeningJobController {
  constructor(
    private readonly listeningJobService: ListeningJobService,
    private readonly audioBackfillService: ListeningAudioBackfillService,
  ) {}

  @Post('generate')
  generate(
    @Body()
    body: {
      totalNeed?: number;
      batchSize?: number;
    },
  ) {
    return this.listeningJobService.enqueueGeneration({
      totalNeed: body.totalNeed,
      batchSize: body.batchSize,
    });
  }

  @Post('backfill-audio')
  backfillAudio(
    @Body()
    body: {
      limit?: number;
    },
  ) {
    return this.audioBackfillService.enqueueMissingAudio(body.limit);
  }
}
