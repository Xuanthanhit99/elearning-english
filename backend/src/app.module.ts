import { Module } from '@nestjs/common';
// import { AppController } from './app.controller';
// import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { CoursesModule } from './modules/courses/courses.module';
import { SectionsModule } from './modules/sections/sections.module';
import { LessonsModule } from './modules/lessons/lessons.module';
import { UploadModule } from './modules/upload/upload.module';
import { EnrollmentsModule } from './modules/enrollments/enrollments.module';
import { LearningModule } from './modules/learning/learning.module';
import { ProgressModule } from './modules/progress/progress.module';
import { CourseLandingModule } from './modules/course-landing/course-landing.module';
import { CoursePagesModule } from './modules/course-pages/course-pages.module';
import { QuizzesModule } from './modules/quizzes/quizzes.module';
import { CertificatesModule } from './modules/certificates/certificates.module';
import { OrdersModule } from './modules/orders/orders.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { TeacherDashboardModule } from './modules/teacher-dashboard/teacher-dashboard.module';
import { AdminDashboardModule } from './modules/admin-dashboard/admin-dashboard.module';
import { WalletModule } from './modules/wallet/wallet.module';
import { CouponsModule } from './modules/coupons/coupons.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { SpeakingModule } from './modules/speaking/speaking.module';
import { WordsModule } from './modules/words/words.module';
import { WritingModule } from './modules/writing/writing.module';
import { PlacementTestsModule } from './modules/placement-tests/placement-tests.module';
import { GeminiService } from './modules/gemini/gemini.service';
import { GeminiController } from './modules/gemini/gemini.controller';
import { GeminiModule } from './modules/gemini/gemini.module';
import { PronunciationModule } from './modules/pronunciation/pronunciation.module';
import { PetsModule } from './modules/pets/pets.module';
import { ArenaModule } from './modules/arena/arena.module';
import { CommunityModule } from './modules/community/community.module';
import { MissionsModule } from './modules/missions/missions.module';
import { VocabularyModule } from './modules/vocabulary/vocabulary.module';
import { VocabularyJobModule } from './modules/vocabulary-job/vocabulary-job.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ListeningModule } from './modules/listening/listening.module';
import { ListeningJobService } from './modules/listening-job/listening-job.service';
import { GrammarModule } from './modules/grammar/grammar.module';
import { ReadingModule } from './modules/reading/reading.module';
import { PlacementModule } from './modules/placement/placement.module';
import { SpeakingPracticeModule } from './modules/speaking-practice/speaking-practice.module';
import { QuestionBankService } from './modules/question-bank/question-bank.service';
import { QuestionGenerationLockService } from './modules/question-bank/question-generation-lock/question-generation-lock.service';
import { QuestionBankModule } from './modules/question-bank/question-bank.module';
import { PlacementProcessingModule } from './modules/placement-processing/placement-processing.module';
import { BullModule } from '@nestjs/bullmq';
import { PlacementResultModule } from './modules/placement-result/placement-result.module';
import { PlacementDashboardModule } from './modules/placement-dashboard/placement-dashboard.module';
import { LearningPathService } from './modules/learning-path/learning-path.service';
import { LearningPathModule } from './modules/learning-path/learning-path.module';
import { LearningPathAccessModule } from './modules/learning-path-access/learning-path-access.module';
import { MissionsV2Module } from './modules/missions-v2/missions-v2.module';
import { LessonBuilderModule } from './modules/lesson-builder/lesson-builder.module';
import { ListeningJobModule } from './modules/listening-job/listening-job.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get<string>('REDIS_HOST', '127.0.0.1'),
          port: configService.get<number>('REDIS_PORT', 6379),
          password: configService.get<string>('REDIS_PASSWORD') || undefined,
        },
      }),
    }),
    ServeStaticModule.forRoot({
      rootPath: join(process.cwd(), 'public'),
      serveRoot: '/',
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    CoursesModule,
    SectionsModule,
    LessonsModule,
    UploadModule,
    EnrollmentsModule,
    LearningModule,
    ProgressModule,
    CourseLandingModule,
    CoursePagesModule,
    QuizzesModule,
    CertificatesModule,
    OrdersModule,
    PaymentsModule,
    ReviewsModule,
    TeacherDashboardModule,
    AdminDashboardModule,
    WalletModule,
    CouponsModule,
    NotificationsModule,
    SpeakingModule,
    WordsModule,
    WritingModule,
    PlacementTestsModule,
    GeminiModule,
    PronunciationModule,
    PetsModule,
    ArenaModule,
    CommunityModule,
    MissionsModule,
    VocabularyModule,
    VocabularyJobModule,
    ListeningModule,
    GrammarModule,
    ReadingModule,
    PlacementModule,
    SpeakingPracticeModule,
    QuestionBankModule,
    PlacementProcessingModule,
    PlacementResultModule,
    PlacementDashboardModule,
    LearningPathModule,
    LearningPathAccessModule,
    MissionsV2Module,
    LessonBuilderModule,
    ListeningJobModule,
  ],
  providers: [
    GeminiService,
    // ListeningJobService,
    QuestionBankService,
    QuestionGenerationLockService,
    LearningPathService,
  ],
  controllers: [GeminiController],
  // controllers: [AppController],
  // providers: [AppService],
})
export class AppModule {}
