/**
 * Mock opponent ("Signal Bot") used for the solo demo.
 *
 * The bot implements the same prediction surface a remote human would use, so
 * swapping it for a networked opponent later means feeding real submissions
 * into the engine instead of generated ones — no engine changes required.
 */

import type { Confidence, Direction } from "./types";

const DIRECTIONS: Direction[] = ["UP", "DOWN", "FLAT"];

export interface BotMove {
  direction: Direction;
  confidence: Confidence;
  /** ms after round start at which the bot "submits". */
  delayMs: number;
}

/**
 * Produce the bot's move for a round. Slightly biased toward directional calls
 * and mid-range confidence so matches feel competitive rather than random.
 */
export function decideBotMove(): BotMove {
  const roll = Math.random();
  const direction: Direction =
    roll < 0.42 ? "UP" : roll < 0.84 ? "DOWN" : "FLAT";
  const confidence = (1 + Math.floor(Math.random() * 3)) as Confidence;
  // Submit somewhere in the first 6-26s to occasionally grab the timing bonus.
  const delayMs = 6000 + Math.floor(Math.random() * 20000);
  return { direction, confidence, delayMs };
}

export const BOT_WALLET = "SignalBot1111111111111111111111111111111111";
export const BOT_NAME = "Signal Bot";

const BOT_NAMES = [
  "Signal Bot",
  "Vega",
  "Nova",
  "Pulse",
  "Echo",
  "Flux",
  "Orbit",
];

/**
 * A distinct bot participant for seat `index`. The wallet is just a unique
 * client-side id (bots never sign on-chain), and the name is for the UI.
 */
export function makeBotSeat(index: number): { wallet: string; name: string } {
  const name =
    index < BOT_NAMES.length ? BOT_NAMES[index] : `Bot ${index + 1}`;
  const wallet = `SignalBot${index}`.padEnd(44, "0");
  return { wallet, name };
}

export { DIRECTIONS };
