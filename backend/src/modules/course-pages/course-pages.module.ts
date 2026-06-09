import { Module } from '@nestjs/common';
import { CoursePagesController } from './course-pages.controller';
import { CoursePagesService } from './course-pages.service';

@Module({
  controllers: [CoursePagesController],
  providers: [CoursePagesService]
})
export class CoursePagesModule {}
