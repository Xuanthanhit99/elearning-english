import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class WritingSessionService {
  constructor(private readonly prisma: PrismaService) {}

  async getOwnedSession(userId: string, sessionId: string) {
    const session = await this.prisma.writingSession.findFirst({
      where: { id: sessionId, userId },
      include: {
        lesson: {
          include: {
            topic: true,
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên luyện viết.');
    }

    return session;
  }

  validateSubmission(content?: string | null) {
    const essay = content?.trim();

    if (!essay) {
      throw new BadRequestException('Vui lòng nhập bài viết trước khi nộp.');
    }

    return {
      content: essay,
      wordCount: essay.split(/\s+/).filter(Boolean).length,
    };
  }
}
