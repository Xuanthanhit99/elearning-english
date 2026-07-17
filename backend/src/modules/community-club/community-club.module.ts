import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommunityModule } from '../community/community.module';
import { CommunityClubController } from './community-club.controller';
import { CommunityClubGateway } from './community-club.gateway';
import { CommunityClubService } from './community-club.service';

@Module({
  imports: [PrismaModule, CommunityModule],
  controllers: [CommunityClubController],
  providers: [CommunityClubService, CommunityClubGateway],
  exports: [CommunityClubService, CommunityClubGateway],
})
export class CommunityClubModule {}
