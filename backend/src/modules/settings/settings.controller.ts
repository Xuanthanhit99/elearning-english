import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { SettingsService } from './settings.service';
import { SettingsQueryService } from './settings-query.service';
import { SettingsCommandService } from './settings-command.service';
import { LearningDnaService } from './learning-dna.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { ResetSettingsSectionDto } from './dto/settings-section.dto';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { JwtAuthGuard } from 'src/common/guards/jwt-auth.guard';

@Controller('settings')
@UseGuards(JwtAuthGuard)
export class SettingsController {
  constructor(
    private readonly settingsService: SettingsService,
    private readonly settingsQuery: SettingsQueryService,
    private readonly settingsCommand: SettingsCommandService,
    private readonly learningDna: LearningDnaService,
  ) {}

  @Get()
  getSettings(@CurrentUser('id') userId: string) {
    return this.settingsQuery.getSettings(userId);
  }

  @Patch()
  updateSettings(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateSettingsDto,
    @Req() req: Request,
  ) {
    return this.settingsCommand.updateSettings(userId, dto, {
      source: 'USER',
      ipAddress: req.ip ?? req.socket?.remoteAddress ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
  }

  @Post('reset-section')
  resetSection(
    @CurrentUser('id') userId: string,
    @Body() dto: ResetSettingsSectionDto,
    @Req() req: Request,
  ) {
    return this.settingsCommand.resetSection(userId, dto.section, {
      source: 'USER',
      ipAddress: req.ip ?? req.socket?.remoteAddress ?? null,
      userAgent: req.headers['user-agent'] ?? null,
    });
  }

  @Get('learning')
  getLearningSettings(@CurrentUser('id') userId: string) {
    return this.settingsQuery.getLearningSettings(userId);
  }

  @Get('ai')
  getAiSettings(@CurrentUser('id') userId: string) {
    return this.settingsQuery.getAiSettings(userId);
  }

  @Get('speaking')
  getSpeakingSettings(@CurrentUser('id') userId: string) {
    return this.settingsQuery.getSpeakingSettings(userId);
  }

  @Get('notifications')
  getNotificationSettings(@CurrentUser('id') userId: string) {
    return this.settingsQuery.getNotificationSettings(userId);
  }

  @Get('community')
  getCommunitySettings(@CurrentUser('id') userId: string) {
    return this.settingsQuery.getCommunitySettings(userId);
  }

  @Get('appearance')
  getAppearanceSettings(@CurrentUser('id') userId: string) {
    return this.settingsQuery.getAppearanceSettings(userId);
  }

  @Get('privacy')
  getPrivacySettings(@CurrentUser('id') userId: string) {
    return this.settingsQuery.getPrivacySettings(userId);
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
    return this.learningDna.getLatest(userId);
  }

  @Post('learning-dna/recalculate')
  recalculateLearningDna(@CurrentUser('id') userId: string) {
    return this.learningDna.recalculate(userId);
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
