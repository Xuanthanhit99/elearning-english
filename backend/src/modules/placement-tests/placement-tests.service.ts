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
    const level = dto.level || 'Beginner';
    const goal = dto.goal || 'General English';

    const prompt = `
You are an English placement test generator for Vietnamese learners.

Return JSON only. Do not use markdown. Do not explain outside JSON.

Generate exactly 20 multiple-choice questions.

Schema:
{
  "durationMinutes": 10,
  "totalQuestions": 20,
  "level": "${level}",
  "goal": "${goal}",
  "questions": [
    {
      "id": "q1",
      "skill": "Grammar",
      "question": "Choose the correct answer.",
      "sentence": "My brother usually ___ to work by bus.",
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

Rules:
- Exactly 20 questions.
- Mix skills:
  - 5 Vocabulary
  - 7 Grammar
  - 4 Reading
  - 4 Communication
- Difficulty should match level: ${level}.
- Goal should match: ${goal}.
- Questions must be suitable for Vietnamese learners.
- Options must have keys A, B, C, D.
- answer must be one of A, B, C, D.
- explain must be short and written in Vietnamese.
- For Reading questions, include a short sentence or mini paragraph in "sentence".
- Do not duplicate questions.
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
        durationMinutes: Number(aiData?.durationMinutes) || 10,
        totalQuestions: questions.length,
        level,
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
    const { questions, answers } = dto;

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
        skill: q.skill,
        question: q.question,
        sentence: q.sentence,
        options: q.options,
        correctAnswer: q.answer,
        userAnswer,
        isCorrect,
        explain: q.explain,
      };
    });

    const total = questions.length;
    const score = Math.round((correct / total) * 100);
    const level = this.calculateLevel(score);
    const skillScores = this.calculateSkillScores(details);

    const result = {
      level,
      score,
      total,
      correct,
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
        result,
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
      .filter((q) => {
        return (
          q &&
          q.question &&
          Array.isArray(q.options) &&
          q.options.length === 4 &&
          ['A', 'B', 'C', 'D'].includes(q.answer)
        );
      })
      .map((q, index) => ({
        id: q.id || `q${index + 1}`,
        skill: q.skill || 'Grammar',
        question: q.question || '',
        sentence: q.sentence || '',
        options: q.options.map((option: any, optionIndex: number) => ({
          key: option.key || ['A', 'B', 'C', 'D'][optionIndex],
          text: option.text || '',
        })),
        answer: q.answer,
        explain: q.explain || '',
      }));
  }

  private calculateLevel(score: number) {
    if (score >= 85) return 'B1';
    if (score >= 70) return 'A2';
    if (score >= 50) return 'A1';
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