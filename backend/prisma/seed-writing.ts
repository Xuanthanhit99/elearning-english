import { PrismaClient, WritingLevel, WritingType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const topics = [
    {
      title: 'Environment',
      slug: 'environment',
      description:
        'Talk about nature, pollution, climate change, and how to protect our planet.',
      category: 'Environment',
      imageUrl:
        'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee',
      difficulty: 'INTERMEDIATE',
      learnerCount: 1300,
      order: 1,
      lessons: [
        {
          title: 'Climate Change Solutions',
          slug: 'climate-change-solutions',
          prompt: 'Write an essay about solutions to climate change.',
          level: WritingLevel.B1,
          type: WritingType.ESSAY,
        },
      ],
    },
    {
      title: 'Technology',
      slug: 'technology',
      description:
        'Explore gadgets, AI, social media, and the impact of technology on our lives.',
      category: 'Technology',
      imageUrl:
        'https://images.unsplash.com/photo-1518770660439-4636190af475',
      difficulty: 'INTERMEDIATE',
      learnerCount: 1800,
      order: 2,
      lessons: [
        {
          title: 'The Impact of AI',
          slug: 'the-impact-of-ai',
          prompt: 'Write an essay about the impact of AI on modern life.',
          level: WritingLevel.B2,
          type: WritingType.ESSAY,
        },
      ],
    },
    {
      title: 'Social',
      slug: 'social',
      description:
        'Write about people, friendship, volunteering, and social activities.',
      category: 'Social',
      imageUrl:
        'https://images.unsplash.com/photo-1511632765486-a01980e01a18',
      difficulty: 'BEGINNER',
      learnerCount: 900,
      order: 3,
      lessons: [
        {
          title: 'Volunteering Benefits',
          slug: 'volunteering-benefits',
          prompt: 'Write an email about the benefits of volunteering.',
          level: WritingLevel.A2,
          type: WritingType.EMAIL,
        },
      ],
    },
    {
      title: 'Education',
      slug: 'education',
      description:
        'Write about school life, learning, teachers, education systems and future goals.',
      category: 'Education',
      imageUrl:
        'https://images.unsplash.com/photo-1512820790803-83ca734da794',
      difficulty: 'INTERMEDIATE',
      learnerCount: 1100,
      order: 4,
      lessons: [
        {
          title: 'Online Learning Experience',
          slug: 'online-learning-experience',
          prompt: 'Write about your online learning experience.',
          level: WritingLevel.B1,
          type: WritingType.ESSAY,
        },
      ],
    },
  ];

  for (const item of topics) {
    const topic = await prisma.writingTopic.upsert({
      where: { slug: item.slug },
      update: {
        title: item.title,
        description: item.description,
        category: item.category,
        imageUrl: item.imageUrl,
        difficulty: item.difficulty,
        learnerCount: item.learnerCount,
        order: item.order,
      },
      create: {
        title: item.title,
        slug: item.slug,
        description: item.description,
        category: item.category,
        imageUrl: item.imageUrl,
        difficulty: item.difficulty,
        learnerCount: item.learnerCount,
        order: item.order,
      },
    });

    for (const lesson of item.lessons) {
      await prisma.writingLesson.upsert({
        where: { slug: lesson.slug },
        update: {
          title: lesson.title,
          prompt: lesson.prompt,
          level: lesson.level,
          type: lesson.type,
        },
        create: {
          topicId: topic.id,
          title: lesson.title,
          slug: lesson.slug,
          prompt: lesson.prompt,
          level: lesson.level,
          type: lesson.type,
        },
      });
    }
  }
}

main()
  .then(() => console.log('Seed writing done'))
  .finally(() => prisma.$disconnect());