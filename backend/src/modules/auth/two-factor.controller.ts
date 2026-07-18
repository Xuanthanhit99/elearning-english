import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AuthTwoFactorService } from './auth-two-factor.service';
import { ConfirmTwoFactorDto, DisableTwoFactorDto } from './dto/two-factor.dto';

@Controller('auth/2fa')
@UseGuards(JwtAuthGuard)
export class TwoFactorController {
  constructor(private readonly twoFactorService: AuthTwoFactorService) {}

  @Post('setup')
  setup(@CurrentUser('id') userId: string) {
    return this.twoFactorService.setup(userId);
  }

  @Post('confirm')
  confirm(@CurrentUser('id') userId: string, @Body() dto: ConfirmTwoFactorDto) {
    return this.twoFactorService.confirm(userId, dto.otp);
  }

  @Post('disable')
  disable(@CurrentUser('id') userId: string, @Body() dto: DisableTwoFactorDto) {
    return this.twoFactorService.disable(userId, dto);
  }
}
