import {
  AiPersonality,
  ChallengeMode,
  CorrectionMode,
  EnglishAccent,
  EnglishLevel,
  Language,
  LearningGoal,
  LearningSkill,
  MessagePermission,
  ThemeMode,
  TranslationMode,
} from '@prisma/client';
import {
  ArrayMaxSize,
  ArrayUnique,
  IsArray,
  IsBoolean,
  IsEnum,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  Max,
  Min,
} from 'class-validator';
import { IsIanaTimezone } from '../validators/is-iana-timezone.validator';

const WEEKDAYS = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'] as const;

export class UpdateSettingsDto {
  @IsOptional()
  @IsEnum(LearningGoal)
  learningGoal?: LearningGoal;

  @IsOptional()
  @IsInt()
  @Min(5)
  @Max(180)
  dailyStudyMinutes?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(6)
  @ArrayUnique()
  @IsEnum(LearningSkill, { each: true })
  preferredSkills?: LearningSkill[];

  @IsOptional()
  @IsEnum(EnglishLevel)
  currentLevel?: EnglishLevel;

  @IsOptional()
  @IsBoolean()
  autoDetectLevel?: boolean;

  @IsOptional()
  @IsEnum(ChallengeMode)
  challengeMode?: ChallengeMode;

  @IsOptional()
  @IsString()
  aiTeacher?: string;

  @IsOptional()
  @IsEnum(AiPersonality)
  aiPersonality?: AiPersonality;

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(2)
  conversationSpeed?: number;

  @IsOptional()
  @IsEnum(CorrectionMode)
  correctionMode?: CorrectionMode;

  @IsOptional()
  @IsEnum(TranslationMode)
  translationMode?: TranslationMode;

  @IsOptional()
  @IsString()
  speechProvider?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100)
  micSensitivity?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  autoStopSeconds?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(2)
  playbackSpeed?: number;

  @IsOptional()
  @IsEnum(EnglishAccent)
  accent?: EnglishAccent;

  @IsOptional()
  @IsBoolean()
  captionsEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  dailyReminderEnabled?: boolean;

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  dailyReminderTime?: string;

  @IsOptional() @IsBoolean() missionReminder?: boolean;
  @IsOptional() @IsBoolean() friendActivity?: boolean;
  @IsOptional() @IsBoolean() clubNotification?: boolean;
  @IsOptional() @IsBoolean() leaderboardNotification?: boolean;
  @IsOptional() @IsBoolean() aiFeedbackNotification?: boolean;
  @IsOptional() @IsBoolean() emailNotification?: boolean;
  @IsOptional() @IsBoolean() pushNotification?: boolean;

  @IsOptional() @IsBoolean() publicProfile?: boolean;
  @IsOptional() @IsBoolean() showStreak?: boolean;
  @IsOptional() @IsBoolean() showAchievements?: boolean;
  @IsOptional() @IsBoolean() allowFriendRequests?: boolean;
  @IsOptional() @IsBoolean() allowClubInvites?: boolean;
  @IsOptional() @IsBoolean() showOnlineStatus?: boolean;
  @IsOptional() @IsBoolean() showLastSeen?: boolean;

  @IsOptional()
  @IsString()
  communityNickname?: string | null;

  @IsOptional()
  @IsEnum(MessagePermission)
  messagePermission?: MessagePermission;

  @IsOptional()
  @IsBoolean()
  autoJoinVoiceRoom?: boolean;

  @IsOptional()
  @IsEnum(ThemeMode)
  theme?: ThemeMode;

  @IsOptional()
  @IsEnum(Language)
  language?: Language;

  @IsOptional()
  @IsString()
  primaryColor?: string;

  @IsOptional()
  @IsNumber()
  @Min(0.8)
  @Max(1.4)
  fontScale?: number;

  @IsOptional() @IsBoolean() compactMode?: boolean;
  @IsOptional() @IsBoolean() animationsEnabled?: boolean;
  @IsOptional() @IsBoolean() reduceMotion?: boolean;
  @IsOptional() @IsBoolean() highContrast?: boolean;
  @IsOptional() @IsBoolean() keyboardNavigation?: boolean;
  @IsOptional() @IsBoolean() screenReaderOptimized?: boolean;

  @IsOptional() @IsBoolean() focusMode?: boolean;
  @IsOptional() @IsBoolean() energyMode?: boolean;
  @IsOptional() @IsBoolean() learningDnaEnabled?: boolean;
  @IsOptional() @IsBoolean() adaptiveDashboard?: boolean;
  @IsOptional() @IsBoolean() autoSchedule?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(7)
  weeklyTargetDays?: number;

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(7)
  @ArrayUnique()
  @IsIn(WEEKDAYS, { each: true })
  restDays?: string[];

  @IsOptional()
  @Matches(/^([01]\d|2[0-3]):([0-5]\d)$/)
  preferredStudyTime?: string;

  @IsOptional()
  @IsIanaTimezone()
  timezone?: string;

  @IsOptional() @IsBoolean() dataPersonalization?: boolean;
  @IsOptional() @IsBoolean() analyticsConsent?: boolean;
}
