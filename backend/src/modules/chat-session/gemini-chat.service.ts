// src/modules/chat-session/gemini-chat.service.ts
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChatRole } from '@prisma/client';
import { CHAT_TOOLS, PAGE_ROUTES } from './chat-tools';

const MIU_SYSTEM_PROMPT = `
Bạn là Miu — linh thú mèo cam đồng hành học tiếng Anh trên app.

TÍNH CÁCH:
- Vui vẻ, gần gũi, xưng "mình" gọi "bạn"
- KHÔNG mở đầu mọi câu bằng "Meo meo!" — chỉ dùng thỉnh thoảng
- Trả lời NGẮN GỌN (2-4 câu), LUÔN trọn ý

NHIỆM VỤ:
- Trả lời câu hỏi về app dựa đúng thông tin được cung cấp
- Khi user muốn LÀM một việc cụ thể (làm bài kiểm tra, xem khóa học, luyện nói, chăm sóc linh thú, xem cộng đồng) → PHẢI gọi function navigate_to_page tương ứng, kèm 1 câu trả lời ngắn xác nhận
- Không tự bịa tính năng ngoài danh sách đã cho

THÔNG TIN APP:
1. Luyện hội thoại (Speaking) — chấm điểm phát âm, phản xạ nói
2. Bài kiểm tra đầu vào (Placement Test) — xác định trình độ CEFR
3. Khóa học theo lộ trình — Ngữ pháp, Từ vựng, Nghe, Viết
4. Linh thú đồng hành — chăm sóc, streak, thăng cấp
5. Wallet/Coin — thưởng khi học, đổi vật phẩm
6. Cộng đồng — chia sẻ tiến độ, tương tác
`;

interface NavigateToPageArgs {
  page: string;
  reason?: string;
}

export interface GeminiReplyResult {
  text: string;
  action?: { path: string; label: string };
}

@Injectable()
export class GeminiChatService {
  private readonly logger = new Logger(GeminiChatService.name);
  private readonly genAI: GoogleGenerativeAI;

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('GEMINI_API_KEY');
    if (!apiKey)
      throw new Error('GEMINI_API_KEY chưa được cấu hình trong .env');
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateReply(
    history: { role: ChatRole; content: string }[],
    userMessage: string,
  ): Promise<GeminiReplyResult> {
    const model = this.genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: MIU_SYSTEM_PROMPT,
      tools: CHAT_TOOLS,
      generationConfig: {
        maxOutputTokens: 300,
        temperature: 0.8,
      },
    });

    const chat = model.startChat({
      history: history.map((h) => ({
        role: h.role === ChatRole.USER ? 'user' : 'model',
        parts: [{ text: h.content }],
      })),
    });

    try {
      const result = await chat.sendMessage(userMessage);
      const response = result.response;

      const functionCalls = response.functionCalls();

      if (functionCalls && functionCalls.length > 0) {
        const call = functionCalls[0];

        if (call.name === 'navigate_to_page') {
          const args = call.args as unknown as NavigateToPageArgs;
          const page = args.page;
          const route = PAGE_ROUTES[page];

          // Gửi lại function response để model sinh câu trả lời text tự nhiên
          const followUp = await chat.sendMessage([
            {
              functionResponse: {
                name: 'navigate_to_page',
                response: { success: true, page: route?.label ?? page },
              },
            },
          ]);

          return {
            text:
              followUp.response.text().trim() ||
              `Đi ngay tới ${route?.label ?? 'trang cần thiết'} nhé!`,
            action: route
              ? { path: route.path, label: route.label }
              : undefined,
          };
        }
      }

      return { text: response.text().trim() };
    } catch (err) {
      this.logger.error('Gemini call failed', err);
      return { text: 'Miu đang hơi lag xíu 🐱💤 Bạn thử gửi lại sau nhé!' };
    }
  }
}
