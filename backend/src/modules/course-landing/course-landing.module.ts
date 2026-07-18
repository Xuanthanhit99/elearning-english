import { Module } from '@nestjs/common';
import { CourseLandingController } from './course-landing.controller';
import { CourseLandingService } from './course-landing.service';

@Module({
  controllers: [CourseLandingController],
  providers: [CourseLandingService],
})
export class CourseLandingModule {}
