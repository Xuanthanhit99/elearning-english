import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const topics = [
  {
    name: 'Food',
    slug: 'food',
    words: [
      {
        word: 'apple',
        meaningVi: 'quả táo',
        meaningEn: 'a round fruit',
        level: 'A1',
        difficulty: 1,
      },
      {
        word: 'bread',
        meaningVi: 'bánh mì',
        meaningEn: 'food made from flour',
        level: 'A1',
        difficulty: 1,
      },
    ],
  },
  {
    name: 'Technology',
    slug: 'technology',
    words: [
      {
        word: 'computer',
        meaningVi: 'máy tính',
        meaningEn: 'an electronic machine',
        level: 'A1',
        difficulty: 1,
      },
      {
        word: 'software',
        meaningVi: 'phần mềm',
        meaningEn: 'programs used by a computer',
        level: 'A2',
        difficulty: 2,
      },
    ],
  },
];

async function main() {
  for (const topic of topics) {
    const createdTopic = await prisma.wordTopic.upsert({
      where: { slug: topic.slug },
      update: {},
      create: {
        name: topic.name,
        slug: topic.slug,
      },
    });

    for (const word of topic.words) {
      await prisma.word.upsert({
        where: { word: word.word },
        update: {},
        create: {
          ...word,
          topicId: createdTopic.id,
          source: 'SEED',
        },
      });
    }
  }
}

main()
  .then(() => console.log('Seed vocabulary done'))
  .finally(() => prisma.$disconnect());
