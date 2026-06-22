import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { LessonsService } from './lessons.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UpdateLessonDto } from './dto/update-lesson.dto';
import { CreateLessonDto } from './dto/create-lesson.dto';
import { UserRole } from '@prisma/client';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class LessonsController {
  constructor(private readonly lessonsService: LessonsService) {}

  @Post('sections/:sectionId/lessons')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  create(
    @Param('sectionId') sectionId: string,
    @Req() req: any,
    @Body() dto: CreateLessonDto,
  ) {
    return this.lessonsService.create(sectionId, req.user, dto);
  }

  @Patch('lessons/:id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  update(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: UpdateLessonDto,
  ) {
    return this.lessonsService.update(id, req.user, dto);
  }

  @Delete('lessons/:id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  delete(@Param('id') id: string, @Req() req: any) {
    return this.lessonsService.delete(id, req.user);
  }
}
