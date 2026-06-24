import { BadRequestException, Injectable } from '@nestjs/common';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { CheckWordDto } from './dto/check-word.dto';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class WordsService {
  private genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

  constructor(private readonly prisma: PrismaService) {}

  private sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private cleanJson(text: string) {
    return text
      .replace(/```json/g, '')
      .replace(/```/g, '')
      .trim();
  }

  private isEmptyJsonArray(value: any) {
    return !value || (Array.isArray(value) && value.length === 0);
  }

  private isIncompleteWord(word: any) {
    if (!word) return true;

    return (
      !word.mainMeaning ||
      word.mainMeaning === 'Chưa có dữ liệu nghĩa.' ||
      !word.shortExplanation ||
      word.shortExplanation === 'Chưa có giải thích chi tiết.' ||
      this.isEmptyJsonArray(word.phrases) ||
      this.isEmptyJsonArray(word.examples)
    );
  }

  private async getDictionaryData(word: string) {
    try {
      const res = await fetch(
        `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(
          word,
        )}`,
      );

      if (!res.ok) return null;

      const data = await res.json();
      const item = data?.[0];
      const meaning = item?.meanings?.[0];
      const definition = meaning?.definitions?.[0];

      return {
        word: item?.word || word,
        ipa: item?.phonetic || item?.phonetics?.[0]?.text || '',
        audio: item?.phonetics?.find((p: any) => p.audio)?.audio || '',
        partOfSpeech: meaning?.partOfSpeech || '',
        definition: definition?.definition || '',
        example: definition?.example || '',
        synonyms: definition?.synonyms || meaning?.synonyms || [],
      };
    } catch {
      return null;
    }
  }

  private buildManualMeaning(word: string) {
    const map: Record<string, any> = {
      excited: {
        mainMeaning: 'hào hứng, háo hức, phấn khích',
        shortExplanation:
          'Dùng khi bạn rất vui và mong chờ điều gì đó sắp xảy ra.',
        synonyms: [
          { word: 'thrilled', meaning: 'rất vui sướng, cực kỳ hào hứng' },
          { word: 'eager', meaning: 'háo hức, mong muốn làm gì đó' },
        ],
        phrases: [
          {
            phrase: 'be excited about something',
            meaning: 'hào hứng về điều gì đó',
          },
          {
            phrase: 'be excited to do something',
            meaning: 'háo hức làm điều gì đó',
          },
          {
            phrase: 'so excited',
            meaning: 'rất háo hức / rất phấn khích',
          },
        ],
        examples: [
          {
            source: "I'm excited about the trip.",
            target: 'Tôi rất háo hức về chuyến đi.',
          },
          {
            source: 'She is excited to start her new job.',
            target: 'Cô ấy háo hức bắt đầu công việc mới.',
          },
        ],
      },
      hello: {
        mainMeaning: 'xin chào',
        shortExplanation:
          'Dùng để chào ai đó khi gặp mặt, gọi điện hoặc bắt đầu cuộc trò chuyện.',
        synonyms: [
          { word: 'hi', meaning: 'chào, xin chào thân mật' },
          { word: 'hey', meaning: 'chào, này' },
        ],
        phrases: [
          { phrase: 'say hello', meaning: 'nói lời chào' },
          { phrase: 'hello everyone', meaning: 'xin chào mọi người' },
        ],
        examples: [
          {
            source: 'Hello, how are you?',
            target: 'Xin chào, bạn khỏe không?',
          },
          {
            source: 'She said hello to me.',
            target: 'Cô ấy đã chào tôi.',
          },
        ],
      },
    };

    return map[word.toLowerCase()] || null;
  }

  private buildPrompt(params: {
    word: string;
    sourceLanguage: string;
    targetLanguage: string;
    level: string;
    dictionary: any;
  }) {
    return `
You are a professional language learning assistant.

Task:
Analyze the word for a vocabulary learning app.

Word: ${params.word}
Source language code: ${params.sourceLanguage}
Target language code: ${params.targetLanguage}
Learner level: ${params.level}

Dictionary data:
${JSON.stringify(params.dictionary)}

Important rules:
- Use the dictionary data as context if it exists.
- Do NOT translate word by word.
- Explain the most common daily meaning.
- If targetLanguage is "vi", write natural Vietnamese.
- If sourceLanguage is "en", examples.source must be English.
- examples.target must be translated into targetLanguage.
- Create 2 to 4 useful phrases.
- Create 2 to 3 simple real-life examples.
- Create 2 to 4 useful synonyms if possible.
- Avoid awkward literal translations.
- Return ONLY valid JSON. No markdown.

JSON format:
{
  "mainMeaning": "",
  "shortExplanation": "",
  "synonyms": [
    {
      "word": "",
      "meaning": ""
    }
  ],
  "phrases": [
    {
      "phrase": "",
      "meaning": ""
    }
  ],
  "examples": [
    {
      "source": "",
      "target": ""
    }
  ]
}
`;
  }

  private async askGemini(params: {
    word: string;
    sourceLanguage: string;
    targetLanguage: string;
    level: string;
    dictionary: any;
  }) {
    if (!process.env.GEMINI_API_KEY) return null;

    const prompt = this.buildPrompt(params);
    const models = ['gemini-2.5-flash', 'gemini-2.0-flash'];

    for (const modelName of models) {
      const model = this.genAI.getGenerativeModel({
        model: modelName,
      });

      for (let retry = 0; retry < 3; retry++) {
        try {
          console.log('Calling Gemini model:', modelName);

          const result = await model.generateContent(prompt);
          const text = result.response.text();

          console.log('Gemini text:', text);

          return JSON.parse(this.cleanJson(text));
        } catch (error: any) {
          console.log('Gemini failed:', {
            modelName,
            retry,
            status: error?.status,
            message: error?.message,
          });

          if ((error?.status === 429 || error?.status === 503) && retry < 2) {
            await this.sleep((retry + 1) * 2000);
            continue;
          }

          break;
        }
      }
    }

    return null;
  }

  private buildWordData(params: {
    wordText: string;
    dto: CheckWordDto;
    level: string;
    dictionary: any;
    manual: any;
    aiData: any;
  }) {
    const { wordText, dto, level, dictionary, manual, aiData } = params;

    return {
      word: wordText,
      sourceLanguage: dto.sourceLanguage,
      targetLanguage: dto.targetLanguage,
      level,

      ipa: dictionary?.ipa || '',
      audio: dictionary?.audio || '',
      partOfSpeech: dictionary?.partOfSpeech || '',
      definition: dictionary?.definition || '',

      mainMeaning:
        manual?.mainMeaning ||
        aiData?.mainMeaning ||
        dictionary?.definition ||
        'Chưa có dữ liệu nghĩa.',

      shortExplanation:
        manual?.shortExplanation ||
        aiData?.shortExplanation ||
        'Chưa có giải thích chi tiết.',

      synonyms:
        manual?.synonyms ||
        aiData?.synonyms ||
        dictionary?.synonyms?.map((item: string) => ({
          word: item,
          meaning: '',
        })) ||
        [],

      phrases: manual?.phrases || aiData?.phrases || [],

      examples:
        manual?.examples ||
        aiData?.examples ||
        (dictionary?.example
          ? [
              {
                source: dictionary.example,
                target: '',
              },
            ]
          : []),
    };
  }

  async checkWord(dto: CheckWordDto, userId?: string) {
    const wordText = dto.word.trim().toLowerCase();
    const level = dto.level || 'Beginner';

    if (!wordText) {
      throw new BadRequestException('Word is required');
    }

    let word = await this.prisma.word.findUnique({
      where: {
        word_sourceLanguage_targetLanguage_level: {
          word: wordText,
          sourceLanguage: dto.sourceLanguage,
          targetLanguage: dto.targetLanguage,
          level,
        },
      },
    });

    if (word && !this.isIncompleteWord(word)) {
      await this.saveHistory(userId, word.id);
      return word;
    }

    const dictionary =
      dto.sourceLanguage === 'en'
        ? await this.getDictionaryData(wordText)
        : null;

    const manual = this.buildManualMeaning(wordText);

    const aiData = manual
      ? null
      : await this.askGemini({
          word: wordText,
          sourceLanguage: dto.sourceLanguage,
          targetLanguage: dto.targetLanguage,
          level,
          dictionary,
        });

    const wordData = this.buildWordData({
      wordText,
      dto,
      level,
      dictionary,
      manual,
      aiData,
    });

    if (word) {
      word = await this.prisma.word.update({
        where: { id: word.id },
        data: wordData,
      });
    } else {
      word = await this.prisma.word.create({
        data: wordData,
      });
    }

    await this.saveHistory(userId, word.id);

    return word;
  }

  private async saveHistory(userId: string | undefined, wordId: string) {
    if (!userId) return;

    await this.prisma.userWordHistory.upsert({
      where: {
        userId_wordId: {
          userId,
          wordId,
        },
      },
      update: {
        createdAt: new Date(),
      },
      create: {
        userId,
        wordId,
      },
    });
  }

  async getMyHistory(userId: string) {
    return this.prisma.userWordHistory.findMany({
      where: { userId },
      include: {
        word: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 20,
    });
  }
}