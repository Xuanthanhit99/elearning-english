import { Test, TestingModule } from '@nestjs/testing';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { VocabularyJobService } from '../vocabulary-job/vocabulary-job.service';

describe('AuthController', () => {
  let controller: AuthController;
  const authService = {
    login: jest.fn(),
    refreshToken: jest.fn(),
    logout: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();

    const module: TestingModule = await Test.createTestingModule({
      // Several routes carry @UseGuards(..., ThrottlerGuard) — ThrottlerGuard
      // needs THROTTLER:MODULE_OPTIONS/ThrottlerStorage from ThrottlerModule
      // to be instantiable, same as the real app.module.ts registration.
      imports: [ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }])],
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: authService },
        { provide: VocabularyJobService, useValue: {} },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('keeps web login cookie-based by default', () => {
    const req = { get: jest.fn().mockReturnValue(undefined) } as any;
    const res = {};
    const dto = { email: 'a@example.com', password: 'secret123' };

    controller.login(dto, req, res as any);

    expect(authService.login).toHaveBeenCalledWith(dto, req, res, {
      includeTokens: false,
    });
  });

  it('returns tokens for explicit bearer login transport', () => {
    const req = {
      get: jest.fn().mockReturnValue('bearer'),
    } as any;
    const res = {};
    const dto = { email: 'a@example.com', password: 'secret123' };

    controller.login(dto, req, res as any);

    expect(authService.login).toHaveBeenCalledWith(dto, req, res, {
      includeTokens: true,
    });
  });

  it('refreshes web sessions from the existing refresh cookie', async () => {
    const req = {
      cookies: { refresh_token: 'cookie-refresh' },
      get: jest.fn().mockReturnValue(undefined),
    } as any;
    const res = {};

    await controller.refresh({}, req, res as any);

    expect(authService.refreshToken).toHaveBeenCalledWith(
      'cookie-refresh',
      res,
      { includeTokens: false },
    );
  });

  it('refreshes mobile sessions from an explicit body refresh token', async () => {
    const req = {
      cookies: { refresh_token: 'cookie-refresh' },
      get: jest.fn().mockReturnValue(undefined),
    } as any;
    const res = {};

    await controller.refresh({ refreshToken: 'mobile-refresh' }, req, res as any);

    expect(authService.refreshToken).toHaveBeenCalledWith(
      'mobile-refresh',
      res,
      { includeTokens: true },
    );
  });
});
