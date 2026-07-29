import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UserRole } from '@prisma/client';
import { DocumentGenerationService } from './document-generation.service';
import { CreateDocumentGenerationDto } from './document-generation.dto';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guards/roles.guard';
import { Roles } from '../../../common/decorators/roles.decorator';
import { CurrentUser } from '../../../common/decorators/current-user.decorator';

// Registered BEFORE AdminDocumentsController in DocumentsModule so the
// literal `generate`/`generations` segments win over that controller's
// `GET /admin/documents/:id`.
@Controller('admin/documents')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class AdminGenerationController {
  constructor(private readonly generation: DocumentGenerationService) {}

  @Post('generate')
  generate(
    @CurrentUser('id') adminId: string,
    @Body() dto: CreateDocumentGenerationDto,
  ) {
    return this.generation.startGeneration(adminId, dto);
  }

  @Get('generations')
  list(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.generation.list(Number(page) || 1, Number(limit) || 20);
  }

  @Get('generations/:id')
  getOne(@Param('id') id: string) {
    return this.generation.getOne(id);
  }

  @Post('generations/:id/cancel')
  cancel(@Param('id') id: string) {
    return this.generation.cancel(id);
  }

  @Post('generations/:id/retry')
  retry(@Param('id') id: string) {
    return this.generation.retry(id);
  }

  @Post('generations/:id/retry-section/:sectionKey')
  retrySection(
    @Param('id') id: string,
    @Param('sectionKey') sectionKey: string,
  ) {
    return this.generation.retrySection(id, sectionKey);
  }
}
