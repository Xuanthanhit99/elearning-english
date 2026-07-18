import { IsBoolean, IsOptional, Matches } from 'class-validator';

export class UpdateNotificationSettingsDto {
  @IsOptional()
  @IsBoolean()
  dailyReminderEnabled?: boolean;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  dailyReminderTime?: string;

  @IsOptional()
  @IsBoolean()
  missionReminder?: boolean;

  @IsOptional()
  @IsBoolean()
  friendActivity?: boolean;

  @IsOptional()
  @IsBoolean()
  clubNotification?: boolean;

  @IsOptional()
  @IsBoolean()
  leaderboardNotification?: boolean;

  @IsOptional()
  @IsBoolean()
  aiFeedbackNotification?: boolean;

  @IsOptional()
  @IsBoolean()
  emailNotification?: boolean;

  @IsOptional()
  @IsBoolean()
  pushNotification?: boolean;
}
