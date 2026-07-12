// scripts/update-placement-question-hash.ts

import { PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const questions = await prisma.placementQuestion.findMany({
    where: {
      questionHash: null,
    },
  });

  console.log(`Found ${questions.length} questions`);

  for (const question of questions) {
    const hash = createHash('sha256')
      .update(
        [
          question.skill,
          question.level,
          question.type,
          question.question.trim().toLowerCase(),
        ].join('|'),
      )
      .digest('hex');

    await prisma.placementQuestion.update({
      where: {
        id: question.id,
      },
      data: {
        questionHash: hash,
      },
    });
  }

  console.log('Done');
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });