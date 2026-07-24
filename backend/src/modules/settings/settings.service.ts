import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthSessionService } from '../auth/auth-session.service';
import { AuditLogService } from '../audit-log/audit-log.service';
import { SettingsQueryService } from './settings-query.service';

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authSessionService: AuthSessionService,
    private readonly settingsQuery: SettingsQueryService,
    private readonly auditLogService: AuditLogService,
  ) {}

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

    // Invalidate the refresh-token pointer first so the session cannot mint
    // a new access token even if this request fails mid-way.
    await this.authSessionService.invalidateSession(sessionId);

    const revoked = await this.prisma.userDeviceSession.update({
      where: { id: sessionId },
      data: { revokedAt: new Date() },
    });

    await this.auditLogService.record({
      userId,
      action: 'AUTH_DEVICE_REVOKED',
      changedFields: ['session'],
      metadata: { sessionId },
    });

    return revoked;
  }

  async revokeOtherDevices(userId: string, currentSessionId?: string) {
    await this.authSessionService.invalidateAllOtherSessions(
      userId,
      currentSessionId,
    );

    const result = await this.prisma.userDeviceSession.updateMany({
      where: {
        userId,
        revokedAt: null,
        ...(currentSessionId
          ? { id: { not: currentSessionId } }
          : { current: false }),
      },
      data: { revokedAt: new Date() },
    });

    await this.auditLogService.record({
      userId,
      action: 'AUTH_DEVICES_REVOKED_ALL_OTHER',
      changedFields: ['session'],
      metadata: { revokedCount: result.count },
    });

    return { revokedCount: result.count };
  }

  async exportSettings(userId: string) {
    const [settings, devices] = await Promise.all([
      this.settingsQuery.getSettings(userId),
      this.getDevices(userId),
    ]);

    const dnaSnapshot = await this.prisma.learningDnaSnapshot.findFirst({
      where: { userId },
      orderBy: { generatedAt: 'desc' },
    });

    return {
      exportedAt: new Date().toISOString(),
      settings,
      devices,
      learningDna: settings.learningDnaEnabled
        ? { enabled: true, snapshot: dnaSnapshot }
        : { enabled: false, snapshot: null },
    };
  }
}
