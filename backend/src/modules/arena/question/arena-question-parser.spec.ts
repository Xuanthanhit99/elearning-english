import { parseArenaQuestionResponse } from './arena-question-parser';

describe('parseArenaQuestionResponse', () => {
  const item = {
    type: 'MULTIPLE_CHOICE',
    prompt: 'What is "apple"?',
    skill: 'Vocabulary',
    options: ['A', 'B', 'C', 'D'],
    answer: 'A',
  };

  it('parses a raw top-level array', () => {
    const result = parseArenaQuestionResponse(JSON.stringify([item]));
    expect(result).toHaveLength(1);
    expect(result[0].prompt).toBe(item.prompt);
  });

  it('strips ```json ... ``` markdown fences', () => {
    const raw = '```json\n' + JSON.stringify([item]) + '\n```';
    const result = parseArenaQuestionResponse(raw);
    expect(result).toHaveLength(1);
  });

  it('strips bare ``` ... ``` fences without the json tag', () => {
    const raw = '```\n' + JSON.stringify([item]) + '\n```';
    const result = parseArenaQuestionResponse(raw);
    expect(result).toHaveLength(1);
  });

  it('unwraps a {questions:[...]} wrapper', () => {
    const raw = JSON.stringify({ questions: [item] });
    const result = parseArenaQuestionResponse(raw);
    expect(result).toHaveLength(1);
  });

  it('unwraps a {data:[...]} wrapper', () => {
    const raw = JSON.stringify({ data: [item] });
    const result = parseArenaQuestionResponse(raw);
    expect(result).toHaveLength(1);
  });

  it('applies the question -> prompt alias', () => {
    const raw = JSON.stringify([{ ...item, prompt: undefined, question: 'Aliased prompt' }]);
    const result = parseArenaQuestionResponse(raw);
    expect(result[0].prompt).toBe('Aliased prompt');
  });

  it('applies the correctAnswer -> answer alias', () => {
    const raw = JSON.stringify([{ ...item, answer: undefined, correctAnswer: 'B' }]);
    const result = parseArenaQuestionResponse(raw);
    expect(result[0].answer).toBe('B');
  });

  it('applies the choices -> options alias', () => {
    const raw = JSON.stringify([{ ...item, options: undefined, choices: ['X', 'Y'] }]);
    const result = parseArenaQuestionResponse(raw);
    expect(result[0].options).toEqual(['X', 'Y']);
  });

  it('prefers the canonical field over the alias when both are present', () => {
    const raw = JSON.stringify([{ ...item, prompt: 'Canonical', question: 'Alias' }]);
    const result = parseArenaQuestionResponse(raw);
    expect(result[0].prompt).toBe('Canonical');
  });

  it('throws on invalid JSON instead of silently returning an empty list', () => {
    expect(() => parseArenaQuestionResponse('{not valid json')).toThrow();
  });

  it('throws on an empty response', () => {
    expect(() => parseArenaQuestionResponse('   ')).toThrow('Empty AI response');
  });

  it('returns an empty array for a genuinely empty JSON array (not an error — validator/pipeline decide if that is a failure)', () => {
    expect(parseArenaQuestionResponse('[]')).toEqual([]);
  });

  it('throws on a malformed payload that is valid JSON but not array/{questions}/{data} shaped', () => {
    expect(() => parseArenaQuestionResponse(JSON.stringify({ foo: 'bar' }))).toThrow(
      'AI response is not an array',
    );
  });

  it('throws when the top level is a JSON primitive', () => {
    expect(() => parseArenaQuestionResponse('"just a string"')).toThrow();
    expect(() => parseArenaQuestionResponse('42')).toThrow();
  });

  it('passes through a mixed valid/invalid payload unfiltered — parsing does not validate, it only extracts and aliases', () => {
    const raw = JSON.stringify([item, { garbage: true }, { type: 'MULTIPLE_CHOICE' }]);
    const result = parseArenaQuestionResponse(raw);
    expect(result).toHaveLength(3);
  });
});
