// prisma/seed-speaking-topics.ts

import {
  PrismaClient,
  SpeakingDifficulty,
  SpeakingLevel,
} from '@prisma/client';

const prisma = new PrismaClient();

const categories = [
  {
    title: 'Daily Life',
    slug: 'daily-life',
    icon: '☕',
    imageUrl: '/images/speaking/categories/daily-life.jpg',
    description:
      'Talk about your everyday activities, habits, and experiences.',
    order: 1,
  },
  {
    title: 'Work & Career',
    slug: 'work-career',
    icon: '💼',
    imageUrl: '/images/speaking/categories/work-career.jpg',
    description: 'Discuss jobs, workplace, and career development.',
    order: 2,
  },
  {
    title: 'Education',
    slug: 'education',
    icon: '🎓',
    imageUrl: '/images/speaking/categories/education.jpg',
    description: 'Explore learning, school life, and education in general.',
    order: 3,
  },
  {
    title: 'Travel & Places',
    slug: 'travel-places',
    icon: '✈️',
    imageUrl: '/images/speaking/categories/travel.jpg',
    description: 'Share travel experiences and talk about different places.',
    order: 4,
  },
  {
    title: 'Technology',
    slug: 'technology',
    icon: '💻',
    imageUrl: '/images/speaking/categories/technology.jpg',
    description: 'Discuss gadgets, the internet, and technological trends.',
    order: 5,
  },
  {
    title: 'Culture',
    slug: 'culture',
    icon: '🎨',
    imageUrl: '/images/speaking/categories/culture.jpg',
    description: 'Talk about traditions, festivals, and cultural differences.',
    order: 6,
  },
  {
    title: 'Health & Fitness',
    slug: 'health-fitness',
    icon: '💚',
    imageUrl: '/images/speaking/categories/health.jpg',
    description: 'Speak about healthy lifestyle, fitness, and well-being.',
    order: 7,
  },
  {
    title: 'Food & Drinks',
    slug: 'food-drinks',
    icon: '🍔',
    imageUrl: '/images/speaking/categories/food.jpg',
    description: 'Share your favorite food, recipes, and dining experiences.',
    order: 8,
  },
];

async function main() {
  for (const item of categories) {
    const category = await prisma.speakingCategory.upsert({
      where: { slug: item.slug },
      update: item,
      create: item,
    });

    await prisma.speakingTopic.upsert({
      where: { slug: item.slug },
      update: {
        title: item.title,
        description: item.description,
        imageUrl: item.imageUrl,
      },
      create: {
        categoryId: category.id,
        title: item.title,
        slug: item.slug,
        description: item.description,
        imageUrl: item.imageUrl,
        minLevel: getLevel(item.slug).min,
        maxLevel: getLevel(item.slug).max,
        difficulty: getDifficulty(item.slug),
        lessonCount: getLessonCount(item.slug),
        progressPercent: getProgress(item.slug),
        order: item.order,
      },
    });
  }

  console.log('Seed speaking topics done');
}

function getLevel(slug: string): { min: SpeakingLevel; max: SpeakingLevel } {
  const map: Record<string, { min: SpeakingLevel; max: SpeakingLevel }> = {
    'daily-life': { min: 'A1', max: 'B1' },
    'work-career': { min: 'A2', max: 'B2' },
    education: { min: 'A1', max: 'B2' },
    'travel-places': { min: 'A2', max: 'B2' },
    technology: { min: 'A2', max: 'C1' },
    culture: { min: 'A2', max: 'C1' },
    'health-fitness': { min: 'A1', max: 'B1' },
    'food-drinks': { min: 'A1', max: 'B1' },
  };

  return map[slug] || { min: 'A1', max: 'B1' };
}

function getDifficulty(slug: string): SpeakingDifficulty {
  const map: Record<string, SpeakingDifficulty> = {
    'daily-life': 'BEGINNER',
    'work-career': 'PRE_INTERMEDIATE',
    education: 'INTERMEDIATE',
    'travel-places': 'PRE_INTERMEDIATE',
    technology: 'ADVANCED',
    culture: 'ADVANCED',
    'health-fitness': 'BEGINNER',
    'food-drinks': 'BEGINNER',
  };

  return map[slug] || 'BEGINNER';
}

function getLessonCount(slug: string) {
  const map: Record<string, number> = {
    'daily-life': 28,
    'work-career': 24,
    education: 20,
    'travel-places': 18,
    technology: 22,
    culture: 16,
    'health-fitness': 16,
    'food-drinks': 15,
  };

  return map[slug] || 10;
}

function getProgress(slug: string) {
  const map: Record<string, number> = {
    'daily-life': 65,
    'work-career': 50,
    education: 60,
    'travel-places': 70,
    technology: 55,
    culture: 40,
    'health-fitness': 45,
    'food-drinks': 35,
  };

  return map[slug] || 0;
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
