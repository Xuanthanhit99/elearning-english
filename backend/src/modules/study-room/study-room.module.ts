import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PrismaModule } from '../../prisma/prisma.module';
import { LearningXpModule } from '../learning-xp/learning-xp.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RealtimePresenceModule } from '../../common/realtime/realtime-presence.module';
import { StudyRoomController } from './study-room.controller';
import { StudyRoomService } from './study-room.service';
import { StudyRoomGateway } from './study-room.gateway';
import { StudyRoomCookieAuthService } from './study-room-cookie-auth.service';

@Module({
  imports: [
    PrismaModule,
    JwtModule.register({}),
    LearningXpModule,
    NotificationsModule,
    RealtimePresenceModule,
  ],
  controllers: [StudyRoomController],
  providers: [StudyRoomService, StudyRoomGateway, StudyRoomCookieAuthService],
  exports: [StudyRoomService],
})
export class StudyRoomModule {}
