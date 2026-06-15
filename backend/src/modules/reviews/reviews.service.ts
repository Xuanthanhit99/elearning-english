import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private prismaService: PrismaService) {}

  async createOrUpdate(userId: string, courseId: string, dto: CreateReviewDto) {
    const enrollment = await this.prismaService.enrollment.findUnique({
      where: {
        userId_courseId: { userId, courseId },
      },
    });

    if (!enrollment) {
      throw new ForbiddenException('Bạn cần sở hữu khóa học để đánh giá');
    }

    return this.prismaService.review.upsert({
      where: { userId_courseId: { userId, courseId } },
      update: { rating: dto.rating, comment: dto.comment },
      create: {
        userId,
        courseId,
        rating: dto.rating,
        comment: dto.comment,
      },
    });
  }

  async getCourseReviews(courseId: string) {
    const course = await this.prismaService.course.findUnique({
      where: { id: courseId },
    });

    if (!course) {
      throw new NotFoundException('Không tìm thấy khóa học');
    }

    const reviews = await this.prismaService.review.findMany({
      where: { courseId },
      include: {
        user: {
          select: {
            id: true,
            fullname: true,
            avatar: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const avgRating =
      reviews.length === 0
        ? 0
        : reviews.reduce((sum, item) => sum + item.rating, 0) / reviews.length;

    return {
      avgRating: Math.round(avgRating * 10) / 10,
      total: reviews.length,
      reviews,
    };
  }
}
