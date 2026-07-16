import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { SettingsService } from './settings.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { ResetSettingsSectionDto } from './dto/settings-section.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  getSettings(@CurrentUser('id') userId: string) {
    return this.settingsService.getSettings(userId);
  }

  @Patch()
  updateSettings(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateSettingsDto,
  ) {
    return this.settingsService.updateSettings(userId, dto);
  }

  @Post('reset-section')
  resetSection(
    @CurrentUser('id') userId: string,
    @Body() dto: ResetSettingsSectionDto,
  ) {
    return this.settingsService.resetSection(userId, dto.section);
  }

  @Get('devices')
  getDevices(@CurrentUser('id') userId: string) {
    return this.settingsService.getDevices(userId);
  }

  @Delete('devices/:sessionId')
  revokeDevice(
    @CurrentUser('id') userId: string,
    @Param('sessionId') sessionId: string,
  ) {
    return this.settingsService.revokeDevice(userId, sessionId);
  }

  @Delete('devices')
  revokeOtherDevices(@CurrentUser('id') userId: string) {
    return this.settingsService.revokeOtherDevices(userId);
  }

  @Get('learning-dna')
  getLearningDna(@CurrentUser('id') userId: string) {
    return this.settingsService.getLearningDna(userId);
  }

  @Get('export')
  async exportSettings(
    @CurrentUser('id') userId: string,
    @Res() res: Response,
  ) {
    const data = await this.settingsService.exportSettings(userId);

    res
      .setHeader('Content-Type', 'application/json')
      .setHeader(
        'Content-Disposition',
        `attachment; filename="poppylingo-settings-${userId}.json"`,
      )
      .send(JSON.stringify(data, null, 2));
  }
}
