/**
 * Real price feed backed by Binance public market data.
 *
 *  - REST `ticker/price` seeds the initial quote.
 *  - WebSocket `<symbol>@miniTicker` streams ~1s updates used for scoring.
 *
 * Implements the same `PriceFeed` interface as the mock so the engine and match
 * controller are source-agnostic (the Pyth/MagicBlock-streamed feed would slot
 * in here too).
 *
 * Resilience: if Binance is unreachable (e.g. geo-blocked without a VPN) the
 * feed is not "live", and `next()` falls back to a small synthetic random walk
 * so a match still resolves with real movement-like behaviour. As soon as a
 * real quote arrives, it takes over.
 */

import type { PriceFeed } from "./mockPriceFeed";

const REST_BASE = "https://api.binance.com/api/v3/ticker/price";
const WS_BASE = "wss://stream.binance.com:9443/ws";
const FALLBACK_VOLATILITY = 0.0015;

export class BinancePriceFeed implements PriceFeed {
  private price: number;
  private live = false;
  private ws?: WebSocket;
  private closed = false;

  constructor(
    private readonly symbol: string, // e.g. "SOLUSDT"
    fallbackPrice: number,
  ) {
    this.price = fallbackPrice;
  }

  /** Whether real Binance quotes are currently streaming. */
  get isLive(): boolean {
    return this.live;
  }

  current(): number {
    return this.price;
  }

  next(): number {
    // When real quotes are flowing, `price` is updated by the WS handler and we
    // simply report it. Otherwise nudge it so rounds still resolve.
    if (!this.live) {
      const drift = (Math.random() - 0.5) * 2 * FALLBACK_VOLATILITY;
      this.price = Math.max(1e-8, this.price * (1 + drift));
    }
    return this.price;
  }

  async connect(): Promise<void> {
    await this.seedFromRest();
    this.openSocket();
  }

  disconnect(): void {
    this.closed = true;
    this.ws?.close();
    this.ws = undefined;
  }

  private async seedFromRest(): Promise<void> {
    try {
      const res = await fetch(`${REST_BASE}?symbol=${this.symbol}`);
      const json = (await res.json()) as { price?: string };
      const parsed = json.price ? Number.parseFloat(json.price) : NaN;
      if (Number.isFinite(parsed) && parsed > 0) this.price = parsed;
    } catch {
      // Keep the fallback price; the socket may still connect later.
    }
  }

  private openSocket(): void {
    if (typeof WebSocket === "undefined" || this.closed) return;
    try {
      const ws = new WebSocket(
        `${WS_BASE}/${this.symbol.toLowerCase()}@miniTicker`,
      );
      this.ws = ws;
      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data as string) as { c?: string };
          const parsed = data.c ? Number.parseFloat(data.c) : NaN;
          if (Number.isFinite(parsed) && parsed > 0) {
            this.price = parsed;
            this.live = true;
          }
        } catch {
          /* ignore malformed frames */
        }
      };
      ws.onclose = () => {
        this.live = false;
      };
      ws.onerror = () => {
        this.live = false;
      };
    } catch {
      this.live = false;
    }
  }
}
