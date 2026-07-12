import {
  Controller,
  Get,
  MessageEvent,
  Param,
  Post,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { Observable, timer } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { PlacementProcessingService } from './placement-processing.service';

type AuthenticatedRequest = Request & {
  user?: {
    id: string;
  };
};

@Controller('placement/tests')
@UseGuards(JwtAuthGuard)
export class PlacementProcessingController {
  constructor(private readonly service: PlacementProcessingService) {}

  @Post(':testId/processing/start')
  async start(
    @Req() req: AuthenticatedRequest,
    @Param('testId') testId: string,
  ) {
    return {
      success: true,
      data: await this.service.ensureStarted(this.getUserId(req), testId),
    };
  }

  @Get(':testId/processing')
  async getSnapshot(
    @Req() req: AuthenticatedRequest,
    @Param('testId') testId: string,
  ) {
    return {
      success: true,
      data: await this.service.getSnapshot(this.getUserId(req), testId),
    };
  }

  // SSE: gửi snapshot mới mỗi giây. Trạng thái vẫn lưu DB nên reload không mất.
  @Get(':testId/processing/events')
  events(
    @Req() req: AuthenticatedRequest,
    @Param('testId') testId: string,
  ): Observable<MessageEvent> {
    const userId = this.getUserId(req);

    return timer(0, 1000).pipe(
      switchMap(async () => ({
        type: 'snapshot',
        data: await this.service.getSnapshot(userId, testId),
      })),
    );
  }

  private getUserId(req: AuthenticatedRequest) {
    const userId = req.user?.id;

    if (!userId) {
      throw new UnauthorizedException(
        'Không xác định được người dùng đăng nhập.',
      );
    }

    return userId;
  }
}
