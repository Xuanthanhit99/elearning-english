import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ArenaService } from './arena.service';
import { CreateArenaRoomDto } from './dto/create-arena-room.dto';
import { FinishArenaMatchDto } from './dto/finish-arena-match.dto';
import { JoinArenaRoomDto } from './dto/join-arena-room.dto';
import { QueueArenaDto } from './dto/queue-arena.dto';
import { CreateArenaEventDto } from './dto/create-arena-event.dto';
import { SubmitArenaAnswerDto } from './dto/submit-arena-answer.dto';
import { SetArenaReadyDto } from './dto/set-arena-ready.dto';

@Controller('arena')
@UseGuards(JwtAuthGuard)
export class ArenaController {
  constructor(private readonly arenaService: ArenaService) {}

  @Get('me')
  getMyProfile(@Req() req: any) {
    return this.arenaService.getMyProfile(req.user.id);
  }

  @Get('lobby')
  getLobby(@Req() req: any) {
    return this.arenaService.getLobby(req.user.id);
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
  enterQueue(@Req() req: any, @Body() dto: QueueArenaDto) {
    return this.arenaService.enterQueue(req.user.id, dto);
  }

  @Post('queue/leave')
  leaveQueue(@Req() req: any) {
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
  retryPreparation(@Req() req: any, @Param('roomId') roomId: string) {
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
  submitAnswer(
    @Req() req: any,
    @Param('roomId') roomId: string,
    @Param('questionId') questionId: string,
    @Body() dto: SubmitArenaAnswerDto,
  ) {
    return this.arenaService.submitAnswer(req.user.id, roomId, questionId, dto);
  }

  @Post('rooms/:roomId/finish')
  finishMatch(
    @Req() req: any,
    @Param('roomId') roomId: string,
    @Body() dto: FinishArenaMatchDto,
  ) {
    return this.arenaService.finishMatch(req.user.id, roomId, dto);
  }
}
