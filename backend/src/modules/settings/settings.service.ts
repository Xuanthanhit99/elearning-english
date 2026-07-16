import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { SettingsSection } from './dto/settings-section.dto';
import { settingsDefaults } from './settings.defaults';
import { Prisma } from '@prisma/client';

@Injectable()
export class SettingsService {
  constructor(private readonly prisma: PrismaService) {}

  async getSettings(userId: string) {
    return this.prisma.userSettings.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  async updateSettings(userId: string, dto: UpdateSettingsDto) {
    if (dto.showOnlineStatus === false && dto.showLastSeen === true) {
      dto.showLastSeen = false;
    }

    if (dto.focusMode === true) {
      dto.friendActivity = false;
      dto.leaderboardNotification = false;
      dto.clubNotification = false;
    }

    return this.prisma.userSettings.upsert({
      where: { userId },
      create: {
        userId,
        ...dto,
      },
      update: dto,
    });
  }
  async resetSection(userId: string, section: SettingsSection) {
    const defaults = settingsDefaults[section];

    if (!defaults) {
      throw new BadRequestException('Invalid settings section');
    }

    const updateData: Prisma.UserSettingsUncheckedUpdateInput = {
      ...defaults,
    };

    const createData: Prisma.UserSettingsUncheckedCreateInput = {
      userId,
      ...defaults,
    };

    return this.prisma.userSettings.upsert({
      where: {
        userId,
      },
      create: createData,
      update: updateData,
    });
  }
  async getDevices(userId: string) {
    return this.prisma.userDeviceSession.findMany({
      where: {
        userId,
        revokedAt: null,
      },
      orderBy: [{ current: 'desc' }, { lastActiveAt: 'desc' }],
      select: {
        id: true,
        deviceName: true,
        browser: true,
        os: true,
        ipAddress: true,
        current: true,
        lastActiveAt: true,
        createdAt: true,
      },
    });
  }

  async revokeDevice(userId: string, sessionId: string) {
    const session = await this.prisma.userDeviceSession.findFirst({
      where: {
        id: sessionId,
        userId,
        revokedAt: null,
      },
    });

    if (!session) {
      throw new NotFoundException('Device session not found');
    }

    if (session.current) {
      throw new BadRequestException(
        'Use logout endpoint to revoke current session',
      );
    }

    return this.prisma.userDeviceSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });
  }

  async revokeOtherDevices(userId: string) {
    const result = await this.prisma.userDeviceSession.updateMany({
      where: {
        userId,
        current: false,
        revokedAt: null,
      },
      data: { revokedAt: new Date() },
    });

    return { revokedCount: result.count };
  }

  async getLearningDna(userId: string) {
    const settings = await this.getSettings(userId);

    if (!settings.learningDnaEnabled) {
      return {
        enabled: false,
        snapshot: null,
      };
    }

    const snapshot = await this.prisma.learningDnaSnapshot.findFirst({
      where: { userId },
      orderBy: { generatedAt: 'desc' },
    });

    return {
      enabled: true,
      snapshot,
    };
  }

  async exportSettings(userId: string) {
    const [settings, devices, dna] = await Promise.all([
      this.getSettings(userId),
      this.getDevices(userId),
      this.getLearningDna(userId),
    ]);

    return {
      exportedAt: new Date().toISOString(),
      settings,
      devices,
      learningDna: dna,
    };
  }
}
