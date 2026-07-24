import {
  Body,
  Controller,
  Get,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import type { Request, Response } from 'express';
import { UserRole } from '@prisma/client';
import { AuthGuard } from '@nestjs/passport';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { VocabularyJobService } from '../vocabulary-job/vocabulary-job.service';
import {
  ACCESS_COOKIE_MAX_AGE_MS,
  REFRESH_COOKIE_MAX_AGE_MS,
  authCookieOptions,
  visibleCookieOptions,
} from './auth-cookie.util';
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly vocabularyJobService: VocabularyJobService,
  ) {}

  @Post('register')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.login(dto, req, res);
  }

  @Post('refresh')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async refresh(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ) {
    const refreshToken = req.cookies?.refresh_token;
    return this.authService.refreshToken(refreshToken, res);
  }

  @Post('logout')
  logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.authService.logout(req.cookies?.refresh_token, res);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: any) {
    return this.authService.getMe(req.user.id);
  }

  @Get('teacher-test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  teacherTest(@Req() req: any) {
    return {
      message: 'Chỉ TEACHER hoặc ADMIN mới vào được',
    };
  }

  @Get('google')
  @UseGuards(AuthGuard('google'))
  googleLogin() {}

  @Get('google/callback')
  @UseGuards(AuthGuard('google'))
  async googleCallback(@Req() req: any, @Res() res: Response) {
    try {
      const result = await this.authService.socialLogin(req.user, req);
      res.cookie(
        'refresh_token',
        result.refreshToken,
        authCookieOptions(REFRESH_COOKIE_MAX_AGE_MS),
      );
      res.cookie(
        'access_token',
        result.accessToken,
        authCookieOptions(ACCESS_COOKIE_MAX_AGE_MS),
      );
      res.cookie(
        'logged_in',
        'true',
        visibleCookieOptions(ACCESS_COOKIE_MAX_AGE_MS),
      );
      return res.redirect(
        `${process.env.FRONTEND_URL}/auth/callback?status=success`,
      );
    } catch (error) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/auth/callback?status=error`,
      );
    }
  }

  @Get('facebook')
  @UseGuards(AuthGuard('facebook'))
  facebookLogin() {}

  @Get('facebook/callback')
  @UseGuards(AuthGuard('facebook'))
  async facebookCallback(@Req() req: any, @Res() res: Response) {
    try {
      const result = await this.authService.socialLogin(req.user, req);
      res.cookie(
        'refresh_token',
        result.refreshToken,
        authCookieOptions(REFRESH_COOKIE_MAX_AGE_MS),
      );
      res.cookie(
        'access_token',
        result.accessToken,
        authCookieOptions(ACCESS_COOKIE_MAX_AGE_MS),
      );
      res.cookie(
        'logged_in',
        'true',
        visibleCookieOptions(ACCESS_COOKIE_MAX_AGE_MS),
      );
      return res.redirect(
        `${process.env.FRONTEND_URL}/auth/callback?status=success`,
      );
    } catch (error) {
      return res.redirect(
        `${process.env.FRONTEND_URL}/auth/callback?status=error`,
      );
    }
  }

  @Post('export-report-email')
  @UseGuards(JwtAuthGuard)
  async exportReport(@Req() req: any) {
    return this.authService.sendReportToEmail(req.user.id);
  }

  @Patch('me/profile')
  @UseGuards(JwtAuthGuard)
  updateProfile(@Req() req, @Body() dto: UpdateProfileDto) {
    return this.authService.updateProfile(req.user.id, dto);
  }

  @Patch('me/avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('avatar'))
  updateAvatar(@Req() req: any, @UploadedFile() file: Express.Multer.File) {
    return this.authService.updateAvatar(req.user.id, file);
  }

  @Get('check-username')
  @UseGuards(JwtAuthGuard)
  checkUsername(@Query('username') username: string, @Req() req) {
    return this.authService.checkUsername(username, req.user.id);
  }

  @Post('jobs/generate-weekly-pool')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  generateWeeklyPool() {
    return this.vocabularyJobService.generateWeeklyTopicPools();
  }
}
