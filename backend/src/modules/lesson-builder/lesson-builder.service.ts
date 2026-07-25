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
      throw new NotFoundException('KhÃ´ng tÃ¬m tháº¥y luá»“ng táº¡o bÃ i há»c.');
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
          // AI-generated content must remain a draft by default and never
          // auto-publish (this used to jump straight to APPROVED, skipping
          // the same DRAFT->PENDING->APPROVED review pipeline every
          // manually-authored course already goes through via
          // courses.controller.ts's /submit and /approve routes).
          status: CourseStatus.DRAFT,
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
      throw new BadRequestException('Báº¡n cáº§n xÃ¡c nháº­n outline trÆ°á»›c.');
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
      throw new NotFoundException('KhÃ´ng tÃ¬m tháº¥y bÃ i há»c Ä‘á»ƒ sinh ná»™i dung.');
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
      throw new ForbiddenException('Báº¡n chÆ°a sá»Ÿ há»¯u khÃ³a há»c nÃ y.');
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
      throw new NotFoundException('KhÃ´ng tÃ¬m tháº¥y khÃ³a há»c.');
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
            !lesson.content?.includes('Ná»™i dung chi tiáº¿t Ä‘ang chá» AI táº¡o'),
        })),
      })),
    };
  }

  private async ensureProjectOwner(userId: string, projectId: string) {
    const project = await this.prisma.aILessonBuilderProject.findFirst({
      where: { id: projectId, userId },
    });

    if (!project) {
      throw new NotFoundException('KhÃ´ng tÃ¬m tháº¥y luá»“ng táº¡o bÃ i há»c.');
    }

    return project;
  }

  private async generateOutline(
    dto: CreateLessonBuilderOutlineDto,
    prompt: string,
  ): Promise<BuilderOutline> {
    try {
      const result = await this.geminiService.generateJson(prompt, { module: 'lesson_builder' });
      return this.normalizeOutline(result);
    } catch (error) {
      console.error('[LessonBuilder] outline fallback:', error);
      return this.buildFallbackOutline(dto);
    }
  }

  private async generateLessonContent(project: any, lesson: any) {
    const prompt = `
Báº¡n lÃ  AI Lesson Builder cá»§a BeaconVie.
Táº¡o ná»™i dung chi tiáº¿t cho má»™t bÃ i há»c tiáº¿ng Anh cÃ¡ nhÃ¢n hÃ³a.

Course: ${lesson.section.course.title}
Module: ${lesson.section.title}
Lesson: ${lesson.title}
Goal cá»§a ngÆ°á»i há»c: ${project.goal}
Level: ${project.level || lesson.section.course.level || 'A1'}
Äá»™ tuá»•i: ${project.audienceAge || 'general'}
Sá»Ÿ thÃ­ch: ${(project.interests || []).join(', ') || 'khÃ´ng cÃ³'}

Chá»‰ tráº£ vá» JSON object:
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

YÃªu cáº§u:
- Ná»™i dung ngáº¯n gá»n, Ä‘Ãºng trÃ¬nh Ä‘á»™, dÃ¹ng tiáº¿ng Viá»‡t giáº£i thÃ­ch.
- CÃ³ Ä‘á»§ Vocabulary, Grammar, Dialogue/Story, Listening script, Speaking, Reading, Exercises, Quiz.
- Quiz 3-5 cÃ¢u, answer pháº£i trÃ¹ng chÃ­nh xÃ¡c má»™t option.
`;

    try {
      return this.normalizeLessonContent(
        await this.geminiService.generateJson(prompt, { module: 'lesson_builder' }),
        lesson.title,
      );
    } catch (error) {
      console.error('[LessonBuilder] content fallback:', error);
      return this.buildFallbackLessonContent(lesson.title);
    }
  }

  private buildOutlinePrompt(dto: CreateLessonBuilderOutlineDto) {
    return `
Báº¡n lÃ  AI Lesson Builder cá»§a BeaconVie.
HÃ£y phÃ¢n tÃ­ch yÃªu cáº§u ngÆ°á»i há»c vÃ  táº¡o course outline tiáº¿ng Anh cÃ¡ nhÃ¢n hÃ³a.

YÃªu cáº§u ngÆ°á»i dÃ¹ng:
- Má»¥c tiÃªu: ${dto.goal}
- Äá»™ tuá»•i: ${dto.audienceAge || 'khÃ´ng rÃµ'}
- TrÃ¬nh Ä‘á»™: ${dto.level || 'tá»± chá»n phÃ¹ há»£p'}
- Thá»i gian há»c má»—i ngÃ y: ${dto.dailyMinutes || 30} phÃºt
- Sá»‘ ngÃ y há»c: ${dto.totalDays || 30}
- Sá»Ÿ thÃ­ch: ${(dto.interests || []).join(', ') || 'khÃ´ng cÃ³'}
- Ká»¹ nÄƒng trá»ng tÃ¢m: ${(dto.focusSkills || []).join(', ') || 'Ä‘á»§ 4 ká»¹ nÄƒng'}

Chá»‰ tráº£ vá» JSON object:
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

Quy táº¯c:
- Táº¡o 2-6 modules tÃ¹y sá»‘ ngÃ y há»c.
- Tá»•ng lesson nÃªn phÃ¹ há»£p vá»›i thá»i gian há»c, tá»‘i thiá»ƒu 4, tá»‘i Ä‘a 40.
- Lesson pháº£i cÃ³ thá»© tá»± há»c tá»± nhiÃªn, tá»« dá»… Ä‘áº¿n khÃ³.
- KhÃ´ng markdown, khÃ´ng giáº£i thÃ­ch ngoÃ i JSON.
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
            goal: String(lesson?.goal || 'HoÃ n thÃ nh má»¥c tiÃªu bÃ i há»c.'),
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
        input?.description || 'KhÃ³a há»c tiáº¿ng Anh cÃ¡ nhÃ¢n hÃ³a bá»Ÿi AI.',
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
        input?.learningGoal || 'Náº¯m ná»™i dung chÃ­nh cá»§a bÃ i.',
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
        'Lá»™ trÃ¬nh cÃ¡ nhÃ¢n hÃ³a giÃºp báº¡n há»c tá»« vá»±ng, máº«u cÃ¢u, nghe, nÃ³i vÃ  Ã´n táº­p tá»«ng ngÃ y.',
      level: dto.level || 'A1',
      estimatedMinutes:
        (dto.dailyMinutes || 30) * Math.min(dto.totalDays || 7, 14),
      modules: [
        {
          title: 'Module 1: Foundation',
          description: 'LÃ m quen vá»›i tá»« vá»±ng vÃ  máº«u cÃ¢u ná»n táº£ng.',
          lessons: [
            {
              title: 'Lesson 1: Hello and Goals',
              goal: 'Biáº¿t chÃ o há»i vÃ  nÃ³i má»¥c tiÃªu há»c.',
              duration: 15,
              skills: ['Vocabulary', 'Speaking'],
            },
            {
              title: 'Lesson 2: Useful Words',
              goal: 'Há»c nhÃ³m tá»« quan trá»ng Ä‘áº§u tiÃªn.',
              duration: 15,
              skills: ['Vocabulary', 'Listening'],
            },
          ],
        },
        {
          title: 'Module 2: Practice',
          description: 'DÃ¹ng kiáº¿n thá»©c trong tÃ¬nh huá»‘ng ngáº¯n.',
          lessons: [
            {
              title: 'Lesson 3: Short Dialogue',
              goal: 'Hiá»ƒu vÃ  luyá»‡n há»™i thoáº¡i ngáº¯n.',
              duration: 20,
              skills: ['Listening', 'Speaking'],
            },
            {
              title: 'Lesson 4: Review and Quiz',
              goal: 'Ã”n táº­p vÃ  kiá»ƒm tra nhanh.',
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
      learningGoal: 'Hiá»ƒu vÃ  sá»­ dá»¥ng ná»™i dung chÃ­nh cá»§a bÃ i há»c.',
      vocabulary: [
        {
          word: 'practice',
          meaning: 'luyá»‡n táº­p',
          example: 'I practice English every day.',
        },
        {
          word: 'goal',
          meaning: 'má»¥c tiÃªu',
          example: 'My goal is to speak clearly.',
        },
      ],
      grammar: [
        {
          point: 'Present Simple',
          explanation: 'DÃ¹ng Ä‘á»ƒ nÃ³i thÃ³i quen hoáº·c sá»± tháº­t Ä‘Æ¡n giáº£n.',
          example: 'I study English every day.',
        },
      ],
      dialogue: [
        {
          speaker: 'A',
          line: 'What is your goal?',
          vi: 'Má»¥c tiÃªu cá»§a báº¡n lÃ  gÃ¬?',
        },
        {
          speaker: 'B',
          line: 'I want to speak English.',
          vi: 'TÃ´i muá»‘n nÃ³i tiáº¿ng Anh.',
        },
      ],
      listeningScript:
        'I study English every day. I practice new words and short sentences.',
      speakingTask: 'NÃ³i 3 cÃ¢u vá» má»¥c tiÃªu há»c tiáº¿ng Anh cá»§a báº¡n.',
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
          options: ['má»¥c tiÃªu', 'bÃ i hÃ¡t', 'mÃ u sáº¯c', 'thá»i tiáº¿t'],
          answer: 'má»¥c tiÃªu',
          explanation: 'Goal nghÄ©a lÃ  má»¥c tiÃªu.',
        },
      ],
    };
  }

  private renderLessonContent(content: any) {
    const lines: string[] = [];
    lines.push(`# ${content.title}`);
    lines.push(`\n## Má»¥c tiÃªu\n${content.learningGoal}`);

    lines.push('\n## Vocabulary');
    for (const item of content.vocabulary || []) {
      lines.push(
        `- ${item.word || ''}: ${item.meaning || ''}. ${item.example || ''}`,
      );
    }

    lines.push('\n## Grammar');
    for (const item of content.grammar || []) {
      lines.push(
        `- ${item.point || ''}: ${item.explanation || ''} VÃ­ dá»¥: ${item.example || ''}`,
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
      lines.push(`- ${item.question || ''} ÄÃ¡p Ã¡n: ${item.answer || ''}`);
    }

    return lines.join('\n');
  }

  private buildLessonPlaceholder(lesson: BuilderOutlineLesson) {
    return `# ${lesson.title}

## Má»¥c tiÃªu
${lesson.goal || 'HoÃ n thÃ nh má»¥c tiÃªu bÃ i há»c.'}

Ná»™i dung chi tiáº¿t Ä‘ang chá» AI táº¡o. HÃ£y báº¥m "Sinh ná»™i dung" Ä‘á»ƒ táº¡o Vocabulary, Grammar, Listening, Speaking, Reading vÃ  Quiz cho bÃ i nÃ y.`;
  }

  private buildCourseThumbnail(title: string) {
    const label = encodeURIComponent(title || 'AI Course');
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 360"><defs><linearGradient id="g" x1="0" x2="1" y1="0" y2="1"><stop stop-color="#7c3aed"/><stop offset="1" stop-color="#14b8a6"/></linearGradient></defs><rect width="600" height="360" rx="36" fill="url(#g)"/><circle cx="480" cy="80" r="72" fill="#fff" opacity=".18"/><circle cx="90" cy="300" r="90" fill="#fff" opacity=".16"/><text x="60" y="155" font-family="Arial,sans-serif" font-size="44" font-weight="900" fill="#fff">AI Lesson</text><text x="60" y="210" font-family="Arial,sans-serif" font-size="30" font-weight="800" fill="#ede9fe">${label.slice(0, 22)}</text><text x="60" y="280" font-family="Arial,sans-serif" font-size="24" font-weight="800" fill="#ccfbf1">BeaconVie</text></svg>`,
    )}`;
  }
}
