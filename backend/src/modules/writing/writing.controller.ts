import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { WritingService } from './writing.service';
import { CheckWritingDto } from './dro/check-writing.dto';
import { OptionalJwtGuard } from 'src/common/guards/optional-jwt.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('writing')
export class WritingController {
  constructor(private readonly writingService: WritingService) {}

  @UseGuards(OptionalJwtGuard)
  @Post('check')
  checkWriting(@Body() dto: CheckWritingDto, @Req() req: any) {
    return this.writingService.checkWriting(dto, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('history')
  getMyWritingHistory(@Req() req: any) {
    return this.writingService.getMyHistory(req.user.id);
  }
}
