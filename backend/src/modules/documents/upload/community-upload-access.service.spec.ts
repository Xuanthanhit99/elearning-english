import { ForbiddenException } from '@nestjs/common';
import { CommunityDocumentUploadAccessService } from './community-upload-access.service';

describe('CommunityDocumentUploadAccessService', () => {
  const ENV_KEYS = [
    'DOCUMENT_COMMUNITY_UPLOAD_ENABLED',
    'DOCUMENT_COMMUNITY_UPLOAD_ALLOWED_USER_IDS',
    'DOCUMENT_COMMUNITY_UPLOAD_ALLOWED_EMAILS',
  ];
  let originalEnv: NodeJS.ProcessEnv;
  let service: CommunityDocumentUploadAccessService;

  beforeEach(() => {
    originalEnv = { ...process.env };
    for (const key of ENV_KEYS) delete process.env[key];
    service = new CommunityDocumentUploadAccessService();
  });

  afterEach(() => {
    for (const key of ENV_KEYS) delete process.env[key];
    Object.assign(process.env, originalEnv);
  });

  it('admin is always allowed, flag off, no allowlist', () => {
    expect(service.isAllowed({ id: 'admin-1', email: 'admin@beaconvie.com', role: 'ADMIN' })).toBe(true);
  });

  it('regular user is denied when flag=false and not on any allowlist', () => {
    process.env.DOCUMENT_COMMUNITY_UPLOAD_ENABLED = 'false';
    expect(service.isAllowed({ id: 'user-1', email: 'nobody@example.com', role: 'STUDENT' })).toBe(false);
  });

  it('assertAllowed throws ForbiddenException (not some other error) for a denied user', () => {
    process.env.DOCUMENT_COMMUNITY_UPLOAD_ENABLED = 'false';
    expect(() =>
      service.assertAllowed({ id: 'user-1', role: 'STUDENT' }),
    ).toThrow(ForbiddenException);
  });

  it('user ID on the allowlist is allowed even with flag=false', () => {
    process.env.DOCUMENT_COMMUNITY_UPLOAD_ENABLED = 'false';
    process.env.DOCUMENT_COMMUNITY_UPLOAD_ALLOWED_USER_IDS = 'user-1,user-2';
    expect(service.isAllowed({ id: 'user-1', role: 'STUDENT' })).toBe(true);
    expect(service.isAllowed({ id: 'user-3', role: 'STUDENT' })).toBe(false);
  });

  it('email allowlist match is case-insensitive', () => {
    process.env.DOCUMENT_COMMUNITY_UPLOAD_ENABLED = 'false';
    process.env.DOCUMENT_COMMUNITY_UPLOAD_ALLOWED_EMAILS = 'Internal@BeaconVie.com';
    expect(
      service.isAllowed({ id: 'user-1', email: 'internal@beaconvie.com', role: 'STUDENT' }),
    ).toBe(true);
    expect(
      service.isAllowed({ id: 'user-1', email: 'INTERNAL@BEACONVIE.COM', role: 'STUDENT' }),
    ).toBe(true);
  });

  it('email allowlist tolerates surrounding whitespace in the CSV', () => {
    process.env.DOCUMENT_COMMUNITY_UPLOAD_ENABLED = 'false';
    process.env.DOCUMENT_COMMUNITY_UPLOAD_ALLOWED_EMAILS = ' internal@beaconvie.com , other@beaconvie.com ';
    expect(
      service.isAllowed({ id: 'user-1', email: 'other@beaconvie.com', role: 'STUDENT' }),
    ).toBe(true);
  });

  it('flag=true allows any authenticated (non-admin) user', () => {
    process.env.DOCUMENT_COMMUNITY_UPLOAD_ENABLED = 'true';
    expect(service.isAllowed({ id: 'user-1', role: 'STUDENT' })).toBe(true);
  });

  it('malformed/empty allowlist env values never accidentally grant access', () => {
    process.env.DOCUMENT_COMMUNITY_UPLOAD_ENABLED = 'false';
    process.env.DOCUMENT_COMMUNITY_UPLOAD_ALLOWED_USER_IDS = '   ,  ,';
    process.env.DOCUMENT_COMMUNITY_UPLOAD_ALLOWED_EMAILS = '';
    expect(service.isAllowed({ id: 'user-1', email: 'x@example.com', role: 'STUDENT' })).toBe(false);
    // An empty-string user id must never match an accidentally-empty
    // allowlist entry produced by e.g. a trailing comma.
    expect(service.isAllowed({ id: '', role: 'STUDENT' })).toBe(false);
  });

  it('a user with no email is still evaluated safely against the ID allowlist', () => {
    process.env.DOCUMENT_COMMUNITY_UPLOAD_ENABLED = 'false';
    process.env.DOCUMENT_COMMUNITY_UPLOAD_ALLOWED_USER_IDS = 'user-1';
    expect(service.isAllowed({ id: 'user-1', role: 'STUDENT' })).toBe(true);
    expect(service.isAllowed({ id: 'user-2', role: 'STUDENT' })).toBe(false);
  });
});
