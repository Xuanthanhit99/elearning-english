import {
  Body,
  Controller,
  Delete,
  Get,
  Ip,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import { DocumentsService } from './documents.service';
import { DocumentInteractionsService } from './document-interactions.service';
import { DocumentListQueryDto } from './dto/document-query.dto';
import {
  RateDocumentDto,
  ReportDocumentDto,
} from './dto/document-interaction.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtGuard } from '../../common/guards/optional-jwt.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

// NOTE on route ordering: this controller's `GET :slug` is a 1-segment
// catch-all GET route. DocumentUploadController (`documents/uploads`)
// and MyDocumentsController (`documents/me`) are registered BEFORE this
// controller in DocumentsModule so their literal segments win over this
// controller's param route — see DocumentsModule for the required order.
@Controller('documents')
export class DocumentsController {
  constructor(
    private readonly documentsService: DocumentsService,
    private readonly interactions: DocumentInteractionsService,
  ) {}

  @Get()
  @UseGuards(OptionalJwtGuard)
  @UsePipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  )
  list(
    @Query() query: DocumentListQueryDto,
    @CurrentUser('id') userId?: string,
  ) {
    return this.documentsService.list(query, userId ?? null);
  }

  @Get(':id/related')
  related(@Param('id') id: string) {
    return this.documentsService.getRelated(id);
  }

  @Post(':id/view')
  @UseGuards(OptionalJwtGuard)
  async view(
    @Param('id') id: string,
    @Req() req: Request,
    @CurrentUser('id') userId?: string,
  ) {
    const cookies = req.cookies as Record<string, string> | undefined;
    const dedupeKey = userId ?? cookies?.anon_session_id ?? req.ip ?? 'anonymous';
    return this.documentsService.recordView(id, String(dedupeKey));
  }

  @Post(':id/download')
  @UseGuards(JwtAuthGuard)
  download(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Ip() ip: string,
  ) {
    return this.interactions.requestDownload(userId, id, ip);
  }

  @Post(':id/bookmark')
  @UseGuards(JwtAuthGuard)
  bookmark(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.interactions.bookmark(userId, id);
  }

  @Delete(':id/bookmark')
  @UseGuards(JwtAuthGuard)
  unbookmark(@Param('id') id: string, @CurrentUser('id') userId: string) {
    return this.interactions.unbookmark(userId, id);
  }

  @Post(':id/rating')
  @UseGuards(JwtAuthGuard)
  rate(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: RateDocumentDto,
  ) {
    return this.interactions.rate(userId, id, body.value, body.comment);
  }

  @Post(':id/report')
  @UseGuards(JwtAuthGuard)
  report(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
    @Body() body: ReportDocumentDto,
  ) {
    return this.interactions.report(userId, id, body.reason, body.description);
  }

  @Get(':slug')
  @UseGuards(OptionalJwtGuard)
  detail(@Param('slug') slug: string, @CurrentUser('id') userId?: string) {
    return this.documentsService.getBySlug(slug, userId ?? null);
  }
}
