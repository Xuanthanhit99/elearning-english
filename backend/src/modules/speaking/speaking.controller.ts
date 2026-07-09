import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { SpeakingService } from './speaking.service';

@Controller('speaking')
export class SpeakingController {
  constructor(private readonly speakingService: SpeakingService) {}

  @UseGuards(JwtAuthGuard)
  @Get('home')
  async getHome(@Req() req: any) {
    const userId = req.user.id;

    const data = await this.speakingService.getHome(userId);

    return {
      success: true,
      data,
    };
  }
}
