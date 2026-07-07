import { ReadingDifficulty } from '@prisma/client';

export const formatDifficulty = (difficulty: ReadingDifficulty) => {
  const map: Record<ReadingDifficulty, string> = {
    EASY: 'Dễ',
    MEDIUM: 'Trung bình',
    HARD: 'Khó',
  };

  return map[difficulty];
};

export const formatMinutes = (minutes: number) => {
  if (!minutes || minutes <= 0) return '0 phút';

  const h = Math.floor(minutes / 60);
  const m = minutes % 60;

  if (h <= 0) return `~ ${m} phút`;
  if (m <= 0) return `~ ${h}h`;

  return `~ ${h}h ${m}m`;
};

export const getFeaturedVocabularyByCategory = async (
  prisma: any,
  categoryId: string,
) => {
  const words = await prisma.readingVocabulary.findMany({
    where: {
      article: {
        categoryId,
      },
    },
    take: 5,
    orderBy: { createdAt: 'desc' },
  });

  return words.map((word) => ({
    id: word.id,
    word: word.word,
    partOfSpeech: word.partOfSpeech,
    meaning: word.meaning,
  }));
};

export const getCategoryAchievements = (completed: number, total: number) => {
  return [
    {
      id: 'green-reader',
      title: 'Green Reader',
      description: 'Hoàn thành 3 bài',
      unlocked: completed >= 3,
    },
    {
      id: 'eco-explorer',
      title: 'Eco Explorer',
      description: 'Đọc 5 bài trong chủ đề',
      unlocked: completed >= 5,
    },
    {
      id: 'topic-master',
      title: 'Planet Lover',
      description: 'Hoàn thành chủ đề',
      unlocked: total > 0 && completed >= total,
    },
  ];
};
