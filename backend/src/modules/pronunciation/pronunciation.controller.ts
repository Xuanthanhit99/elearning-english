// src/pronunciation/pronunciation.controller.ts
import {
  Body,
  Controller,
  Get,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PronunciationService } from './pronunciation.service';
import { GeneratePronunciationDto } from './dto/generate-pronunciation.dto';
import { AnalyzePronunciationDto } from './dto/analyze-pronunciation.dto';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('pronunciation')
export class PronunciationController {
  constructor(private readonly service: PronunciationService) {}

  @Post('generate')
  @UseGuards(JwtAuthGuard)
  generate(@Req() req: any, @Body() dto: GeneratePronunciationDto) {
    return this.service.generateExercise(req.user.id, dto);
  }

  @Post('analyze')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(FileInterceptor('audio'))
  analyze(
    @Req() req: any,
    @Body() dto: AnalyzePronunciationDto,
    @UploadedFile() audio: Express.Multer.File,
  ) {
    return this.service.analyze(req.user.id, dto.exerciseId, audio);
  }

  @Get('history')
  @UseGuards(JwtAuthGuard)
  history(@Req() req: any) {
    return this.service.history(req.user.id);
  }
}
