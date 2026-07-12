import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  PlacementQuestionType,
  PlacementTestStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { extname, join } from 'path';

type SubmitSpeakingInput = {
  userId: string;
  sessionId: string;
  questionId: string;
  spentSeconds: number;
  audio: Express.Multer.File;
};

type SkipSpeakingInput = {
  userId: string;
  sessionId: string;
  questionId: string;
  action: 'SKIPPED' | 'DEFERRED';
  spentSeconds: number;
};

type SubmitWritingInput = {
  userId: string;
  sessionId: string;
  questionId: string;
  content: string;
  spentSeconds: number;
};

@Injectable()
export class PlacementResponseService {
  constructor(private readonly prisma: PrismaService) {}

  async submitSpeaking(input: SubmitSpeakingInput) {
    const testQuestion = await this.getOwnedQuestion(
      input.userId,
      input.sessionId,
      input.questionId,
    );

    if (testQuestion.question.type !== PlacementQuestionType.SPEAKING) {
      throw new BadRequestException('Câu hỏi này không phải dạng Speaking.');
    }

    const audioUrl = await this.saveAudioFile(input.audio);

    const aiFeedback: Prisma.InputJsonValue = {
      status: 'PENDING',
      evaluationStatus: 'PENDING',
      message: 'Bài nói đang chờ AI chấm điểm.',
      includedInOverallScore: true,
    };

    await this.prisma.placementTestQuestion.update({
      where: {
        id: testQuestion.id,
      },
      data: {
        audioUrl,
        transcript: null,
        userAnswer: audioUrl,
        isSkipped: false,
        isCorrect: null,
        score: null,
        aiFeedback,
        spentSeconds: input.spentSeconds,
        answeredAt: new Date(),
      },
    });

    return {
      questionId: input.questionId,
      audioUrl,
      evaluationStatus: 'PENDING',
      includedInOverallScore: true,
      nextQuestion: await this.findNextQuestion(
        input.sessionId,
        testQuestion.order,
      ),
      savedAt: new Date(),
    };
  }

  async skipSpeaking(input: SkipSpeakingInput) {
    const testQuestion = await this.getOwnedQuestion(
      input.userId,
      input.sessionId,
      input.questionId,
    );

    if (testQuestion.question.type !== PlacementQuestionType.SPEAKING) {
      throw new BadRequestException('Câu hỏi này không phải dạng Speaking.');
    }

    const isDeferred = input.action === 'DEFERRED';

    const aiFeedback: Prisma.InputJsonValue = {
      status: input.action,
      evaluationStatus: 'NOT_EVALUATED',
      message: isDeferred
        ? 'Người dùng chọn đánh giá Speaking sau.'
        : 'Người dùng đã bỏ qua phần Speaking.',
      includedInOverallScore: false,
      fallbackLevelSource: 'OVERALL_LEVEL',
      recommendedAction: isDeferred
        ? 'RESUME_SPEAKING_ASSESSMENT'
        : 'TAKE_SPEAKING_ASSESSMENT_LATER',
    };

    await this.prisma.placementTestQuestion.update({
      where: {
        id: testQuestion.id,
      },
      data: {
        userAnswer: null,
        audioUrl: null,
        transcript: null,
        isSkipped: true,

        // Lưu 0 để có dữ liệu kỹ thuật, nhưng KHÔNG tính vào overall.
        score: 0,
        isCorrect: null,
        aiFeedback,
        spentSeconds: input.spentSeconds,
        answeredAt: new Date(),
      },
    });

    return {
      questionId: input.questionId,
      action: input.action,
      score: 0,
      evaluationStatus: 'NOT_EVALUATED',
      includedInOverallScore: false,
      pendingAssessment: isDeferred,
      nextQuestion: await this.findNextQuestion(
        input.sessionId,
        testQuestion.order,
      ),
      savedAt: new Date(),
    };
  }

