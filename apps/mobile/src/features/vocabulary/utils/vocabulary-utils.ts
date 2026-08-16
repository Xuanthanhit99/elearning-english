import type { DailyWordItem, TodayVocabulary } from '../types/vocabulary';

export function isLearnedStatus(status?: string | null) {
  return status === 'LEARNING' || status === 'KNOWN' || status === 'REVIEW' || status === 'MASTERED';
}

export function getVocabularyProgress(words: DailyWordItem[] = [], today?: TodayVocabulary | null) {
  const total = words.length || today?.words?.length || 0;
  const learned = words.filter((item) => isLearnedStatus(item.progress?.status)).length;
  const percent = today?.completed ? 100 : total > 0 ? Math.round((learned / total) * 100) : 0;

  return {
    total,
    learned,
    remaining: Math.max(0, total - learned),
    percent: Math.max(0, Math.min(100, percent)),
  };
}

export function findFirstUnlearnedIndex(words: DailyWordItem[] = []) {
  const index = words.findIndex((item) => !isLearnedStatus(item.progress?.status));
  return index >= 0 ? index : 0;
}

export function getWordMeaning(item?: DailyWordItem | null) {
  return item?.word.meaningVi || item?.word.meaningEn || 'Chưa có nghĩa cho từ này.';
}

export function getPrimaryCta(today?: TodayVocabulary | null, progressPercent = 0) {
  if (!today?.id || today.locked) return 'Chưa có bài hôm nay';
  if (today.completed || today.status === 'COMPLETED') return 'Xem lại từ hôm nay';
  if (progressPercent > 0) return 'Tiếp tục học';
  return 'Bắt đầu học';
}
