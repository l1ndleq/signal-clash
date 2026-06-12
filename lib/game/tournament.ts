/**
 * Pure tournament settlement logic.
 *
 * Two responsibilities, both side-effect-free and unit-tested:
 *   - rank a field of players by score (deterministic tie-break by wallet)
 *   - split the prize pool across the paid places after the platform rake
 *
 * The math is intentionally lossless: the rake is floored and the final paid
 * place absorbs any rounding remainder, so the sum of (rake + all payouts)
 * always equals the original pool exactly — no lamports are created or lost.
 */

import {
  RAKE_BPS,
  TOURNAMENT_PRIZE_SPLIT_BPS,
} from "@/lib/config";
import type { Room, TournamentStanding } from "./types";

const BPS_DENOM = 10_000;

/**
 * Prize split (basis points of the post-rake pot) for a field of `maxPlayers`,
 * mirroring the on-chain `signal_clash_vault` program EXACTLY:
 *   field < 4   -> [100]            winner-take-all
 *   field 4..5  -> [70, 30]
 *   field >= 6  -> [50, 30, 20]     tournament split
 */
export function splitBpsForField(maxPlayers: number): readonly number[] {
  if (maxPlayers < 4) return [10_000];
  if (maxPlayers < 6) return [7_000, 3_000];
  return [5_000, 3_000, 2_000];
}

/** Number of paid places for a field of `maxPlayers`. */
export function paidPlacesForField(maxPlayers: number): number {
  return splitBpsForField(maxPlayers).length;
}

export interface PrizeBreakdown {
  rakeLamports: number;
  netPoolLamports: number;
  /** Prize per paid place, index 0 = 1st. */
  payouts: number[];
}

/**
 * Split `prizePoolLamports` across the paid places.
 *
 * @param rakeBps   platform cut in basis points (default 3% from config)
 * @param splitBps  share per place; must sum to 10000 (default 50/30/20)
 */
export function computePrizeBreakdown(
  prizePoolLamports: number,
  rakeBps: number = RAKE_BPS,
  splitBps: readonly number[] = TOURNAMENT_PRIZE_SPLIT_BPS,
): PrizeBreakdown {
  const pool = Math.max(0, Math.floor(prizePoolLamports));
  const rakeLamports = Math.floor((pool * rakeBps) / BPS_DENOM);
  const netPoolLamports = pool - rakeLamports;

  const payouts: number[] = [];
  let distributed = 0;
  splitBps.forEach((bps, i) => {
    const isLast = i === splitBps.length - 1;
    // The last paid place absorbs the rounding remainder so nothing is lost.
    const amount = isLast
      ? netPoolLamports - distributed
      : Math.floor((netPoolLamports * bps) / BPS_DENOM);
    payouts.push(amount);
    distributed += amount;
  });

  return { rakeLamports, netPoolLamports, payouts };
}

/**
 * Rank every player in a room by score, highest first. Ties are broken
 * deterministically by wallet string so the ordering is stable across renders
 * and reproducible for settlement.
 */
export function rankStandings(room: Room): TournamentStanding[] {
  const { payouts } = computePrizeBreakdown(
    room.prizePoolLamports,
    RAKE_BPS,
    splitBpsForField(room.maxPlayers),
  );

  return Object.values(room.players)
    .slice()
    .sort((a, b) => b.score - a.score || a.wallet.localeCompare(b.wallet))
    .map((p, index) => ({
      rank: index + 1,
      wallet: p.wallet,
      displayName: p.displayName,
      score: p.score,
      payoutLamports: payouts[index] ?? 0,
    }));
}

/** Convenience: a single wallet's standing, or null if not in the field. */
export function standingFor(
  room: Room,
  wallet: string,
): TournamentStanding | null {
  return rankStandings(room).find((s) => s.wallet === wallet) ?? null;
}

/** Number of paid places (length of the configured split). */
export const PAID_PLACES = TOURNAMENT_PRIZE_SPLIT_BPS.length;
