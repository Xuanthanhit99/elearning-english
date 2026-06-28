// src/pronunciation/pronunciation.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { GeminiService } from '../gemini/gemini.service';
import { UploadService } from '../upload/upload.service';
import { GeneratePronunciationDto } from './dto/generate-pronunciation.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class PronunciationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly geminiService: GeminiService,
    private readonly uploadService: UploadService,
  ) {}

  async generateExercise(userId: string, dto: GeneratePronunciationDto) {
    const level = dto.level || 'A2';
    const goal = dto.goal || 'Speaking';

    const prompt = `
You are an English pronunciation coach for Vietnamese learners.

Return JSON only.

Generate one pronunciation practice exercise.

Schema:
{
  "title": "Sentence practice",
  "type": "sentence",
  "level": "${level}",
  "text": "I want to improve my English speaking skills.",
  "ipa": "/aɪ wɑːnt tə ɪmˈpruːv maɪ ˈɪŋɡlɪʃ ˈspiːkɪŋ skɪlz/",
  "focusSounds": [
    {
      "word": "improve",
      "sound": "/pruːv/",
      "note": "Chú ý âm /v/ cuối từ."
    }
  ]
}

Rules:
- Text should be natural English.
- Suitable for Vietnamese learners.
- Include 2-4 focus sounds.
- Focus on ending sounds, stress, vowels, or connected speech.
- Explain notes in Vietnamese.
`;

    const aiData = await this.geminiService.generateJson(prompt);

    return this.prisma.pronunciationExercise.create({
      data: {
        title: aiData.title || 'Sentence practice',
        type: aiData.type || 'sentence',
        level: aiData.level || level,
        text: aiData.text,
        ipa: aiData.ipa || '',
        focusSounds: aiData.focusSounds || [],
      },
    });
  }

  async analyze(
    userId: string,
    exerciseId: string,
    audio?: Express.Multer.File,
  ) {
    if (!audio) {
      throw new BadRequestException('Vui lòng gửi file ghi âm.');
    }

    const exercise = await this.prisma.pronunciationExercise.findUnique({
      where: { id: exerciseId },
    });

    if (!exercise) {
      throw new BadRequestException('Không tìm thấy bài luyện.');
    }

    const uploaded = (await this.uploadService.uploadFile(
      audio,
      'pronunciation',
      'video',
    )) as { secure_url: string };
    const audioUrl = uploaded.secure_url;

    const prompt = `
You are an English pronunciation evaluator.

The learner practiced this sentence:
"${exercise.text}"

IPA:
"${exercise.ipa || ''}"

Because you cannot directly listen to audio in this JSON prompt, generate a realistic pronunciation evaluation result for demo.

Return JSON only:

{
  "score": 86,
  "clarity": 90,
  "stress": 82,
  "endingSound": 78,
  "fluency": 88,
  "wordFeedback": [
    {
      "word": "improve",
      "status": "warning",
      "correctIpa": "/ɪmˈpruːv/",
      "userIpa": "/ɪmˈpruv/",
      "note": "Trọng âm cần rõ hơn."
    }
  ],
  "errors": [
    {
      "title": "Âm cuối",
      "wrong": "skill",
      "correct": "skills",
      "note": "Bạn đang thiếu âm /z/ cuối từ."
    }
  ],
  "miniDrill": [
    "skills",
    "improve skills",
    "improve my English speaking skills"
  ],
  "miuNote": "Bạn phát âm khá tốt, cần luyện thêm âm cuối."
}

Rules:
- score and sub scores must be 0-100.
- wordFeedback status must be one of: good, warning, bad.
- Notes must be Vietnamese.
`;

    const aiData = await this.geminiService.generateJson(prompt);

    return this.prisma.pronunciationResult.create({
      data: {
        userId,
        exerciseId,
        audioUrl,
        score: Number(aiData.score) || 0,
        clarity: Number(aiData.clarity) || 0,
        stress: Number(aiData.stress) || 0,
        endingSound: Number(aiData.endingSound) || 0,
        fluency: Number(aiData.fluency) || 0,
        feedback: {
          wordFeedback: aiData.wordFeedback || [],
          errors: aiData.errors || [],
          miniDrill: aiData.miniDrill || [],
          miuNote: aiData.miuNote || '',
        },
      },
      include: {
        exercise: true,
      },
    });
  }

  async history(userId: string) {
    return this.prisma.pronunciationResult.findMany({
      where: { userId },
      include: {
        exercise: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }
}
