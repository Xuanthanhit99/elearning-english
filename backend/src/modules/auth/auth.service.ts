import {
  BadRequestException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { JwtService } from '@nestjs/jwt';
import { RegisterDto } from './dto/register.dto';
import bcrypt from 'bcrypt';
import { LoginDto } from './dto/login.dto';
import { Request, Response } from 'express';
import { StringValue } from 'ms';
import * as ExcelJS from 'exceljs';
import * as nodemailer from 'nodemailer';
import { randomUUID } from 'crypto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UploadService } from '../upload/upload.service';
import { Prisma, User, UserRole, UserStatus } from '@prisma/client';
import { AuthSessionService } from './auth-session.service';
import { decryptSecret } from './two-factor-crypto.util';
import { AuditLogService } from '../audit-log/audit-log.service';
import { MailService } from '../mail/mail.service';
import { generateRawToken, hashToken } from './auth-token.util';
import {
  ACCESS_COOKIE_MAX_AGE_MS,
  REFRESH_COOKIE_MAX_AGE_MS,
  authCookieOptions,
  clearAllAuthCookies,
  visibleCookieOptions,
} from './auth-cookie.util';
import { getJwtAccessSecret, getJwtRefreshSecret } from './auth-secrets.util';

/** Temporary (not permanent) brute-force lockout â€” see AuthService.login(). */
const MAX_FAILED_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_DURATION_MS = 15 * 60 * 1000;

const PASSWORD_RESET_TOKEN_TTL_MS = 30 * 60 * 1000;
const EMAIL_VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private uploadService: UploadService,
    private authSessionService: AuthSessionService,
    private auditLogService: AuditLogService,
    private mailService: MailService,
  ) {}

  async register(dto: RegisterDto) {
    const existUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existUser) {
      throw new BadRequestException('Email Ä‘Ã£ tá»“n táº¡i');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        fullname: dto.fullName,
        email: dto.email,
        password: hashedPassword,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
        isEmailVerified: false,
      },
      select: {
        id: true,
        email: true,
        fullname: true,
        role: true,
        status: true,
        createAt: true,
      },
    });

    // Verification is informational only â€” it does not gate login/access (see
    // `resendVerificationEmail`/`verifyEmail`), so a failure here must never
    // fail registration itself.
    this.sendVerificationEmailInternal(user).catch((error) => {
      this.logger.warn(
        `Failed to send verification email to userId=${user.id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    });

    return {
      message: 'ÄÄƒng kÃ½ thÃ nh cÃ´ng',
      user,
    };
  }

  async login(dto: LoginDto, req: Request, res: Response) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new BadRequestException('Email hoáº·c máº­t kháº©u khÃ´ng Ä‘Ãºng');
    }

    // Temporary (not permanent) account-level lockout, independent of the
    // generic per-IP Throttler on this route â€” that alone lets a distributed
    // attacker rotating IPs guess a single account's password with no
    // effective limit. Checked before the password comparison so a locked
    // account never leaks a "valid password" timing signal either.
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      await this.auditLogService.record({
        userId: user.id,
        action: 'AUTH_LOGIN_BLOCKED_LOCKOUT',
        changedFields: [],
        metadata: { lockedUntil: user.lockedUntil.toISOString() },
        ipAddress: req.ip ?? req.socket?.remoteAddress ?? null,
        userAgent: req.headers?.['user-agent'],
      });
      throw new UnauthorizedException(
        'TÃ i khoáº£n táº¡m thá»i bá»‹ khÃ³a do Ä‘Äƒng nháº­p sai nhiá»u láº§n. Vui lÃ²ng Thử lại sau.',
      );
    }

    const isValidPassword = await bcrypt.compare(dto.password, user.password);

    if (!isValidPassword) {
      await this.recordFailedLogin(user, req);
      throw new BadRequestException('Email hoáº·c máº­t kháº©u khÃ´ng Ä‘Ãºng');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(
        'TÃ i khoáº£n hiá»‡n khÃ´ng Ä‘Æ°á»£c phÃ©p Ä‘Äƒng nháº­p',
      );
    }

    if (user.twoFactorSecret) {
      if (!dto.otp && !dto.recoveryCode) {
        return {
          success: false,
          twoFactorRequired: true,
          message: 'Vui lÃ²ng nháº­p mÃ£ xÃ¡c thá»±c hai bÆ°á»›c',
        };
      }

      const twoFactorVerified = await this.verifyLoginSecondFactor(user.id, {
        otp: dto.otp,
        recoveryCode: dto.recoveryCode,
      });

      if (!twoFactorVerified) {
        await this.auditLogService.record({
          userId: user.id,
          action: 'AUTH_LOGIN_2FA_FAILED',
          changedFields: [],
          ipAddress: req.ip ?? req.socket?.remoteAddress ?? null,
          userAgent: req.headers?.['user-agent'],
        });
        throw new UnauthorizedException('MÃ£ xÃ¡c thá»±c hai bÆ°á»›c khÃ´ng Ä‘Ãºng');
      }
    }

    // A correct password (and, if applicable, correct 2FA) clears any
    // accumulated failure count so a legitimate user's next mistyped attempt
    // starts counting from zero again, not from a stale near-lockout state.
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await this.prisma.user.update({
        where: { id: user.id },
        data: { failedLoginAttempts: 0, lockedUntil: null },
      });
    }

    const payload = {
      sub: user.id,
      role: user.role,
      email: user.email,
    };

    const maxAge = dto.rememberMe
      ? 30 * 24 * 60 * 60 * 1000
      : 24 * 60 * 60 * 1000;

    const jti = randomUUID();

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: getJwtAccessSecret(),
      expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as StringValue,
    });
    const refreshToken = await this.jwtService.signAsync(
      { ...payload, jti },
      {
        secret: getJwtRefreshSecret(),
        expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as StringValue,
      },
    );

    await this.authSessionService.createSession({
      userId: user.id,
      jti,
      userAgent: req.headers?.['user-agent'],
      ipAddress: req.ip ?? req.socket?.remoteAddress ?? null,
    });

    await this.auditLogService.record({
      userId: user.id,
      action: 'AUTH_LOGIN_SUCCESS',
      changedFields: ['session'],
      metadata: {
        userAgent: req.headers?.['user-agent'] ?? null,
        ipAddress: req.ip ?? req.socket?.remoteAddress ?? null,
      },
      ipAddress: req.ip ?? req.socket?.remoteAddress ?? null,
      userAgent: req.headers?.['user-agent'],
    });

    res.cookie(
      'refresh_token',
      refreshToken,
      authCookieOptions(REFRESH_COOKIE_MAX_AGE_MS),
    );

    res.cookie('access_token', accessToken, authCookieOptions(maxAge));

    res.cookie('logged_in', 'true', visibleCookieOptions(maxAge));

    return {
      success: true,
      message: 'ÄÄƒng nháº­p thÃ nh cÃ´ng',
      user: {
        id: user.id,
        fullname: user.fullname,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    };
  }

  /**
   * Always returns the same generic message regardless of whether `email`
   * matches an account â€” never reveal account existence via response
   * content, status code, or a materially different code path (the one
   * real-world timing difference â€” whether an email actually gets sent â€” is
   * inherent to any such flow and not practically closable without a fake
   * SMTP round-trip; kept the response shape and status code identical,
   * which is the part actually observable by a scripted enumeration probe).
   */
  async forgotPassword(email: string, req: Request) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (user && user.status === UserStatus.ACTIVE) {
      const rawToken = generateRawToken();
      const tokenHash = hashToken(rawToken);

      // Invalidate any still-outstanding token from an earlier request so an
      // old, possibly-leaked link stops working the moment a new one is
      // issued.
      await this.prisma.passwordResetToken.updateMany({
        where: { userId: user.id, usedAt: null },
        data: { usedAt: new Date() },
      });

      await this.prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
          ipAddress: req.ip ?? req.socket?.remoteAddress ?? null,
          userAgent: req.headers?.['user-agent'] as string | undefined,
        },
      });

      const resetUrl = `${this.frontendUrl()}/reset-password?token=${rawToken}`;

      try {
        await this.mailService.sendPasswordResetEmail(
          user.email,
          user.fullname,
          resetUrl,
        );
      } catch (error) {
        // Never let a mail-provider failure leak to the client â€” that would
        // itself be an enumeration signal (silent success vs. visible error).
        this.logger.warn(
          `Failed to send password reset email to userId=${user.id}: ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }

    return {
      message:
        'Náº¿u email tá»“n táº¡i trong há»‡ thá»‘ng, chÃºng tÃ´i Ä‘Ã£ gá»­i hÆ°á»›ng dáº«n Ä‘áº·t láº¡i máº­t kháº©u.',
    };
  }

  async resetPassword(rawToken: string, newPassword: string) {
    const tokenHash = hashToken(rawToken);
    const record = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException(
        'LiÃªn káº¿t Ä‘áº·t láº¡i máº­t kháº©u khÃ´ng há»£p lá»‡ hoáº·c Ä‘Ã£ háº¿t háº¡n.',
      );
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: {
          password: hashedPassword,
          failedLoginAttempts: 0,
          lockedUntil: null,
        },
      }),
      this.prisma.passwordResetToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    // No "current" session to preserve in this unauthenticated flow â€” every
    // session, on every device, must die so a stolen password can't keep a
    // live session going after the legitimate owner resets it.
    await this.revokeAllSessions(record.userId);

    await this.auditLogService.record({
      userId: record.userId,
      action: 'AUTH_PASSWORD_RESET',
      changedFields: ['password', 'session'],
    });

    return {
      message: 'Äáº·t láº¡i máº­t kháº©u thÃ nh cÃ´ng. Vui lÃ²ng Ä‘Äƒng nháº­p láº¡i.',
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('KhÃ´ng tÃ¬m tháº¥y tÃ i khoáº£n.');
    }

    const isValidPassword = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!isValidPassword) {
      throw new BadRequestException('Máº­t kháº©u hiá»‡n táº¡i khÃ´ng Ä‘Ãºng.');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        failedLoginAttempts: 0,
        lockedUntil: null,
      },
    });

    // The access-token payload carries no session/jti identifier (only
    // sub/role/email), so there is no reliable way to tell "this request's
    // own session" apart from any other live session for this user â€” revoke
    // everything, including the caller's own session, and require a fresh
    // login. Safer than guessing, and matches the same "never leave old
    // sessions active after a password event" rule applied to reset.
    await this.revokeAllSessions(userId);

    await this.auditLogService.record({
      userId,
      action: 'AUTH_PASSWORD_CHANGED',
      changedFields: ['password', 'session'],
    });

    return {
      message: 'Äá»•i máº­t kháº©u thÃ nh cÃ´ng. Vui lÃ²ng Ä‘Äƒng nháº­p láº¡i.',
    };
  }

  async verifyEmail(rawToken: string) {
    const tokenHash = hashToken(rawToken);
    const record = await this.prisma.emailVerificationToken.findUnique({
      where: { tokenHash },
    });

    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException(
        'LiÃªn káº¿t xÃ¡c minh email khÃ´ng há»£p lá»‡ hoáº·c Ä‘Ã£ háº¿t háº¡n.',
      );
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: record.userId },
        data: { isEmailVerified: true },
      }),
      this.prisma.emailVerificationToken.update({
        where: { id: record.id },
        data: { usedAt: new Date() },
      }),
    ]);

    await this.auditLogService.record({
      userId: record.userId,
      action: 'AUTH_EMAIL_VERIFIED',
      changedFields: ['isEmailVerified'],
    });

    return { message: 'XÃ¡c minh email thÃ nh cÃ´ng.' };
  }

  async resendVerificationEmail(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('KhÃ´ng tÃ¬m tháº¥y tÃ i khoáº£n.');
    }

    if (user.isEmailVerified) {
      return { message: 'Email cá»§a báº¡n Ä‘Ã£ Ä‘Æ°á»£c xÃ¡c minh.' };
    }

    await this.sendVerificationEmailInternal(user);

    return { message: 'ÄÃ£ gá»­i láº¡i email xÃ¡c minh.' };
  }

  async refreshToken(refreshToken: string, res: Response) {
    if (!refreshToken) {
      throw new UnauthorizedException('KhÃ´ng cÃ³ refresh token');
    }

    let payload: { sub: string; role: string; jti?: string };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: getJwtRefreshSecret(),
      });
    } catch {
      throw new UnauthorizedException('Refresh token khÃ´ng há»£p lá»‡');
    }

    if (!payload.jti) {
      // Legacy token issued before session tracking existed â€” reject so the
      // user has to log in again and get a properly tracked session.
      throw new UnauthorizedException('Refresh token khÃ´ng há»£p lá»‡');
    }

    const dbUser = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        fullname: true,
        email: true,
        role: true,
        status: true,
        avatar: true,
      },
    });

    if (!dbUser) {
      throw new UnauthorizedException('NgÆ°á»i dÃ¹ng khÃ´ng tá»“n táº¡i');
    }

    if (dbUser.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(
        'TÃ i khoáº£n hiá»‡n khÃ´ng Ä‘Æ°á»£c phÃ©p lÃ m má»›i phiÃªn',
      );
    }

    const newJti = randomUUID();
    const rotated = await this.authSessionService.rotate(payload.jti, newJti);

    if (!rotated) {
      // A valid, correctly-signed refresh token whose jti is no longer live
      // means either it already rotated once (a legitimate client retrying
      // a stale token) or â€” more concerning â€” someone is replaying a token
      // that was already used elsewhere. Rotation itself already prevents
      // the replay from succeeding; this audit event is what gives that
      // scenario a forensic trail instead of vanishing as a silent 401.
      await this.auditLogService.record({
        userId: payload.sub,
        action: 'AUTH_REFRESH_REUSE_REJECTED',
        changedFields: [],
        metadata: { jti: payload.jti },
      });
      throw new UnauthorizedException(
        'PhiÃªn Ä‘Äƒng nháº­p Ä‘Ã£ bá»‹ thu há»“i, vui lÃ²ng Ä‘Äƒng nháº­p láº¡i',
      );
    }

    const accessToken = await this.jwtService.signAsync(
      {
        sub: dbUser.id,
        role: dbUser.role,
        email: dbUser.email,
      },
      {
        secret: getJwtAccessSecret(),
        expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as StringValue,
      },
    );

    const newRefreshToken = await this.jwtService.signAsync(
      {
        sub: dbUser.id,
        role: dbUser.role,
        jti: newJti,
      },
      {
        secret: getJwtRefreshSecret(),
        expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as StringValue,
      },
    );

    res.cookie(
      'access_token',
      accessToken,
      authCookieOptions(ACCESS_COOKIE_MAX_AGE_MS),
    );

    res.cookie(
      'refresh_token',
      newRefreshToken,
      authCookieOptions(REFRESH_COOKIE_MAX_AGE_MS),
    );

    res.cookie(
      'logged_in',
      'true',
      visibleCookieOptions(ACCESS_COOKIE_MAX_AGE_MS),
    );

    await this.auditLogService.record({
      userId: dbUser.id,
      action: 'AUTH_REFRESH_ROTATED',
      changedFields: ['session'],
      metadata: { oldJti: payload.jti, newJti },
    });

    return {
      success: true,
      message: 'Refresh token thÃ nh cÃ´ng',
      data: {
        user: {
          id: dbUser.id,
          fullName: dbUser.fullname,
          email: dbUser.email,
          role: dbUser.role,
          status: dbUser.status,
          avatar: dbUser.avatar,
        },
      },
    };
  }

  async logout(refreshToken: string | undefined, res: Response) {
    if (refreshToken) {
      try {
        const payload = await this.jwtService.verifyAsync<{
          sub: string;
          jti?: string;
        }>(refreshToken, { secret: getJwtRefreshSecret() });

        if (payload?.jti) {
          await this.authSessionService.invalidateByJti(payload.jti);
          await this.prisma.userDeviceSession.updateMany({
            where: { userId: payload.sub, refreshTokenId: payload.jti },
            data: { revokedAt: new Date() },
          });
          await this.auditLogService.record({
            userId: payload.sub,
            action: 'AUTH_LOGOUT',
            changedFields: ['session'],
            metadata: { jti: payload.jti },
          });
        }
      } catch {
        // Token already invalid/expired â€” nothing left to revoke.
      }
    }

    clearAllAuthCookies(res);
    return {
      message: 'ÄÄƒng xuáº¥t thÃ nh cÃ´ng',
    };
  }

  async socialLogin(
    profile: {
      provider: string;
      providerId: string;
      email?: string;
      fullname?: string;
      avatar?: string;
    },
    req?: Request,
  ) {
    if (!profile.email) {
      throw new BadRequestException('KhÃ´ng láº¥y Ä‘Æ°á»£c email tá»« tÃ i khoáº£n');
    }

    let dbUser = await this.prisma.user.findUnique({
      where: {
        email: profile.email,
      },
    });

    if (!dbUser) {
      dbUser = await this.prisma.user.create({
        data: {
          email: profile.email,
          fullname: profile.fullname || profile.email,
          avatar: profile.avatar,
          password: '',
          role: 'STUDENT',
        },
      });
    }

    if (dbUser && !dbUser.provider) {
      dbUser = await this.prisma.user.update({
        where: {
          id: dbUser.id,
        },
        data: {
          provider: profile.provider,
          providerId: profile.providerId,
          avatar: dbUser.avatar || profile.avatar,
        },
      });
    }

    if (dbUser.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(
        'TÃ i khoáº£n hiá»‡n khÃ´ng Ä‘Æ°á»£c phÃ©p Ä‘Äƒng nháº­p',
      );
    }

    const jti = randomUUID();

    const accessToken = await this.jwtService.signAsync(
      {
        sub: dbUser.id,
        role: dbUser.role,
        email: dbUser.email,
      },
      {
        secret: getJwtAccessSecret(),
        expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as StringValue,
      },
    );
    const refreshToken = await this.jwtService.signAsync(
      {
        sub: dbUser.id,
        role: dbUser.role,
        jti,
      },
      {
        secret: getJwtRefreshSecret(),
        expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as StringValue,
      },
    );

    await this.authSessionService.createSession({
      userId: dbUser.id,
      jti,
      userAgent: req?.headers?.['user-agent'],
      ipAddress: req?.ip ?? req?.socket?.remoteAddress ?? null,
    });

    await this.auditLogService.record({
      userId: dbUser.id,
      action: 'AUTH_SOCIAL_LOGIN_SUCCESS',
      changedFields: ['session'],
      metadata: {
        provider: profile.provider,
        userAgent: req?.headers?.['user-agent'] ?? null,
        ipAddress: req?.ip ?? req?.socket?.remoteAddress ?? null,
      },
      ipAddress: req?.ip ?? req?.socket?.remoteAddress ?? null,
      userAgent: req?.headers?.['user-agent'],
    });

    return { accessToken, dbUser, refreshToken };
  }

  async getMe(userId: string) {
    const getUser = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        fullname: true,
        email: true,
        avatar: true,
        username: true,
        bio: true,
        goal: true,
        interests: true,
        phone: true,
        level: true,
        xp: true,
        isPro: true,
        role: true,
        englishLevel: true,
        learningGoal: true,
        createAt: true,
      },
    });

    if (!getUser) {
      throw new BadRequestException(
        'KhÃ´ng tÃ¬m tháº¥y tÃ i khoáº£n email Ä‘Ã£ Ä‘Äƒng kÃ½',
      );
    }

    return {
      success: true,
      data: { getUser },
    };
  }

  async sendReportToEmail(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user?.email) {
      throw new Error('User email not found');
    }

    const wordHistory = await this.prisma.userWordHistory.findMany({
      where: { userId },
      include: {
        word: true,
      },
      orderBy: { searchedAt: 'desc' },
    });

    const writingHistory = await this.prisma.writingSubmission.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });

    const workbook = new ExcelJS.Workbook();

    const wordSheet = workbook.addWorksheet('Lá»‹ch sá»­ check tá»«');

    wordSheet.columns = [
      { header: 'Tá»«', key: 'word', width: 25 },
      { header: 'NghÄ©a', key: 'meaning', width: 35 },
      { header: 'Level', key: 'level', width: 15 },
      { header: 'Loáº¡i tá»«', key: 'partOfSpeech', width: 15 },
      { header: 'NgÃ y check', key: 'createdAt', width: 25 },
    ];

    wordHistory.forEach((item) => {
      wordSheet.addRow({
        word: item.word.word,
        meaning: item.word.meaningVi || item.word.meaningEn,
        level: item.word.level,
        partOfSpeech: item.word.partOfSpeech,
        createdAt: item.searchedAt.toLocaleString(),
      });
    });

    const writingSheet = workbook.addWorksheet('Lá»‹ch sá»­ check bÃ i');
    writingSheet.columns = [
      { header: 'BÃ i gá»‘c', key: 'originalText', width: 50 },
      { header: 'Äiá»ƒm', key: 'score', width: 10 },
      { header: 'Grammar', key: 'grammarScore', width: 10 },
      { header: 'Vocabulary', key: 'vocabularyScore', width: 12 },
      { header: 'Clarity', key: 'clarityScore', width: 10 },
      { header: 'Meaning', key: 'meaningScore', width: 10 },
      { header: 'PhiÃªn báº£n gá»£i Ã½', key: 'suggestedVersion', width: 50 },
      { header: 'NgÃ y check', key: 'createdAt', width: 25 },
    ];

    writingHistory.forEach((item) => {
      writingSheet.addRow({
        originalText: item.originalText,
        score: item.score,
        grammarScore: item.grammarScore,
        vocabularyScore: item.vocabularyScore,
        clarityScore: item.clarityScore,
        meaningScore: item.meaningScore,
        suggestedVersion: item.suggestedVersion,
        createdAt: item.createdAt.toLocaleString(),
      });
    });

    const buffer = await workbook.xlsx.writeBuffer();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: `"BeaconVie" <${process.env.MAIL_USER}>`,
      to: user.email,
      subject: 'BÃ¡o cÃ¡o há»c táº­p BeaconVie',
      html: `
        <h2>Xin chÃ o ${user.fullname || 'báº¡n'},</h2>
        <p>Miu gá»­i báº¡n file Excel bÃ¡o cÃ¡o lá»‹ch sá»­ há»c táº­p.</p>
        <p>File bao gá»“m lá»‹ch sá»­ check tá»« vÃ  check bÃ i.</p>
      `,
      attachments: [
        {
          filename: 'miulingo-report.xlsx',
          content: Buffer.from(buffer),
          contentType:
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      ],
    });
    return {
      message: 'Report sent successfully',
    };
  }

  // users.service.ts
  async updateProfile(userId: string, dto: UpdateProfileDto) {
    if (dto.username) {
      const existed = await this.prisma.user.findFirst({
        where: {
          username: dto.username,
          NOT: { id: userId },
        },
        select: {
          id: true,
        },
      });

      if (existed) {
        throw new BadRequestException('Username Ä‘Ã£ Ä‘Æ°á»£c sá»­ dá»¥ng');
      }
    }

    const data: Prisma.UserUpdateInput = {};

    if (dto.fullname !== undefined) data.fullname = dto.fullname;
    if (dto.username !== undefined) data.username = dto.username;
    if (dto.bio !== undefined) data.bio = dto.bio;
    if (dto.goal !== undefined) data.goal = dto.goal;
    if (dto.interests !== undefined) data.interests = dto.interests;
    if (dto.phone !== undefined) data.phone = dto.phone;
    if (dto.englishLevel !== undefined) data.englishLevel = dto.englishLevel;
    if (dto.learningGoal !== undefined) data.learningGoal = dto.learningGoal;

    return this.prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        fullname: true,
        username: true,
        email: true,
        avatar: true,
        bio: true,
        goal: true,
        interests: true,
        phone: true,
        englishLevel: true,
        learningGoal: true,
        role: true,
        level: true,
        xp: true,
        isPro: true,
      },
    });
  }

  async checkUsername(username: string, userId: string) {
    const existed = await this.prisma.user.findFirst({
      where: {
        username,
        NOT: { id: userId },
      },
    });

    return {
      username,
      available: !existed,
    };
  }

  private async verifyLoginSecondFactor(
    userId: string,
    credentials: { otp?: string; recoveryCode?: string },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorSecret: true,
        twoFactorRecoveryCodes: true,
      },
    });

    if (!user?.twoFactorSecret) {
      return true;
    }

    if (credentials.otp) {
      const { verifySync } = await import('otplib');

      return verifySync({
        token: credentials.otp,
        secret: decryptSecret(user.twoFactorSecret),
      }).valid;
    }

    if (credentials.recoveryCode) {
      const matchedCode = await this.findMatchingRecoveryCode(
        credentials.recoveryCode,
        user.twoFactorRecoveryCodes,
      );

      if (!matchedCode) {
        return false;
      }

      await this.prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorRecoveryCodes: user.twoFactorRecoveryCodes.filter(
            (code) => code !== matchedCode,
          ),
        },
      });

      return true;
    }

    return false;
  }

  private async findMatchingRecoveryCode(
    recoveryCode: string,
    hashedCodes: string[],
  ) {
    for (const hashedCode of hashedCodes) {
      if (await bcrypt.compare(recoveryCode, hashedCode)) {
        return hashedCode;
      }
    }

    return null;
  }

  private frontendUrl() {
    return process.env.FRONTEND_URL || 'http://localhost:3000';
  }

  /** Revokes every live session/refresh-token for a user â€” used by both
   * password reset (unauthenticated, no session to preserve) and password
   * change (see changePassword's comment on why "keep current session" isn't
   * safely possible today). Mirrors SettingsService.revokeOtherDevices'
   * Redis-then-DB ordering: the refresh-token pointer dies first so a
   * session can't mint a new access token even if the DB update below fails.
   */
  private async revokeAllSessions(userId: string) {
    await this.authSessionService.invalidateAllOtherSessions(userId);
    await this.prisma.userDeviceSession.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  private async recordFailedLogin(
    user: Pick<User, 'id' | 'failedLoginAttempts'>,
    req: Request,
  ) {
    const attempts = user.failedLoginAttempts + 1;
    const locked = attempts >= MAX_FAILED_LOGIN_ATTEMPTS;

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        // Reset the counter once locked so the next window (after the lock
        // expires) starts fresh instead of instantly re-locking on attempt 1.
        failedLoginAttempts: locked ? 0 : attempts,
        lockedUntil: locked
          ? new Date(Date.now() + LOGIN_LOCKOUT_DURATION_MS)
          : null,
      },
    });

    await this.auditLogService.record({
      userId: user.id,
      action: locked ? 'AUTH_LOGIN_LOCKED' : 'AUTH_LOGIN_FAILURE',
      changedFields: ['failedLoginAttempts'],
      metadata: { attempts },
      ipAddress: req.ip ?? req.socket?.remoteAddress ?? null,
      userAgent: req.headers?.['user-agent'],
    });
  }

  private async sendVerificationEmailInternal(
    user: Pick<User, 'id' | 'email' | 'fullname'>,
  ) {
    await this.prisma.emailVerificationToken.updateMany({
      where: { userId: user.id, usedAt: null },
      data: { usedAt: new Date() },
    });

    const rawToken = generateRawToken();
    const tokenHash = hashToken(rawToken);

    await this.prisma.emailVerificationToken.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt: new Date(Date.now() + EMAIL_VERIFICATION_TOKEN_TTL_MS),
      },
    });

    const verifyUrl = `${this.frontendUrl()}/verify-email?token=${rawToken}`;
    await this.mailService.sendVerificationEmail(
      user.email,
      user.fullname,
      verifyUrl,
    );
  }

  // users.service.ts
  async updateAvatar(userId: string, file: Express.Multer.File) {
    const uploaded: any = await this.uploadService.uploadFile(
      file,
      'english-platform/images/avatar',
      'image',
    );

    return this.prisma.user.update({
      where: { id: userId },
      data: {
        avatar: uploaded.secure_url,
      },
      select: {
        id: true,
        fullname: true,
        email: true,
        avatar: true,
        phone: true,
        englishLevel: true,
        learningGoal: true,
        role: true,
      },
    });
  }
}
