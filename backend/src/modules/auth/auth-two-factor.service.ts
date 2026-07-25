import {
  BadRequestException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { generateSecret, generateURI, verifySync } from 'otplib';
import * as QRCode from 'qrcode';
import bcrypt from 'bcrypt';
import type Redis from 'ioredis';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { settingsCacheKey } from '../settings/settings.constants';
import {
  decryptSecret,
  encryptSecret,
  generateRecoveryCodes,
} from './two-factor-crypto.util';
import { AUTH_REDIS } from './auth.constants';

@Injectable()
export class AuthTwoFactorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auditLog: AuditLogService,
    @Inject(AUTH_REDIS) private readonly redis: Redis,
  ) {}

  /** Step 1: generate a pending secret + QR code. Nothing is enabled yet. */
  async setup(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });

    if (!user) {
      throw new BadRequestException('KhÃ´ng tÃ¬m tháº¥y tÃ i khoáº£n');
    }

    const secret = generateSecret();
    const otpauthUrl = generateURI({
      issuer: 'BeaconVie',
      label: user.email,
      secret,
    });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorTempSecret: encryptSecret(secret) },
    });

    return {
      qrCodeDataUrl,
      manualEntryKey: secret,
    };
  }

  /** Step 2: verify the OTP typed from the authenticator app, then enable 2FA. */
  async confirm(userId: string, otp: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, twoFactorTempSecret: true },
    });

    if (!user?.twoFactorTempSecret) {
      throw new BadRequestException(
        'ChÆ°a khá»Ÿi táº¡o 2FA, vui lÃ²ng gá»i /auth/2fa/setup trÆ°á»›c',
      );
    }

    const secret = decryptSecret(user.twoFactorTempSecret);
    const isValid = verifySync({ token: otp, secret }).valid;

    if (!isValid) {
      throw new BadRequestException('MÃ£ OTP khÃ´ng Ä‘Ãºng');
    }

    const recoveryCodes = generateRecoveryCodes(8);
    const hashedRecoveryCodes = await Promise.all(
      recoveryCodes.map((code) => bcrypt.hash(code, 10)),
    );

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorSecret: encryptSecret(secret),
          twoFactorTempSecret: null,
          twoFactorRecoveryCodes: hashedRecoveryCodes,
        },
      }),
      this.prisma.userSettings.upsert({
        where: { userId },
        create: { userId, twoFactorEnabled: true },
        update: { twoFactorEnabled: true },
      }),
    ]);

    await this.redis.del(settingsCacheKey(userId)).catch(() => undefined);

    await this.auditLog.record({
      userId,
      action: 'TWO_FACTOR_ENABLED',
    });

    // Recovery codes are shown to the user exactly once, right now.
    return { recoveryCodes };
  }

  async disable(
    userId: string,
    credentials: { password?: string; otp?: string; recoveryCode?: string },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        password: true,
        twoFactorSecret: true,
        twoFactorRecoveryCodes: true,
      },
    });

    if (!user?.twoFactorSecret) {
      throw new BadRequestException('2FA hiá»‡n chÆ°a Ä‘Æ°á»£c báº­t');
    }

    const verified = await this.verifyAny(user, credentials);

    if (!verified) {
      throw new UnauthorizedException(
        'KhÃ´ng thá»ƒ xÃ¡c minh danh tÃ­nh Ä‘á»ƒ táº¯t 2FA',
      );
    }

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: userId },
        data: {
          twoFactorSecret: null,
          twoFactorTempSecret: null,
          twoFactorRecoveryCodes: [],
        },
      }),
      this.prisma.userSettings.upsert({
        where: { userId },
        create: { userId, twoFactorEnabled: false },
        update: { twoFactorEnabled: false },
      }),
    ]);

    await this.redis.del(settingsCacheKey(userId)).catch(() => undefined);

    await this.auditLog.record({
      userId,
      action: 'TWO_FACTOR_DISABLED',
    });

    return { success: true };
  }

  /** Used by the login flow once 2FA is enabled for a user (best-effort hook point). */
  async verifyLoginOtp(userId: string, otp: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { twoFactorSecret: true },
    });

    if (!user?.twoFactorSecret) return false;

    return verifySync({
      token: otp,
      secret: decryptSecret(user.twoFactorSecret),
    }).valid;
  }

  private async verifyAny(
    user: {
      password: string;
      twoFactorSecret: string | null;
      twoFactorRecoveryCodes: string[];
    },
    credentials: { password?: string; otp?: string; recoveryCode?: string },
  ) {
    if (credentials.password) {
      return bcrypt.compare(credentials.password, user.password);
    }

    if (credentials.otp && user.twoFactorSecret) {
      return verifySync({
        token: credentials.otp,
        secret: decryptSecret(user.twoFactorSecret),
      }).valid;
    }

    if (credentials.recoveryCode) {
      for (const hashed of user.twoFactorRecoveryCodes) {
        if (await bcrypt.compare(credentials.recoveryCode, hashed)) {
          return true;
        }
      }
    }

    return false;
  }
}
