import {
  BadRequestException,
  Injectable,
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
import { Prisma, UserRole, UserStatus } from '@prisma/client';
import { AuthSessionService } from './auth-session.service';
import { decryptSecret } from './two-factor-crypto.util';
import { AuditLogService } from '../audit-log/audit-log.service';
import {
  ACCESS_COOKIE_MAX_AGE_MS,
  REFRESH_COOKIE_MAX_AGE_MS,
  authCookieOptions,
  clearAuthCookieOptions,
  visibleCookieOptions,
} from './auth-cookie.util';
import { getJwtAccessSecret, getJwtRefreshSecret } from './auth-secrets.util';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private uploadService: UploadService,
    private authSessionService: AuthSessionService,
    private auditLogService: AuditLogService,
  ) {}

  async register(dto: RegisterDto) {
    const existUser = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existUser) {
      throw new BadRequestException('Email đã tồn tại');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        fullname: dto.fullName,
        email: dto.email,
        password: hashedPassword,
        role: UserRole.STUDENT,
        status: UserStatus.ACTIVE,
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

    return {
      message: 'Đăng ký thành công',
      user,
    };
  }

  async login(dto: LoginDto, req: Request, res: Response) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (!user) {
      throw new BadRequestException('Email hoặc mật khẩu không đúng');
    }

    const isValidPassword = await bcrypt.compare(dto.password, user.password);

    if (!isValidPassword) {
      throw new BadRequestException('Email hoặc mật khẩu không đúng');
    }

    if (user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(
        'Tài khoản hiện không được phép đăng nhập',
      );
    }

    if (user.twoFactorSecret) {
      if (!dto.otp && !dto.recoveryCode) {
        return {
          success: false,
          twoFactorRequired: true,
          message: 'Vui lòng nhập mã xác thực hai bước',
        };
      }

      const twoFactorVerified = await this.verifyLoginSecondFactor(user.id, {
        otp: dto.otp,
        recoveryCode: dto.recoveryCode,
      });

      if (!twoFactorVerified) {
        throw new UnauthorizedException('Mã xác thực hai bước không đúng');
      }
    }

    const payload = {
      sub: user.id,
      role: user.role,
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
      message: 'Đăng nhập thành công',
      user: {
        id: user.id,
        fullname: user.fullname,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    };
  }

  async refreshToken(refreshToken: string, res: Response) {
    if (!refreshToken) {
      throw new UnauthorizedException('Không có refresh token');
    }

    let payload: { sub: string; role: string; jti?: string };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: getJwtRefreshSecret(),
      });
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }

    if (!payload.jti) {
      // Legacy token issued before session tracking existed — reject so the
      // user has to log in again and get a properly tracked session.
      throw new UnauthorizedException('Refresh token không hợp lệ');
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
      throw new UnauthorizedException('Người dùng không tồn tại');
    }

    if (dbUser.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException(
        'Tài khoản hiện không được phép làm mới phiên',
      );
    }

    const newJti = randomUUID();
    const rotated = await this.authSessionService.rotate(payload.jti, newJti);

    if (!rotated) {
      throw new UnauthorizedException(
        'Phiên đăng nhập đã bị thu hồi, vui lòng đăng nhập lại',
      );
    }

    const accessToken = await this.jwtService.signAsync(
      {
        sub: dbUser.id,
        role: dbUser.role,
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
      message: 'Refresh token thành công',
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
        // Token already invalid/expired — nothing left to revoke.
      }
    }

    res.clearCookie('refresh_token', clearAuthCookieOptions);
    res.clearCookie('access_token', clearAuthCookieOptions);
    res.clearCookie('logged_in', { ...clearAuthCookieOptions, httpOnly: false });
    return {
      message: 'Đăng xuất thành công',
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
      throw new BadRequestException('Không lấy được email từ tài khoản');
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
        'Tài khoản hiện không được phép đăng nhập',
      );
    }

    const jti = randomUUID();

    const accessToken = await this.jwtService.signAsync(
      {
        sub: dbUser.id,
        role: dbUser.role,
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
        level: true,
        xp: true,
        isPro: true,
        createAt: true,
      },
    });

    if (!getUser) {
      throw new BadRequestException(
        'Không tìm thấy tài khoản email đã đăng ký',
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

    const wordSheet = workbook.addWorksheet('Lịch sử check từ');

    wordSheet.columns = [
      { header: 'Từ', key: 'word', width: 25 },
      { header: 'Nghĩa', key: 'meaning', width: 35 },
      { header: 'Level', key: 'level', width: 15 },
      { header: 'Loại từ', key: 'partOfSpeech', width: 15 },
      { header: 'Ngày check', key: 'createdAt', width: 25 },
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

    const writingSheet = workbook.addWorksheet('Lịch sử check bài');
    writingSheet.columns = [
      { header: 'Bài gốc', key: 'originalText', width: 50 },
      { header: 'Điểm', key: 'score', width: 10 },
      { header: 'Grammar', key: 'grammarScore', width: 10 },
      { header: 'Vocabulary', key: 'vocabularyScore', width: 12 },
      { header: 'Clarity', key: 'clarityScore', width: 10 },
      { header: 'Meaning', key: 'meaningScore', width: 10 },
      { header: 'Phiên bản gợi ý', key: 'suggestedVersion', width: 50 },
      { header: 'Ngày check', key: 'createdAt', width: 25 },
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
      from: `"PoppyLingo" <${process.env.MAIL_USER}>`,
      to: user.email,
      subject: 'Báo cáo học tập PoppyLingo',
      html: `
        <h2>Xin chào ${user.fullname || 'bạn'},</h2>
        <p>Miu gửi bạn file Excel báo cáo lịch sử học tập.</p>
        <p>File bao gồm lịch sử check từ và check bài.</p>
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
        throw new BadRequestException('Username đã được sử dụng');
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
      data: dto,
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
