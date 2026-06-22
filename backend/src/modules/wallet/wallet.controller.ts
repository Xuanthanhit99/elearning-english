import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { WalletService } from './wallet.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CreateWithdrawDto } from './dto/create-withdraw.dto';
import { WithdrawStatus } from '@prisma/client';
import { UserRole } from '@prisma/client';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get('teacher-wallet')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  getTeacherWallet(@Req() req: any) {
    return this.walletService.getTeacherWallet(req.user.id);
  }

  @Post('teacher-wallet/withdraw')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  createWithdraw(@Req() req: any, @Body() dto: CreateWithdrawDto) {
    return this.walletService.createWithdrawRequest(req.user.id, dto);
  }

  @Get('teacher-wallet/withdraws')
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  getMyWithdraws(@Req() req: any) {
    return this.walletService.getMyWithdraws(req.user.id);
  }

  @Get('admin-wallet/withdraws')
  @Roles(UserRole.ADMIN)
  getAllWithdraws() {
    return this.walletService.getAllWithdraws();
  }

  @Patch('admin-wallet/withdraws/:id/approve')
  @Roles(UserRole.ADMIN)
  approve(@Param('id') id: string) {
    return this.walletService.updateWithdrawStatus(id, WithdrawStatus.APPROVED);
  }

  @Patch('admin-wallet/withdraws/:id/reject')
  @Roles(UserRole.ADMIN)
  reject(@Param('id') id: string) {
    return this.walletService.updateWithdrawStatus(id, WithdrawStatus.REJECTED);
  }

  @Patch('admin-wallet/withdraws/:id/paid')
  @Roles(UserRole.ADMIN)
  paid(@Param('id') id: string) {
    return this.walletService.updateWithdrawStatus(id, WithdrawStatus.PAID);
  }
}
