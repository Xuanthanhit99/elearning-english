import {
  OnWorkerEvent,
  Processor,
  WorkerHost,
} from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import {
  LearningSkill,
  MissionV2Action,
  SpeakingSessionStatus,
} from '@prisma/client';
import { Job } from 'bullmq';
import { PrismaService } from 'src/prisma/prisma.service';
import { MissionV2ProgressService } from '../missions-v2/services/mission-v2-progress.service';
import {
  SPEAKING_PROCESSING_JOB,
  SPEAKING_PROCESSING_QUEUE,
} from './speaking-processing.constants';
import { SpeakingAiEvaluationService } from './speaking-ai-evaluation.service';
import { SpeakingSpeechToTextService } from './speaking-speech-to-text.service';
import { SpeakingProcessingQueueData } from './speaking-processing.types';

@Processor(SPEAKING_PROCESSING_QUEUE, {
  concurrency: 2,
})
export class SpeakingProcessingProcessor extends WorkerHost {
  private readonly logger = new Logger(
    SpeakingProcessingProcessor.name,
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly stt: SpeakingSpeechToTextService,
    private readonly ai: SpeakingAiEvaluationService,
    private readonly missionProgress: MissionV2ProgressService,
  ) {
    super();
  }

  async process(
    job: Job<SpeakingProcessingQueueData>,
  ) {
    if (
      job.name !==
      SPEAKING_PROCESSING_JOB.PROCESS_ANSWER
    ) {
      throw new Error(
        `Unsupported Speaking job: ${job.name}`,
      );
    }

    const {
      processingJobId,
      sessionId,
      answerId,
      userId,
    } = job.data;

    try {
      await this.updateJob(
        processingJobId,
        {
          status: 'PROCESSING',
          step: 'TRANSCRIBING',
          progress: 25,
          message:
            'Đang chuyển giọng nói thành văn bản.',
          startedAt: new Date(),
        },
      );

      const processing =
        await this.prisma.speakingProcessingJob.findUnique({
          where: {
            id: processingJobId,
          },
        });

      if (!processing) {
        throw new Error(
          'SpeakingProcessingJob not found',
        );
      }

      const session =
        await this.prisma.speakingSession.findFirst({
          where: {
            id: sessionId,
            userId,
          },
          include: {
            lesson: true,
          },
        });

      if (!session) {
        throw new Error(
          'SpeakingSession not found',
        );
      }

      const answer =
        await this.prisma.speakingAnswer.findUnique({
          where: {
            id: answerId,
          },
        });

      if (!answer) {
        throw new Error(
          'SpeakingAnswer not found',
        );
      }

      const transcription =
        await this.stt.transcribe({
          filepath:
            processing.audioPath,
          mimeType:
            processing.audioMimeType,
        });

      await this.prisma.speakingAnswer.update({
        where: {
          id: answerId,
        },
        data: {
          transcript:
            transcription.transcript,
        },
      });

      await this.updateJob(
        processingJobId,
        {
          step: 'AI_SCORING',
          progress: 55,
          message:
            'AI đang phân tích phát âm, độ trôi chảy và ngữ pháp.',
        },
      );

      const evaluation =
        await this.ai.evaluate({
          question:
            answer.question,
          expectedText:
            answer.expectedText,
          transcript:
            transcription.transcript,
          level:
            session.lesson?.level ??
            'A1',
          speechConfidence:
            transcription.confidence,
        });

      await this.prisma.$transaction(
        async (tx) => {
          await tx.speakingAnswer.update({
            where: {
              id: answerId,
            },
            data: {
              overallScore:
                evaluation.overallScore,
              pronunciation:
                evaluation.pronunciation,
              fluency:
                evaluation.fluency,
              grammar:
                evaluation.grammar,
              vocabulary:
                evaluation.vocabulary,
              confidence:
                evaluation.confidence,
              correctedText:
                evaluation.correctedText,
              feedback:
                evaluation.feedback,
              suggestions:
                evaluation.suggestions,
            },
          });

          const completed =
            await tx.speakingSession.updateMany({
              where: {
                id: sessionId,
                userId,
                status: {
                  not:
                    SpeakingSessionStatus.COMPLETED,
                },
              },
              data: {
                status:
                  SpeakingSessionStatus.COMPLETED,
                overallScore:
                  evaluation.overallScore,
                pronunciation:
                  evaluation.pronunciation,
                fluency:
                  evaluation.fluency,
                grammar:
                  evaluation.grammar,
                vocabulary:
                  evaluation.vocabulary,
                confidence:
                  evaluation.confidence,
                duration:
                  processing.duration,
                finishedAt: new Date(),
              },
            });

          if (
            completed.count === 1 &&
            session.lessonId
          ) {
            const oldProgress =
              await tx.speakingLessonProgress.findUnique({
                where: {
                  userId_lessonId: {
                    userId,
                    lessonId:
                      session.lessonId,
                  },
                },
              });

            await tx.speakingLessonProgress.upsert({
              where: {
                userId_lessonId: {
                  userId,
                  lessonId:
                    session.lessonId,
                },
              },
              update: {
                completed: true,
                attempts: {
                  increment: 1,
                },
                lastScore:
                  evaluation.overallScore,
                bestScore: Math.max(
                  oldProgress?.bestScore ??
                    0,
                  evaluation.overallScore,
                ),
                completedAt:
                  new Date(),
              },
              create: {
                userId,
                lessonId:
                  session.lessonId,
                completed: true,
                attempts: 1,
                lastScore:
                  evaluation.overallScore,
                bestScore:
                  evaluation.overallScore,
                completedAt:
                  new Date(),
              },
            });
          }
        },
      );

      await this.updateJob(
        processingJobId,
        {
          step: 'UPDATING_MISSIONS',
          progress: 85,
          message:
            'Đang cập nhật nhiệm vụ và tiến độ học.',
          mistakes:
            evaluation.mistakes,
          improvedVersion:
            evaluation.improvedVersion,
          nextPractice:
            evaluation.nextPractice,
        },
      );

      const missionUpdated =
        await this.updateMissions({
          userId,
          lessonId:
            session.lessonId,
          duration:
            processing.duration,
        });

      await this.updateJob(
        processingJobId,
        {
          status: 'COMPLETED',
          step: 'COMPLETED',
          progress: 100,
          message:
            'Đã hoàn thành phân tích bài nói.',
          missionUpdated,
          completedAt: new Date(),
        },
      );

      return {
        sessionId,
        answerId,
        overallScore:
          evaluation.overallScore,
        missionUpdated,
      };
    } catch (error) {
      await this.updateJob(
        processingJobId,
        {
          status: 'FAILED',
          step: 'FAILED',
          errorMessage:
            error instanceof Error
              ? error.message
              : String(error),
          message:
            'Không thể xử lý bài nói.',
        },
      );

      throw error;
    }
  }

