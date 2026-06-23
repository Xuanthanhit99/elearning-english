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
import { Response } from 'express';
import { StringValue } from 'ms';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
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

  async login(dto: LoginDto, res: Response) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    console.log('form', dto);

    if (!user) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const isValidPassword = await bcrypt.compare(dto.password, user.password);

    if (!isValidPassword) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }

    const payload = {
      sub: user.id,
      email: user.email,
      role: user.role,
    };

    const accessToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_ACCESS_SECRET,
      expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN || '15m') as StringValue,
    });
    const refreshToken = await this.jwtService.signAsync(payload, {
      secret: process.env.JWT_REFRESH_SECRET,
      expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as StringValue,
    });

    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: false,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
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

  async refreshToken(refreshToken: string) {
    if (!refreshToken) {
      throw new UnauthorizedException('Không có refresh token');
    }

    try {
      const payload = await this.jwtService.verifyAsync(refreshToken, {
        secret: process.env.JWT_REFRESH_SECRET,
      });

      const accessToken = await this.jwtService.signAsync(
        {
          sub: payload.sub,
          email: payload.email,
          role: payload.role,
        },
        {
          secret: process.env.JWT_ACCESS_SECRET,
          expiresIn: (process.env.JWT_ACCESS_EXPIRES_IN ||
            '15m') as StringValue,
        },
      );

      const dbUser = await this.prisma.user.findUnique({
        where: { email: payload.email },
      });

      return {
        accessToken,
        user: {
          id: dbUser?.id,
          fullName: dbUser?.fullname,
          email: dbUser?.email,
          role: dbUser?.role,
          status: dbUser?.status,
        },
      };
    } catch {
      throw new UnauthorizedException('Refresh token không hợp lệ');
    }
  }

  async logout(res: Response) {
    res.clearCookie('refreshToken');

    return {
      message: 'Đăng xuất thành công',
    };
  }

  async socialLogin(profile: {
    provider: string;
    providerId: string;
    email?: string;
    fullname?: string;
    avatar?: string;
  }) {
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
      },
      {
        secret: process.env.JWT_REFRESH_SECRET,
        expiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as StringValue,
      },
    );

    return { accessToken, dbUser, refreshToken };
  }

  async getMe(email: string) {
    const getUser = await this.prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        fullname: true,
        avatar: true,
        role: true,
        status: true,
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
}
