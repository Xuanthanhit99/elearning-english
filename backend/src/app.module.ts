import { Module } from '@nestjs/common';
// import { AppController } from './app.controller';
// import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { ConfigModule } from '@nestjs/config';
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
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
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
  ],
  // controllers: [AppController],
  // providers: [AppService],
})
export class AppModule {}
