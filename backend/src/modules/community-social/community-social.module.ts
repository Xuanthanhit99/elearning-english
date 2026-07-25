import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { CommunityModule } from '../community/community.module';
import { CommunitySocialController } from './community-social.controller';
import { CommunitySocialGateway } from './community-social.gateway';
import { CommunitySocialService } from './community-social.service';
import { CommunityUploadController } from './community-upload.controller';
import { SettingsModule } from '../settings/settings.module';
import { LearningXpModule } from '../learning-xp/learning-xp.module';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    SettingsModule,
    CommunityModule,
    LearningXpModule,
  ],
  controllers: [CommunitySocialController, CommunityUploadController],
  providers: [CommunitySocialService, CommunitySocialGateway],
  exports: [CommunitySocialService, CommunitySocialGateway],
})
export class CommunitySocialModule {}
