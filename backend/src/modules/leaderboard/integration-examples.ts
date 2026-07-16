// import { LearningSkill, XpSourceType } from '@prisma/client';
// import { XP_RULES } from './leaderboard.constants';

// // SPEAKING: gọi sau khi session đã được xác minh COMPLETED và transcript hợp lệ.
// await this.xpService.awardXp({
//   userId,
//   sourceType: XpSourceType.SPEAKING,
//   sourceId: session.id,
//   skill: LearningSkill.SPEAKING,
//   baseXp: XP_RULES.SPEAKING_SESSION,
//   bonusXp: result.overallScore >= 90 ? 10 : result.overallScore >= 75 ? 5 : 0,
//   idempotencyKey: `speaking-session:${session.id}:completed`,
//   metadata: { score: result.overallScore, lessonId: session.lessonId },
// });

// // WRITING: gọi sau khi AI chấm và submission có đủ độ dài tối thiểu.
// await this.xpService.awardXp({
//   userId,
//   sourceType: XpSourceType.WRITING,
//   sourceId: submission.id,
//   skill: LearningSkill.WRITING,
//   baseXp: XP_RULES.WRITING_SUBMISSION,
//   bonusXp: (submission.score ?? 0) >= 90 ? 10 : 0,
//   idempotencyKey: `writing:${submission.id}:evaluated`,
//   metadata: { score: submission.score },
// });

// // VOCABULARY: một daily plan chỉ được nhận XP một lần.
// await this.xpService.awardXp({
//   userId,
//   sourceType: XpSourceType.VOCABULARY,
//   sourceId: dailyPlan.id,
//   skill: LearningSkill.VOCABULARY,
//   baseXp: XP_RULES.VOCABULARY_LESSON,
//   idempotencyKey: `vocabulary-day:${dailyPlan.id}:completed`,
// });

// // MISSION: chỉ gọi lúc claim, không gọi cả lúc completed và claim.
// await this.xpService.awardXp({
//   userId,
//   sourceType: XpSourceType.MISSION,
//   sourceId: userMission.id,
//   baseXp: mission.rewardXp,
//   idempotencyKey: `mission:${userMission.id}:claimed`,
// });

// // PLACEMENT: chỉ cấp một lần cho lần hoàn thành đầu tiên hoặc dùng id test để cấp từng attempt.
// await this.xpService.awardXp({
//   userId,
//   sourceType: XpSourceType.PLACEMENT,
//   sourceId: test.id,
//   baseXp: XP_RULES.PLACEMENT_COMPLETED,
//   idempotencyKey: `placement:${test.id}:completed`,
// });
