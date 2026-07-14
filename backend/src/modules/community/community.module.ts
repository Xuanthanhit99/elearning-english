import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommunityController } from './community.controller';
import { CommunityJobService } from './community-job.service';
import { CommunityService } from './community.service';
import { COMMUNITY_QUEUE } from './community.constants';
import { CommunityGateway } from './gateway/community.gateway';
import { CommunityProcessor } from './processors/community.processor';

@Module({
  imports: [PrismaModule, BullModule.registerQueue({ name: COMMUNITY_QUEUE })],
  controllers: [CommunityController],
  providers: [
    CommunityService,
    CommunityJobService,
    CommunityGateway,
    CommunityProcessor,
  ],
  exports: [CommunityService, CommunityGateway],
})
export class CommunityModule {}
