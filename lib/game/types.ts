/**
 * Core domain types for Signal Clash.
 *
 * These types are intentionally free of any React / Solana / MagicBlock
 * imports so the game logic stays portable and unit-testable.
 */

export type Direction = "UP" | "DOWN" | "FLAT";
export type Confidence = 1 | 2 | 3;
export type Market = "SOL/USD" | "BTC/USD" | "ETH/USD";

export type RoomStatus = "waiting" | "active" | "finished";
export type RoundStatus = "waiting" | "active" | "resolved";

/** A head-to-head room vs. a scheduled, many-player tournament. */
export type RoomKind = "room" | "tournament";

export interface Prediction {
  player: string; // wallet address
  direction: Direction;
  confidence: Confidence;
  submittedAt: number; // ms epoch
  locked: boolean;
  scoreDelta?: number;
  correct?: boolean;
}

export interface Round {
  index: number;
  startPrice: number;
  endPrice?: number;
  startedAt: number; // ms epoch
  durationSeconds: number;
  status: RoundStatus;
  predictions: Prediction[];
}

export interface Player {
  wallet: string;
  displayName?: string;
  score: number;
  streak: number;
  predictions: Prediction[];
  /** True once this player has paid the entry fee on-chain. */
  deposited?: boolean;
}

export interface Room {
  id: string;
  /** "room" (1v1 quick match) or "tournament" (scheduled, many players). */
  kind: RoomKind;
  creator: string; // wallet address
  opponent?: string; // wallet address
  market: Market;
  entryFeeLamports: number;
  prizePoolLamports: number;
  status: RoomStatus;
  rounds: Round[];
  currentRoundIndex: number;
  winner?: string; // wallet address; undefined while unresolved or on a draw
  /** True once the match has been scored and a winner (or draw) is known. */
  isDraw?: boolean;
  players: Record<string, Player>; // keyed by wallet
  maxPlayers: number; // lobby capacity (2..N); for tournaments this is the field size
  totalRounds: number;
  roundDurationSeconds: number;
  createdAt: number;
  /** Tournament only: epoch ms at which registration closes and play begins. */
  startsAt?: number;
}

/** One finisher's place and prize in a settled tournament. */
export interface TournamentStanding {
  rank: number; // 1-based
  wallet: string;
  displayName?: string;
  score: number;
  /** Prize in lamports (0 outside the paid places). */
  payoutLamports: number;
}

/** Result returned by the pure scoring function. */
export interface ScoreResult {
  scoreDelta: number;
  correct: boolean;
  actualDirection: Direction;
  timingBonus: number;
  streakBonus: number;
}

export interface ScoreInput {
  direction: Direction;
  confidence: Confidence;
  submittedAt: number; // ms epoch
  roundStartedAt: number; // ms epoch
  startPrice: number;
  endPrice: number;
  /** Player's correct-streak BEFORE this round is applied. */
  currentStreak: number;
}
