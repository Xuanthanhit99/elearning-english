import {
  Body,
  Controller,
  Delete,
  Param,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';
import { RolesGuard } from 'src/common/guards/roles.guard';
import { SectionsService } from './sections.service';
import { Roles } from 'src/common/decorators/roles.decorator';
import { CreateSectionDto } from './dto/create-section.dto';
import { UpdateSectionDto } from './dto/update-section.dto';
import { UserRole } from '@prisma/client';

@Controller()
@UseGuards(JwtAuthGuard, RolesGuard)
export class SectionsController {
  constructor(private readonly sectionService: SectionsService) {}

  @Post('courses/:courseId/sections')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  create(
    @Param('courseId') courseId: string,
    @Req() req: any,
    @Body() dto: CreateSectionDto,
  ) {
    return this.sectionService.create(courseId, req.user, dto);
  }

  @Patch('sections/:id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  update(
    @Param('id') id: string,
    @Req() req: any,
    @Body() dto: UpdateSectionDto,
  ) {
    return this.sectionService.update(id, req.user, dto);
  }

  @Delete('sections/:id')
  @Roles(UserRole.ADMIN, UserRole.TEACHER)
  delete(@Param('id') id: string, @Req() req: any) {
    return this.sectionService.delete(id, req.user);
  }
}
