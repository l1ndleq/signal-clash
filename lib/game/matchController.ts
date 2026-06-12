/**
 * MatchController — drives a single 1v1 match end-to-end.
 *
 * Owns the live price ticker, per-round timers, and the bot opponent, calling
 * the GameEngine for all state/scoring. It exposes a subscribe/getView surface
 * so a React hook can render it without holding any game logic itself.
 *
 * Opponent model for the MVP: the seat that is not the connected wallet is
 * driven by the local bot. Because submissions flow through the engine's
 * `submitPrediction`/`lockPrediction`, swapping the bot for a networked human
 * (real online PvP) requires no engine changes — only a different source of
 * those calls.
 */

import { GameEngine } from "./engine";
import { BinancePriceFeed } from "./binancePriceFeed";
import { MARKETS } from "./markets";
import type { Direction, Market, Room } from "./types";
import type { MagicBlockAdapter } from "@/lib/magicblock/types";
import { decideBotMove, makeBotSeat } from "./bot";

export type MatchPhase =
  | "ready"
  | "countdown"
  | "round-active"
  | "round-resolved"
  | "finished";

export interface MatchView {
  room: Room | null;
  myWallet: string;
  opponentWallet: string;
  market: Market;
  livePrice: number;
  /** True when real Binance quotes are streaming (vs. synthetic fallback). */
  feedLive: boolean;
  roundEndsAt: number | null; // epoch ms, or null when no active timer
  phase: MatchPhase;
  /** 3, 2, 1 during countdown phase — undefined otherwise. */
  countdownValue?: number;
  commitRef?: string;
}

const RESULT_PAUSE_MS = 1500;
const COUNTDOWN_STEPS = [3, 2, 1];

/**
 * Optional on-chain mirror of this match (a MagicBlock Ephemeral Rollup
 * session). Structural so `lib/game` stays free of Solana imports; the concrete
 * impl is `MatchErSession`. Every call is best-effort — the controller never
 * blocks gameplay on it.
 */
export interface MatchMirror {
  start(): Promise<unknown>;
  submitPrediction(direction: Direction, confidence: number): Promise<unknown>;
  resolveRound(scoreDelta: number, newStreak: number): Promise<unknown>;
  finish(): Promise<unknown>;
}

export class MatchController {
  private engine: GameEngine;
  private feed: BinancePriceFeed;
  private market: Market;
  private subs = new Set<(v: MatchView) => void>();

  private priceTimer?: ReturnType<typeof setInterval>;
  private roundTimer?: ReturnType<typeof setTimeout>;
  private botTimers: ReturnType<typeof setTimeout>[] = [];
  private pauseTimer?: ReturnType<typeof setTimeout>;
  private countdownTimer?: ReturnType<typeof setTimeout>;
  private destroyed = false;
  private resolving = false;
  private started = false;

  private phase: MatchPhase = "ready";
  private countdownValue?: number;
  private roundEndsAt: number | null = null;
  private livePrice: number;
  private commitRef?: string;

  constructor(
    private readonly adapter: MagicBlockAdapter,
    private readonly roomId: string,
    private readonly myWallet: string,
    private readonly mirror?: MatchMirror,
  ) {
    this.market = adapter.getRoom(roomId)?.market ?? "SOL/USD";
    const cfg = MARKETS[this.market];
    this.feed = new BinancePriceFeed(cfg.binanceSymbol, cfg.fallbackPrice);
    this.engine = new GameEngine(adapter, this.feed);
    this.livePrice = this.feed.current();
  }

  subscribe(cb: (v: MatchView) => void): () => void {
    this.subs.add(cb);
    cb(this.getView());
    return () => this.subs.delete(cb);
  }

  getView(): MatchView {
    const room = this.adapter.getRoom(this.roomId) ?? null;
    return {
      room,
      myWallet: this.myWallet,
      opponentWallet: this.botSeats(room)[0] ?? "",
      market: room?.market ?? this.market,
      livePrice: this.livePrice,
      feedLive: this.feed.isLive,
      roundEndsAt: this.roundEndsAt,
      phase: this.phase,
      countdownValue: this.countdownValue,
      commitRef: this.commitRef,
    };
  }

  /**
   * Begin the match. The lobby leader can start at any time — empty seats are
   * filled with bots up to `maxPlayers` so the arena plays at the chosen size.
   * (Real joined humans keep their seats; bots only fill the remainder.)
   */
  async start(): Promise<void> {
    if (this.started) return;
    this.started = true;

    const room = this.adapter.getRoom(this.roomId);
    if (!room) throw new Error("Room not found");

    // Kick off the on-chain mirror (L1 create + delegate) concurrently so its
    // wallet popup / confirmation overlaps the countdown rather than stalling it.
    this.mirrorStep("start", () => this.mirror?.start());

    const seatsToFill = room.maxPlayers - Object.keys(room.players).length;
    for (let i = 0; i < seatsToFill; i++) {
      const bot = makeBotSeat(i);
      await this.engine.joinRoom(this.roomId, bot.wallet, bot.name);
    }

    // Connect the real Binance feed (REST seed + WS stream) before round 1 so
    // the first round's start price is a real quote.
    await this.feed.connect();
    this.livePrice = this.feed.current();

    this.priceTimer = setInterval(() => {
      this.livePrice = this.feed.next();
      this.emit();
    }, 1000);

    this.startCountdown();
  }

  /** Human locks in their prediction for the active round. */
  async lockMyPrediction(
    direction: Room["rounds"][number]["predictions"][number]["direction"],
    confidence: Room["rounds"][number]["predictions"][number]["confidence"],
  ): Promise<void> {
    if (this.phase !== "round-active") return;
    await this.engine.submitPrediction({
      roomId: this.roomId,
      player: this.myWallet,
      direction,
      confidence,
    });
    await this.engine.lockPrediction(this.roomId, this.myWallet);
    this.mirrorStep("submit", () =>
      this.mirror?.submitPrediction(direction, Number(confidence)),
    );
    this.emit();
  }

