import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { UserRole } from '@prisma/client';
import { Roles } from 'src/common/decorators/roles.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { AdminDashboardService } from './admin-dashboard.service';
import {
  AdminContentStatusDto,
  AdminFeatureFlagDto,
  AdminGamificationToggleDto,
  AdminListQueryDto,
  AdminModerationActionDto,
  AdminUserActionDto,
} from './dto/admin-backoffice.dto';

type AdminRequest = Request & {
  user?: {
    id?: string;
    userId?: string;
    sub?: string;
  };
};

@Controller('admin-dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminDashboardController {
  constructor(private readonly adminDashboardService: AdminDashboardService) {}

  @Get()
  getOverview() {
    return this.adminDashboardService.getOverview();
  }

  @Get('revenue')
  getRevenue() {
    return this.adminDashboardService.getRevenue();
  }

  @Get('users')
  listUsers(@Query() query: AdminListQueryDto) {
    return this.adminDashboardService.listUsers(query);
  }

  @Get('users/:id')
  getUserProfile(@Param('id') id: string) {
    return this.adminDashboardService.getUserProfile(id);
  }

  @Patch('users/:id/action')
  applyUserAction(
    @Param('id') id: string,
    @Body() dto: AdminUserActionDto,
    @Req() req: AdminRequest,
  ) {
    return this.adminDashboardService.applyUserAction(
      id,
      dto,
      this.getActor(req),
    );
  }

  @Get('content')
  listContent(@Query() query: AdminListQueryDto) {
    return this.adminDashboardService.listContent(query);
  }

  @Patch('content/:type/:id/status')
  updateContentStatus(
    @Param('type') type: string,
    @Param('id') id: string,
    @Body() dto: AdminContentStatusDto,
    @Req() req: AdminRequest,
  ) {
    return this.adminDashboardService.updateContentStatus(
      type,
      id,
      dto,
      this.getActor(req),
    );
  }

  // MODERATOR (in addition to ADMIN) can act on these four — every other
  // route in this controller stays ADMIN-only via the class-level @Roles.
  @Get('moderation/posts')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  listModerationPosts(@Query() query: AdminListQueryDto) {
    return this.adminDashboardService.listModerationPosts(query);
  }

  @Patch('moderation/posts/:id')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  moderatePost(
    @Param('id') id: string,
    @Body() dto: AdminModerationActionDto,
    @Req() req: AdminRequest,
  ) {
    return this.adminDashboardService.moderatePost(id, dto, this.getActor(req));
  }

  @Get('moderation/clubs')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  listClubs(@Query() query: AdminListQueryDto) {
    return this.adminDashboardService.listClubs(query);
  }

  @Patch('moderation/clubs/:id')
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  moderateClub(
    @Param('id') id: string,
    @Body() dto: AdminModerationActionDto,
    @Req() req: AdminRequest,
  ) {
    return this.adminDashboardService.moderateClub(id, dto, this.getActor(req));
  }

  @Get('gamification/:kind')
  listGamificationDefinitions(
    @Param('kind') kind: string,
    @Query() query: AdminListQueryDto,
  ) {
    return this.adminDashboardService.listGamificationDefinitions(kind, query);
  }

  @Patch('gamification/:kind/:id/toggle')
  toggleGamificationDefinition(
    @Param('kind') kind: string,
    @Param('id') id: string,
    @Body() dto: AdminGamificationToggleDto,
    @Req() req: AdminRequest,
  ) {
    return this.adminDashboardService.toggleGamificationDefinition(
      kind,
      id,
      dto.isActive,
      this.getActor(req),
    );
  }

  @Get('audit-logs')
  listAuditLogs(@Query() query: AdminListQueryDto) {
    return this.adminDashboardService.listAuditLogs(query);
  }

  @Get('operations')
  getOperations() {
    return this.adminDashboardService.getOperations();
  }

  @Get('operations/queues')
  getQueueSummary() {
    return this.adminDashboardService.getQueueSummary();
  }

  @Get('operations/health')
  getHealth() {
    return this.adminDashboardService.getHealth();
  }

  @Get('operations/feature-flags')
  getFeatureFlags() {
    return this.adminDashboardService.getFeatureFlags();
  }

  @Patch('operations/feature-flags/:key')
  setFeatureFlag(
    @Param('key') key: string,
    @Body() dto: AdminFeatureFlagDto,
    @Req() req: AdminRequest,
  ) {
    return this.adminDashboardService.setFeatureFlag(
      key,
      dto.isEnabled,
      this.getActor(req),
    );
  }

  @Get('operations/bullmq-queues')
  getBullMqQueues() {
    return this.adminDashboardService.getBullMqQueues();
  }

  @Get('operations/ai-usage')
  getAiUsage(@Query('fromDays') fromDays?: string) {
    return this.adminDashboardService.getAiUsage(
      fromDays ? Number(fromDays) : undefined,
    );
  }

  @Get('operations/queues/:queueName/failed')
  listFailedJobs(@Param('queueName') queueName: string) {
    return this.adminDashboardService.listFailedJobs(queueName);
  }

  @Post('operations/queues/:queueName/jobs/:jobId/retry')
  retryJob(
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
    @Req() req: AdminRequest,
  ) {
    return this.adminDashboardService.retryJob(
      queueName,
      jobId,
      this.getActor(req),
    );
  }

  @Post('operations/queues/:queueName/jobs/:jobId/remove')
  removeJob(
    @Param('queueName') queueName: string,
    @Param('jobId') jobId: string,
    @Req() req: AdminRequest,
  ) {
    return this.adminDashboardService.removeJob(
      queueName,
      jobId,
      this.getActor(req),
    );
  }

  @Post('operations/queues/:queueName/pause')
  pauseQueue(@Param('queueName') queueName: string, @Req() req: AdminRequest) {
    return this.adminDashboardService.pauseQueue(queueName, this.getActor(req));
  }

  @Post('operations/queues/:queueName/resume')
  resumeQueue(@Param('queueName') queueName: string, @Req() req: AdminRequest) {
    return this.adminDashboardService.resumeQueue(
      queueName,
      this.getActor(req),
    );
  }

  private getActor(req: AdminRequest) {
    const id = req.user?.id ?? req.user?.userId ?? req.user?.sub;

    if (!id) {
      throw new UnauthorizedException('Không xác định được admin hiện tại.');
    }

    return {
      id,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'] ?? null,
    };
  }
}
