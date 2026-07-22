import { Injectable } from '@nestjs/common';
import { ArenaQuestionCandidate } from './arena-question.types';

/**
 * Static curated fallback bank — this is the dormant `QUESTION_BANK` that
 * used to sit commented-out in `arena.service.ts`, uncommented and adapted
 * to the validated `ArenaQuestionCandidate` shape instead of reinventing a
 * new fallback list from scratch.
 */
const ARENA_STATIC_QUESTION_BANK: ArenaQuestionCandidate[] = [
  {
    type: 'MULTIPLE_CHOICE',
    skill: 'Vocabulary',
    prompt: 'Apple nghĩa là gì?',
    options: ['Quả táo', 'Quyển sách', 'Con mèo', 'Cái ghế'],
    answer: 'Quả táo',
    explanation: 'Apple là quả táo.',
    points: 10,
  },
  {
    type: 'MULTIPLE_CHOICE',
    skill: 'Vocabulary',
    prompt: 'Travel nghĩa là gì?',
    options: ['Du lịch', 'Nấu ăn', 'Ngủ', 'Vẽ'],
    answer: 'Du lịch',
    points: 10,
  },
  {
    type: 'FILL_BLANK',
    skill: 'Grammar',
    prompt: 'I ___ a student.',
    options: ['am', 'is', 'are', 'be'],
    answer: 'am',
    explanation: 'I đi với am.',
    points: 10,
  },
  {
    type: 'MULTIPLE_CHOICE',
    skill: 'Grammar',
    prompt: 'She ___ coffee every morning.',
    options: ['drink', 'drinks', 'drinking', 'to drink'],
    answer: 'drinks',
    points: 10,
  },
  {
    type: 'ORDER_SENTENCE',
    skill: 'Grammar',
    prompt: 'Sắp xếp câu: go / school / I / to',
    options: ['I go to school', 'School I go to', 'Go I to school', 'To school go I'],
    answer: 'I go to school',
    points: 10,
  },
  {
    type: 'LISTENING_PLACEHOLDER',
    skill: 'Listening',
    prompt: 'Nghe câu: "How are you today?". Người nói hỏi gì?',
    options: ['Bạn khỏe không hôm nay?', 'Bạn tên gì?', 'Bạn ở đâu?', 'Bạn học gì?'],
    answer: 'Bạn khỏe không hôm nay?',
    points: 10,
  },
  {
    type: 'PRONUNCIATION_PLACEHOLDER',
    skill: 'Pronunciation',
    prompt: 'Đọc từ "Opportunity". Chọn phiên âm gần đúng.',
    options: ['/ˌɑːpərˈtuːnəti/', '/kæt/', '/bʊk/', '/hæpi/'],
    answer: '/ˌɑːpərˈtuːnəti/',
    points: 10,
  },
  {
    type: 'FLASH',
    skill: 'Vocabulary',
    prompt: 'Flash 5 giây: 🐶. Chọn từ đúng.',
    options: ['dog', 'cat', 'bird', 'fish'],
    answer: 'dog',
    points: 10,
  },
  {
    type: 'MATCHING_PLACEHOLDER',
    skill: 'Mixed',
    prompt: 'Ghép nghĩa: happy',
    options: ['vui vẻ', 'buồn', 'nhanh', 'sạch'],
    answer: 'vui vẻ',
    points: 10,
  },
  {
    type: 'MULTIPLE_CHOICE',
    skill: 'Mixed',
    prompt: 'Which sentence is correct?',
    options: ['I am happy.', 'I is happy.', 'I are happy.', 'I be happy.'],
    answer: 'I am happy.',
    points: 10,
  },
];

@Injectable()
export class ArenaQuestionFallbackSource {
  /**
   * Deliberately small (this is a last-resort static bank, not a primary
   * source) — for a narrow skill filter it may not reach `count` unique
   * questions, in which case the pipeline moves on (or fails preparation)
   * rather than repeating a question within the same match.
   */
  getCandidates(skill: string): ArenaQuestionCandidate[] {
    const pool = ARENA_STATIC_QUESTION_BANK.filter(
      (item) => skill === 'Mixed' || item.skill === skill || item.skill === 'Mixed',
    );
    return pool.length ? pool : ARENA_STATIC_QUESTION_BANK;
  }
}
