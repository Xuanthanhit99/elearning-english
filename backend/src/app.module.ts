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
  ],
  // controllers: [AppController],
  // providers: [AppService],
})
export class AppModule {}
