import crypto from 'crypto';
import { PrismaClient, GrammarDifficulty } from '@prisma/client';

const prisma = new PrismaClient();

function createSentenceHash(sentence: string) {
  return crypto
    .createHash('sha256')
    .update(
      sentence
        .toLowerCase()
        .replace(/[’‘]/g, "'")
        .replace(/[“”]/g, '"')
        .replace(/[^\w\s']/g, '')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .digest('hex');
}

async function main() {
  const topic = await prisma.grammarTopic.create({
    data: {
      title: 'Thì hiện tại đơn',
      description: 'Học cách dùng thì hiện tại đơn trong tiếng Anh',
      level: 'A1',
      order: 1,
    },
  });

  const lesson = await prisma.grammarLesson.create({
    data: {
      topicId: topic.id,
      title: 'Thì hiện tại đơn',
      description: 'Luyện tập câu khẳng định, phủ định và câu hỏi',
      tip: 'Thì hiện tại đơn dùng cho thói quen, sự thật hiển nhiên hoặc lịch trình cố định.',
      level: 'A1',
      order: 1,
      theory: {
        title: 'Thì hiện tại đơn',
        items: [
          'Thói quen, hành động lặp lại',
          'Sự thật hiển nhiên',
          'Lịch trình cố định',
        ],
      },
    },
  });

  const questions = [
    {
      lessonId: lesson.id,
      type: 'MULTIPLE_CHOICE',
      prompt: 'Chọn dạng đúng của động từ trong ngoặc',
      sentence: 'She _____ (go) to school every day.',
      options: [
        { key: 'A', value: 'go' },
        { key: 'B', value: 'goes' },
        { key: 'C', value: 'going' },
        { key: 'D', value: 'gone' },
      ],
      answer: 'goes',
      explanation: '“She” là ngôi thứ ba số ít nên động từ thêm “-s”: goes.',
      difficulty: GrammarDifficulty.EASY,
      order: 1,
    },
    {
      lessonId: lesson.id,
      type: 'MULTIPLE_CHOICE',
      prompt: 'Chọn đáp án đúng',
      sentence: 'They _____ football every weekend.',
      options: [
        { key: 'A', value: 'plays' },
        { key: 'B', value: 'play' },
        { key: 'C', value: 'playing' },
        { key: 'D', value: 'played' },
      ],
      answer: 'play',
      explanation: '“They” là chủ ngữ số nhiều nên động từ giữ nguyên: play.',
      difficulty: GrammarDifficulty.EASY,
      order: 2,
    },
    {
      lessonId: lesson.id,
      type: 'MULTIPLE_CHOICE',
      prompt: 'Chọn dạng đúng của động từ',
      sentence: 'He _____ coffee every morning.',
      options: [
        { key: 'A', value: 'drink' },
        { key: 'B', value: 'drinks' },
        { key: 'C', value: 'drinking' },
        { key: 'D', value: 'drank' },
      ],
      answer: 'drinks',
      explanation: '“He” là ngôi thứ ba số ít nên động từ thêm “-s”: drinks.',
      difficulty: GrammarDifficulty.EASY,
      order: 3,
    },
  ];

  await prisma.grammarQuestion.createMany({
    data: questions.map((question) => ({
      ...question,
      sentenceHash: createSentenceHash(question.sentence),
    })),
    skipDuplicates: true,
  });

  console.log('Seed grammar successfully');
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });