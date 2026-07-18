import { InjectQueue } from '@nestjs/bullmq';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Queue } from 'bullmq';
import { PrismaService } from 'src/prisma/prisma.service';
import {
  SPEAKING_PROCESSING_JOB,
  SPEAKING_PROCESSING_QUEUE,
} from './speaking-processing.constants';
import { SpeakingAudioStorageService } from './speaking-audio-storage.service';
import { CreateSpeakingUploadDto } from './dto/create-speaking-upload.dto';

@Injectable()
export class SpeakingProcessingService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audioStorage: SpeakingAudioStorageService,
    @InjectQueue(SPEAKING_PROCESSING_QUEUE)
    private readonly queue: Queue,
  ) {}

  async uploadAndQueue(input: {
    userId: string;
    sessionId: string;
    file: Express.Multer.File;
    dto: CreateSpeakingUploadDto;
  }) {
    const session = await this.prisma.speakingSession.findFirst({
      where: {
        id: input.sessionId,
        userId: input.userId,
      },
      include: {
        lesson: true,
      },
    });

    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên luyện nói.');
    }

    if (session.status === 'COMPLETED') {
      throw new BadRequestException('Phiên luyện nói đã hoàn thành.');
    }

    const stored = await this.audioStorage.save(input.file);

    const answer = await this.prisma.speakingAnswer.create({
      data: {
        sessionId: session.id,
        question: input.dto.question,
        expectedText:
          input.dto.expectedText ?? session.lesson?.expectedText ?? '',
        transcript: '',
        audioUrl: stored.audioUrl,
        overallScore: 0,
        pronunciation: 0,
        fluency: 0,
        grammar: 0,
        vocabulary: 0,
        confidence: 0,
        correctedText: '',
        feedback: '',
        suggestions: [],
      },
    });

    const processingJob = await this.prisma.speakingProcessingJob.create({
      data: {
        userId: input.userId,
        sessionId: session.id,
        answerId: answer.id,
        status: 'QUEUED',
        step: 'UPLOAD_COMPLETED',
        progress: 10,
        message: 'Đã tải audio lên. Đang chờ xử lý.',
        audioPath: stored.filepath,
        audioMimeType: stored.mimeType,
        duration: input.dto.duration ?? 0,
      },
    });

    await this.queue.add(
      SPEAKING_PROCESSING_JOB.PROCESS_ANSWER,
      {
        processingJobId: processingJob.id,
        sessionId: session.id,
        answerId: answer.id,
        userId: input.userId,
      },
      {
        jobId: `speaking-${processingJob.id}`,
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: {
          age: 24 * 60 * 60,
          count: 500,
        },
        removeOnFail: false,
      },
    );

    return {
      processingJobId: processingJob.id,
      sessionId: session.id,
      answerId: answer.id,
      status: 'QUEUED',
      processingUrl: `/speaking/sessions/${session.id}/processing`,
    };
  }

  async getStatus(userId: string, sessionId: string) {
    const job = await this.prisma.speakingProcessingJob.findFirst({
      where: {
        userId,
        sessionId,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (!job) {
      throw new NotFoundException('Không tìm thấy tiến trình Speaking.');
    }

    return {
      id: job.id,
      sessionId: job.sessionId,
      status: job.status,
      step: job.step,
      progress: job.progress,
      message: job.message,
      errorMessage: job.errorMessage,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      resultUrl:
        job.status === 'COMPLETED'
          ? `/speaking/sessions/${sessionId}/result`
          : null,
    };
  }

  async getResult(userId: string, sessionId: string) {
    const session = await this.prisma.speakingSession.findFirst({
      where: {
        id: sessionId,
        userId,
      },
      include: {
        topic: {
          include: {
            category: true,
          },
        },
        lesson: true,
        answers: {
          orderBy: {
            createdAt: 'desc',
          },
        },
      },
    });

    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên luyện nói.');
    }

    if (session.status !== 'COMPLETED') {
      throw new BadRequestException('Phiên luyện nói chưa xử lý xong.');
    }

    const latestAnswer = session.answers[0];

    if (!latestAnswer) {
      throw new NotFoundException('Không tìm thấy kết quả Speaking.');
    }

    const processing = await this.prisma.speakingProcessingJob.findFirst({
      where: {
        userId,
        sessionId,
        answerId: latestAnswer.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return {
      summary: {
        sessionId: session.id,
        lessonId: session.lessonId,
        lessonTitle: session.lesson?.title ?? 'Speaking Practice',
        topicTitle: session.topic?.title ?? 'General',
        categoryTitle: session.topic?.category?.title ?? 'General',
        practiceType: session.lesson?.type ?? 'FREE_TALK',
        level: session.lesson?.level ?? 'A1',
        duration: processing?.duration ?? session.duration ?? 0,
        completedAt: session.finishedAt,
      },
      scores: {
        overallScore: latestAnswer.overallScore,
        pronunciation: latestAnswer.pronunciation,
        fluency: latestAnswer.fluency,
        grammar: latestAnswer.grammar,
        vocabulary: latestAnswer.vocabulary,
        confidence: latestAnswer.confidence,
      },
      answer: {
        id: latestAnswer.id,
        question: latestAnswer.question,
        expectedText: latestAnswer.expectedText,
        transcript: latestAnswer.transcript,
        audioUrl: latestAnswer.audioUrl,
        correctedText: latestAnswer.correctedText,
      },
      aiFeedback: {
        feedback: latestAnswer.feedback,
        suggestions: latestAnswer.suggestions,
        mistakes: processing?.mistakes ?? [],
        improvedVersion:
          processing?.improvedVersion ?? latestAnswer.correctedText,
        nextPractice: processing?.nextPractice ?? null,
      },
      missionUpdated: processing?.missionUpdated ?? false,
    };
  }
}
