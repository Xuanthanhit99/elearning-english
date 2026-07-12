// src/placement-tests/placement-tests.service.ts
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common';
import { SubmitPlacementTestDto } from './dto/submit-placement-test.dto';
import { PrismaService } from 'src/prisma/prisma.service';
import { GeneratePlacementTestDto } from './dto/generate-placement-test.dto';
import { GeminiService } from '../gemini/gemini.service';

@Injectable()
export class PlacementTestsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
  ) {}

  async generateTest(userId: string, dto: GeneratePlacementTestDto) {
    const mode = dto.mode || 'ADAPTIVE';
    const level = dto.level || 'Beginner';
    const goal = dto.goal || 'General English';

    const levelRule =
      mode === 'LEVEL_BASED'
        ? `
Test mode: LEVEL_BASED.
Generate all 20 questions at level: ${level}.
The test should measure the learner's ability inside this selected level.
Every question.level must be "${level}".
`
        : `
Test mode: ADAPTIVE.
Generate questions from easy to hard:
- 5 Beginner questions
- 5 A1 questions
- 5 A2 questions
- 5 B1 questions
The test should estimate the learner's real level.
`;

    const prompt = `
You are an English placement test generator for Vietnamese learners.

Return JSON only.
Do not use markdown.
Do not explain outside JSON.

Generate exactly 20 multiple-choice questions.

${levelRule}

Return JSON with this exact schema:
{
  "durationMinutes": 10,
  "totalQuestions": 20,
  "mode": "${mode}",
  "level": "${mode === 'LEVEL_BASED' ? level : 'Adaptive'}",
  "goal": "${goal}",
  "questions": [
    {
      "id": "q1",
      "level": "A1",
      "skill": "Grammar",
      "type": "multiple_choice",
      "question": "Choose the correct answer.",
      "sentence": "My brother usually ___ to work by bus.",
      "audioText": "",
      "options": [
        { "key": "A", "text": "go" },
        { "key": "B", "text": "goes" },
        { "key": "C", "text": "going" },
        { "key": "D", "text": "went" }
      ],
      "answer": "B",
      "explain": "Chủ ngữ số ít 'my brother' nên dùng 'goes'."
    }
  ]
}

Question distribution:
- Grammar: 4 questions
- Vocabulary: 4 questions
- Reading: 3 questions
- Listening: 3 questions
- Speaking: 3 questions
- Writing: 3 questions
Total: 20 questions.

IMPORTANT:
Generate EXACTLY:
- 4 Grammar questions
- 4 Vocabulary questions
- 3 Reading questions
- 3 Listening questions
- 3 Speaking questions
- 3 Writing questions

Do not generate more or less for each skill.

Allowed skills:
- Grammar
- Vocabulary
- Reading
- Listening
- Speaking
- Writing

Allowed types:
- multiple_choice
- reading
- listening
- speaking
- writing

Rules for all questions:
- Every question must have 4 options.
- Option keys must be exactly A, B, C, D.
- answer must be exactly one of A, B, C, D.
- explain must be short and written in Vietnamese.
- Questions must be suitable for Vietnamese learners.
- Do not duplicate questions.
- Do not leave question, options, answer, or explain empty.
- For Reading/Writing/Speaking, sentence must not be empty.
- For Listening, audioText must not be empty.

Specific rules:

1. Grammar questions
- skill = "Grammar"
- type = "multiple_choice"
- sentence should contain a grammar gap or grammar context.

2. Vocabulary questions
- skill = "Vocabulary"
- type = "multiple_choice"
- question should test meaning, synonym, antonym, or word usage.

3. Reading questions
- skill = "Reading"
- type = "reading"
- sentence must contain a short paragraph.
- question must ask about the paragraph.

4. Listening questions
- skill = "Listening"
- type = "listening"
- audioText must contain a short spoken dialogue.
- sentence can repeat the audioText.
- question must ask about the dialogue.

Example listening:
audioText: "Tom: Hi Mary. Are you free this afternoon? Mary: Yes, I am."
question: "What are they talking about?"

5. Speaking questions
- skill = "Speaking"
- type = "speaking"
- sentence must contain a real-life conversation context.
- question must ask the learner to choose the most natural spoken response.

Example speaking:
sentence: "A: Good morning. How are you today?"
question: "What is the best reply?"

6. Writing questions
- skill = "Writing"
- type = "writing"
- sentence must contain an incorrect sentence.
- question must ask the learner to choose the best corrected sentence.

Example writing:
sentence: "I wants improve my English."
question: "Choose the best corrected sentence."
`;

    try {
      const aiData = await this.geminiService.generateJson(prompt);

      const questions = this.normalizeQuestions(aiData?.questions || []);

      if (questions.length < 10) {
        throw new InternalServerErrorException(
          'Gemini tạo quá ít câu hỏi hợp lệ.',
        );
      }
      return {
        mode,
        durationMinutes: Number(aiData?.durationMinutes) || 10,
        totalQuestions: questions.length,
        level: mode === 'LEVEL_BASED' ? level : 'Adaptive',
        goal,
        questions,
      };
    } catch (error) {
      console.error('Generate placement test failed:', error);
      throw new InternalServerErrorException(
        'Không thể tạo bài kiểm tra trình độ.',
      );
    }
  }

  async submitTest(userId: string, dto: SubmitPlacementTestDto) {
    const { questions, answers, mode, selectedLevel } = dto as any;
    if (!questions?.length) {
      throw new BadRequestException('Danh sách câu hỏi không hợp lệ.');
    }

    let correct = 0;

    const details = questions.map((q, index) => {
      const userAnswer = answers[q.id] || answers[String(index)] || null;
      const isCorrect = userAnswer === q.answer;

      if (isCorrect) correct++;

      return {
        id: q.id,
        level: q.level,
        type: q.type,
        skill: q.skill,
        question: q.question,
        sentence: q.sentence,
        audioText: q.audioText,
        options: q.options,
        correctAnswer: q.answer,
        userAnswer,
        isCorrect,
        explain: q.explain,
      };
    });

    const total = questions.length;
    const score = Math.round((correct / total) * 100);
    const level =
      mode === 'LEVEL_BASED'
        ? selectedLevel ||
          questions?.[0]?.level ||
          this.calculateAdaptiveLevel(details)
        : this.calculateAdaptiveLevel(details);
    const skillScores = this.calculateSkillScores(details);

    const result = {
      level,
      score,
      total,
      correct,
      mode: mode || 'ADAPTIVE',
      selectedLevel: selectedLevel || null,
      wrong: total - correct,
      skillScores,
      recommendedCourses: this.getRecommendedCourses(level),
      summary: this.getResultSummary(level, score),
      details,
    };

    return this.prisma.placementTest.create({
      data: {
        userId,
        level,
        score,
        total,
        correct,
        answers,
        // result,
      },
    });
  }

  async getHistory(userId: string) {
    return this.prisma.placementTest.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  private normalizeQuestions(questions: any[]) {
    return questions
      .map((q, index) => {
        const options = (q.options || []).map(
          (option: any, optionIndex: number) => ({
            key: option.key || ['A', 'B', 'C', 'D'][optionIndex],
            text: option.text || '',
          }),
        );

        const answer = this.normalizeAnswer(
          q.answer || q.correctAnswer,
          options,
        );

        return {
          id: q.id || `q${index + 1}`,
          level: q.level || 'Beginner',
          skill: q.skill || 'Grammar',
          type: q.type || 'multiple_choice',
          question: q.question || '',
          sentence: q.sentence || '',
          audioText: q.audioText || '',
          options,
          answer,
          explain: q.explain || q.explanation || '',
        };
      })
      .filter(
        (q) =>
          q.question &&
          q.options.length === 4 &&
          ['A', 'B', 'C', 'D'].includes(q.answer) &&
          [
            'Grammar',
            'Vocabulary',
            'Reading',
            'Listening',
            'Speaking',
            'Writing',
          ].includes(q.skill) &&
          [
            'multiple_choice',
            'reading',
            'listening',
            'speaking',
            'writing',
          ].includes(q.type),
      );
  }

  private normalizeAnswer(answer: any, options: any[]) {
    if (!answer) return '';

    const raw = String(answer).trim();

    if (['A', 'B', 'C', 'D'].includes(raw.toUpperCase())) {
      return raw.toUpperCase();
    }

    const found = options.find(
      (option: any) =>
        String(option.text).trim().toLowerCase() === raw.toLowerCase(),
    );

    return found?.key || '';
  }

  private calculateAdaptiveLevel(details: any[]) {
    const levels = {
      Beginner: { total: 0, correct: 0 },
      A1: { total: 0, correct: 0 },
      A2: { total: 0, correct: 0 },
      B1: { total: 0, correct: 0 },
    };

    for (const item of details) {
      if (!levels[item.level]) continue;

      levels[item.level].total++;

      if (item.isCorrect) {
        levels[item.level].correct++;
      }
    }

    const getRate = (level: keyof typeof levels) => {
      const data = levels[level];

      if (data.total === 0) return 0;

      return data.correct / data.total;
    };

    if (getRate('B1') >= 0.8) return 'B1';
    if (getRate('A2') >= 0.8) return 'A2';
    if (getRate('A1') >= 0.8) return 'A1';

    return 'Beginner';
  }

  private calculateSkillScores(details: any[]) {
    const groups: Record<string, { total: number; correct: number }> = {};

    details.forEach((item) => {
      if (!groups[item.skill]) {
        groups[item.skill] = {
          total: 0,
          correct: 0,
        };
      }

      groups[item.skill].total++;

      if (item.isCorrect) {
        groups[item.skill].correct++;
      }
    });

    return Object.entries(groups).map(([skill, value]) => ({
      skill,
      score: Math.round((value.correct / value.total) * 100),
      total: value.total,
      correct: value.correct,
    }));
  }

  private getRecommendedCourses(level: string) {
    if (level === 'Beginner') {
      return ['English Starter', 'Vocabulary Basic'];
    }

    if (level === 'A1') {
      return ['English Starter Plus', 'Grammar Clear'];
    }

    if (level === 'A2') {
      return ['Speaking Daily', 'Grammar Clear'];
    }

    return ['Business English', 'Speaking Advanced'];
  }

  private getResultSummary(level: string, score: number) {
    if (level === 'Beginner') {
      return `Bạn đạt ${score}/100. Bạn nên bắt đầu với từ vựng và ngữ pháp cơ bản.`;
    }

    if (level === 'A1') {
      return `Bạn đạt ${score}/100. Bạn đã có nền tảng cơ bản và nên luyện thêm câu giao tiếp ngắn.`;
    }

    if (level === 'A2') {
      return `Bạn đạt ${score}/100. Bạn phù hợp với lộ trình Speaking Daily và Grammar Clear.`;
    }

    return `Bạn đạt ${score}/100. Bạn có nền tảng khá tốt và có thể học Business English hoặc Speaking Advanced.`;
  }
}
