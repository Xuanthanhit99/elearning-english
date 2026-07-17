import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
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
import { Prisma } from '@prisma/client';
import { AuthSessionService } from './auth-session.service';

const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private uploadService: UploadService,
    private authSessionService: AuthSessionService,
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
        role: dto.role,
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

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const maxAge = dto.rememberMe
      ? 30 * 24 * 60 * 60 * 1000
      : 24 * 60 * 60 * 1000;

    const jti = randomUUID();

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as StringValue,
    });
    const refreshToken = await this.jwtService.signAsync(
      { ...payload, jti },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as StringValue,
      },
    );

    await this.authSessionService.createSession({
      userId: user.id,
      jti,
      userAgent: req.headers?.['user-agent'],
      ipAddress: req.ip ?? req.socket?.remoteAddress ?? null,
    });

    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    });

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
    });

    res.cookie('logged_in', 'true', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
    });

    return {
      message: 'Đăng nhập thành công',
      accessToken: accessToken,
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

    let payload: { sub: string; email: string; role: string; jti?: string };
    try {
      payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
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
        email: dbUser.email,
        role: dbUser.role,
      },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ||
          '15m') as StringValue,
      },
    );

    const newRefreshToken = await this.jwtService.signAsync(
      {
        sub: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
        jti: newJti,
      },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as StringValue,
      },
    );

    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60 * 1000,
    });

    res.cookie('refresh_token', newRefreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: REFRESH_COOKIE_MAX_AGE_MS,
    });

    res.cookie('logged_in', 'true', {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 15 * 60 * 1000,
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
        }>(refreshToken, { secret: process.env.JWT_REFRESH_SECRET });

        if (payload?.jti) {
          await this.authSessionService.invalidateByJti(payload.jti);
          await this.prisma.userDeviceSession.updateMany({
            where: { userId: payload.sub, refreshTokenId: payload.jti },
            data: { revokedAt: new Date() },
          });
        }
      } catch {
        // Token already invalid/expired — nothing left to revoke.
      }
    }

    res.clearCookie('refresh_token');
    res.clearCookie('access_token');
    res.clearCookie('logged_in');
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

    console.log('dấdasa', 'ds');

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

    const jti = randomUUID();

    const accessToken = await this.jwtService.signAsync(
      {
        sub: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
      },
      {
        secret: process.env.JWT_ACCESS_SECRET,
        expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as StringValue,
      },
    );
    const refreshToken = await this.jwtService.signAsync(
      {
        sub: dbUser.id,
        email: dbUser.email,
        role: dbUser.role,
        jti,
      },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as StringValue,
      },
    );

    await this.authSessionService.createSession({
      userId: dbUser.id,
      jti,
      userAgent: req?.headers?.['user-agent'],
      ipAddress: req?.ip ?? req?.socket?.remoteAddress ?? null,
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
