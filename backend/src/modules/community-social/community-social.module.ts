import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommunitySocialController } from './community-social.controller';
import { CommunitySocialGateway } from './community-social.gateway';
import { CommunitySocialService } from './community-social.service';
import { CommunityUploadController } from './community-upload.controller';

@Module({
  imports: [PrismaModule],
  controllers: [CommunitySocialController,CommunityUploadController],
  providers: [CommunitySocialService, CommunitySocialGateway],
  exports: [CommunitySocialService, CommunitySocialGateway],
})
export class CommunitySocialModule {}
