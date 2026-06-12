import { describe, expect, it } from "vitest";
import {
  computePrizeBreakdown,
  paidPlacesForField,
  rankStandings,
  splitBpsForField,
} from "@/lib/game/tournament";
import type { Player, Room } from "@/lib/game/types";

function player(wallet: string, score: number): Player {
  return { wallet, score, streak: 0, predictions: [] };
}

function room(
  players: Player[],
  prizePoolLamports: number,
  maxPlayers: number = players.length,
): Room {
  return {
    id: "t1",
    kind: "tournament",
    creator: players[0]?.wallet ?? "c",
    market: "SOL/USD",
    entryFeeLamports: 0,
    prizePoolLamports,
    status: "finished",
    rounds: [],
    currentRoundIndex: 0,
    players: Object.fromEntries(players.map((p) => [p.wallet, p])),
    maxPlayers,
    totalRounds: 5,
    roundDurationSeconds: 30,
    createdAt: 0,
  };
}

describe("computePrizeBreakdown", () => {
  it("1. takes a 3% rake and splits the net pool 50/30/20", () => {
    const { rakeLamports, netPoolLamports, payouts } =
      computePrizeBreakdown(1_000_000);
    expect(rakeLamports).toBe(30_000); // 3% of 1,000,000
    expect(netPoolLamports).toBe(970_000);
    expect(payouts).toEqual([485_000, 291_000, 194_000]); // 50/30/20 of net
  });

  it("2. is lossless: rake + every payout sums back to the original pool", () => {
    // A pool that does not divide cleanly, to exercise the remainder path.
    const pool = 1_234_567;
    const { rakeLamports, payouts } = computePrizeBreakdown(pool);
    const total = rakeLamports + payouts.reduce((a, b) => a + b, 0);
    expect(total).toBe(pool);
  });

  it("3. floors the rake and gives the rounding remainder to last place", () => {
    const { rakeLamports, netPoolLamports, payouts } =
      computePrizeBreakdown(1_234_567);
    expect(rakeLamports).toBe(Math.floor((1_234_567 * 300) / 10_000));
    // first two places are floored shares, third absorbs the remainder
    expect(payouts[0]).toBe(Math.floor((netPoolLamports * 5000) / 10_000));
    expect(payouts[1]).toBe(Math.floor((netPoolLamports * 3000) / 10_000));
    expect(payouts[2]).toBe(netPoolLamports - payouts[0] - payouts[1]);
  });

  it("4. handles an empty pool without producing negative payouts", () => {
    const { rakeLamports, netPoolLamports, payouts } = computePrizeBreakdown(0);
    expect(rakeLamports).toBe(0);
    expect(netPoolLamports).toBe(0);
    expect(payouts).toEqual([0, 0, 0]);
  });
});

describe("splitBpsForField", () => {
  it("5. mirrors the on-chain tier table by field size", () => {
    expect(splitBpsForField(2)).toEqual([10_000]); // winner-take-all
    expect(splitBpsForField(3)).toEqual([10_000]);
    expect(splitBpsForField(4)).toEqual([7_000, 3_000]);
    expect(splitBpsForField(5)).toEqual([7_000, 3_000]);
    expect(splitBpsForField(6)).toEqual([5_000, 3_000, 2_000]);
    expect(splitBpsForField(16)).toEqual([5_000, 3_000, 2_000]);
    expect(paidPlacesForField(2)).toBe(1);
    expect(paidPlacesForField(4)).toBe(2);
    expect(paidPlacesForField(8)).toBe(3);
  });
});

describe("rankStandings", () => {
  it("6. ranks by score desc and pays the top three on a 6+ field", () => {
    const r = room(
      [
        player("aaa", 100),
        player("bbb", 500),
        player("ccc", 300),
        player("ddd", 200),
        player("eee", 50),
      ],
      1_000_000,
      8, // tournament field -> 50/30/20
    );
    const standings = rankStandings(r);
    expect(standings.map((s) => s.wallet)).toEqual([
      "bbb",
      "ccc",
      "ddd",
      "aaa",
      "eee",
    ]);
    expect(standings.map((s) => s.payoutLamports)).toEqual([
      485_000,
      291_000,
      194_000,
      0,
      0,
    ]);
  });

  it("7. pays 70/30 on a four-player field", () => {
    const r = room(
      [
        player("aaa", 100),
        player("bbb", 500),
        player("ccc", 300),
        player("ddd", 50),
      ],
      1_000_000,
      4, // -> 70/30
    );
    const standings = rankStandings(r);
    expect(standings.map((s) => s.payoutLamports)).toEqual([
      679_000, // 70% of 970k
      291_000, // 30% of 970k
      0,
      0,
    ]);
  });

  it("8. pays winner-take-all on a 1v1 field", () => {
    const r = room([player("aaa", 100), player("bbb", 500)], 1_000_000, 2);
    const standings = rankStandings(r);
    expect(standings.map((s) => s.payoutLamports)).toEqual([970_000, 0]);
  });

  it("9. breaks score ties deterministically by wallet", () => {
    const r = room([player("zzz", 100), player("aaa", 100)], 0);
    const standings = rankStandings(r);
    expect(standings.map((s) => s.wallet)).toEqual(["aaa", "zzz"]);
  });
});