  private async updateMissions(
    input: {
      userId: string;
      lessonId: string | null;
      duration: number;
    },
  ) {
    try {
      await this.missionProgress.increase({
        userId: input.userId,
        action:
          MissionV2Action.COMPLETE_SPEAKING,
        amount: 1,
        skill:
          LearningSkill.SPEAKING,
        lessonId:
          input.lessonId ?? undefined,
      });

      await this.missionProgress.increase({
        userId: input.userId,
        action:
          MissionV2Action.COMPLETE_LESSON,
        amount: 1,
        skill:
          LearningSkill.SPEAKING,
        lessonId:
          input.lessonId ?? undefined,
      });

      await this.missionProgress.increase({
        userId: input.userId,
        action:
          MissionV2Action.STUDY_LESSON,
        amount: 1,
        skill:
          LearningSkill.SPEAKING,
        lessonId:
          input.lessonId ?? undefined,
      });

      const minutes = Math.max(
        1,
        Math.ceil(input.duration / 60),
      );

      await this.missionProgress.increase({
        userId: input.userId,
        action:
          MissionV2Action.STUDY_MINUTES,
        amount: minutes,
        studyMinutes: minutes,
        skill:
          LearningSkill.SPEAKING,
      });

      return true;
    } catch (error) {
      this.logger.error(
        'Speaking Mission update failed',
        error instanceof Error
          ? error.stack
          : String(error),
      );

      return false;
    }
  }

  private updateJob(
    id: string,
    data: Record<string, unknown>,
  ) {
    return this.prisma.speakingProcessingJob.update({
      where: {
        id,
      },
      data,
    });
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(
      `Speaking job completed: ${job.id}`,
    );
  }

  @OnWorkerEvent('failed')
  onFailed(
    job: Job | undefined,
    error: Error,
  ) {
    this.logger.error(
      `Speaking job failed: ${job?.id}`,
      error.stack,
    );
  }
}
