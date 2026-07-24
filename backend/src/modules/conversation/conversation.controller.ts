import {
  Body,
  Controller,
  Get,
  Logger,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import type { Request, Response } from 'express';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { ConversationService } from './conversation.service';
import { StartConversationDto } from './dto/start-conversation.dto';
import { SendConversationMessageDto } from './dto/send-conversation-message.dto';
import { ListConversationsDto } from './dto/list-conversations.dto';

type AuthenticatedRequest = Request & { user?: { id?: string } };

@Controller('conversation')
@UseGuards(JwtAuthGuard)
export class ConversationController {
  private readonly logger = new Logger(ConversationController.name);

  constructor(private readonly conversationService: ConversationService) {}

  @Get('scenarios')
  async scenarios() {
    return { success: true, data: await this.conversationService.listScenarios() };
  }

  @Post('sessions')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async start(@Req() req: AuthenticatedRequest, @Body() dto: StartConversationDto) {
    return {
      success: true,
      data: await this.conversationService.startSession(this.getUserId(req), dto),
    };
  }

  @Get('sessions')
  async list(@Req() req: AuthenticatedRequest, @Query() query: ListConversationsDto) {
    return {
      success: true,
      data: await this.conversationService.listSessions(this.getUserId(req), query),
    };
  }

  @Get('sessions/:id')
  async get(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return {
      success: true,
      data: await this.conversationService.getSession(this.getUserId(req), id),
    };
  }

  /**
   * Streams the AI reply as plain-text chunks over a normal POST response
   * (not SSE/EventSource, which is GET-only and awkward for a message body —
   * a `fetch(...).body.getReader()` client, per the Step 0 audit, is the
   * intended consumer). Uses `@Res()` in non-passthrough mode so chunks can
   * be written as they arrive; any error thrown by `prepareMessageStream`
   * happens before any header is written, so Nest's global exception filter
   * still handles it normally.
   */
  @Post('sessions/:id/messages')
  @UseGuards(ThrottlerGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async sendMessage(
    @Req() req: AuthenticatedRequest,
    @Res() res: Response,
    @Param('id') id: string,
    @Body() dto: SendConversationMessageDto,
  ) {
    const userId = this.getUserId(req);
    const prepared = await this.conversationService.prepareMessageStream(
      userId,
      id,
      dto.content,
    );

    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('X-Accel-Buffering', 'no');

    let clientClosed = false;
    req.on('close', () => {
      clientClosed = true;
    });

    let fullText = '';
    try {
      for await (const chunk of prepared.stream) {
        if (clientClosed) break;
        fullText += chunk;
        res.write(chunk);
      }
    } catch (error) {
      this.logger.error(
        `Streaming failed for session=${id}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      if (!clientClosed && !res.writableEnded) {
        res.write('\n[The connection was interrupted. Please try again.]');
      }
    } finally {
      // Persist whatever was produced even on a client-cancelled/failed
      // stream — a partial reply is still real conversation history, not
      // discarded, and the generation lock is always released here.
      await prepared.persist(fullText);
      if (!res.writableEnded) res.end();
    }
  }

  @Post('sessions/:id/finish')
  async finish(@Req() req: AuthenticatedRequest, @Param('id') id: string) {
    return {
      success: true,
      data: await this.conversationService.finishSession(this.getUserId(req), id),
    };
  }

  private getUserId(req: AuthenticatedRequest) {
    const id = req.user?.id;
    if (!id) {
      throw new Error('Unauthenticated request reached a guarded route.');
    }
    return id;
  }
}
