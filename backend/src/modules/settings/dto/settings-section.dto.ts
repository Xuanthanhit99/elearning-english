import { IsIn } from 'class-validator';

export const SETTINGS_SECTIONS = [
  'learning',
  'ai',
  'speaking',
  'notifications',
  'privacy',
  'community',
  'appearance',
  'accessibility',
  'advanced',
] as const;

export type SettingsSection =
  (typeof SETTINGS_SECTIONS)[number];

export class ResetSettingsSectionDto {
  @IsIn(SETTINGS_SECTIONS)
  section!: SettingsSection;
}