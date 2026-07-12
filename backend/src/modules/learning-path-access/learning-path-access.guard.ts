import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import type { Request } from 'express';
import { LearningPathAccessService } from './learning-path-access.service';

type AuthenticatedRequest = Request & {
  user?: {
    id?: string;
    userId?: string;
    sub?: string;
  };
};

@Injectable()
export class LearningPathAccessGuard implements CanActivate {
  constructor(private readonly accessService: LearningPathAccessService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    const userId =
      request.user?.id ?? request.user?.userId ?? request.user?.sub;

    if (!userId) {
      throw new ForbiddenException({
        code: 'AUTH_REQUIRED',
        message: 'Bạn cần đăng nhập.',
        nextUrl: '/login',
      });
    }

    const access = await this.accessService.resolve(userId);

    if (!access.allowed) {
      throw new ForbiddenException({
        code: 'PLACEMENT_REQUIRED',
        ...access,
      });
    }

    return true;
  }
}
