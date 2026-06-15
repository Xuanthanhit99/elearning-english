import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class CertificatesService {
  constructor(private prismaService: PrismaService) {}

  async generate(userId: string, courseId: string) {
    const enrollment = await this.prismaService.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    if (!enrollment) {
      throw new ForbiddenException('Bạn chưa sở hữu khóa học này');
    }

    const totalLessons = await this.prismaService.lesson.count({
      where: {
        section: {
          courseId,
        },
      },
    });

    const completedLessons = await this.prismaService.lessonProgress.count({
      where: { userId, courseId, completed: true },
    });

    const percent =
      totalLessons === 0
        ? 0
        : Math.round((completedLessons / totalLessons) * 100);

    if (percent < 100) {
      throw new BadRequestException('Bạn chưa hoàn thành 100% khóa học');
    }

    const existed = await this.prismaService.certificate.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    if (existed) {
      return existed;
    }

    return this.prismaService.certificate.create({
      data: {
        userId,
        courseId,
        code: `CERT-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
      },
    });
  }

  async myCertificates(userId: string) {
    return this.prismaService.certificate.findMany({
      where: { userId },
      include: {
        course: {
          select: {
            id: true,
            title: true,
            thumbnail: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async verify(code: string) {
    const certificate = await this.prismaService.certificate.findUnique({
      where: { code },
      include: {
        user: {
          select: {
            id: true,
            fullname: true,
          },
        },
        course: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!certificate) {
      throw new NotFoundException('Không tìm thấy chứng chỉ');
    }

    return certificate;
  }
}
