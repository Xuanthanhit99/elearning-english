import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { QuizzesService } from './quizzes.service';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { CreateQuizDto } from './dto/create-quiz.dto';
import { SubmitQuizDto } from './dto/submit-quiz.dto';
@Controller()
@UseGuards(JwtAuthGuard)
export class QuizzesController {
  constructor(private readonly quizzesService: QuizzesService) {}

  @Post('lessons/:lessonId/quizzes')
  @UseGuards(RolesGuard)
  @Roles(UserRole.TEACHER, UserRole.ADMIN)
  createQuiz(
    @Param('lessonId') lessonId: string,
    @Req() req: any,
    @Body() dto: CreateQuizDto,
  ) {
    return this.quizzesService.createQuiz(lessonId, req.user, dto);
  }

  @Get('lessons/:lessonId/quizzes')
  getLessonQuizzes(@Param('lessonId') lessonId: string, @Req() req: any) {
    return this.quizzesService.getLessonQuizzes(lessonId, req.user.id);
  }

  @Post('quizzes/submit')
  submitQuiz(@Req() req: any, @Body() dto: SubmitQuizDto) {
    return this.quizzesService.submitQuiz(req.user.id, dto);
  }
}
