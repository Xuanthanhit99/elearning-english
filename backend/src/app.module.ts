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
import { TtsModule } from './modules/tts/tts.module';
import { PetsModule } from './modules/pets/pets.module';
import { ArenaModule } from './modules/arena/arena.module';
import { CommunityModule } from './modules/community/community.module';
import { MissionsModule } from './modules/missions/missions.module';
import { VocabularyModule } from './modules/vocabulary/vocabulary.module';
import { VocabularyJobModule } from './modules/vocabulary-job/vocabulary-job.module';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule } from '@nestjs/throttler';
import { ListeningModule } from './modules/listening/listening.module';
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
import { CommunitySocialModule } from './modules/community-social/community-social.module';
import { getStaticRootDir } from './config/static-assets.config';
import { CommunityClubModule } from './modules/community-club/community-club.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { CommunityClubPermissionModule } from './modules/community-club/community-club-permission.module';
import { LeaderboardModule } from './modules/leaderboard/leaderboard.module';
import { LearningXpModule } from './modules/learning-xp/learning-xp.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { SettingsModule } from './modules/settings/settings.module';
import { PlacementSessionModule } from './modules/placement/placement-session/placement-session.module';
import { ChatSessionModule } from './modules/chat-session/chat-session.module';
import { AchievementsModule } from './modules/achievements/achievements.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { SearchModule } from './modules/search/search.module';
import { HealthController } from './health.controller';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ScheduleModule.forRoot(),
    // Registered globally so `ThrottlerGuard`/`@Throttle` are available for
    // injection, but NOT bound as a global APP_GUARD — only the specific
    // brute-forceable auth endpoints (login/register/refresh/2FA) opt in via
    // `@UseGuards(ThrottlerGuard)`, so unrelated polling-heavy routes
    // (Writing/Speaking/Placement processing status, Dashboard, etc.) are
    // unaffected.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }]),
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
      /*
       * Stage 6D.3: dùng chung getStaticRootDir() với
       * listening-tts.service.ts (qua static-assets.config.ts) để nơi
       * ghi audio Listening và nơi static server phục vụ file LUÔN
       * khớp nhau. Mặc định không đổi (`<cwd>/public`) nếu không set
       * env `STATIC_ROOT_DIR`.
       */
      rootPath: getStaticRootDir(),
      serveRoot: '/',
    }),
    EventEmitterModule.forRoot({
      wildcard: false,
      delimiter: '.',
      maxListeners: 50,
      verboseMemoryLeak: true,
      ignoreErrors: false,
    }),
    LearningXpModule,
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
    TtsModule,
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
    CommunitySocialModule,
    CommunityClubModule,
    DashboardModule,
    CommunityClubPermissionModule,
    LeaderboardModule,
    SettingsModule,
    PlacementSessionModule,
    ChatSessionModule,
    AchievementsModule,
    AnalyticsModule,
    SearchModule,
  ],
  providers: [
    GeminiService,
    // ListeningJobService,
    QuestionBankService,
    QuestionGenerationLockService,
    LearningPathService,
  ],
  controllers: [GeminiController, HealthController],
  // controllers: [AppController],
  // providers: [AppService],
})
export class AppModule {}
