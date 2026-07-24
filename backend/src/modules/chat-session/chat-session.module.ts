import { Module } from '@nestjs/common';
import { ChatSessionController } from './chat-session.controller';
import { ChatSessionService } from './chat-session.service';
import { ContentFilterService } from './content-filter.service';
import { GeminiChatService } from './gemini-chat.service';
import { PrismaModule } from 'src/prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ChatSessionController],
  providers: [GeminiChatService, ChatSessionService, ContentFilterService],
  // ContentFilterService is generic (not Miu-persona-specific) — exported so
  // the new conversation module can reuse it instead of duplicating a second
  // copy of the same 2-method safety check.
  exports: [ContentFilterService],
})
export class ChatSessionModule {}
