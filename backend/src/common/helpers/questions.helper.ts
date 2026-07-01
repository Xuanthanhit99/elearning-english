export const pickQuestionType = (index: number) => {
  const types = [
    'MULTIPLE_CHOICE',
    'WRITE_MEANING',
    'WRITE_WORD',
    'WRITE_SENTENCE',
  ] as const;

  return types[index % types.length];
};

export const buildQuestion = (type: string, word: any) => {
  if (type === 'MULTIPLE_CHOICE') {
    return `Từ "${word.word}" có nghĩa là gì?`;
  }

  if (type === 'WRITE_MEANING') {
    return `Viết nghĩa tiếng Việt của từ "${word.word}"`;
  }

  if (type === 'WRITE_WORD') {
    return `Viết từ tiếng Anh có nghĩa là: "${word.meaningVi}"`;
  }

  return `Viết một câu tiếng Anh sử dụng từ "${word.word}"`;
};

export const buildAnswer = (type: string, word: any) => {
  if (type === 'WRITE_WORD') {
    return word.word;
  }

  if (type === 'WRITE_SENTENCE') {
    return word.word;
  }

  return word.meaningVi || word.meaningEn || word.word;
};

const shuffle = <T>(arr: T[]) => [...arr].sort(() => Math.random() - 0.5);

export const buildOptions = async (prisma: any, type: string, wordId: string) => {
  if (type !== 'MULTIPLE_CHOICE') return [];

  const current = await prisma.word.findUnique({
    where: { id: wordId },
  });

  const wrongWords = await prisma.word.findMany({
    where: {
      id: {
        not: wordId,
      },
      level: current?.level,
    },
    take: 3,
  });

  return shuffle([
    current?.meaningVi || current?.meaningEn || current?.word || '',
    ...wrongWords.map((w) => w.meaningVi || w.meaningEn || w.word),
  ]);
};
