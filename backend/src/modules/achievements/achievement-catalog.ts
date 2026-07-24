import {
  AchievementCategory,
  AchievementRarity,
  AchievementRuleType,
  AchievementVisibility,
  Prisma,
} from '@prisma/client';

export type AchievementSeedDefinition = {
  code: string;
  title: string;
  description: string;
  icon: string;
  category: AchievementCategory;
  rarity: AchievementRarity;
  visibility: AchievementVisibility;
  ruleType: AchievementRuleType;
  eventType: string;
  ruleConfig?: Prisma.InputJsonValue;
  targetValue: number;
  rewardXp: number;
  rewardCoins: number;
  displayOrder: number;
  /** Schema already supports a seasonal/time-limited window (Achievement.startsAt/endsAt,
   * already filtered on by processActivityEvent) — this type just never exposed it to the
   * catalog, so no definition could actually use it. Both optional/undefined by default. */
  startsAt?: Date;
  endsAt?: Date;
};

/** Fired by AchievementsListener alongside the normal per-skill completion event whenever a
 * learning activity completes — carries the user's current PetProfile.streak as `score` so
 * MAX_VALUE-rule achievements can react to "reached a streak of N," reusing the streak value
 * that's already computed/stored by the learning-path/pets streak logic rather than
 * recomputing it. See STREAK_EVENT_TYPE achievements below. */
export const STREAK_EVENT_TYPE = 'STREAK_DAY';

/** Fixed calendar window for the seasonal "early_adopter_launch" achievement below.
 * Deliberately a fixed date, not `new Date()` at module load — computing it relative to
 * process-start would silently push the window forward on every restart/deploy and the
 * achievement would never actually close, defeating the point of a time-limited achievement. */
const LAUNCH_WINDOW_START = new Date('2026-07-24T00:00:00.000Z');
const LAUNCH_WINDOW_END = new Date('2026-08-23T00:00:00.000Z');

