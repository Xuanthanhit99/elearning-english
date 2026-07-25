import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { StudyRoomService } from './study-room.service';
import { CreateStudyRoomDto } from './dto/create-study-room.dto';
import { ListStudyRoomsDto } from './dto/list-study-rooms.dto';
import { JoinStudyRoomByCodeDto } from './dto/join-study-room-by-code.dto';

@Controller('study-rooms')
@UseGuards(JwtAuthGuard)
export class StudyRoomController {
  constructor(private readonly service: StudyRoomService) {}

  private userId(req: any) {
    return req.user.id;
  }

  @Get()
  list(@Query() query: ListStudyRoomsDto) {
    return this.service.listRooms(query);
  }

  @Get('mine')
  mine(@Req() req: any) {
    return this.service.myRooms(this.userId(req));
  }

  @Get(':roomId')
  getRoom(@Req() req: any, @Param('roomId') roomId: string) {
    return this.service.getRoom(this.userId(req), roomId);
  }

  @Get(':roomId/history')
  history(@Req() req: any, @Param('roomId') roomId: string) {
    return this.service.getRoomHistory(this.userId(req), roomId);
  }

  @Post()
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  create(@Req() req: any, @Body() dto: CreateStudyRoomDto) {
    return this.service.createRoom(this.userId(req), dto);
  }

  @Post(':roomId/join')
  join(@Req() req: any, @Param('roomId') roomId: string) {
    return this.service.joinRoom(this.userId(req), roomId);
  }

  @Post('join-by-code')
  joinByCode(@Req() req: any, @Body() dto: JoinStudyRoomByCodeDto) {
    return this.service.joinRoomByCode(this.userId(req), dto.inviteCode);
  }

  @Delete(':roomId/leave')
  leave(@Req() req: any, @Param('roomId') roomId: string) {
    return this.service.leaveRoom(this.userId(req), roomId);
  }

  @Post(':roomId/start')
  start(@Req() req: any, @Param('roomId') roomId: string) {
    return this.service.startSession(this.userId(req), roomId);
  }

  @Post(':roomId/end')
  end(@Req() req: any, @Param('roomId') roomId: string) {
    return this.service.endSessionManually(this.userId(req), roomId);
  }

  @Post(':roomId/members/:memberUserId/kick')
  kick(
    @Req() req: any,
    @Param('roomId') roomId: string,
    @Param('memberUserId') memberUserId: string,
  ) {
    return this.service.kickMember(this.userId(req), roomId, memberUserId);
  }

  @Post(':roomId/members/:memberUserId/ban')
  ban(
    @Req() req: any,
    @Param('roomId') roomId: string,
    @Param('memberUserId') memberUserId: string,
  ) {
    return this.service.banMember(this.userId(req), roomId, memberUserId);
  }

  @Post(':roomId/members/:memberUserId/mute')
  mute(
    @Req() req: any,
    @Param('roomId') roomId: string,
    @Param('memberUserId') memberUserId: string,
  ) {
    return this.service.muteMember(this.userId(req), roomId, memberUserId, true);
  }

  @Post(':roomId/members/:memberUserId/unmute')
  unmute(
    @Req() req: any,
    @Param('roomId') roomId: string,
    @Param('memberUserId') memberUserId: string,
  ) {
    return this.service.muteMember(this.userId(req), roomId, memberUserId, false);
  }
}
