import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ArenaAiQuestionSource } from './arena-ai-question-source';
import { ArenaQuestionFallbackSource } from './arena-question-fallback-source';
import { ArenaQuestionHistoryService } from './arena-question-history.service';
import { createQuestionContentHash } from './arena-question-hash.util';
import { ArenaQuestionCandidate, ArenaQuestionType } from './arena-question.types';

export class ArenaQuestionPreparationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ArenaQuestionPreparationError';
  }
}

function envInt(name: string, fallback: number): number {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
}

const getNarrowedHistoryWindowDays = () => envInt('ARENA_QUESTION_HISTORY_NARROW_WINDOW_DAYS', 1);

/**
 * Orchestrates question preparation for one match: AI (bounded retry) ->
 * reusable questions from other matches -> static fallback, deduping
 * against both the in-progress batch and each participant's recent
 * question history, widening the history window in a controlled way if the
 * pool is too narrow. `ArenaService` only calls `prepareQuestionSet` — no
 * parsing/validation/retry logic lives in `ArenaService` itself.
 */
@Injectable()
export class ArenaQuestionPipelineService {
  private readonly logger = new Logger(ArenaQuestionPipelineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly aiSource: ArenaAiQuestionSource,
    private readonly fallbackSource: ArenaQuestionFallbackSource,
    private readonly history: ArenaQuestionHistoryService,
  ) {}

  async prepareQuestionSet(input: {
    skill: string;
    topic: string;
    difficulty: string;
    mode: string;
    userIds: string[];
    count: number;
  }): Promise<ArenaQuestionCandidate[]> {
    let excludedHashes = await this.history.getRecentHashes(input.userIds);

    const accepted: ArenaQuestionCandidate[] = [];
    const acceptedHashes = new Set<string>();

    const tryAdd = (candidates: ArenaQuestionCandidate[]) => {
      for (const candidate of candidates) {
        if (accepted.length >= input.count) break;
        const hash = createQuestionContentHash(candidate);
        if (acceptedHashes.has(hash) || excludedHashes.has(hash)) continue;
        acceptedHashes.add(hash);
        accepted.push(candidate);
      }
    };

    const aiCandidates = await this.aiSource.generateCandidates({
      skill: input.skill,
      level: input.difficulty,
      topic: input.topic,
      count: input.count,
    });
    tryAdd(aiCandidates);

    if (accepted.length < input.count) {
      const reusable = await this.loadReusableCandidates(
        input.skill,
        new Set([...acceptedHashes, ...excludedHashes]),
      );
      tryAdd(reusable);
    }

    if (accepted.length < input.count && excludedHashes.size > 0) {
      // Controlled widening: narrow the lookback window instead of
      // dropping history exclusion entirely, so a small question pool still
      // avoids the *most* recently seen content.
      this.logger.warn(
        `Arena question pool too narrow for skill="${input.skill}" — narrowing history exclusion window`,
      );
      excludedHashes = await this.history.getRecentHashes(
        input.userIds,
        getNarrowedHistoryWindowDays(),
      );
      const reusable = await this.loadReusableCandidates(
        input.skill,
        new Set([...acceptedHashes, ...excludedHashes]),
      );
      tryAdd(reusable);
    }

    if (accepted.length < input.count) {
      tryAdd(this.fallbackSource.getCandidates(input.skill));
    }

    if (accepted.length < input.count) {
      throw new ArenaQuestionPreparationError(
        `Only found ${accepted.length}/${input.count} valid, non-duplicate questions for ` +
          `skill="${input.skill}" topic="${input.topic}" difficulty="${input.difficulty}"`,
      );
    }

    return accepted.slice(0, input.count);
  }

  private async loadReusableCandidates(
    skill: string,
    excludeHashes: Set<string>,
  ): Promise<ArenaQuestionCandidate[]> {
    const rows = await this.prisma.arenaQuestion.findMany({
      where: { skill, contentHash: { not: null } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    return rows
      .filter((row) => row.contentHash && !excludeHashes.has(row.contentHash))
      .map((row) => ({
        type: row.type as ArenaQuestionType,
        skill: row.skill,
        prompt: row.prompt,
        options: Array.isArray(row.options) ? (row.options as unknown as string[]) : [],
        answer: row.answer,
        explanation: row.explanation ?? undefined,
        points: row.points,
      }));
  }
}
