import { validateArenaQuestionCandidates } from './arena-question-validator';
import { ArenaQuestionRawCandidate } from './arena-question.types';

describe('validateArenaQuestionCandidates', () => {
  const validItem: ArenaQuestionRawCandidate = {
    type: 'MULTIPLE_CHOICE',
    prompt: 'What is "apple"?',
    skill: 'Vocabulary',
    options: ['A', 'B', 'C', 'D'],
    answer: 'A',
    explanation: 'An apple is a fruit.',
    points: 10,
  };

  function validateOne(item: ArenaQuestionRawCandidate) {
    return validateArenaQuestionCandidates([item]);
  }

  it('accepts a fully valid candidate', () => {
    const { valid, rejected } = validateOne(validItem);
    expect(rejected).toHaveLength(0);
    expect(valid).toHaveLength(1);
    expect(valid[0]).toMatchObject({
      type: 'MULTIPLE_CHOICE',
      prompt: 'What is "apple"?',
      skill: 'Vocabulary',
      answer: 'A',
      points: 10,
    });
  });

  it('rejects a missing type', () => {
    const { valid, rejected } = validateOne({ ...validItem, type: undefined });
    expect(valid).toHaveLength(0);
    expect(rejected[0].reason).toBe('missing_or_invalid_type');
  });

  it('rejects an invalid/unknown type (invalid enum)', () => {
    const { valid, rejected } = validateOne({ ...validItem, type: 'NOT_A_REAL_TYPE' });
    expect(valid).toHaveLength(0);
    expect(rejected[0].reason).toBe('missing_or_invalid_type');
  });

  it('rejects a missing prompt', () => {
    const { valid, rejected } = validateOne({ ...validItem, prompt: undefined });
    expect(valid).toHaveLength(0);
    expect(rejected[0].reason).toBe('empty_prompt');
  });

  it('rejects a blank (whitespace-only) prompt', () => {
    const { valid, rejected } = validateOne({ ...validItem, prompt: '   ' });
    expect(valid).toHaveLength(0);
    expect(rejected[0].reason).toBe('empty_prompt');
  });

  it('rejects a missing answer', () => {
    const { valid, rejected } = validateOne({ ...validItem, answer: undefined });
    expect(valid).toHaveLength(0);
    expect(rejected[0].reason).toBe('empty_answer');
  });

  it('rejects a missing skill', () => {
    const { valid, rejected } = validateOne({ ...validItem, skill: undefined });
    expect(valid).toHaveLength(0);
    expect(rejected[0].reason).toBe('missing_skill');
  });

  it('rejects duplicate options (case-insensitive)', () => {
    const { valid, rejected } = validateOne({
      ...validItem,
      options: ['Apple', 'apple', 'Banana', 'Cherry'],
    });
    expect(valid).toHaveLength(0);
    expect(rejected[0].reason).toBe('duplicate_options');
  });

  it('rejects when the answer is not among the options', () => {
    const { valid, rejected } = validateOne({
      ...validItem,
      answer: 'Not in the list',
      options: ['A', 'B', 'C', 'D'],
    });
    expect(valid).toHaveLength(0);
    expect(rejected[0].reason).toBe('answer_not_in_options');
  });

  it('accepts the answer matching an option case-insensitively', () => {
    const { valid, rejected } = validateOne({ ...validItem, answer: 'a', options: ['A', 'B', 'C', 'D'] });
    expect(rejected).toHaveLength(0);
    expect(valid[0].answer).toBe('a');
  });

  it('rejects options that are not an array', () => {
    const { valid, rejected } = validateOne({ ...validItem, options: 'not-an-array' });
    expect(valid).toHaveLength(0);
    expect(rejected[0].reason).toBe('options_not_array');
  });

  it('rejects options containing empty or non-string entries', () => {
    const { valid, rejected } = validateOne({ ...validItem, options: ['A', '', 'C', 'D'] });
    expect(valid).toHaveLength(0);
    expect(rejected[0].reason).toBe('options_contain_empty_or_non_string');
  });

  it('allows a missing/undefined options array (free-text question types)', () => {
    const { valid, rejected } = validateOne({ ...validItem, options: undefined });
    expect(rejected).toHaveLength(0);
    expect(valid[0].options).toEqual([]);
  });

  it('falls back to the default points (10) when points is missing, non-numeric, or non-positive — points is never rejected, only defaulted', () => {
    expect(validateOne({ ...validItem, points: undefined }).valid[0].points).toBe(10);
    expect(validateOne({ ...validItem, points: 'not-a-number' as any }).valid[0].points).toBe(10);
    expect(validateOne({ ...validItem, points: -5 }).valid[0].points).toBe(10);
    expect(validateOne({ ...validItem, points: 0 }).valid[0].points).toBe(10);
  });

  it('rounds a valid fractional points value instead of rejecting it', () => {
    expect(validateOne({ ...validItem, points: 7.6 }).valid[0].points).toBe(8);
  });

  it('there is no per-candidate "difficulty" field to validate — difficulty is a pipeline-level generation input (skill/topic/difficulty), not part of ArenaQuestionCandidate; an extraneous difficulty field on a raw candidate is simply ignored, not rejected', () => {
    const { valid, rejected } = validateOne({ ...validItem, difficulty: 'not-a-real-level' } as any);
    expect(rejected).toHaveLength(0);
    expect(valid).toHaveLength(1);
    expect((valid[0] as any).difficulty).toBeUndefined();
  });

  it('supports partial-valid batches: rejects only the malformed candidates and keeps the rest', () => {
    const items: ArenaQuestionRawCandidate[] = [
      validItem,
      { ...validItem, prompt: undefined },
      { ...validItem, type: 'BOGUS_TYPE' },
      { ...validItem, prompt: 'Second valid one' },
    ];
    const { valid, rejected } = validateArenaQuestionCandidates(items);
    expect(valid).toHaveLength(2);
    expect(rejected).toHaveLength(2);
    expect(valid.map((v) => v.prompt)).toEqual([validItem.prompt, 'Second valid one']);
  });

  it('rejects a non-object item', () => {
    const { valid, rejected } = validateArenaQuestionCandidates(['not an object' as any]);
    expect(valid).toHaveLength(0);
    expect(rejected[0].reason).toBe('not_an_object');
  });
});
