/**
 * Mock SOL/USD price feed.
 *
 * Implements a small random-walk so the demo shows a live-moving price. The
 * `PriceFeed` interface is the seam where a real oracle (e.g. Pyth or a
 * MagicBlock-streamed feed) would be plugged in without touching the engine.
 */

export interface PriceFeed {
  /** Current price without advancing the simulation. */
  current(): number;
  /** Advance one tick and return the new price. */
  next(): number;
}

export interface MockPriceFeedOptions {
  initial?: number;
  /** Per-tick volatility as a fraction of price (e.g. 0.004 = 0.4%). */
  volatility?: number;
}

export class MockPriceFeed implements PriceFeed {
  private price: number;
  private readonly volatility: number;

  constructor({ initial = 150, volatility = 0.004 }: MockPriceFeedOptions = {}) {
    this.price = initial;
    this.volatility = volatility;
  }

  current(): number {
    return round2(this.price);
  }

  next(): number {
    const drift = (Math.random() - 0.5) * 2 * this.volatility;
    this.price = Math.max(0.01, this.price * (1 + drift));
    return this.current();
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}
