import type { UserSettings } from '@prisma/client';

export type SettingsUpdateSource = 'USER' | 'PLACEMENT' | 'ADMIN' | 'SYSTEM';

export class SettingsUpdatedEvent {
  constructor(
    public readonly userId: string,
    public readonly changedFields: string[],
    public readonly previousSettings: UserSettings,
    public readonly currentSettings: UserSettings,
    public readonly source: SettingsUpdateSource,
  ) {}
}
