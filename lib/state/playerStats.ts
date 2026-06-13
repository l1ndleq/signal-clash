/**
 * Client-side player history + stats persistence.
 *
 * There is no backend in this devnet MVP, so finished matches are stored in
 * localStorage keyed by wallet. A small set of demo players is seeded so the
 * leaderboard and profiles are populated before you play. Real matches you
 * finish are merged on top of (and override) the seeds for your wallet.
 */

import { shortAddress } from "@/lib/solana/client";

const STORAGE_KEY = "signal-clash:history:v1";

export type MatchResult = "win" | "loss" | "draw";

export interface MatchRecord {
  id: string; // unique per match (room id) — used to de-dupe
  ts: number; // finished, epoch ms
  market: string;
  kind: "room" | "tournament";
  result: MatchResult;
  rank: number; // 1-based finishing place
  field: number; // number of players
  myScore: number;
  opponentName: string;
  opponentScore: number;
  rounds: number;
  correct: number; // correct predictions
  total: number; // total predictions
  bestStreak: number;
}

export interface PlayerStats {
  wallet: string;
  matches: number;
  wins: number;
  losses: number;
  draws: number;
  winRate: number; // 0..1
  totalScore: number;
  bestStreak: number;
  accuracy: number; // 0..1
  lastPlayed: number; // epoch ms
}

// ---- Demo seed players (leaderboard is never empty) -----------------------

function rec(p: Partial<MatchRecord> & { id: string; result: MatchResult }): MatchRecord {
  return {
    ts: Date.now() - 86_400_000,
    market: "SOL/USD",
    kind: "room",
    rank: p.result === "win" ? 1 : 2,
    field: 2,
    myScore: 0,
    opponentName: "Opponent",
    opponentScore: 0,
    rounds: 5,
    correct: 0,
    total: 5,
    bestStreak: 0,
    ...p,
  };
}

const SEED_HISTORY: Record<string, MatchRecord[]> = {
  SoLSignaL11111111111111111111111111111111: [
    rec({ id: "seed-sig-1", result: "win", myScore: 720, opponentScore: 410, correct: 5, bestStreak: 5, ts: Date.now() - 3_600_000 }),
    rec({ id: "seed-sig-2", result: "win", myScore: 640, opponentScore: 520, correct: 4, bestStreak: 3, ts: Date.now() - 7_200_000 }),
    rec({ id: "seed-sig-3", result: "loss", myScore: 380, opponentScore: 560, correct: 2, bestStreak: 1, ts: Date.now() - 90_000_000 }),
    rec({ id: "seed-sig-4", result: "win", myScore: 690, opponentScore: 300, correct: 5, bestStreak: 4, market: "BTC/USD", ts: Date.now() - 100_000_000 }),
  ],
  ChAdEthPredic22222222222222222222222222222: [
    rec({ id: "seed-chad-1", result: "win", myScore: 660, opponentScore: 450, correct: 4, bestStreak: 4, market: "ETH/USD", ts: Date.now() - 5_400_000 }),
    rec({ id: "seed-chad-2", result: "loss", myScore: 420, opponentScore: 610, correct: 3, bestStreak: 2, ts: Date.now() - 11_000_000 }),
    rec({ id: "seed-chad-3", result: "draw", myScore: 500, opponentScore: 500, correct: 3, bestStreak: 2, ts: Date.now() - 95_000_000 }),
  ],
  DiamondHands3333333333333333333333333333333: [
    rec({ id: "seed-dia-1", result: "loss", myScore: 350, opponentScore: 580, correct: 2, bestStreak: 1, ts: Date.now() - 6_000_000 }),
    rec({ id: "seed-dia-2", result: "win", myScore: 600, opponentScore: 540, correct: 4, bestStreak: 3, market: "BTC/USD", ts: Date.now() - 20_000_000 }),
  ],
  PaperHands44444444444444444444444444444444: [
    rec({ id: "seed-paper-1", result: "loss", myScore: 240, opponentScore: 620, correct: 1, bestStreak: 1, ts: Date.now() - 8_000_000 }),
    rec({ id: "seed-paper-2", result: "loss", myScore: 300, opponentScore: 510, correct: 2, bestStreak: 1, ts: Date.now() - 30_000_000 }),
  ],
};

// ---- Storage --------------------------------------------------------------

function readStored(): Record<string, MatchRecord[]> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as Record<string, MatchRecord[]>) : {};
  } catch {
    return {};
  }
}

