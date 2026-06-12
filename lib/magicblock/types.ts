/**
 * MagicBlock real-time game-state layer abstraction.
 *
 * In production these methods would delegate room/round/prediction state to a
 * MagicBlock Ephemeral Rollup (ER): `createRoomState` would delegate the room
 * PDA to the ER, mutations would run as cheap ER transactions, and
 * `commitFinalResult` would commit the final state back to Solana base layer
 * for settlement. For the MVP we ship a local in-memory implementation behind
 * this exact interface so the rest of the app is already wired for it.
 */

import type {
  Confidence,
  Direction,
  Market,
  Room,
  RoomKind,
  Round,
} from "@/lib/game/types";

export interface CreateRoomParams {
  id: string;
  kind: RoomKind;
  creator: string;
  market: Market;
  entryFeeLamports: number;
  maxPlayers: number;
  totalRounds: number;
  roundDurationSeconds: number;
  /** Tournament only: epoch ms at which play begins. */
  startsAt?: number;
}

export interface SubmitPredictionParams {
  roomId: string;
  player: string;
  direction: Direction;
  confidence: Confidence;
  submittedAt: number;
}

/** Per-prediction outcome produced by the engine's pure scoring pass. */
export interface ScoredPrediction {
  player: string;
  scoreDelta: number;
  correct: boolean;
}

export interface MagicBlockAdapter {
  // --- room lifecycle ---
  createRoomState(params: CreateRoomParams): Promise<Room>;
  joinRoomState(
    roomId: string,
    player: string,
    displayName?: string,
  ): Promise<Room>;
  finalizeRoom(roomId: string, winner?: string, isDraw?: boolean): Promise<Room>;
  /** Commit the final, scored room state back to the base layer. */
  commitFinalResult(roomId: string): Promise<string>;

  // --- round lifecycle ---
  startRound(roomId: string, startPrice: number): Promise<Round>;
  submitPrediction(params: SubmitPredictionParams): Promise<void>;
  lockPrediction(roomId: string, player: string): Promise<void>;
  resolveRound(
    roomId: string,
    endPrice: number,
    scored: ScoredPrediction[],
  ): Promise<Round>;
  updateScore(
    roomId: string,
    player: string,
    scoreDelta: number,
    streak: number,
  ): Promise<void>;

  // --- reads / subscriptions ---
  getRoom(roomId: string): Room | undefined;
  listRooms(): Room[];
  subscribe(roomId: string, cb: (room: Room) => void): () => void;
}