  destroy(): void {
    this.destroyed = true;
    this.stopTimers();
    this.feed.disconnect();
    this.subs.clear();
  }

  // ---- internals ----

  /** Show 3-2-1 countdown, then kick off the next round. */
  private startCountdown(): void {
    let stepIndex = 0;
    this.countdownValue = COUNTDOWN_STEPS[stepIndex];
    this.phase = "countdown";
    this.emit();

    const tick = () => {
      if (this.destroyed) return;
      stepIndex += 1;
      if (stepIndex >= COUNTDOWN_STEPS.length) {
        this.countdownValue = undefined;
        void this.beginRound();
        return;
      }
      this.countdownValue = COUNTDOWN_STEPS[stepIndex];
      this.emit();
      this.countdownTimer = setTimeout(tick, 900);
    };

    this.countdownTimer = setTimeout(tick, 900);
  }

  /** Every seat that is not the connected wallet (all bot-driven for the demo). */
  private botSeats(room: Room | null): string[] {
    if (!room) return [];
    return Object.keys(room.players).filter((w) => w !== this.myWallet);
  }

  private async beginRound(): Promise<void> {
    const room = this.adapter.getRoom(this.roomId);
    if (!room) return;
    if (room.rounds.length >= room.totalRounds) {
      await this.finalize();
      return;
    }

    await this.engine.startNextRound(this.roomId);
    this.phase = "round-active";
    this.resolving = false;

    const durationMs = room.roundDurationSeconds * 1000;
    this.roundEndsAt = Date.now() + durationMs;

    // Schedule each bot seat's move independently, then the hard deadline.
    this.botTimers = this.botSeats(room).map((seat) => {
      const move = decideBotMove();
      const delay = Math.max(500, Math.min(move.delayMs, durationMs - 500));
      return setTimeout(() => {
        void this.botSubmit(seat, move.direction, move.confidence);
      }, delay);
    });
    this.roundTimer = setTimeout(() => void this.resolveRound(), durationMs);

    this.emit();
  }

  private async botSubmit(
    seat: string,
    direction: ReturnType<typeof decideBotMove>["direction"],
    confidence: ReturnType<typeof decideBotMove>["confidence"],
  ): Promise<void> {
    await this.engine.submitPrediction({
      roomId: this.roomId,
      player: seat,
      direction,
      confidence,
    });
    await this.engine.lockPrediction(this.roomId, seat);
    this.emit();
  }

  private async resolveRound(): Promise<void> {
    if (this.resolving) return;
    this.resolving = true;
    clearTimeout(this.roundTimer);
    this.botTimers.forEach(clearTimeout);

    const room = this.adapter.getRoom(this.roomId);
    if (!room) return;
    const round = room.rounds[room.currentRoundIndex];
    if (!round || round.status !== "active") return;

    // Any seat that never submitted gets a default no-confidence FLAT call.
    const seats = Object.keys(room.players);
    for (const seat of seats) {
      const existing = round.predictions.find((p) => p.player === seat);
      if (!existing) {
        await this.engine.submitPrediction({
          roomId: this.roomId,
          player: seat,
          direction: "FLAT",
          confidence: 1,
        });
      }
      await this.engine.lockPrediction(this.roomId, seat);
    }

    await this.engine.resolveCurrentRound(this.roomId, this.feed.current());

    // Mirror my round outcome onto the ER (off-chain-scored delta + new streak).
    const scored = this.adapter.getRoom(this.roomId);
    const myDelta =
      round.predictions.find((p) => p.player === this.myWallet)?.scoreDelta ?? 0;
    const myStreak = scored?.players[this.myWallet]?.streak ?? 0;
    this.mirrorStep("resolve", () =>
      this.mirror?.resolveRound(myDelta, myStreak),
    );

    this.phase = "round-resolved";
    this.roundEndsAt = null;
    this.emit();

    this.pauseTimer = setTimeout(() => {
      if (this.destroyed) return;
      if (this.engine.isMatchOver(this.roomId)) void this.finalize();
      else this.startCountdown();
    }, RESULT_PAUSE_MS);
  }

  private async finalize(): Promise<void> {
    this.stopTimers();
    const { commitRef } = await this.engine.finalizeMatch(this.roomId);
    this.commitRef = commitRef;
    this.mirrorStep("finish", () => this.mirror?.finish());
    this.phase = "finished";
    this.roundEndsAt = null;
    this.emit();
  }

  /** Run a best-effort on-chain mirror call; log the outcome, never throw. */
  private mirrorStep(
    label: string,
    run: () => Promise<unknown> | undefined,
  ): void {
    const p = run();
    if (!p) return;
    void p
      .then((res) => {
        const r = res as { ok?: boolean; signature?: string; error?: string };
        if (r?.ok === false) {
          console.warn(`[ER ${label}] skipped: ${r.error}`);
        } else if (r?.signature) {
          console.info(`[ER ${label}] ${r.signature}`);
        }
      })
      .catch((err) => console.warn(`[ER ${label}] error`, err));
  }

  private stopTimers(): void {
    if (this.priceTimer) clearInterval(this.priceTimer);
    if (this.roundTimer) clearTimeout(this.roundTimer);
    this.botTimers.forEach(clearTimeout);
    this.botTimers = [];
    if (this.pauseTimer) clearTimeout(this.pauseTimer);
    if (this.countdownTimer) clearTimeout(this.countdownTimer);
  }

  private emit(): void {
    const view = this.getView();
    this.subs.forEach((cb) => cb(view));
  }
}