function writeStored(data: Record<string, MatchRecord[]>): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // ignore quota / serialization errors — history is best-effort
  }
}

/** Seeds merged with stored data (stored wins for the same wallet). */
function loadAll(): Record<string, MatchRecord[]> {
  return { ...SEED_HISTORY, ...readStored() };
}

/** Append a finished match for a wallet (de-duped by match id). */
export function recordMatch(wallet: string, record: MatchRecord): void {
  if (!wallet) return;
  const stored = readStored();
  const existing = stored[wallet] ?? SEED_HISTORY[wallet] ?? [];
  if (existing.some((m) => m.id === record.id)) return;
  stored[wallet] = [record, ...existing];
  writeStored(stored);
  invalidate();
}

// ---- External store (for useSyncExternalStore: SSR-safe, no setState) ------

type Listener = () => void;
const listeners = new Set<Listener>();
let leaderboardCache: PlayerStats[] | null = null;
const historyCache = new Map<string, MatchRecord[]>();

function invalidate(): void {
  leaderboardCache = null;
  historyCache.clear();
  listeners.forEach((l) => l());
}

export function subscribePlayerStats(cb: Listener): () => void {
  listeners.add(cb);
  if (typeof window !== "undefined") window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    if (typeof window !== "undefined") window.removeEventListener("storage", cb);
  };
}

/** Stable cached snapshots so useSyncExternalStore doesn't loop. */
export function leaderboardSnapshot(): PlayerStats[] {
  if (!leaderboardCache) leaderboardCache = getLeaderboard();
  return leaderboardCache;
}

export function historySnapshot(wallet: string): MatchRecord[] {
  let cached = historyCache.get(wallet);
  if (!cached) {
    cached = getHistory(wallet);
    historyCache.set(wallet, cached);
  }
  return cached;
}

// Server snapshots are stable constants (seeds only — deterministic, no window).
const SERVER_LEADERBOARD = Object.keys(SEED_HISTORY)
  .map((w) => computeStats(w, SEED_HISTORY[w]))
  .sort((a, b) => b.wins - a.wins || b.totalScore - a.totalScore);

export function leaderboardServerSnapshot(): PlayerStats[] {
  return SERVER_LEADERBOARD;
}

const EMPTY_HISTORY: MatchRecord[] = [];
export function historyServerSnapshot(wallet: string): MatchRecord[] {
  return SEED_HISTORY[wallet] ?? EMPTY_HISTORY;
}

/** A wallet's full match history, newest first. */
export function getHistory(wallet: string): MatchRecord[] {
  const all = loadAll();
  return [...(all[wallet] ?? [])].sort((a, b) => b.ts - a.ts);
}

export function computeStats(wallet: string, history?: MatchRecord[]): PlayerStats {
  const h = history ?? getHistory(wallet);
  const wins = h.filter((m) => m.result === "win").length;
  const losses = h.filter((m) => m.result === "loss").length;
  const draws = h.filter((m) => m.result === "draw").length;
  const totalScore = h.reduce((s, m) => s + m.myScore, 0);
  const bestStreak = h.reduce((s, m) => Math.max(s, m.bestStreak), 0);
  const correct = h.reduce((s, m) => s + m.correct, 0);
  const total = h.reduce((s, m) => s + m.total, 0);
  return {
    wallet,
    matches: h.length,
    wins,
    losses,
    draws,
    winRate: h.length ? wins / h.length : 0,
    totalScore,
    bestStreak,
    accuracy: total ? correct / total : 0,
    lastPlayed: h[0]?.ts ?? 0,
  };
}

/** Stats for every known player (seeds + real), ranked for the leaderboard. */
export function getLeaderboard(): PlayerStats[] {
  const all = loadAll();
  return Object.keys(all)
    .map((wallet) => computeStats(wallet, all[wallet]))
    .filter((s) => s.matches > 0)
    .sort(
      (a, b) =>
        b.wins - a.wins ||
        b.totalScore - a.totalScore ||
        b.winRate - a.winRate,
    );
}

/** Human label for a wallet (seed players get readable names). */
export function displayNameFor(wallet: string): string {
  const SEED_NAMES: Record<string, string> = {
    SoLSignaL11111111111111111111111111111111: "signalmaxi.sol",
    ChAdEthPredic22222222222222222222222222222: "chad.eth",
    DiamondHands3333333333333333333333333333333: "diamondhands",
    PaperHands44444444444444444444444444444444: "paperhands",
  };
  return SEED_NAMES[wallet] ?? shortAddress(wallet, 4);
}
