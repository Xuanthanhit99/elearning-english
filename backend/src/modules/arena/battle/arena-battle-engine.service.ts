import { Injectable } from '@nestjs/common';
import {
  comboMultiplierBasisPoints,
  getArenaMaxScoreMultiplierBp,
  speedBonusBasisPoints,
} from './arena-battle.constants';

export type ArenaAnswerOutcomeInput = {
  basePoints: number;
  isCorrect: boolean;
  isLate: boolean;
  comboBefore: number;
  questionActivatedAt: Date | null;
  answeredAt: Date;
  windowMs: number;
  /** 10000 = no bonus, 20000 = double, etc. From an active DOUBLE_SCORE effect. */
  powerUpMultiplierBasisPoints: number;
};

export type ArenaAnswerOutcome = {
  comboAfter: number;
  speedBonusBasisPoints: number;
  comboMultiplierBasisPoints: number;
  finalMultiplierBasisPoints: number;
  finalScore: number;
};

/**
 * Pure calculation, no DB/IO — deterministic and unit-testable in
 * isolation. `ArenaService`/`ArenaPowerUpService` own persistence; this
 * only computes numbers from inputs they supply.
 */
@Injectable()
export class ArenaBattleEngineService {
  calculateAnswerOutcome(input: ArenaAnswerOutcomeInput): ArenaAnswerOutcome {
    if (!input.isCorrect || input.isLate) {
      return {
        comboAfter: 0,
        speedBonusBasisPoints: 0,
        comboMultiplierBasisPoints: comboMultiplierBasisPoints(0),
        finalMultiplierBasisPoints: 10000,
        finalScore: 0,
      };
    }

    const comboAfter = input.comboBefore + 1;
    const elapsedMs = input.questionActivatedAt
      ? Math.max(0, input.answeredAt.getTime() - input.questionActivatedAt.getTime())
      : input.windowMs;
    const speedBp = speedBonusBasisPoints(elapsedMs, input.windowMs);
    const comboBp = comboMultiplierBasisPoints(comboAfter);

    let effectiveBp = Math.round((comboBp * (10000 + speedBp)) / 10000);
    effectiveBp = Math.round((effectiveBp * input.powerUpMultiplierBasisPoints) / 10000);
    effectiveBp = Math.min(effectiveBp, getArenaMaxScoreMultiplierBp());

    const finalScore = Math.floor((input.basePoints * effectiveBp) / 10000);

    return {
      comboAfter,
      speedBonusBasisPoints: speedBp,
      comboMultiplierBasisPoints: comboBp,
      finalMultiplierBasisPoints: effectiveBp,
      finalScore,
    };
  }
}
