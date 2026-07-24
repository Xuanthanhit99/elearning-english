import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { LearningXpModule } from '../learning-xp/learning-xp.module';
import { ChatSessionModule } from '../chat-session/chat-session.module';
import { ConversationController } from './conversation.controller';
import { ConversationService } from './conversation.service';
import { ConversationGeminiService } from './conversation-gemini.service';

@Module({
  imports: [PrismaModule, LearningXpModule, ChatSessionModule],
  controllers: [ConversationController],
  providers: [ConversationService, ConversationGeminiService],
  exports: [ConversationService],
})
export class ConversationModule {}
