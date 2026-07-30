import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MyDocumentsService } from './my-documents.service';
import { DocumentInteractionsService } from './document-interactions.service';
import { UpdateMyDocumentDto } from './dto/document-interaction.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CommunityDocumentUploadAccessService } from './upload/community-upload-access.service';

// Registered before DocumentsController in DocumentsModule — the literal
// `me`/`bookmarks` segments here must win over that controller's
// `GET /documents/:slug` catch-all.
@Controller('documents/me')
@UseGuards(JwtAuthGuard)
export class MyDocumentsController {
  constructor(
    private readonly myDocuments: MyDocumentsService,
    private readonly interactions: DocumentInteractionsService,
    private readonly communityUploadAccess: CommunityDocumentUploadAccessService,
  ) {}

  // Literal segment — must stay registered before `GET :id` below so it
  // isn't swallowed by that catch-all (same route-ordering concern as
  // the rest of this controller). Never exposes the allowlist itself,
  // only a plain boolean the frontend uses to show/hide the upload CTA;
  // the real enforcement is CommunityDocumentUploadGuard on the upload
  // endpoints, not this.
  @Get('upload-access')
  getUploadAccess(
    @CurrentUser() user: { id: string; email?: string; role: string },
  ) {
    return {
      canUploadCommunityDocuments: this.communityUploadAccess.isAllowed(user),
    };
  }

  @Get()
  list(
    @CurrentUser('id') userId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.myDocuments.list(
      userId,
      Number(page) || 1,
      Number(limit) || 20,
    );
  }

  @Get('bookmarks')
  bookmarks(@CurrentUser('id') userId: string, @Query('page') page?: string) {
    return this.interactions.listMyBookmarks(userId, Number(page) || 1);
  }

  @Get(':id')
  getOne(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.myDocuments.getOne(userId, id);
  }

  @Patch(':id')
  update(
    @CurrentUser('id') userId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMyDocumentDto,
  ) {
    return this.myDocuments.update(userId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser('id') userId: string, @Param('id') id: string) {
    return this.myDocuments.remove(userId, id);
  }
}
