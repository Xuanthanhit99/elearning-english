import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { WordsService } from './words.service';
import { CheckWordDto } from './dto/check-word.dto';
import { OptionalJwtGuard } from 'src/common/guards/optional-jwt.guard';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('words')
export class WordsController {
  constructor(private wordsService: WordsService) {}
  @UseGuards(OptionalJwtGuard)
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
