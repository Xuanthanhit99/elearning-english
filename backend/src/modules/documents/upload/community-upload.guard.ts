import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request } from 'express';
import { CommunityDocumentUploadAccessService } from './community-upload-access.service';

/**
 * Thin guard wrapper — real policy lives in
 * CommunityDocumentUploadAccessService so it stays unit-testable without
 * spinning up HTTP. Must run AFTER JwtAuthGuard (relies on
 * `request.user` already being populated).
 */
@Injectable()
export class CommunityDocumentUploadGuard implements CanActivate {
  constructor(private readonly access: CommunityDocumentUploadAccessService) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const user = request.user as
      | { id: string; email?: string; role: string }
      | undefined;
    if (!user) {
      throw new UnauthorizedException();
    }
    this.access.assertAllowed(user);
    return true;
  }
}
