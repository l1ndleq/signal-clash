/**
 * Pure scoring logic for a single prediction round.
 *
 * This module has no side effects and no external dependencies beyond the
 * shared constants, which makes it the most heavily unit-tested piece of the
 * game. Both the real-time game layer (MagicBlock) and any future on-chain
 * verifier can reuse the exact same rules.
 */

import {
  PRICE_THRESHOLD_PCT,
  SCORE_CORRECT_DIRECTIONAL,
  SCORE_CORRECT_FLAT,
  SCORE_WRONG_PENALTY,
  STREAK_BIG_BONUS,
  STREAK_BIG_THRESHOLD,
  STREAK_SMALL_BONUS,
  STREAK_SMALL_THRESHOLD,
  TIMING_FAST_BONUS,
  TIMING_FAST_SECONDS,
  TIMING_MED_BONUS,
  TIMING_MED_SECONDS,
} from "@/lib/config";
import type { Direction, ScoreInput, ScoreResult } from "./types";

/** Classify the actual market move between two prices. */
export function resolveDirection(startPrice: number, endPrice: number): Direction {
  const change = (endPrice - startPrice) / startPrice;
  if (change > PRICE_THRESHOLD_PCT) return "UP";
  if (change < -PRICE_THRESHOLD_PCT) return "DOWN";
  return "FLAT";
}

function timingBonusFor(submittedAt: number, roundStartedAt: number): number {
  const elapsedSeconds = (submittedAt - roundStartedAt) / 1000;
  if (elapsedSeconds <= TIMING_FAST_SECONDS) return TIMING_FAST_BONUS;
  if (elapsedSeconds <= TIMING_MED_SECONDS) return TIMING_MED_BONUS;
  return 0;
}

function streakBonusFor(streakAfterRound: number): number {
  if (streakAfterRound >= STREAK_BIG_THRESHOLD) return STREAK_BIG_BONUS;
  if (streakAfterRound >= STREAK_SMALL_THRESHOLD) return STREAK_SMALL_BONUS;
  return 0;
}

/**
 * Calculate the score impact of one prediction.
 *
 * Rules:
 *  - base: correct UP/DOWN = +100, correct FLAT = +80, wrong = -60
 *  - base/penalty is multiplied by the confidence multiplier (1x/2x/3x)
 *  - timing and streak bonuses are flat and only awarded when correct
 */
export function calculateRoundScore(input: ScoreInput): ScoreResult {
  const {
    direction,
    confidence,
    submittedAt,
    roundStartedAt,
    startPrice,
    endPrice,
    currentStreak,
  } = input;

  const actualDirection = resolveDirection(startPrice, endPrice);
  const correct = direction === actualDirection;

  if (!correct) {
    return {
      scoreDelta: SCORE_WRONG_PENALTY * confidence,
      correct: false,
      actualDirection,
      timingBonus: 0,
      streakBonus: 0,
    };
  }

  const base =
    actualDirection === "FLAT" ? SCORE_CORRECT_FLAT : SCORE_CORRECT_DIRECTIONAL;
  const timingBonus = timingBonusFor(submittedAt, roundStartedAt);
  const streakBonus = streakBonusFor(currentStreak + 1);

  return {
    scoreDelta: base * confidence + timingBonus + streakBonus,
    correct: true,
    actualDirection,
    timingBonus,
    streakBonus,
  };
}
