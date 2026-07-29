import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { UserRole } from '@prisma/client';
import { AdminDocumentsService } from './admin-documents.service';
import {
  AdminApproveDocumentDto,
  AdminCreateOfficialDocumentDto,
  AdminRejectDocumentDto,
  AdminRequestChangesDto,
  AdminResolveReportDto,
  AdminUpdateDocumentDto,
} from './admin-documents.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

@Controller('admin/documents')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminDocumentsController {
  constructor(private readonly adminDocuments: AdminDocumentsService) {}

  @Get()
  list(
    @Query('status') status?: string,
    @Query('source') source?: string,
    @Query('creationType') creationType?: string,
    @Query('authorId') authorId?: string,
    @Query('category') category?: string,
    @Query('keyword') keyword?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.adminDocuments.list({
      status,
      source,
      creationType,
      authorId,
      category,
      keyword,
      page: Number(page) || 1,
      limit: Number(limit) || 20,
    });
  }

  @Post()
  @UseInterceptors(FileInterceptor('file', { storage: memoryStorage() }))
  async createOfficial(
    @CurrentUser('id') adminId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() dto: AdminCreateOfficialDocumentDto,
  ) {
    if (!file) throw new BadRequestException('Không nhận được file.');
    return this.adminDocuments.uploadOfficial(adminId, file, dto);
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.adminDocuments.getOne(id);
  }

  @Get(':id/versions/:versionId/review-download')
  getReviewDownload(@Param('versionId') versionId: string) {
    return this.adminDocuments.getReviewDownloadUrl(versionId);
  }

  @Patch(':id')
  update(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body() dto: AdminUpdateDocumentDto,
  ) {
    return this.adminDocuments.update(adminId, id, dto);
  }

  @Post(':id/approve')
  approve(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body() dto: AdminApproveDocumentDto,
  ) {
    return this.adminDocuments.approve(
      adminId,
      id,
      dto.publishImmediately ?? true,
    );
  }

  @Post(':id/reject')
  reject(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body() dto: AdminRejectDocumentDto,
  ) {
    return this.adminDocuments.reject(adminId, id, dto);
  }

  @Post(':id/request-changes')
  requestChanges(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Body() dto: AdminRequestChangesDto,
  ) {
    return this.adminDocuments.requestChanges(adminId, id, dto);
  }

  @Post(':id/publish')
  publish(@CurrentUser('id') adminId: string, @Param('id') id: string) {
    return this.adminDocuments.publish(adminId, id);
  }

  @Post(':id/unpublish')
  unpublish(@CurrentUser('id') adminId: string, @Param('id') id: string) {
    return this.adminDocuments.unpublish(adminId, id);
  }

  @Post(':id/hide')
  hide(@CurrentUser('id') adminId: string, @Param('id') id: string) {
    return this.adminDocuments.hide(adminId, id);
  }

  @Post(':id/remove')
  remove(@CurrentUser('id') adminId: string, @Param('id') id: string) {
    return this.adminDocuments.remove(adminId, id);
  }

  @Post(':id/restore')
  restore(@CurrentUser('id') adminId: string, @Param('id') id: string) {
    return this.adminDocuments.restore(adminId, id);
  }

  @Post(':id/retry')
  retry(@CurrentUser('id') adminId: string, @Param('id') id: string) {
    return this.adminDocuments.retry(adminId, id);
  }

  @Post(':id/rollback/:versionId')
  rollback(
    @CurrentUser('id') adminId: string,
    @Param('id') id: string,
    @Param('versionId') versionId: string,
  ) {
    return this.adminDocuments.rollback(adminId, id, versionId);
  }

  @Post('reports/:reportId/resolve')
  resolveReport(
    @CurrentUser('id') adminId: string,
    @Param('reportId') reportId: string,
    @Body() dto: AdminResolveReportDto,
  ) {
    return this.adminDocuments.resolveReport(adminId, reportId, dto);
  }
}
