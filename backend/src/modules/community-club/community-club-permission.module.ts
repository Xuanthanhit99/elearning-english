import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { CommunityClubPermissionController } from './community-club-permission.controller';
import { CommunityClubPermissionService } from './community-club-permission.service';

@Module({
  imports: [PrismaModule],
  controllers: [CommunityClubPermissionController],
  providers: [CommunityClubPermissionService],
  exports: [CommunityClubPermissionService],
})
export class CommunityClubPermissionModule {}
