/**
 * Central tunable constants for Signal Clash.
 *
 * Keeping these in one place lets the game engine, scoring function, and UI
 * stay in sync, and makes the rules easy to audit for the hackathon demo.
 */

import { LAMPORTS_PER_SOL } from "@solana/web3.js";

// ---- Match shape ----
export const TOTAL_ROUNDS = 5;
export const ROUND_DURATION_SECONDS = 30;
/** Round-duration presets (seconds) offered when creating a room/tournament. */
export const ROUND_DURATION_OPTIONS = [10, 20, 30] as const;

// ---- Price resolution ----
/** Minimum move (as a fraction) for a round to count as UP or DOWN. 0.05%. */
export const PRICE_THRESHOLD_PCT = 0.0005;

// ---- Base scoring ----
export const SCORE_CORRECT_DIRECTIONAL = 100; // correct UP / DOWN
export const SCORE_CORRECT_FLAT = 80; // correct FLAT
export const SCORE_WRONG_PENALTY = -60; // any wrong call

// ---- Timing bonus (only when correct) ----
export const TIMING_FAST_SECONDS = 10; // submit within 10s
export const TIMING_FAST_BONUS = 30;
export const TIMING_MED_SECONDS = 30; // submit within 30s
export const TIMING_MED_BONUS = 15;

// ---- Streak bonus (only when correct), evaluated on streak AFTER the round ----
export const STREAK_BIG_THRESHOLD = 5;
export const STREAK_BIG_BONUS = 60;
export const STREAK_SMALL_THRESHOLD = 3;
export const STREAK_SMALL_BONUS = 25;

// ---- Tournaments ----
/** Prize split for the top 3 finishers, in basis points (50% / 30% / 20%). */
export const TOURNAMENT_PRIZE_SPLIT_BPS = [5000, 3000, 2000] as const;
/** Round-count presets a tournament organizer can pick. */
export const TOURNAMENT_ROUND_OPTIONS = [5, 7, 10] as const;
/** Field-size presets (number of seats the bracket fills to). */
export const TOURNAMENT_FIELD_OPTIONS = [8, 16, 32] as const;
export const DEFAULT_TOURNAMENT_FIELD = 16;
/** "Starts in" presets, in seconds, measured from creation time. */
export const TOURNAMENT_START_OPTIONS_SEC = [60, 180, 300] as const;
export const DEFAULT_TOURNAMENT_START_SEC = 180;

/**
 * Wallets allowed to CREATE tournaments (organizer-only). Everyone else sees a
 * "tournaments coming soon" state and can only create quick-match rooms.
 *
 * Set via NEXT_PUBLIC_ADMIN_WALLET (comma-separated for multiple), or hardcode
 * base58 addresses in the fallback array below.
 */
export const ADMIN_WALLETS: string[] = (
  process.env.NEXT_PUBLIC_ADMIN_WALLET ?? ""
)
  .split(",")
  .map((w) => w.trim())
  .filter(Boolean)
  .concat([
    // Organizer wallet (devnet).
    "2ZZupu8DUhmsbbaeFdnqEzqehfHxe2x2X8WYjgvdRMge",
  ]);

export function isAdminWallet(wallet: string | null | undefined): boolean {
  return !!wallet && ADMIN_WALLETS.includes(wallet);
}

// ---- Solana / settlement ----
export const SOLANA_NETWORK = "devnet" as const;
export const SOLANA_RPC_ENDPOINT =
  process.env.NEXT_PUBLIC_SOLANA_RPC ?? "https://api.devnet.solana.com";

/** Entry-fee presets offered in the create-room form, in SOL. */
export const ENTRY_FEE_PRESETS_SOL = [0.01, 0.05, 0.1] as const;

/** Bounds for a custom entry fee (SOL). */
export const MIN_ENTRY_FEE_SOL = 0.001;
export const MAX_ENTRY_FEE_SOL = 5;

/** Lobby size options (players per arena). */
export const MAX_PLAYERS_OPTIONS = [2, 3, 4, 6] as const;
export const DEFAULT_MAX_PLAYERS = 2;

// ---- On-chain vault (Anchor program) ----
/** Rake taken from the pot on settle, in basis points. 300 = 3%. */
export const RAKE_BPS = 300;
/** Treasury that receives the rake (devnet keypair; secret in treasury-devnet.json). */
export const TREASURY_PUBKEY = "8UqyRdiYwVgb89AHPhQDEKUvs8FVQyfnsPKMJnNmUTrn";
/** Deployed vault program id (devnet, L1 settlement). */
export const VAULT_PROGRAM_ID =
  process.env.NEXT_PUBLIC_VAULT_PROGRAM_ID ??
  "7fgxvrdpcYMhqLZP9E1mFDQFmffE7ifALVdUm8owG5Lv";

/** Deployed match program id (devnet, Ephemeral Rollups game state). */
export const MATCH_PROGRAM_ID =
  process.env.NEXT_PUBLIC_MATCH_PROGRAM_ID ??
  "EBVEm8hADVP2dmftFE3FWcdMjg7MWpfk7ssxeNAiawYQ";

/**
 * MagicBlock devnet endpoints. The Magic Router auto-routes each transaction to
 * the base layer or the ephemeral rollup based on whether its accounts are
 * delegated, so the client can use a single connection.
 */
export const ER_ROUTER_ENDPOINT =
  process.env.NEXT_PUBLIC_ER_ROUTER ?? "https://devnet-router.magicblock.app";

export const lamports = (sol: number): number => Math.round(sol * LAMPORTS_PER_SOL);
export const solFromLamports = (lp: number): number => lp / LAMPORTS_PER_SOL;
