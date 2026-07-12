import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { LessonBuilderService } from './lesson-builder.service';
import { CreateLessonBuilderOutlineDto } from './dto/create-lesson-builder-outline.dto';
import { UpdateBuilderOutlineDto } from './dto/update-builder-outline.dto';
import { GenerateBuilderContentDto } from './dto/generate-builder-content.dto';

@Controller('lesson-builder')
@UseGuards(JwtAuthGuard)
export class LessonBuilderController {
  constructor(private readonly lessonBuilderService: LessonBuilderService) {}

  @Post('outline')
  createOutline(@Req() req: any, @Body() dto: CreateLessonBuilderOutlineDto) {
    return this.lessonBuilderService.createOutline(req.user.id, dto);
  }

  @Get('projects')
  listProjects(@Req() req: any) {
    return this.lessonBuilderService.listProjects(req.user.id);
  }

  @Get('projects/:projectId')
  getProject(@Req() req: any, @Param('projectId') projectId: string) {
    return this.lessonBuilderService.getProject(req.user.id, projectId);
  }

  @Patch('projects/:projectId/outline')
  updateOutline(
    @Req() req: any,
    @Param('projectId') projectId: string,
    @Body() dto: UpdateBuilderOutlineDto,
  ) {
    return this.lessonBuilderService.updateOutline(
      req.user.id,
      projectId,
      dto.outline,
    );
  }

  @Post('projects/:projectId/confirm-outline')
  confirmOutline(@Req() req: any, @Param('projectId') projectId: string) {
    return this.lessonBuilderService.confirmOutline(req.user.id, projectId);
  }

  @Post('projects/:projectId/generate-content')
  generateContent(
    @Req() req: any,
    @Param('projectId') projectId: string,
    @Body() dto: GenerateBuilderContentDto,
  ) {
    return this.lessonBuilderService.generateContent(
      req.user.id,
      projectId,
      dto.lessonId,
    );
  }

  @Get('courses/:courseId')
  getCourse(@Req() req: any, @Param('courseId') courseId: string) {
    return this.lessonBuilderService.getCourse(req.user.id, courseId);
  }
}
