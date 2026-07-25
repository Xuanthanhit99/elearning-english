import { Global, Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AiUsageService } from './ai-usage.service';

// Global like AuthModule/RedisCacheModule — GeminiService (used from
// dozens of content-generation call sites across the app) needs
// AiUsageService injectable everywhere without every one of those modules
// adding an explicit import.
@Global()
@Module({
  imports: [PrismaModule],
  providers: [AiUsageService],
  exports: [AiUsageService],
})
export class AiUsageModule {}
