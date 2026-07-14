import { Injectable } from '@nestjs/common';
import { WritingService } from './writing.service';

@Injectable()
export class WritingHistoryService {
  constructor(private readonly writingService: WritingService) {}

  getHistory(
    userId: string,
    query: {
      topic?: string;
      type?: string;
      level?: string;
      status?: string;
      from?: string;
      to?: string;
      page: number;
      limit: number;
    },
  ) {
    return this.writingService.getWritingHistory(userId, query);
  }

  getDetail(userId: string, sessionId: string) {
    return this.writingService.getWritingHistoryDetail(userId, sessionId);
  }

  practiceAgain(userId: string, sessionId: string) {
    return this.writingService.retryEssay(userId, sessionId);
  }
}
