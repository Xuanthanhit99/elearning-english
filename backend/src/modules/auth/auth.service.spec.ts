import { Test, TestingModule } from '@nestjs/testing';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { AuthSessionService } from './auth-session.service';
import { AuthService } from './auth.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { MailService } from '../mail/mail.service';
import bcrypt from 'bcrypt';

describe('AuthService', () => {
  let service: AuthService;
  let prisma: any;
  let jwtService: any;
  let authSessionService: any;
  let auditLogService: any;

  const activeUser = {
    id: 'user-1',
    email: 'student@example.com',
    fullname: 'Student One',
    password: 'hashed-password',
    role: 'STUDENT',
    status: 'ACTIVE',
    failedLoginAttempts: 0,
    lockedUntil: null,
    twoFactorSecret: null,
  };

  beforeEach(async () => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      userDeviceSession: {
        updateMany: jest.fn(),
      },
    };
    jwtService = {
      signAsync: jest
        .fn()
        .mockResolvedValueOnce('access-token')
        .mockResolvedValueOnce('refresh-token'),
      verifyAsync: jest.fn(),
    };
    authSessionService = {
      createSession: jest.fn(),
      rotate: jest.fn(),
      invalidateByJti: jest.fn(),
    };
    auditLogService = { record: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: PrismaService, useValue: prisma },
        { provide: JwtService, useValue: jwtService },
        { provide: UploadService, useValue: {} },
        { provide: AuthSessionService, useValue: authSessionService },
        { provide: AuditLogService, useValue: auditLogService },
        { provide: MailService, useValue: {} },
      ],
    }).compile();

    service = module.get<AuthService>(AuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('keeps web login tokens in cookies only by default', async () => {
    jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true as never);
    prisma.user.findUnique.mockResolvedValueOnce(activeUser);

    const res = { cookie: jest.fn() };
    const req = {
      headers: { 'user-agent': 'web' },
      ip: '127.0.0.1',
      socket: {},
    };

    const response = await service.login(
      { email: activeUser.email, password: 'secret123' },
      req as any,
      res as any,
    );

    expect(res.cookie).toHaveBeenCalledWith(
      'access_token',
      'access-token',
      expect.any(Object),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      'refresh_token',
      'refresh-token',
      expect.any(Object),
    );
    expect(response).not.toHaveProperty('accessToken');
    expect(response).not.toHaveProperty('refreshToken');
  });

  it('returns the generated token pair for mobile login when requested', async () => {
    jest.spyOn(bcrypt, 'compare').mockResolvedValueOnce(true as never);
    prisma.user.findUnique.mockResolvedValueOnce(activeUser);

    const response = await service.login(
      { email: activeUser.email, password: 'secret123' },
      { headers: {}, socket: {} } as any,
      { cookie: jest.fn() } as any,
      { includeTokens: true },
    );

    expect(response).toMatchObject({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
  });

  it('returns rotated tokens for mobile refresh while reusing session rotation', async () => {
    jwtService.verifyAsync.mockResolvedValueOnce({
      sub: activeUser.id,
      role: activeUser.role,
      jti: 'old-jti',
    });
    jwtService.signAsync = jest
      .fn()
      .mockResolvedValueOnce('new-access-token')
      .mockResolvedValueOnce('new-refresh-token');
    prisma.user.findUnique.mockResolvedValueOnce({
      id: activeUser.id,
      fullname: activeUser.fullname,
      email: activeUser.email,
      role: activeUser.role,
      status: activeUser.status,
      avatar: null,
    });
    authSessionService.rotate.mockResolvedValueOnce({
      userId: activeUser.id,
      sessionId: 'session-1',
    });

    const response = await service.refreshToken(
      'old-refresh-token',
      { cookie: jest.fn() } as any,
      { includeTokens: true },
    );

    expect(authSessionService.rotate).toHaveBeenCalledWith('old-jti', expect.any(String));
    expect(response).toMatchObject({
      accessToken: 'new-access-token',
      refreshToken: 'new-refresh-token',
    });
  });
});
