/**
 * MatchController — drives a single 1v1 match end-to-end.
 *
 * Owns the live price ticker and per-round timers, calling the GameEngine for
 * all state/scoring. It exposes a subscribe/getView surface so a React hook can
 * render it without holding any game logic itself.
 *
 * Opponent model: real online human-vs-human. The room creator is the host and
 * drives round timing/resolution; the other seat submits predictions, which the
 * host reads from the shared room state (Supabase). The passive guest derives
 * its phase/round-deadline from that same shared state.
 */

import { GameEngine } from "./engine";
import { BinancePriceFeed } from "./binancePriceFeed";
import { MARKETS } from "./markets";
import type { Direction, Market, Room } from "./types";
import type { MagicBlockAdapter } from "@/lib/magicblock/types";

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
  private pauseTimer?: ReturnType<typeof setTimeout>;
  private countdownTimer?: ReturnType<typeof setTimeout>;
  private destroyed = false;
  private resolving = false;
  private started = false;
  private feedReady = false;
  /** The room creator drives round timing/resolution; the other seat is passive. */
  private readonly isHost: boolean;
  private adapterUnsub?: () => void;

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
    const room = adapter.getRoom(roomId);
    this.market = room?.market ?? "SOL/USD";
    this.isHost = room?.creator === myWallet;
    const cfg = MARKETS[this.market];
    this.feed = new BinancePriceFeed(cfg.binanceSymbol, cfg.fallbackPrice);
    this.engine = new GameEngine(adapter, this.feed);
    this.livePrice = this.feed.current();

    // Re-render whenever the shared room changes (opponent joins, host advances
    // rounds, etc.) — this is how the passive (guest) client stays in sync.
    this.adapterUnsub = this.adapter.subscribe(roomId, () => this.emit());
  }

  subscribe(cb: (v: MatchView) => void): () => void {
    this.subs.add(cb);
    cb(this.getView());
    return () => this.subs.delete(cb);
  }

  getView(): MatchView {
    const room = this.adapter.getRoom(this.roomId) ?? null;
    const live = this.liveState(room);
    return {
      room,
      myWallet: this.myWallet,
      opponentWallet: this.opponentWallet(room),
      market: room?.market ?? this.market,
      livePrice: this.livePrice,
      feedLive: this.feed.isLive,
      roundEndsAt: live.roundEndsAt,
      phase: live.phase,
      countdownValue: live.countdownValue,
      commitRef: this.commitRef,
    };
  }

  /** The other seat (real opponent), or "" while alone. */
  private opponentWallet(room: Room | null): string {
    if (!room) return "";
    return Object.keys(room.players).find((w) => w !== this.myWallet) ?? "";
  }

  /**
   * Match phase + round deadline. The host owns these locally; the passive guest
   * derives them from the shared room state the host writes.
   */
  private liveState(room: Room | null): {
    phase: MatchPhase;
    roundEndsAt: number | null;
    countdownValue?: number;
  } {
    if (this.isHost) {
      return {
        phase: this.phase,
        roundEndsAt: this.roundEndsAt,
        countdownValue: this.countdownValue,
      };
    }
    if (!room) return { phase: "ready", roundEndsAt: null };
    if (room.status === "finished") return { phase: "finished", roundEndsAt: null };
    const round = room.rounds[room.currentRoundIndex];
    if (!round) return { phase: "ready", roundEndsAt: null };
    if (round.status === "resolved") return { phase: "round-resolved", roundEndsAt: null };
    return {
      phase: "round-active",
      roundEndsAt: round.startedAt + round.durationSeconds * 1000,
    };
  }

  /**
   * Connect the live price feed and start the display ticker. Called by every
   * client (host and guest) so both see live prices; does not begin rounds.
   */
  async activate(): Promise<void> {
    if (this.feedReady || this.destroyed) return;
    this.feedReady = true;

    await this.feed.connect();
    this.livePrice = this.feed.current();
    this.priceTimer = setInterval(() => {
      this.livePrice = this.feed.next();
      this.emit();
    }, 1000);
  }

  /**
   * Begin the match. Host-only: the room creator drives round timing and
   * resolution; the opponent plays by submitting predictions, which the host
   * reads from the shared room state. Real online human-vs-human — no bots.
   */
  async start(): Promise<void> {
    if (this.started || !this.isHost) return;
    this.started = true;

    const room = this.adapter.getRoom(this.roomId);
    if (!room) throw new Error("Room not found");

    // Kick off the on-chain mirror (L1 create + delegate) concurrently so its
    // wallet popup / confirmation overlaps the countdown rather than stalling it.
    this.mirrorStep("start", () => this.mirror?.start());

    await this.activate();
    this.startCountdown();
  }

  /** Human locks in their prediction for the active round. */
  async lockMyPrediction(
    direction: Room["rounds"][number]["predictions"][number]["direction"],
    confidence: Room["rounds"][number]["predictions"][number]["confidence"],
  ): Promise<void> {
    const room = this.adapter.getRoom(this.roomId) ?? null;
    if (this.liveState(room).phase !== "round-active") return;
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
    this.adapterUnsub?.();
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
    this.roundTimer = setTimeout(() => void this.resolveRound(), durationMs);

    this.emit();
  }

  private async resolveRound(): Promise<void> {
    if (this.resolving) return;
    this.resolving = true;
    clearTimeout(this.roundTimer);

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
    if (this.pauseTimer) clearTimeout(this.pauseTimer);
    if (this.countdownTimer) clearTimeout(this.countdownTimer);
  }

  private emit(): void {
    const view = this.getView();
    this.subs.forEach((cb) => cb(view));
  }
}