  async submitWriting(input: SubmitWritingInput) {
    const testQuestion = await this.getOwnedQuestion(
      input.userId,
      input.sessionId,
      input.questionId,
    );

    if (testQuestion.question.type !== PlacementQuestionType.WRITING) {
      throw new BadRequestException('Câu hỏi này không phải dạng Writing.');
    }

    const content = input.content.trim();
    const wordCount = this.countWords(content);

    if (wordCount < 20) {
      throw new BadRequestException(
        'Bài viết cần ít nhất 20 từ để AI có thể đánh giá.',
      );
    }

    const aiFeedback: Prisma.InputJsonValue = {
      status: 'PENDING',
      evaluationStatus: 'PENDING',
      message: 'Bài viết đang chờ AI chấm điểm.',
      includedInOverallScore: true,
    };

    await this.prisma.placementTestQuestion.update({
      where: {
        id: testQuestion.id,
      },
      data: {
        writingText: content,
        wordCount,
        userAnswer: content,
        isSkipped: false,
        isCorrect: null,
        score: null,
        aiFeedback,
        spentSeconds: input.spentSeconds,
        answeredAt: new Date(),
      },
    });

    return {
      questionId: input.questionId,
      wordCount,
      evaluationStatus: 'PENDING',
      includedInOverallScore: true,
      nextQuestion: await this.findNextQuestion(
        input.sessionId,
        testQuestion.order,
      ),
      savedAt: new Date(),
    };
  }

  private async getOwnedQuestion(
    userId: string,
    sessionId: string,
    questionId: string,
  ) {
    const session = await this.prisma.placementTest.findUnique({
      where: {
        id: sessionId,
      },
      select: {
        userId: true,
        status: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên kiểm tra.');
    }

    if (session.userId !== userId) {
      throw new ForbiddenException(
        'Bạn không có quyền truy cập phiên kiểm tra này.',
      );
    }

    if (session.status !== PlacementTestStatus.IN_PROGRESS) {
      throw new BadRequestException(
        'Phiên kiểm tra không còn ở trạng thái đang làm.',
      );
    }

    const testQuestion = await this.prisma.placementTestQuestion.findFirst({
      where: {
        testId: sessionId,
        questionId,
      },
      select: {
        id: true,
        order: true,
        question: {
          select: {
            type: true,
          },
        },
      },
    });

    if (!testQuestion) {
      throw new NotFoundException(
        'Không tìm thấy câu hỏi trong phiên kiểm tra.',
      );
    }

    return testQuestion;
  }

  private async findNextQuestion(sessionId: string, currentOrder: number) {
    const next = await this.prisma.placementTestQuestion.findFirst({
      where: {
        testId: sessionId,
        order: {
          gt: currentOrder,
        },
      },
      orderBy: {
        order: 'asc',
      },
      select: {
        questionId: true,
        order: true,
      },
    });

    return next
      ? {
          questionId: next.questionId,
          order: next.order,
        }
      : null;
  }

  private countWords(content: string): number {
    return content.trim().split(/\s+/).filter(Boolean).length;
  }

  private async saveAudioFile(file: Express.Multer.File): Promise<string> {
    const uploadDir = join(process.cwd(), 'uploads', 'placement', 'speaking');

    await fs.mkdir(uploadDir, {
      recursive: true,
    });

    const extension =
      extname(file.originalname) || this.extensionFromMimeType(file.mimetype);

    const fileName = `${randomUUID()}${extension}`;
    const filePath = join(uploadDir, fileName);

    await fs.writeFile(filePath, file.buffer);

    return `/uploads/placement/speaking/${fileName}`;
  }

  private extensionFromMimeType(mimeType: string): string {
    const map: Record<string, string> = {
      'audio/webm': '.webm',
      'audio/wav': '.wav',
      'audio/mpeg': '.mp3',
      'audio/mp4': '.m4a',
    };

    return map[mimeType] ?? '.webm';
  }
}
