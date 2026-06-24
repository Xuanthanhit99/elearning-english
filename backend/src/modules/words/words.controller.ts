import { Body, Controller, Post } from '@nestjs/common';
import { WordsService } from './words.service';
import { CheckWordDto } from './dto/check-word.dto';

@Controller('words')
export class WordsController {
  constructor(private wordsService: WordsService) {}
  @Post('check')
  checkWord(@Body() dto: CheckWordDto) {
    return this.wordsService.checkWord(dto);
  }
}
