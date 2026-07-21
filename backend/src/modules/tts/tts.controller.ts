// src/modules/tts/tts.controller.ts
import { BadRequestException, Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { TtsService } from './tts.service';
import { SynthesizeSpeechDto } from './dto/synthesize-speech.dto';

@Controller('tts')
export class TtsController {
  constructor(private readonly ttsService: TtsService) {}

  @Post('speak')
  @UseGuards(JwtAuthGuard)
  async speak(@Body() dto: SynthesizeSpeechDto) {
    const audioUrl = await this.ttsService.synthesize(dto.text, dto.lang ?? 'en');

    if (!audioUrl) {
      throw new BadRequestException('Không tạo được audio phát âm.');
    }

    return { audioUrl };
  }
}
