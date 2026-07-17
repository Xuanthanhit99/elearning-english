// src/chat/chat.service.ts
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { GeminiChatService } from './gemini-chat.service';
import { ContentFilterService } from './content-filter.service';
import { ChatRole, QuickAction } from '@prisma/client';
import { CreateMessageDto } from './dto/create-message.dto';

const QUICK_ACTION_PROMPTS: Record<QuickAction, string> = {
  CHEER_UP: 'Hãy động viên mình học tiếng Anh hôm nay đi Miu.',
  BANTER: 'Nghịch với mình một chút đi, kể trò gì vui vui.',
  QUICK_TIP: 'Cho mình 1 câu tiếng Anh hay dùng kèm nghĩa và cách dùng.',
};

const HISTORY_LIMIT = 20;

@Injectable()
export class ChatSessionService {
  constructor(
    private prisma: PrismaService,
    private geminiChat: GeminiChatService,
    private contentFilter: ContentFilterService,
  ) {}

  async getOrCreatePet(userId: string) {
    return this.prisma.userPet.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  async sendMessage(userId: string, dto: CreateMessageDto) {
    const content = dto.quickAction
      ? QUICK_ACTION_PROMPTS[dto.quickAction]
      : dto.content?.trim();

    if (!content) {
      throw new BadRequestException('Nội dung tin nhắn không hợp lệ');
    }

    if (!this.contentFilter.isUserInputSafe(content)) {
      return this.buildStaticReply(
        userId,
        dto.sessionId,
        'Miu chỉ thích tám chuyện học tiếng Anh và vui vẻ thôi á 🐱 Hỏi mình chuyện khác đi!',
      );
    }

    const session = dto.sessionId
      ? await this.prisma.chatSession.findFirst({
          where: { id: dto.sessionId, userId },
        })
      : await this.prisma.chatSession.create({ data: { userId } });

    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên chat');
    }

    const pet = await this.getOrCreatePet(userId);

    // Lấy lịch sử TRƯỚC khi thêm tin nhắn mới, để không tự lặp lại chính nó trong history
    const history = await this.prisma.chatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: 'asc' },
      take: HISTORY_LIMIT,
    });

    // Lưu tin nhắn USER — bước này đã bị thiếu ở bản trước
    await this.prisma.chatMessage.create({
      data: { sessionId: session.id, role: ChatRole.USER, content },
    });

    const contextualPrompt = `[Trạng thái: Level ${pet.level}, Streak ${pet.streak} ngày, HP ${pet.hp}/100]\n${content}`;

    const result = await this.geminiChat.generateReply(
      history,
      contextualPrompt,
    );

    let replyText = result.text;
    if (!this.contentFilter.isAiOutputSafe(replyText)) {
      replyText = 'Miu hơi rối trong đầu xíu 🐱 Hỏi mình câu khác nhé!';
    }

    await this.prisma.chatMessage.create({
      data: {
        sessionId: session.id,
        role: ChatRole.ASSISTANT,
        content: replyText,
      },
    });

    return {
      sessionId: session.id,
      reply: replyText,
      action: result.action ?? null,
      petStatus: {
        name: pet.name,
        level: pet.level,
        streak: pet.streak,
        hp: pet.hp,
      },
    };
  }

  private async buildStaticReply(
    userId: string,
    sessionId: string | undefined,
    reply: string,
  ) {
    const pet = await this.getOrCreatePet(userId);

    const session = sessionId
      ? await this.prisma.chatSession.findFirst({
          where: { id: sessionId, userId },
        })
      : await this.prisma.chatSession.create({ data: { userId } });

    if (!session) {
      throw new NotFoundException('Không tìm thấy phiên chat');
    }

    return {
      sessionId: session.id, // giờ TS hiểu session chắc chắn không null
      reply,
      petStatus: {
        name: pet.name,
        level: pet.level,
        streak: pet.streak,
        hp: pet.hp,
      },
    };
  }

  async getMessages(userId: string, sessionId: string) {
    const session = await this.prisma.chatSession.findFirst({
      where: { id: sessionId, userId },
      include: { messages: { orderBy: { createdAt: 'asc' } } },
    });
    if (!session) throw new NotFoundException('Không tìm thấy phiên chat');
    return session.messages;
  }

  async createSession(userId: string) {
    return this.prisma.chatSession.create({ data: { userId } });
  }
}
