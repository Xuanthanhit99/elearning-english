// src/chat/content-filter.service.ts
import { Injectable } from '@nestjs/common';

const BLOCKED_PATTERNS: RegExp[] = [
  /\b(chính trị|tôn giáo|bạo lực|khiêu dâm)\b/i,
  // thêm từ khóa nhạy cảm khác theo nhu cầu
];

@Injectable()
export class ContentFilterService {
  isUserInputSafe(text: string): boolean {
    return !BLOCKED_PATTERNS.some((p) => p.test(text));
  }

  // Lọc luôn cả output của AI phòng khi model "lệch kịch bản"
  isAiOutputSafe(text: string): boolean {
    return !BLOCKED_PATTERNS.some((p) => p.test(text));
  }
}
