import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { WordsService } from './words.service';
import { CheckWordDto } from './dto/check-word.dto';
import { OptionalJwtGuard } from 'src/common/guards/optional-jwt.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';

@Controller('words')
export class WordsController {
  constructor(private wordsService: WordsService) {}
  // Public (auth optional) and calls Gemini directly on a cache miss — was
  // completely unthrottled, so anyone could force unlimited real Gemini spend
  // with no login required, just by submitting novel words.
  @UseGuards(OptionalJwtGuard, ThrottlerGuard)
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
  @Post('check')
  checkWord(@Body() dto: CheckWordDto, @Req() req: any) {
    return this.wordsService.checkWord(dto, req.user?.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('history')
  getMyHistory(@Req() req: any) {
    return this.wordsService.getMyHistory(req.user.id);
  }
}
