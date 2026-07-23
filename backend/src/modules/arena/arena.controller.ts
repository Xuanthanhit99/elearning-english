import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { Roles } from 'src/common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ArenaService } from './arena.service';
import { CreateArenaRoomDto } from './dto/create-arena-room.dto';
import { FinishArenaMatchDto } from './dto/finish-arena-match.dto';
import { JoinArenaRoomDto } from './dto/join-arena-room.dto';
import { QueueArenaDto } from './dto/queue-arena.dto';
import { CreateArenaEventDto } from './dto/create-arena-event.dto';
import { SubmitArenaAnswerDto } from './dto/submit-arena-answer.dto';
import { SetArenaReadyDto } from './dto/set-arena-ready.dto';
import { ArenaRateLimiterService } from './rate-limit/arena-rate-limiter.service';

@Controller('arena')
@UseGuards(JwtAuthGuard)
export class ArenaController {
  constructor(
    private readonly arenaService: ArenaService,
    private readonly rateLimiter: ArenaRateLimiterService,
  ) {}

  @Get('me')
  getMyProfile(@Req() req: any) {
    return this.arenaService.getMyProfile(req.user.id);
  }

  @Get('lobby')
  getLobby(@Req() req: any) {
    return this.arenaService.getLobby(req.user.id);
  }

  @Get('rating/history')
  async getRatingHistory(
    @Req() req: any,
    @Query('take') take?: string,
    @Query('cursor') cursor?: string,
    @Query('tierChangesOnly') tierChangesOnly?: string,
    @Query('seasonId') seasonId?: string,
  ) {
    await this.rateLimiter.consume(req.user.id, 'historyFetch');
    return this.arenaService.getRatingHistory(req.user.id, { take, cursor, tierChangesOnly, seasonId });
  }

  @Get('season/current')
  getCurrentSeason(@Req() req: any) {
    return this.arenaService.getCurrentSeason(req.user.id);
  }

  @Get('admin/operations')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  getAdminOperations() {
    return this.arenaService.getAdminOperations();
  }

  @Post('admin/reconciliation/run')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async runAdminReconciliation(@Req() req: any) {
    await this.rateLimiter.consume(req.user.id, 'adminOperation');
    return this.arenaService.runAdminReconciliation();
  }

  @Post('admin/season-lifecycle/run')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async runAdminSeasonLifecycle(@Req() req: any) {
    await this.rateLimiter.consume(req.user.id, 'adminOperation');
    return this.arenaService.runAdminSeasonLifecycle();
  }

  @Post('rooms')
  createRoom(@Req() req: any, @Body() dto: CreateArenaRoomDto) {
    return this.arenaService.createRoom(req.user.id, dto);
  }

  @Post('rooms/:roomId/join')
  joinRoom(
    @Req() req: any,
    @Param('roomId') roomId: string,
    @Body() dto: JoinArenaRoomDto,
  ) {
    return this.arenaService.joinRoom(req.user.id, roomId, dto);
  }

  @Post('queue')
  async enterQueue(@Req() req: any, @Body() dto: QueueArenaDto) {
    await this.rateLimiter.consume(req.user.id, 'queueJoin');
    return this.arenaService.enterQueue(req.user.id, dto);
  }

  @Post('queue/leave')
  async leaveQueue(@Req() req: any) {
    await this.rateLimiter.consume(req.user.id, 'queueCancel');
    return this.arenaService.leaveQueue(req.user.id);
  }

  @Get('rooms/:roomId')
  getRoom(@Req() req: any, @Param('roomId') roomId: string) {
    return this.arenaService.getRoom(req.user.id, roomId);
  }

  @Post('rooms/:roomId/start')
  startRoom(@Req() req: any, @Param('roomId') roomId: string) {
    return this.arenaService.startRoom(req.user.id, roomId);
  }

  @Post('rooms/:roomId/ready')
  setReady(
    @Req() req: any,
    @Param('roomId') roomId: string,
    @Body() dto: SetArenaReadyDto,
  ) {
    return this.arenaService.setReady(req.user.id, roomId, dto);
  }

  @Post('rooms/:roomId/leave')
  leaveRoom(@Req() req: any, @Param('roomId') roomId: string) {
    return this.arenaService.leaveRoom(req.user.id, roomId);
  }

  @Post('rooms/:roomId/retry')
  async retryPreparation(@Req() req: any, @Param('roomId') roomId: string) {
    await this.rateLimiter.consume(req.user.id, 'matchmakingRetry');
    return this.arenaService.retryPreparation(req.user.id, roomId);
  }

  @Post('rooms/:roomId/events')
  createEvent(
    @Req() req: any,
    @Param('roomId') roomId: string,
    @Body() dto: CreateArenaEventDto,
  ) {
    return this.arenaService.createEvent(req.user.id, roomId, dto);
  }

  @Post('rooms/:roomId/questions/:questionId/answer')
  async submitAnswer(
    @Req() req: any,
    @Param('roomId') roomId: string,
    @Param('questionId') questionId: string,
    @Body() dto: SubmitArenaAnswerDto,
  ) {
    await this.rateLimiter.consume(req.user.id, 'answerSubmit');
    return this.arenaService.submitAnswer(req.user.id, roomId, questionId, dto);
  }

  @Post('rooms/:roomId/finish')
  async finishMatch(
    @Req() req: any,
    @Param('roomId') roomId: string,
    @Body() dto: FinishArenaMatchDto,
  ) {
    await this.rateLimiter.consume(req.user.id, 'finishRequest');
    return this.arenaService.finishMatch(req.user.id, roomId, dto);
  }
}
