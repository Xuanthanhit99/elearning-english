import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class LearningService {
  constructor(private prismaService: PrismaService) {}

  async getLessonDetail(userId: string, lessonId: string) {
    const lesson = await this.prismaService.lesson.findUnique({
      where: { id: lessonId },
      include: {
        section: {
          include: {
            course: true,
          },
        },
      },
    });

    if (!lesson) {
      throw new NotFoundException('Không tìm thấy bài học');
    }

    const courseId = lesson.section.course.id;

    const enrollment = await this.prismaService.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    if (!enrollment && !lesson.isPreview) {
      throw new ForbiddenException('Bạn cần mua khóa học để xem bài này');
    }

    return {
      id: lesson.id,
      title: lesson.title,
      content: lesson.content,
      videoUrl: lesson.videoUrl,
      duration: lesson.duration,
      isPreview: lesson.isPreview,
      course: {
        id: lesson.section.course.id,
        title: lesson.section.course.title,
        sections: await this.prismaService.section.findMany({
          where: {
            courseId: lesson.section.course.id,
          },
          orderBy: {
            order: 'asc',
          },
          include: {
            lessons: {
              orderBy: {
                order: 'asc',
              },
              select: {
                id: true,
                title: true,
                order: true,
                isPreview: true,
              },
            },
          },
        }),
      },
    };
  }
}
