// prisma/seed-speaking.ts

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const categories = [
    {
      title: 'Daily Life',
      slug: 'daily-life',
      icon: '☕',
      color: '#FFEDEF',
      order: 1,
    },
    {
      title: 'Work & Career',
      slug: 'work-career',
      icon: '💼',
      color: '#FFF1D9',
      order: 2,
    },
    {
      title: 'Education',
      slug: 'education',
      icon: '🎓',
      color: '#EEF6FF',
      order: 3,
    },
    {
      title: 'Travel & Places',
      slug: 'travel-places',
      icon: '🌍',
      color: '#EFFFF8',
      order: 4,
    },
    {
      title: 'Technology',
      slug: 'technology',
      icon: '💻',
      color: '#F3EDFF',
      order: 5,
    },
    {
      title: 'Culture',
      slug: 'culture',
      icon: '🎨',
      color: '#FFF4E5',
      order: 6,
    },
  ];

  for (const category of categories) {
    await prisma.speakingCategory.upsert({
      where: { slug: category.slug },
      update: category,
      create: category,
    });
  }

  const dailyLife = await prisma.speakingCategory.findUnique({
    where: { slug: 'daily-life' },
  });

  const travel = await prisma.speakingCategory.findUnique({
    where: { slug: 'travel-places' },
  });

  const technology = await prisma.speakingCategory.findUnique({
    where: { slug: 'technology' },
  });

  if (dailyLife) {
    const topic = await prisma.speakingTopic.upsert({
      where: { slug: 'my-favorite-food' },
      update: {},
      create: {
        categoryId: dailyLife.id,
        title: 'My Favorite Food',
        slug: 'my-favorite-food',
        description: 'Talk about your favorite food.',
        difficulty: 'EASY',
        estimatedMinutes: 5,
        imageUrl: '/images/speaking/food.jpg',
        order: 1,
      },
    });

    await prisma.speakingLesson.createMany({
      data: [
        {
          topicId: topic.id,
          title: 'Talking about my weekend',
          type: 'FREE_TALK',
          difficulty: 'EASY',
          estimatedMinutes: 5,
          prompt: 'Tell me about your weekend.',
        },
        {
          topicId: topic.id,
          title: 'My Favorite Food',
          type: 'READ_ALOUD',
          difficulty: 'EASY',
          estimatedMinutes: 6,
          expectedText: 'My favorite food is pizza because it is delicious.',
        },
      ],
      skipDuplicates: true,
    });
  }

  if (travel) {
    await prisma.speakingTopic.upsert({
      where: { slug: 'a-perfect-vacation' },
      update: {},
      create: {
        categoryId: travel.id,
        title: 'A Perfect Vacation',
        slug: 'a-perfect-vacation',
        description: 'Describe your dream vacation.',
        difficulty: 'EASY',
        estimatedMinutes: 6,
        imageUrl: '/images/speaking/vacation.jpg',
        order: 2,
      },
    });
  }

  if (technology) {
    await prisma.speakingTopic.upsert({
      where: { slug: 'the-future-of-ai' },
      update: {},
      create: {
        categoryId: technology.id,
        title: 'The Future of AI',
        slug: 'the-future-of-ai',
        description: 'Talk about artificial intelligence.',
        difficulty: 'MEDIUM',
        estimatedMinutes: 8,
        imageUrl: '/images/speaking/ai.jpg',
        order: 3,
      },
    });
  }

  console.log('Seed speaking data done');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());