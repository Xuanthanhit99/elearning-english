import { Module } from '@nestjs/common';
import { GeminiModule } from '../gemini/gemini.module';
import { LessonBuilderController } from './lesson-builder.controller';
import { LessonBuilderService } from './lesson-builder.service';

@Module({
  imports: [GeminiModule],
  controllers: [LessonBuilderController],
  providers: [LessonBuilderService],
  exports: [LessonBuilderService],
})
export class LessonBuilderModule {}
