/**
 * Game engine: orchestrates room and round lifecycle on top of the MagicBlock
 * adapter, using the pure `calculateRoundScore` function for all scoring.
 *
 * The engine is deliberately UI-agnostic and dependency-injected (adapter +
 * price feed) so it can be driven from a React store in the browser or from a
 * test harness with deterministic prices.
 */

import { Market } from "./types";
import type {
  Confidence,
  Direction,
  Room,
  RoomKind,
  Round,
} from "./types";
import { calculateRoundScore } from "./scoring";
import type { PriceFeed } from "./mockPriceFeed";
import type {
  MagicBlockAdapter,
  ScoredPrediction,
} from "@/lib/magicblock/types";

export interface CreateRoomInput {
  creator: string;
  entryFeeLamports: number;
  kind?: RoomKind;
  market?: Market;
  maxPlayers?: number;
  totalRounds: number;
  roundDurationSeconds: number;
  /** Tournament only: epoch ms at which play begins. */
  startsAt?: number;
}

export interface SubmitInput {
  roomId: string;
  player: string;
  direction: Direction;
  confidence: Confidence;
  submittedAt?: number;
}

export interface FinalizeResult {
  room: Room;
  commitRef: string;
}

function generateRoomId(): string {
  const id =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return id.replace(/-/g, "").slice(0, 8);
}

export class GameEngine {
  constructor(
    private readonly adapter: MagicBlockAdapter,
    private readonly feed: PriceFeed,
  ) {}

  async createRoom(input: CreateRoomInput): Promise<Room> {
    return this.adapter.createRoomState({
      id: generateRoomId(),
      kind: input.kind ?? "room",
      creator: input.creator,
      market: input.market ?? "SOL/USD",
      entryFeeLamports: input.entryFeeLamports,
      maxPlayers: input.maxPlayers ?? 2,
      totalRounds: input.totalRounds,
      roundDurationSeconds: input.roundDurationSeconds,
      startsAt: input.startsAt,
    });
  }

  async joinRoom(
    roomId: string,
    player: string,
    displayName?: string,
  ): Promise<Room> {
    return this.adapter.joinRoomState(roomId, player, displayName);
  }

  /** Begin the next round, sampling the current price as the start price. */
  async startNextRound(roomId: string): Promise<Round | null> {
    const room = this.adapter.getRoom(roomId);
    if (!room) throw new Error(`Room not found: ${roomId}`);
    if (room.rounds.length >= room.totalRounds) return null;
    return this.adapter.startRound(roomId, this.feed.current());
  }

  async submitPrediction(input: SubmitInput): Promise<void> {
    await this.adapter.submitPrediction({
      roomId: input.roomId,
      player: input.player,
      direction: input.direction,
      confidence: input.confidence,
      submittedAt: input.submittedAt ?? Date.now(),
    });
  }

  async lockPrediction(roomId: string, player: string): Promise<void> {
    await this.adapter.lockPrediction(roomId, player);
  }

  /**
   * Resolve the active round: classify the move, score every prediction with
   * the pure scoring function, then persist round + player-score updates.
   *
   * @param endPrice optional override; defaults to the live feed price. Tests
   *                 pass an explicit value for determinism.
   */
  async resolveCurrentRound(roomId: string, endPrice?: number): Promise<Round> {
    const room = this.adapter.getRoom(roomId);
    if (!room) throw new Error(`Room not found: ${roomId}`);
    const round = room.rounds[room.currentRoundIndex];
    if (!round) throw new Error("No round to resolve");

    const finalPrice = endPrice ?? this.feed.current();

    const scored: ScoredPrediction[] = [];
    const newStreaks: Record<string, number> = {};

    for (const prediction of round.predictions) {
      const player = room.players[prediction.player];
      const currentStreak = player?.streak ?? 0;
      const result = calculateRoundScore({
        direction: prediction.direction,
        confidence: prediction.confidence,
        submittedAt: prediction.submittedAt,
        roundStartedAt: round.startedAt,
        startPrice: round.startPrice,
        endPrice: finalPrice,
        currentStreak,
      });
      scored.push({
        player: prediction.player,
        scoreDelta: result.scoreDelta,
        correct: result.correct,
      });
      newStreaks[prediction.player] = result.correct ? currentStreak + 1 : 0;
    }

    const resolved = await this.adapter.resolveRound(roomId, finalPrice, scored);
    for (const s of scored) {
      await this.adapter.updateScore(
        roomId,
        s.player,
        s.scoreDelta,
        newStreaks[s.player],
      );
    }
    return resolved;
  }

  /** True once every round has been played and resolved. */
  isMatchOver(roomId: string): boolean {
    const room = this.adapter.getRoom(roomId);
    if (!room) return false;
    const last = room.rounds[room.rounds.length - 1];
    return (
      room.rounds.length >= room.totalRounds && last?.status === "resolved"
    );
  }

  /** Determine the winner from final scores and commit the result. */
  async finalizeMatch(roomId: string): Promise<FinalizeResult> {
    const room = this.adapter.getRoom(roomId);
    if (!room) throw new Error(`Room not found: ${roomId}`);

    const { winner, isDraw } = decideWinner(room);
    const finalized = await this.adapter.finalizeRoom(roomId, winner, isDraw);
    const commitRef = await this.adapter.commitFinalResult(roomId);
    return { room: finalized, commitRef };
  }
}

export function decideWinner(room: Room): {
  winner?: string;
  isDraw: boolean;
} {
  const wallets = Object.keys(room.players);
  if (wallets.length === 0) return { isDraw: true };
  let best: string | undefined;
  let bestScore = -Infinity;
  let tie = false;
  for (const wallet of wallets) {
    const score = room.players[wallet].score;
    if (score > bestScore) {
      bestScore = score;
      best = wallet;
      tie = false;
    } else if (score === bestScore) {
      tie = true;
    }
  }
  return tie ? { isDraw: true } : { winner: best, isDraw: false };
}