export const ACHIEVEMENT_CATALOG: AchievementSeedDefinition[] = [
  {
    code: 'vocabulary_first_10',
    title: 'Tu vung khoi dong',
    description: 'Hoan thanh 10 hoat dong tu vung.',
    icon: 'book',
    category: AchievementCategory.VOCABULARY,
    rarity: AchievementRarity.COMMON,
    visibility: AchievementVisibility.PUBLIC,
    ruleType: AchievementRuleType.TOTAL_COUNT,
    eventType: 'VOCABULARY_COMPLETED',
    targetValue: 10,
    rewardXp: 50,
    rewardCoins: 10,
    displayOrder: 10,
  },
  {
    code: 'listening_first_10',
    title: 'Nghe cham chi',
    description: 'Hoan thanh 10 bai luyen nghe.',
    icon: 'headphones',
    category: AchievementCategory.LISTENING,
    rarity: AchievementRarity.COMMON,
    visibility: AchievementVisibility.PUBLIC,
    ruleType: AchievementRuleType.TOTAL_COUNT,
    eventType: 'LISTENING_COMPLETED',
    targetValue: 10,
    rewardXp: 60,
    rewardCoins: 12,
    displayOrder: 20,
  },
  {
    code: 'grammar_first_10',
    title: 'Ngu phap chac tay',
    description: 'Hoan thanh 10 bai ngu phap.',
    icon: 'exercise',
    category: AchievementCategory.GRAMMAR,
    rarity: AchievementRarity.COMMON,
    visibility: AchievementVisibility.PUBLIC,
    ruleType: AchievementRuleType.TOTAL_COUNT,
    eventType: 'GRAMMAR_COMPLETED',
    targetValue: 10,
    rewardXp: 60,
    rewardCoins: 12,
    displayOrder: 30,
  },
  {
    code: 'reading_first_10',
    title: 'Doc deu dan',
    description: 'Hoan thanh 10 bai doc.',
    icon: 'book',
    category: AchievementCategory.READING,
    rarity: AchievementRarity.COMMON,
    visibility: AchievementVisibility.PUBLIC,
    ruleType: AchievementRuleType.TOTAL_COUNT,
    eventType: 'READING_COMPLETED',
    targetValue: 10,
    rewardXp: 60,
    rewardCoins: 12,
    displayOrder: 40,
  },
  {
    code: 'speaking_first_10',
    title: 'Noi tu tin',
    description: 'Hoan thanh 10 bai Speaking.',
    icon: 'mic',
    category: AchievementCategory.SPEAKING,
    rarity: AchievementRarity.UNCOMMON,
    visibility: AchievementVisibility.PUBLIC,
    ruleType: AchievementRuleType.TOTAL_COUNT,
    eventType: 'SPEAKING_COMPLETED',
    targetValue: 10,
    rewardXp: 80,
    rewardCoins: 16,
    displayOrder: 50,
  },
  {
    code: 'writing_first_10',
    title: 'Viet deu dan',
    description: 'Hoan thanh 10 bai Writing.',
    icon: 'pen',
    category: AchievementCategory.WRITING,
    rarity: AchievementRarity.UNCOMMON,
    visibility: AchievementVisibility.PUBLIC,
    ruleType: AchievementRuleType.TOTAL_COUNT,
    eventType: 'WRITING_COMPLETED',
    targetValue: 10,
    rewardXp: 80,
    rewardCoins: 16,
    displayOrder: 60,
  },
  {
    code: 'writing_score_90',
    title: 'Bai viet an tuong',
    description: 'Dat diem Writing tu 90 tro len.',
    icon: 'star',
    category: AchievementCategory.WRITING,
    rarity: AchievementRarity.RARE,
    visibility: AchievementVisibility.PUBLIC,
    ruleType: AchievementRuleType.MAX_VALUE,
    eventType: 'WRITING_COMPLETED',
    ruleConfig: { valueField: 'score' },
    targetValue: 90,
    rewardXp: 120,
    rewardCoins: 24,
    displayOrder: 70,
  },
  {
    code: 'mission_claimed_5',
    title: 'Nguoi san nhiem vu',
    description: 'Nhan thuong 5 nhiem vu.',
    icon: 'target',
    category: AchievementCategory.MISSION,
    rarity: AchievementRarity.UNCOMMON,
    visibility: AchievementVisibility.PUBLIC,
    ruleType: AchievementRuleType.TOTAL_COUNT,
    eventType: 'MISSION_CLAIMED',
    targetValue: 5,
    rewardXp: 80,
    rewardCoins: 20,
    displayOrder: 80,
  },
  {
    code: 'placement_completed',
    title: 'Bat dau dung trinh do',
    description: 'Hoan thanh Placement Test dau tien.',
    icon: 'sparkles',
    category: AchievementCategory.PLACEMENT,
    rarity: AchievementRarity.RARE,
    visibility: AchievementVisibility.PUBLIC,
    ruleType: AchievementRuleType.ONE_TIME_EVENT,
    eventType: 'PLACEMENT_COMPLETED',
    targetValue: 1,
    rewardXp: 100,
    rewardCoins: 20,
    displayOrder: 90,
  },
  // --- Streak achievements (Achievement 2.0) ---
  // Keyed off STREAK_EVENT_TYPE, fired by AchievementsListener from the user's existing
  // PetProfile.streak (see achievements.listener.ts) — reuses the streak value already
  // computed by learning-path/pets, never recomputes it independently.
  {
    code: 'streak_7',
    title: '7 ngay lien tiep',
    description: 'Duy tri chuoi hoc 7 ngay lien tiep.',
    icon: 'flame',
    category: AchievementCategory.STREAK,
    rarity: AchievementRarity.UNCOMMON,
    visibility: AchievementVisibility.PUBLIC,
    ruleType: AchievementRuleType.MAX_VALUE,
    eventType: STREAK_EVENT_TYPE,
    ruleConfig: { valueField: 'score' },
    targetValue: 7,
    rewardXp: 70,
    rewardCoins: 15,
    displayOrder: 100,
  },
  {
    code: 'streak_30',
    title: '30 ngay ben bi',
    description: 'Duy tri chuoi hoc 30 ngay lien tiep.',
    icon: 'flame',
    category: AchievementCategory.STREAK,
    rarity: AchievementRarity.RARE,
    visibility: AchievementVisibility.PUBLIC,
    ruleType: AchievementRuleType.MAX_VALUE,
    eventType: STREAK_EVENT_TYPE,
    ruleConfig: { valueField: 'score' },
    targetValue: 30,
    rewardXp: 200,
    rewardCoins: 40,
    displayOrder: 110,
  },
  {
    // Hidden (not spoiled ahead of time) + EPIC rarity — exercises both the
    // visibility=HIDDEN redaction path and the EPIC tier, neither of which any
    // prior catalog entry used.
    code: 'streak_100',
    title: 'The ky luyen tap',
    description: 'Duy tri chuoi hoc 100 ngay lien tiep.',
    icon: 'flame',
    category: AchievementCategory.STREAK,
    rarity: AchievementRarity.EPIC,
    visibility: AchievementVisibility.HIDDEN,
    ruleType: AchievementRuleType.MAX_VALUE,
    eventType: STREAK_EVENT_TYPE,
    ruleConfig: { valueField: 'score' },
    targetValue: 100,
    rewardXp: 500,
    rewardCoins: 100,
    displayOrder: 120,
  },
  {
    // LEGENDARY tier — previously unused by any live definition.
    code: 'streak_365',
    title: 'Mot nam khong ngat quang',
    description: 'Duy tri chuoi hoc 365 ngay lien tiep.',
    icon: 'crown',
    category: AchievementCategory.STREAK,
    rarity: AchievementRarity.LEGENDARY,
    visibility: AchievementVisibility.PUBLIC,
    ruleType: AchievementRuleType.MAX_VALUE,
    eventType: STREAK_EVENT_TYPE,
    ruleConfig: { valueField: 'score' },
    targetValue: 365,
    rewardXp: 2000,
    rewardCoins: 400,
    displayOrder: 130,
  },
  {
    // Seasonal/time-limited example — exercises Achievement.startsAt/endsAt, which
    // processActivityEvent already filters on but no prior catalog entry ever set.
    // Window is computed relative to module load (seeded once at boot + on
    // catalog updates), giving a real 30-day limited-time achievement.
    code: 'early_adopter_launch',
    title: 'Nguoi dong hanh dau tien',
    description: 'Hoan thanh mot nhiem vu trong 30 ngay dau ra mat Achievement 2.0.',
    icon: 'sparkles',
    category: AchievementCategory.SPECIAL,
    rarity: AchievementRarity.RARE,
    visibility: AchievementVisibility.PUBLIC,
    ruleType: AchievementRuleType.ONE_TIME_EVENT,
    eventType: 'MISSION_CLAIMED',
    targetValue: 1,
    rewardXp: 150,
    rewardCoins: 30,
    displayOrder: 140,
    startsAt: LAUNCH_WINDOW_START,
    endsAt: LAUNCH_WINDOW_END,
  },
  // --- AI Conversation Partner achievements ---
  // Keyed off CONVERSATION_COMPLETED, published by ConversationService.finishSession
  // via the same LearningXpPublisher.publish() contract Speaking/Writing already use —
  // zero achievements-engine changes required (see conversation module's Step 0 audit).
  {
    code: 'conversation_first',
    title: 'Cuoc tro chuyen dau tien',
    description: 'Hoan thanh buoi hoi thoai AI dau tien.',
    icon: 'message-circle',
    category: AchievementCategory.SPEAKING,
    rarity: AchievementRarity.COMMON,
    visibility: AchievementVisibility.PUBLIC,
    ruleType: AchievementRuleType.TOTAL_COUNT,
    eventType: 'CONVERSATION_COMPLETED',
    targetValue: 1,
    rewardXp: 40,
    rewardCoins: 10,
    displayOrder: 150,
  },
  {
    code: 'conversation_10',
    title: 'Nguoi tro chuyen tich cuc',
    description: 'Hoan thanh 10 buoi hoi thoai AI.',
    icon: 'message-circle',
    category: AchievementCategory.SPEAKING,
    rarity: AchievementRarity.UNCOMMON,
    visibility: AchievementVisibility.PUBLIC,
    ruleType: AchievementRuleType.TOTAL_COUNT,
    eventType: 'CONVERSATION_COMPLETED',
    targetValue: 10,
    rewardXp: 120,
    rewardCoins: 25,
    displayOrder: 160,
  },
  {
    code: 'conversation_50',
    title: 'Bac thay hoi thoai',
    description: 'Hoan thanh 50 buoi hoi thoai AI.',
    icon: 'message-circle',
    category: AchievementCategory.SPEAKING,
    rarity: AchievementRarity.RARE,
    visibility: AchievementVisibility.PUBLIC,
    ruleType: AchievementRuleType.TOTAL_COUNT,
    eventType: 'CONVERSATION_COMPLETED',
    targetValue: 50,
    rewardXp: 400,
    rewardCoins: 80,
    displayOrder: 170,
  },
  {
    code: 'conversation_score_90',
    title: 'Noi tieng Anh luu loat',
    description: 'Dat diem tong ket tu 90 tro len trong mot buoi hoi thoai AI.',
    icon: 'star',
    category: AchievementCategory.SPEAKING,
    rarity: AchievementRarity.EPIC,
    visibility: AchievementVisibility.PUBLIC,
    ruleType: AchievementRuleType.MAX_VALUE,
    eventType: 'CONVERSATION_COMPLETED',
    ruleConfig: { valueField: 'score' },
    targetValue: 90,
    rewardXp: 250,
    rewardCoins: 50,
    displayOrder: 180,
  },
];
