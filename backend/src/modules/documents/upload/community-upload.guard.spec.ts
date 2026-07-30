import { ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { CommunityDocumentUploadGuard } from './community-upload.guard';
import { CommunityDocumentUploadAccessService } from './community-upload-access.service';

function makeContext(user: unknown) {
  return {
    switchToHttp: () => ({
      getRequest: () => ({ user }),
    }),
  } as never;
}

describe('CommunityDocumentUploadGuard', () => {
  it('throws Unauthorized if request.user is missing (guest — real 401 is enforced upstream by JwtAuthGuard, this is defense in depth)', () => {
    const guard = new CommunityDocumentUploadGuard(new CommunityDocumentUploadAccessService());
    expect(() => guard.canActivate(makeContext(undefined))).toThrow(UnauthorizedException);
  });

  it('throws Forbidden for an authenticated user the access service denies', () => {
    process.env.DOCUMENT_COMMUNITY_UPLOAD_ENABLED = 'false';
    process.env.DOCUMENT_COMMUNITY_UPLOAD_ALLOWED_USER_IDS = '';
    process.env.DOCUMENT_COMMUNITY_UPLOAD_ALLOWED_EMAILS = '';
    const guard = new CommunityDocumentUploadGuard(new CommunityDocumentUploadAccessService());
    expect(() =>
      guard.canActivate(makeContext({ id: 'user-1', role: 'STUDENT' })),
    ).toThrow(ForbiddenException);
  });

  it('allows an admin through', () => {
    const guard = new CommunityDocumentUploadGuard(new CommunityDocumentUploadAccessService());
    expect(guard.canActivate(makeContext({ id: 'admin-1', role: 'ADMIN' }))).toBe(true);
  });

  it('allows any authenticated user when the beta flag is on', () => {
    process.env.DOCUMENT_COMMUNITY_UPLOAD_ENABLED = 'true';
    const guard = new CommunityDocumentUploadGuard(new CommunityDocumentUploadAccessService());
    expect(guard.canActivate(makeContext({ id: 'user-1', role: 'STUDENT' }))).toBe(true);
    delete process.env.DOCUMENT_COMMUNITY_UPLOAD_ENABLED;
  });
});
