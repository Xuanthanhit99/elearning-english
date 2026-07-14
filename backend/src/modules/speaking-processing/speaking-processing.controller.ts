import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { CreateSpeakingUploadDto } from './dto/create-speaking-upload.dto';
import { SpeakingProcessingService } from './speaking-processing.service';

@Controller('speaking')
@UseGuards(JwtAuthGuard)
export class SpeakingProcessingController {
  constructor(
    private readonly service: SpeakingProcessingService,
  ) {}

  @Post('sessions/:sessionId/upload')
  @UseInterceptors(
    FileInterceptor('audio', {
      limits: {
        fileSize: 25 * 1024 * 1024,
      },
    }),
  )
  upload(
    @Req() req: any,
    @Param('sessionId') sessionId: string,
    @UploadedFile()
    file: Express.Multer.File,
    @Body() dto: CreateSpeakingUploadDto,
  ) {
    return this.service.uploadAndQueue({
      userId: req.user.id,
      sessionId,
      file,
      dto,
    });
  }

  @Get('sessions/:sessionId/status')
  status(
    @Req() req: any,
    @Param('sessionId') sessionId: string,
  ) {
    return this.service.getStatus(
      req.user.id,
      sessionId,
    );
  }

  @Get('sessions/:sessionId/result')
  result(
    @Req() req: any,
    @Param('sessionId') sessionId: string,
  ) {
    return this.service.getResult(
      req.user.id,
      sessionId,
    );
  }
}
