import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { TeacherDashboardService } from './teacher-dashboard.service';

@Controller('teacher-dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.TEACHER, UserRole.ADMIN)
export class TeacherDashboardController {
  constructor(private teacherDashboardService: TeacherDashboardService) {}

  @Get('revenue')
  getRevenue(@Req() req: any) {
    return this.teacherDashboardService.getRevenue(req.user.id);
  }
}
