import { createQuestionContentHash, normalizeQuestionContent } from './arena-question-hash.util';
import { ArenaQuestionCandidate } from './arena-question.types';

function candidate(overrides: Partial<ArenaQuestionCandidate> = {}): Pick<
  ArenaQuestionCandidate,
  'type' | 'prompt' | 'options' | 'answer'
> {
  return {
    type: 'MULTIPLE_CHOICE',
    prompt: 'What is "apple"?',
    options: ['Apple', 'Banana', 'Cherry', 'Date'],
    answer: 'Apple',
    ...overrides,
  };
}

describe('createQuestionContentHash', () => {
  it('is deterministic — same input always yields the same hash', () => {
    const a = createQuestionContentHash(candidate());
    const b = createQuestionContentHash(candidate());
    expect(a).toBe(b);
  });

  it('produces a 64-char hex SHA-256 digest', () => {
    const hash = createQuestionContentHash(candidate());
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('normalizes whitespace — extra/irregular spacing does not change the hash', () => {
    const a = createQuestionContentHash(candidate({ prompt: 'What   is "apple"?' }));
    const b = createQuestionContentHash(candidate({ prompt: '  What is "apple"?  ' }));
    expect(a).toBe(b);
  });

  it('normalizes case — the hash is case-insensitive', () => {
    const a = createQuestionContentHash(candidate({ prompt: 'WHAT IS "APPLE"?' }));
    const b = createQuestionContentHash(candidate({ prompt: 'what is "apple"?' }));
    expect(a).toBe(b);
  });

  it('is insensitive to option ordering — the same option set in a different order hashes the same', () => {
    const a = createQuestionContentHash(candidate({ options: ['Apple', 'Banana', 'Cherry', 'Date'] }));
    const b = createQuestionContentHash(candidate({ options: ['Date', 'Cherry', 'Banana', 'Apple'] }));
    expect(a).toBe(b);
  });

  it('duplicate detection: identical content from two independently-built candidates hashes identically', () => {
    const first = { type: 'FILL_BLANK', prompt: 'I ___ a student.', options: ['am', 'is'], answer: 'am' } as const;
    const second = { type: 'FILL_BLANK', prompt: 'I ___ a student.', options: ['am', 'is'], answer: 'am' } as const;
    expect(createQuestionContentHash(first)).toBe(createQuestionContentHash(second));
  });

  it('a different answer produces a different hash even if the prompt/options are identical', () => {
    const a = createQuestionContentHash(candidate({ answer: 'Apple' }));
    const b = createQuestionContentHash(candidate({ answer: 'Banana' }));
    expect(a).not.toBe(b);
  });

  it('a different prompt produces a different hash', () => {
    const a = createQuestionContentHash(candidate({ prompt: 'What is "apple"?' }));
    const b = createQuestionContentHash(candidate({ prompt: 'What is "banana"?' }));
    expect(a).not.toBe(b);
  });

  it('a different type produces a different hash even with identical prompt/options/answer', () => {
    const a = createQuestionContentHash(candidate({ type: 'MULTIPLE_CHOICE' }));
    const b = createQuestionContentHash(candidate({ type: 'FILL_BLANK' }));
    expect(a).not.toBe(b);
  });

  it('a different option set (not just reordered) produces a different hash', () => {
    const a = createQuestionContentHash(candidate({ options: ['Apple', 'Banana', 'Cherry', 'Date'] }));
    const b = createQuestionContentHash(candidate({ options: ['Apple', 'Banana', 'Cherry', 'Elderberry'] }));
    expect(a).not.toBe(b);
  });
});

describe('normalizeQuestionContent', () => {
  it('joins type/prompt/options/answer into a single deterministic string (type is kept as-is; text fields are normalized)', () => {
    const normalized = normalizeQuestionContent(candidate());
    expect(normalized).toContain('MULTIPLE_CHOICE');
    expect(normalized).toContain('what is apple');
  });
});
