import { describe, expect, it } from "vitest";
import { GameEngine, decideWinner } from "@/lib/game/engine";
import { LocalMagicBlockAdapter } from "@/lib/magicblock/mockAdapter";
import type { PriceFeed } from "@/lib/game/mockPriceFeed";

/** Deterministic price feed for tests. */
class StubFeed implements PriceFeed {
  constructor(public value: number) {}
  current(): number {
    return this.value;
  }
  next(): number {
    return this.value;
  }
}

const CREATOR = "Creator11111111111111111111111111111111111";
const OPPONENT = "Opponent2222222222222222222222222222222222";

describe("GameEngine full match", () => {
  it("6. plays rounds, scores both players, and decides the winner", async () => {
    const adapter = new LocalMagicBlockAdapter();
    const feed = new StubFeed(100);
    const engine = new GameEngine(adapter, feed);

    const created = await engine.createRoom({
      creator: CREATOR,
      entryFeeLamports: 50_000_000,
      totalRounds: 2,
      roundDurationSeconds: 45,
    });
    const roomId = created.id;

    // Prize pool reflects only the creator until the opponent joins.
    expect(created.prizePoolLamports).toBe(50_000_000);
    const joined = await engine.joinRoom(roomId, OPPONENT);
    expect(joined.prizePoolLamports).toBe(100_000_000);

    // ---- Round 1: price rises -> UP. Creator right, opponent wrong. ----
    feed.value = 100;
    const r1 = await engine.startNextRound(roomId);
    expect(r1).not.toBeNull();
    const startedAt1 = adapter.getRoom(roomId)!.rounds[0].startedAt;
    await engine.submitPrediction({
      roomId,
      player: CREATOR,
      direction: "UP",
      confidence: 2,
      submittedAt: startedAt1 + 5_000,
    });
    await engine.submitPrediction({
      roomId,
      player: OPPONENT,
      direction: "DOWN",
      confidence: 1,
      submittedAt: startedAt1 + 5_000,
    });
    await engine.resolveCurrentRound(roomId, 103); // +3% -> UP

    // ---- Round 2: price rises again. Creator right, opponent wrong. ----
    const r2 = await engine.startNextRound(roomId);
    expect(r2).not.toBeNull();
    const startedAt2 = adapter.getRoom(roomId)!.rounds[1].startedAt;
    await engine.submitPrediction({
      roomId,
      player: CREATOR,
      direction: "UP",
      confidence: 1,
      submittedAt: startedAt2 + 5_000,
    });
    await engine.submitPrediction({
      roomId,
      player: OPPONENT,
      direction: "DOWN",
      confidence: 1,
      submittedAt: startedAt2 + 5_000,
    });
    await engine.resolveCurrentRound(roomId, 106);

    expect(engine.isMatchOver(roomId)).toBe(true);

    const room = adapter.getRoom(roomId)!;
    // Creator: R1 (100*2 + 30) = 230, R2 (100*1 + 30) = 130 -> 360
    expect(room.players[CREATOR].score).toBe(360);
    // Opponent wrong twice: -60, -60 -> -120
    expect(room.players[OPPONENT].score).toBe(-120);
    expect(room.players[CREATOR].streak).toBe(2);
    expect(room.players[OPPONENT].streak).toBe(0);

    const { room: finalized, commitRef } = await engine.finalizeMatch(roomId);
    expect(finalized.status).toBe("finished");
    expect(finalized.winner).toBe(CREATOR);
    expect(finalized.isDraw).toBe(false);
    expect(commitRef).toContain("mb-commit:");
  });

  it("decideWinner reports a draw on equal scores", () => {
    const room = {
      players: {
        a: { wallet: "a", score: 100, streak: 0, predictions: [] },
        b: { wallet: "b", score: 100, streak: 0, predictions: [] },
      },
    } as never;
    expect(decideWinner(room)).toEqual({ isDraw: true });
  });
});
