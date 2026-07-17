import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import {
  CefrLevel,
  LearningSkill,
  MissionV2Action,
  PlacementMethod,
} from '@prisma/client';
import { Job } from 'bullmq';
import { PrismaService } from 'src/prisma/prisma.service';
import { MissionV2ProgressService } from '../missions-v2/services/mission-v2-progress.service';
import {
  WRITING_PROCESSING_JOB,
  WRITING_PROCESSING_QUEUE,
} from './writing-processing.constants';
import { WritingAiEvaluationService } from './writing-ai-evaluation.service';
import { WritingProcessingQueueData } from './writing-processing.types';
import { LearningXpPublisher } from '../learning-xp/learning-xp.publisher';
import { SettingsQueryService } from '../settings/settings-query.service';

@Processor(WRITING_PROCESSING_QUEUE, {
  concurrency: 2,
})
export class WritingProcessor extends WorkerHost {
  private readonly logger = new Logger(WritingProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ai: WritingAiEvaluationService,
    private readonly missionProgress: MissionV2ProgressService,
    private readonly learningXp: LearningXpPublisher,
    private readonly settingsQuery: SettingsQueryService,
  ) {
    super();
  }

  async process(job: Job<WritingProcessingQueueData>) {
    if (job.name !== WRITING_PROCESSING_JOB.EVALUATE_SESSION) {
      throw new Error(`Unsupported Writing job: ${job.name}`);
    }

    const { processingJobId, sessionId, userId } = job.data;

    try {
      await this.updateJob(processingJobId, {
        status: 'PROCESSING',
        step: 'AI_EVALUATION',
        progress: 35,
        message: 'Gemini đang chấm bài viết của bạn.',
        startedAt: new Date(),
      });

      const processingJob = await this.prisma.writingProcessingJob.findUnique({
        where: { id: processingJobId },
      });

      if (!processingJob) {
        throw new Error('WritingProcessingJob not found');
      }

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
        throw new Error('WritingSession not found');
      }

      const aiSettings = await this.settingsQuery.getAiSettings(userId);

      const evaluation = await this.ai.evaluate({
        prompt: session.lesson.prompt,
        essay: processingJob.content,
        type: session.lesson.type,
        level: session.lesson.level,
        minWords: session.lesson.minWords,
        maxWords: session.lesson.maxWords,
        correctionMode: aiSettings.correctionMode,
        translationMode: aiSettings.translationMode,
        learningGoal: aiSettings.learningGoal,
      });

      await this.updateJob(processingJobId, {
        step: 'SAVING_RESULT',
        progress: 70,
        message: 'Đang lưu kết quả và gợi ý luyện tập.',
        mistakes: evaluation.mistakes,
        feedback: evaluation.feedback,
        suggestions: evaluation.suggestions,
        nextPractice: evaluation.nextPractice,
      });

      await this.prisma.$transaction(async (tx) => {
        await tx.writingSession.update({
          where: { id: sessionId },
          data: {
            content: processingJob.content,
            wordCount: processingJob.wordCount,
            timeSpentSeconds: processingJob.timeSpentSeconds,
            isSubmitted: true,
            submittedAt: new Date(),
            overallScore: evaluation.overallScore,
            taskScore: evaluation.taskResponse,
            coherenceScore: evaluation.coherence,
            vocabularyScore: evaluation.vocabulary,
            grammarScore: evaluation.grammar,
            feedback: evaluation.feedback,
            aiResult: evaluation,
            corrections: evaluation.mistakes,
            strengths: [],
            improvements: evaluation.suggestions,
            vocabularySuggestions: [],
            suggestedVersion: evaluation.correctedEssay,
            learningTips: evaluation.suggestions,
            aiCoachTask: evaluation.nextPractice.title,
            rewriteRequired: evaluation.overallScore < 70,
            nextPracticeSuggestion: evaluation.nextPractice.reason,
          },
        });

        const lessons = await tx.writingLesson.findMany({
          where: {
            topicId: session.lesson.topicId,
            isActive: true,
          },
          select: { id: true },
        });

        const lessonIds = lessons.map((item) => item.id);
        const completed = await tx.writingSession.count({
          where: {
            userId,
            lessonId: { in: lessonIds },
            isSubmitted: true,
          },
        });

        await tx.writingTopicProgress.upsert({
          where: {
            userId_topicId: {
              userId,
              topicId: session.lesson.topicId,
            },
          },
          update: {
            completedLessons: completed,
            totalLessons: lessons.length,
            progressPercent: lessons.length
              ? Math.round((completed / lessons.length) * 100)
              : 0,
          },
          create: {
            userId,
            topicId: session.lesson.topicId,
            completedLessons: completed,
            totalLessons: lessons.length,
            progressPercent: lessons.length
              ? Math.round((completed / lessons.length) * 100)
              : 0,
          },
        });

        await tx.userSkillLevel.upsert({
          where: {
            userId_skill: {
              userId,
              skill: LearningSkill.WRITING,
            },
          },
          update: {
            level: session.lesson.level as CefrLevel,
            score: evaluation.overallScore,
            source: PlacementMethod.MANUAL,
          },
          create: {
            userId,
            skill: LearningSkill.WRITING,
            level: session.lesson.level as CefrLevel,
            score: evaluation.overallScore,
            source: PlacementMethod.MANUAL,
          },
        });
      });

      await this.updateJob(processingJobId, {
        step: 'UPDATING_MISSIONS',
        progress: 85,
        message: 'Đang cập nhật nhiệm vụ và tiến độ học.',
      });

      const missionUpdated = await this.updateMissions({
        userId,
        lessonId: session.lessonId,
        duration: processingJob.timeSpentSeconds,
      });

      await this.updateJob(processingJobId, {
        status: 'COMPLETED',
        step: 'COMPLETED',
        progress: 100,
        message: 'Đã hoàn thành chấm bài Writing.',
        missionUpdated,
        completedAt: new Date(),
      });

      await this.learningXp.publish({
        activity: 'WRITING_COMPLETED',
        userId,
        sourceId: session.id,
        score: evaluation.overallScore,
        completionRate: 100,
        metadata: {
          sessionId: session.id,
          lessonId: session.lessonId,
          topicId: session.lesson.topicId,
          wordCount: processingJob.wordCount,
          timeSpentSeconds: processingJob.timeSpentSeconds,
          taskScore: evaluation.taskResponse,
          coherenceScore: evaluation.coherence,
          vocabularyScore: evaluation.vocabulary,
          grammarScore: evaluation.grammar,
          rewriteRequired: evaluation.overallScore < 70,
        },
      });

      return {
        sessionId,
        overallScore: evaluation.overallScore,
        missionUpdated,
      };
    } catch (error) {
      await this.updateJob(processingJobId, {
        status: 'FAILED',
        step: 'FAILED',
        errorMessage: error instanceof Error ? error.message : String(error),
        message: 'Không thể chấm bài Writing lúc này.',
      });

      throw error;
    }
  }

  private async updateMissions(input: {
    userId: string;
    lessonId: string | null;
    duration: number;
  }) {
    try {
      await this.missionProgress.increase({
        userId: input.userId,
        action: MissionV2Action.CHECK_WRITING,
        amount: 1,
        skill: LearningSkill.WRITING,
        lessonId: input.lessonId ?? undefined,
      });

      await this.missionProgress.increase({
        userId: input.userId,
        action: MissionV2Action.COMPLETE_LESSON,
        amount: 1,
        skill: LearningSkill.WRITING,
        lessonId: input.lessonId ?? undefined,
      });

      await this.missionProgress.increase({
        userId: input.userId,
        action: MissionV2Action.STUDY_LESSON,
        amount: 1,
        skill: LearningSkill.WRITING,
        lessonId: input.lessonId ?? undefined,
      });

      const minutes = Math.max(1, Math.ceil(input.duration / 60));

      await this.missionProgress.increase({
        userId: input.userId,
        action: MissionV2Action.STUDY_MINUTES,
        amount: minutes,
        studyMinutes: minutes,
        skill: LearningSkill.WRITING,
      });

      return true;
    } catch (error) {
      this.logger.error(
        'Writing Mission update failed',
        error instanceof Error ? error.stack : String(error),
      );

      return false;
    }
  }

  private updateJob(id: string, data: Record<string, unknown>) {
    return this.prisma.writingProcessingJob.update({
      where: { id },
      data,
    });
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.debug(`Writing job completed: ${job.id}`);
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job | undefined, error: Error) {
    this.logger.error(`Writing job failed: ${job?.id}`, error.stack);
  }
}
