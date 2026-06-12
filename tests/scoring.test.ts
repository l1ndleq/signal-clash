import { describe, expect, it } from "vitest";
import { calculateRoundScore, resolveDirection } from "@/lib/game/scoring";
import type { ScoreInput } from "@/lib/game/types";

const base: ScoreInput = {
  direction: "UP",
  confidence: 1,
  submittedAt: 5_000,
  roundStartedAt: 0,
  startPrice: 100,
  endPrice: 101,
  currentStreak: 0,
};

describe("resolveDirection", () => {
  it("classifies UP / DOWN / FLAT against the 0.05% threshold", () => {
    expect(resolveDirection(100, 101)).toBe("UP");
    expect(resolveDirection(100, 99)).toBe("DOWN");
    expect(resolveDirection(100, 100.02)).toBe("FLAT"); // 0.02% < threshold
  });
});

describe("calculateRoundScore", () => {
  it("1. scores a correct UP prediction with fast-timing bonus", () => {
    const r = calculateRoundScore(base);
    expect(r.correct).toBe(true);
    expect(r.actualDirection).toBe("UP");
    // base 100 * 1x + timing 30 (<=10s) + streak 0
    expect(r.scoreDelta).toBe(130);
    expect(r.timingBonus).toBe(30);
    expect(r.streakBonus).toBe(0);
  });

  it("2. applies the confidence multiplier to a wrong-prediction penalty", () => {
    const r = calculateRoundScore({
      ...base,
      direction: "UP",
      confidence: 3,
      endPrice: 98, // actual DOWN -> wrong
    });
    expect(r.correct).toBe(false);
    expect(r.actualDirection).toBe("DOWN");
    expect(r.scoreDelta).toBe(-180); // -60 * 3
    expect(r.timingBonus).toBe(0);
    expect(r.streakBonus).toBe(0);
  });

  it("3. awards timing bonus by submission window (only when correct)", () => {
    const fast = calculateRoundScore({ ...base, submittedAt: 10_000 });
    expect(fast.timingBonus).toBe(30); // <=10s

    const mid = calculateRoundScore({ ...base, submittedAt: 25_000 });
    expect(mid.timingBonus).toBe(15); // <=30s

    const late = calculateRoundScore({ ...base, submittedAt: 40_000 });
    expect(late.timingBonus).toBe(0);
    expect(late.scoreDelta).toBe(100); // base only

    // No timing bonus on a wrong call regardless of speed.
    const wrongFast = calculateRoundScore({
      ...base,
      submittedAt: 1_000,
      endPrice: 90,
    });
    expect(wrongFast.timingBonus).toBe(0);
  });

  it("4. awards streak bonus based on the streak AFTER the round", () => {
    const three = calculateRoundScore({ ...base, currentStreak: 2 });
    expect(three.streakBonus).toBe(25); // streak becomes 3

    const five = calculateRoundScore({ ...base, currentStreak: 4 });
    expect(five.streakBonus).toBe(60); // streak becomes 5
    // base 100 + timing 30 + streak 60
    expect(five.scoreDelta).toBe(190);
  });

  it("5. scores a correct FLAT resolution at +80 base", () => {
    const r = calculateRoundScore({
      ...base,
      direction: "FLAT",
      endPrice: 100.02, // within threshold -> FLAT
    });
    expect(r.correct).toBe(true);
    expect(r.actualDirection).toBe("FLAT");
    // base 80 + timing 30
    expect(r.scoreDelta).toBe(110);
  });
});
