import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { AILessonBuilderStatus, CourseStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { createSlug } from 'src/common/utils/slug.util';
import { GeminiService } from '../gemini/gemini.service';
import { CreateLessonBuilderOutlineDto } from './dto/create-lesson-builder-outline.dto';

type BuilderOutlineLesson = {
  title: string;
  goal?: string;
  duration?: number;
  skills?: string[];
};

type BuilderOutlineModule = {
  title: string;
  description?: string;
  lessons: BuilderOutlineLesson[];
};

type BuilderOutline = {
  title: string;
  description: string;
  level: string;
  estimatedMinutes: number;
  modules: BuilderOutlineModule[];
};

@Injectable()
export class LessonBuilderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
  ) {}

  async createOutline(userId: string, dto: CreateLessonBuilderOutlineDto) {
    const prompt = this.buildOutlinePrompt(dto);
    const outline = await this.generateOutline(dto, prompt);

    const project = await this.prisma.aILessonBuilderProject.create({
      data: {
        userId,
        goal: dto.goal,
        audienceAge: dto.audienceAge,
        level: dto.level,
        dailyMinutes: dto.dailyMinutes,
        totalDays: dto.totalDays,
        interests: dto.interests || [],
        focusSkills: dto.focusSkills || [],
        generationPrompt: prompt,
        outline: outline as any,
        status: AILessonBuilderStatus.OUTLINE_COMPLETED,
      },
    });

    return this.getProject(userId, project.id);
  }

  async listProjects(userId: string) {
    return this.prisma.aILessonBuilderProject.findMany({
      where: { userId },
      include: {
        course: {
          include: {
            sections: {
              orderBy: { order: 'asc' },
              include: {
                lessons: { orderBy: { order: 'asc' } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getProject(userId: string, projectId: string) {
    const project = await this.prisma.aILessonBuilderProject.findFirst({
      where: { id: projectId, userId },
      include: {
        course: {
          include: {
            sections: {
              orderBy: { order: 'asc' },
              include: {
                lessons: {
                  orderBy: { order: 'asc' },
                  include: {
                    quizzes: {
                      select: {
                        id: true,
                        question: true,
                        options: true,
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Không tìm thấy luồng tạo bài học.');
    }

    return {
      ...project,
      firstLessonId: project.course?.sections?.[0]?.lessons?.[0]?.id || null,
    };
  }

  async updateOutline(
    userId: string,
    projectId: string,
    outline: Record<string, any>,
  ) {
    await this.ensureProjectOwner(userId, projectId);
    const normalized = this.normalizeOutline(outline);

    await this.prisma.aILessonBuilderProject.update({
      where: { id: projectId },
      data: {
        outline: normalized as any,
        status: AILessonBuilderStatus.OUTLINE_COMPLETED,
      },
    });

    return this.getProject(userId, projectId);
  }

  async confirmOutline(userId: string, projectId: string) {
    const project = await this.ensureProjectOwner(userId, projectId);
    const outline = this.normalizeOutline(project.outline as any);

    if (project.courseId) {
      return this.getProject(userId, projectId);
    }

    const slug = `${createSlug(outline.title)}-${Date.now()}`;

    const course = await this.prisma.$transaction(async (tx) => {
      const createdCourse = await tx.course.create({
        data: {
          teacherId: userId,
          title: outline.title,
          slug,
          description: outline.description,
          thumbnail: this.buildCourseThumbnail(outline.title),
          level: outline.level || project.level || 'A1',
          price: 0,
          status: CourseStatus.APPROVED,
        },
      });

      for (const [moduleIndex, module] of outline.modules.entries()) {
        const section = await tx.section.create({
          data: {
            courseId: createdCourse.id,
            title: module.title,
            order: moduleIndex + 1,
          },
        });

        for (const [lessonIndex, lesson] of module.lessons.entries()) {
          await tx.lesson.create({
            data: {
              sectionId: section.id,
              title: lesson.title,
              content: this.buildLessonPlaceholder(lesson),
              duration:
                Number(lesson.duration) ||
                Math.max(8, Math.round((project.dailyMinutes || 30) / 2)),
              order: lessonIndex + 1,
              isPreview: lessonIndex === 0 && moduleIndex === 0,
            },
          });
        }
      }

      await tx.enrollment.upsert({
        where: {
          userId_courseId: {
            userId,
            courseId: createdCourse.id,
          },
        },
        update: {},
        create: {
          userId,
          courseId: createdCourse.id,
        },
      });

      await tx.aILessonBuilderProject.update({
        where: { id: projectId },
        data: {
          courseId: createdCourse.id,
          status: AILessonBuilderStatus.OUTLINE_COMPLETED,
        },
      });

      return createdCourse;
    });

    return {
      ...(await this.getProject(userId, projectId)),
      courseId: course.id,
    };
  }

  async generateContent(userId: string, projectId: string, lessonId?: string) {
    const project = await this.ensureProjectOwner(userId, projectId);

    if (!project.courseId) {
      throw new BadRequestException('Bạn cần xác nhận outline trước.');
    }

    await this.prisma.aILessonBuilderProject.update({
      where: { id: projectId },
      data: { status: AILessonBuilderStatus.CONTENT_PENDING },
    });

    const lessons = await this.prisma.lesson.findMany({
      where: {
        ...(lessonId ? { id: lessonId } : {}),
        section: {
          courseId: project.courseId,
        },
      },
      include: {
        section: {
          include: {
            course: true,
          },
        },
      },
      orderBy: [{ section: { order: 'asc' } }, { order: 'asc' }],
    });

    if (!lessons.length) {
      throw new NotFoundException('Không tìm thấy bài học để sinh nội dung.');
    }

    for (const lesson of lessons) {
      const content = await this.generateLessonContent(project, lesson);

      await this.prisma.lesson.update({
        where: { id: lesson.id },
        data: {
          content: this.renderLessonContent(content),
          duration: content.duration || lesson.duration || 15,
        },
      });

      await this.prisma.quiz.deleteMany({
        where: { lessonId: lesson.id },
      });

      for (const quiz of (content.quiz || []).slice(0, 5)) {
        const options = Array.isArray(quiz.options)
          ? quiz.options.filter(Boolean).slice(0, 4)
          : [];
        if (!quiz.question || options.length < 2 || !quiz.answer) continue;

        await this.prisma.quiz.create({
          data: {
            lessonId: lesson.id,
            question: String(quiz.question),
            options,
            answer: String(quiz.answer),
          },
        });
      }
    }

    await this.prisma.aILessonBuilderProject.update({
      where: { id: projectId },
      data: { status: AILessonBuilderStatus.CONTENT_COMPLETED },
    });

    return this.getProject(userId, projectId);
  }

  async getCourse(userId: string, courseId: string) {
    const enrollment = await this.prisma.enrollment.findUnique({
      where: { userId_courseId: { userId, courseId } },
    });

    if (!enrollment) {
      throw new ForbiddenException('Bạn chưa sở hữu khóa học này.');
    }

    const course = await this.prisma.course.findUnique({
      where: { id: courseId },
      include: {
        sections: {
          orderBy: { order: 'asc' },
          include: {
            lessons: {
              orderBy: { order: 'asc' },
              include: {
                quizzes: {
                  select: {
                    id: true,
                    question: true,
                    options: true,
                  },
                },
              },
            },
          },
        },
        aiLessonBuilderProjects: {
          where: { userId },
          take: 1,
        },
      },
    });

    if (!course) {
      throw new NotFoundException('Không tìm thấy khóa học.');
    }

    const progress = await this.prisma.lessonProgress.findMany({
      where: { userId, courseId },
      select: { lessonId: true, completed: true },
    });

    const completedIds = new Set(
      progress.filter((item) => item.completed).map((item) => item.lessonId),
    );

    return {
      ...course,
      sections: course.sections.map((section) => ({
        ...section,
        lessons: section.lessons.map((lesson) => ({
          ...lesson,
          completed: completedIds.has(lesson.id),
          hasContent:
            Boolean(lesson.content) &&
            !lesson.content?.includes('Nội dung chi tiết đang chờ AI tạo'),
        })),
      })),
    };
  }

  private async ensureProjectOwner(userId: string, projectId: string) {
    const project = await this.prisma.aILessonBuilderProject.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      throw new NotFoundException('Không tìm thấy luồng tạo bài học.');
    }

    return project;
  }

  private async generateOutline(
    dto: CreateLessonBuilderOutlineDto,
    prompt: string,
  ): Promise<BuilderOutline> {
    try {
      const result = await this.geminiService.generateJson(prompt);
      return this.normalizeOutline(result);
    } catch (error) {
      console.error('[LessonBuilder] outline fallback:', error);
      return this.buildFallbackOutline(dto);
    }
  }

  private async generateLessonContent(project: any, lesson: any) {
    const prompt = `
Bạn là AI Lesson Builder của PoppyLingo.
Tạo nội dung chi tiết cho một bài học tiếng Anh cá nhân hóa.

Course: ${lesson.section.course.title}
Module: ${lesson.section.title}
Lesson: ${lesson.title}
Goal của người học: ${project.goal}
Level: ${project.level || lesson.section.course.level || 'A1'}
Độ tuổi: ${project.audienceAge || 'general'}
Sở thích: ${(project.interests || []).join(', ') || 'không có'}

Chỉ trả về JSON object:
{
  "title": "string",
  "duration": 15,
  "learningGoal": "string",
  "vocabulary": [{"word":"string","meaning":"string","example":"string"}],
  "grammar": [{"point":"string","explanation":"string","example":"string"}],
  "dialogue": [{"speaker":"A","line":"string","vi":"string"}],
  "listeningScript": "string",
  "speakingTask": "string",
  "reading": {"title":"string","content":"string","questions":["string"]},
  "exercises": [{"type":"fill_blank|translate|multiple_choice","question":"string","answer":"string"}],
  "quiz": [{"question":"string","options":["A","B","C","D"],"answer":"A","explanation":"string"}]
}

Yêu cầu:
- Nội dung ngắn gọn, đúng trình độ, dùng tiếng Việt giải thích.
- Có đủ Vocabulary, Grammar, Dialogue/Story, Listening script, Speaking, Reading, Exercises, Quiz.
- Quiz 3-5 câu, answer phải trùng chính xác một option.
`;

    try {
      return this.normalizeLessonContent(
        await this.geminiService.generateJson(prompt),
        lesson.title,
      );
    } catch (error) {
      console.error('[LessonBuilder] content fallback:', error);
      return this.buildFallbackLessonContent(lesson.title);
    }
  }

  private buildOutlinePrompt(dto: CreateLessonBuilderOutlineDto) {
    return `
Bạn là AI Lesson Builder của PoppyLingo.
Hãy phân tích yêu cầu người học và tạo course outline tiếng Anh cá nhân hóa.

Yêu cầu người dùng:
- Mục tiêu: ${dto.goal}
- Độ tuổi: ${dto.audienceAge || 'không rõ'}
- Trình độ: ${dto.level || 'tự chọn phù hợp'}
- Thời gian học mỗi ngày: ${dto.dailyMinutes || 30} phút
- Số ngày học: ${dto.totalDays || 30}
- Sở thích: ${(dto.interests || []).join(', ') || 'không có'}
- Kỹ năng trọng tâm: ${(dto.focusSkills || []).join(', ') || 'đủ 4 kỹ năng'}

Chỉ trả về JSON object:
{
  "title": "string",
  "description": "string",
  "level": "A1|A2|B1|B2|C1|C2",
  "estimatedMinutes": 300,
  "modules": [
    {
      "title": "string",
      "description": "string",
      "lessons": [
        {
          "title": "string",
          "goal": "string",
          "duration": 15,
          "skills": ["Vocabulary","Grammar","Listening"]
        }
      ]
    }
  ]
}

Quy tắc:
- Tạo 2-6 modules tùy số ngày học.
- Tổng lesson nên phù hợp với thời gian học, tối thiểu 4, tối đa 40.
- Lesson phải có thứ tự học tự nhiên, từ dễ đến khó.
- Không markdown, không giải thích ngoài JSON.
`;
  }

  private normalizeOutline(input: any): BuilderOutline {
    const modules = Array.isArray(input?.modules) ? input.modules : [];
    const normalizedModules = modules
      .map((module: any, moduleIndex: number) => ({
        title: String(module?.title || `Module ${moduleIndex + 1}`),
        description: String(module?.description || ''),
        lessons: (Array.isArray(module?.lessons) ? module.lessons : [])
          .map((lesson: any, lessonIndex: number) => ({
            title: String(lesson?.title || `Lesson ${lessonIndex + 1}`),
            goal: String(lesson?.goal || 'Hoàn thành mục tiêu bài học.'),
            duration: Number(lesson?.duration) || 15,
            skills: Array.isArray(lesson?.skills)
              ? lesson.skills.map(String)
              : ['Vocabulary', 'Grammar', 'Speaking'],
          }))
          .slice(0, 12),
      }))
      .filter((module: BuilderOutlineModule) => module.lessons.length > 0)
      .slice(0, 8);

    const outline: BuilderOutline = {
      title: String(input?.title || 'AI English Course'),
      description: String(
        input?.description || 'Khóa học tiếng Anh cá nhân hóa bởi AI.',
      ),
      level: String(input?.level || 'A1'),
      estimatedMinutes: Number(input?.estimatedMinutes) || 300,
      modules: normalizedModules.length
        ? normalizedModules
        : this.buildFallbackOutline({ goal: 'English course' }).modules,
    };

    return outline;
  }

  private normalizeLessonContent(input: any, title: string) {
    return {
      title: String(input?.title || title),
      duration: Number(input?.duration) || 15,
      learningGoal: String(
        input?.learningGoal || 'Nắm nội dung chính của bài.',
      ),
      vocabulary: Array.isArray(input?.vocabulary) ? input.vocabulary : [],
      grammar: Array.isArray(input?.grammar) ? input.grammar : [],
      dialogue: Array.isArray(input?.dialogue) ? input.dialogue : [],
      listeningScript: String(input?.listeningScript || ''),
      speakingTask: String(input?.speakingTask || ''),
      reading:
        input?.reading && typeof input.reading === 'object'
          ? input.reading
          : { title: '', content: '', questions: [] },
      exercises: Array.isArray(input?.exercises) ? input.exercises : [],
      quiz: Array.isArray(input?.quiz) ? input.quiz : [],
    };
  }

  private buildFallbackOutline(dto: Partial<CreateLessonBuilderOutlineDto>) {
    const topic = dto.goal || 'English for daily life';
    return {
      title: topic.length > 60 ? 'Personal English Course' : topic,
      description:
        'Lộ trình cá nhân hóa giúp bạn học từ vựng, mẫu câu, nghe, nói và ôn tập từng ngày.',
      level: dto.level || 'A1',
      estimatedMinutes:
        (dto.dailyMinutes || 30) * Math.min(dto.totalDays || 7, 14),
      modules: [
        {
          title: 'Module 1: Foundation',
          description: 'Làm quen với từ vựng và mẫu câu nền tảng.',
          lessons: [
            {
              title: 'Lesson 1: Hello and Goals',
              goal: 'Biết chào hỏi và nói mục tiêu học.',
              duration: 15,
              skills: ['Vocabulary', 'Speaking'],
            },
            {
              title: 'Lesson 2: Useful Words',
              goal: 'Học nhóm từ quan trọng đầu tiên.',
              duration: 15,
              skills: ['Vocabulary', 'Listening'],
            },
          ],
        },
        {
          title: 'Module 2: Practice',
          description: 'Dùng kiến thức trong tình huống ngắn.',
          lessons: [
            {
              title: 'Lesson 3: Short Dialogue',
              goal: 'Hiểu và luyện hội thoại ngắn.',
              duration: 20,
              skills: ['Listening', 'Speaking'],
            },
            {
              title: 'Lesson 4: Review and Quiz',
              goal: 'Ôn tập và kiểm tra nhanh.',
              duration: 20,
              skills: ['Reading', 'Quiz'],
            },
          ],
        },
      ],
    };
  }

  private buildFallbackLessonContent(title: string) {
    return {
      title,
      duration: 15,
      learningGoal: 'Hiểu và sử dụng nội dung chính của bài học.',
      vocabulary: [
        {
          word: 'practice',
          meaning: 'luyện tập',
          example: 'I practice English every day.',
        },
        {
          word: 'goal',
          meaning: 'mục tiêu',
          example: 'My goal is to speak clearly.',
        },
      ],
      grammar: [
        {
          point: 'Present Simple',
          explanation: 'Dùng để nói thói quen hoặc sự thật đơn giản.',
          example: 'I study English every day.',
        },
      ],
      dialogue: [
        {
          speaker: 'A',
          line: 'What is your goal?',
          vi: 'Mục tiêu của bạn là gì?',
        },
        {
          speaker: 'B',
          line: 'I want to speak English.',
          vi: 'Tôi muốn nói tiếng Anh.',
        },
      ],
      listeningScript:
        'I study English every day. I practice new words and short sentences.',
      speakingTask: 'Nói 3 câu về mục tiêu học tiếng Anh của bạn.',
      reading: {
        title: 'My English Goal',
        content:
          'I want to improve my English. I learn a little every day and review often.',
        questions: ['What does the learner want to improve?'],
      },
      exercises: [
        {
          type: 'fill_blank',
          question: 'I ____ English every day.',
          answer: 'study',
        },
      ],
      quiz: [
        {
          question: 'What does "goal" mean?',
          options: ['mục tiêu', 'bài hát', 'màu sắc', 'thời tiết'],
          answer: 'mục tiêu',
          explanation: 'Goal nghĩa là mục tiêu.',
        },
      ],
    };
  }

  private renderLessonContent(content: any) {
    const lines: string[] = [];
    lines.push(`# ${content.title}`);
    lines.push(`\n## Mục tiêu\n${content.learningGoal}`);

    lines.push('\n## Vocabulary');
    for (const item of content.vocabulary || []) {
      lines.push(
        `- ${item.word || ''}: ${item.meaning || ''}. ${item.example || ''}`,
      );
    }

    lines.push('\n## Grammar');
    for (const item of content.grammar || []) {
      lines.push(
        `- ${item.point || ''}: ${item.explanation || ''} Ví dụ: ${item.example || ''}`,
      );
    }

    lines.push('\n## Dialogue / Story');
    for (const item of content.dialogue || []) {
      lines.push(
        `- ${item.speaker || 'A'}: ${item.line || ''} ${item.vi ? `(${item.vi})` : ''}`,
      );
    }

    lines.push(`\n## Listening Script\n${content.listeningScript || ''}`);
    lines.push(`\n## Speaking Task\n${content.speakingTask || ''}`);
    lines.push(
      `\n## Reading\n${content.reading?.title || ''}\n${content.reading?.content || ''}`,
    );

    if (Array.isArray(content.reading?.questions)) {
      for (const question of content.reading.questions) {
        lines.push(`- ${question}`);
      }
    }

    lines.push('\n## Exercises');
    for (const item of content.exercises || []) {
      lines.push(`- ${item.question || ''} Đáp án: ${item.answer || ''}`);
    }

    return lines.join('\n');
  }

  private buildLessonPlaceholder(lesson: BuilderOutlineLesson) {
    return `# ${lesson.title}

## Mục tiêu
${lesson.goal || 'Hoàn thành mục tiêu bài học.'}

Nội dung chi tiết đang chờ AI tạo. Hãy bấm "Sinh nội dung" để tạo Vocabulary, Grammar, Listening, Speaking, Reading và Quiz cho bài này.`;
  }

  private buildCourseThumbnail(title: string) {
    const label = encodeURIComponent(title || 'AI Course');
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 360"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#7c3aed"/><stop offset="1" stop-color="#14b8a6"/></linearGradient></defs><rect width="600" height="360" rx="36" fill="url(#g)"/><circle cx="480" cy="80" r="72" fill="#fff" opacity=".18"/><circle cx="90" cy="300" r="90" fill="#fff" opacity=".16"/><text x="60" y="155" font-family="Arial,sans-serif" font-size="44" font-weight="900" fill="#fff">AI Lesson</text><text x="60" y="210" font-family="Arial,sans-serif" font-size="30" font-weight="800" fill="#ede9fe">${label.slice(0, 22)}</text><text x="60" y="280" font-family="Arial,sans-serif" font-size="24" font-weight="800" fill="#ccfbf1">PoppyLingo</text></svg>`,
    )}`;
  }
}
