import { Module } from '@nestjs/common';
import { TeacherDashboardController } from './teacher-dashboard.controller';
import { TeacherDashboardService } from './teacher-dashboard.service';

@Module({
  controllers: [TeacherDashboardController],
  providers: [TeacherDashboardService],
})
export class TeacherDashboardModule {}
