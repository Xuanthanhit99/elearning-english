import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import type { Request, Response } from 'express';
import { UserRole } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Post('login')
  login(@Body() dto: LoginDto, @Res({ passthrough: true }) res: Response) {
    console.log("form");
    return this.authService.login(dto, res);
  }

  @Post('refresh')
  refresh(@Req() req: Request) {
    return this.authService.refreshToken(req.cookies?.refreshToken);
  }

  @Post('logout')
  logout(@Res({ passthrough: true }) res: Response) {
    return this.authService.logout(res);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  me(@Req() req: any) {
    return req.user;
  }

  @Get('teacher-test')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  teacherTest(@Req() req: any) {
    return {
      message: 'Chỉ TEACHER hoặc ADMIN mới vào được',
    };
  }
}
