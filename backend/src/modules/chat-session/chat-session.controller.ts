import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { ChatSessionService } from './chat-session.service';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { Throttle } from '@nestjs/throttler';
import { CreateMessageDto } from './dto/create-message.dto';

@Controller('chat-session')
@UseGuards(JwtAuthGuard)
export class ChatSessionController {
  constructor(private chatService: ChatSessionService) {}
  @Throttle({ default: { limit: 15, ttl: 60_000 } }) // 15 tin/phút/user
  @Post('message')
  send(@CurrentUser() user, @Body() dto: CreateMessageDto) {
    return this.chatService.sendMessage(user.id, dto);
  }

  @Post('sessions')
  createSession(@CurrentUser() user) {
    return this.chatService.createSession(user.id);
  }

  @Get('sessions/:id/messages')
  getMessages(@CurrentUser() user, @Param('id') id: string) {
    return this.chatService.getMessages(user.id, id);
  }

  @Get('pet')
  getPet(@CurrentUser() user) {
    return this.chatService.getOrCreatePet(user.id);
  }
}
