/**
 * Client-side player history + stats persistence.
 *
 * Finished matches are stored in localStorage keyed by wallet — real games
 * only, no demo seeding. The leaderboard and profiles are built from these.
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

/** All stored history (real matches only — no demo seeding). */
function loadAll(): Record<string, MatchRecord[]> {
  return readStored();
}

/** Append a finished match for a wallet (de-duped by match id). */
export function recordMatch(wallet: string, record: MatchRecord): void {
  if (!wallet) return;
  const stored = readStored();
  const existing = stored[wallet] ?? [];
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

// Server snapshots are stable empty constants (no localStorage during SSR).
const EMPTY_LEADERBOARD: PlayerStats[] = [];
export function leaderboardServerSnapshot(): PlayerStats[] {
  return EMPTY_LEADERBOARD;
}

const EMPTY_HISTORY: MatchRecord[] = [];
export function historyServerSnapshot(): MatchRecord[] {
  return EMPTY_HISTORY;
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

/** Stats for every player with a recorded match, ranked for the leaderboard. */
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

/** Human label for a wallet (short base58). */
export function displayNameFor(wallet: string): string {
  return shortAddress(wallet, 4);
}
