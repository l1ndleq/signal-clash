"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { type Connection, type Transaction } from "@solana/web3.js";
import {
  ArrowLeft,
  ArrowRight,
  BadgeDollarSign,
  ExternalLink,
  Play,
  Radio,
  ShieldCheck,
  Swords,
  TrendingDown,
  TrendingUp,
  Wallet,
  Zap,
} from "lucide-react";
import Header from "@/components/Header";
import PredictionControls from "@/components/PredictionControls";
import RoundTimer from "@/components/RoundTimer";
import Scoreboard from "@/components/Scoreboard";
import ResultCard, { type PayoutState } from "@/components/ResultCard";
import TradingViewChart from "@/components/TradingViewChart";
import { useMatch } from "@/lib/state/useMatch";
import { lobbyEngine } from "@/lib/game/instances";
import { MARKETS, formatPrice } from "@/lib/game/markets";
import type { Market } from "@/lib/game/types";
import { solFromLamports } from "@/lib/config";
import {
  buildSettleWinners,
  depositEntryFee,
  getVaultAddress,
  settleGame,
  voidGame,
} from "@/lib/solana/settlement";
import { shortAddress } from "@/lib/solana/client";
import { resolveDirection } from "@/lib/game/scoring";

export default function RoomPage() {
  const params = useParams<{ roomId: string }>();
  const roomId = params.roomId;
  const { publicKey, sendTransaction } = useWallet();
  const wallet = publicKey?.toBase58() ?? null;

  const { view, start, lock } = useMatch(roomId, wallet);

  const [depositing, setDepositing] = useState(false);
  const [depositUrl, setDepositUrl] = useState<string | null>(null);
  const [depositErr, setDepositErr] = useState<string | null>(null);
  const [payout, setPayout] = useState<PayoutState>({ claiming: false });
  const [entering, setEntering] = useState(false);

  const escrow = useMemo(() => getVaultAddress(roomId), [roomId]);

  if (!wallet) {
    return (
      <RoomShell>
        <CenterCard
          title="Connect wallet"
          body="A playable room needs a connected devnet wallet so you can join, lock predictions, and sign your own settlement transactions. Signal Clash never stores private keys."
          icon={Wallet}
        >
          <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row">
            <Link href="/lobby" className="btn btn-primary min-h-12 flex-1">
              Back to lobby
              <ArrowRight size={17} aria-hidden />
            </Link>
            <Link href="/arena" className="btn btn-ghost min-h-12 flex-1">
              View demo
              <Play size={17} aria-hidden />
            </Link>
          </div>
        </CenterCard>
      </RoomShell>
    );
  }

  if (!view) {
    return (
      <RoomShell>
        <CenterCard
          title="Loading room"
          body="Syncing the local MagicBlock mock adapter and match controller."
          icon={Radio}
        />
      </RoomShell>
    );
  }

  if (!view.room) {
    return (
      <RoomShell>
        <CenterCard
          title="Room not found"
          body="This room id does not exist or has expired in the in-memory real-time layer for this demo session. Return to the lobby to create or join a fresh devnet arena."
          icon={Swords}
        >
          <div className="mt-6 flex w-full flex-col gap-2 sm:flex-row">
            <Link href="/lobby" className="btn btn-primary min-h-12 flex-1">
              Back to lobby
              <ArrowRight size={17} aria-hidden />
            </Link>
            <Link href="/arena" className="btn btn-ghost min-h-12 flex-1">
              View demo
              <Play size={17} aria-hidden />
            </Link>
          </div>
        </CenterCard>
      </RoomShell>
    );
  }

  const room = view.room;
  const round = room.rounds[room.currentRoundIndex];
  const myPrediction = round?.predictions.find((p) => p.player === wallet);
  const roundActive = view.phase === "round-active";

  const onDeposit = async (): Promise<boolean> => {
    if (!publicKey || depositUrl) return !!depositUrl;
    setDepositing(true);
    setDepositErr(null);
    try {
      const res = await depositEntryFee({
        gameId: roomId,
        payer: publicKey,
        entryFeeLamports: room.entryFeeLamports,
        maxPlayers: room.maxPlayers,
        sendTransaction: (tx: Transaction, conn: Connection) =>
          sendTransaction(tx, conn),
      });
      setDepositUrl(res.explorerUrl);
      return true;
    } catch (e) {
      setDepositErr(
        e instanceof Error ? e.message : "Deposit failed (check devnet balance)",
      );
      return false;
    } finally {
      setDepositing(false);
    }
  };

  const beginMatch = async () => {
    const amParticipant =
      room.creator === wallet || room.players[wallet] !== undefined;
    if (!amParticipant && Object.keys(room.players).length < room.maxPlayers) {
      await lobbyEngine.joinRoom(roomId, wallet);
    }
    setEntering(true);
    setTimeout(() => setEntering(false), 1100);
    await start();
  };

  const onDepositAndStart = async () => {
    const ok = await onDeposit();
    if (ok) await beginMatch();
  };

  const onStart = beginMatch;

  const onClaim = async () => {
    if (!publicKey) return;
    setPayout({ claiming: true });
    try {
      const { winners, places } = buildSettleWinners(room, wallet);
      const res = await settleGame({
        gameId: roomId,
        authority: publicKey,
        winners,
        places,
        sendTransaction: (tx: Transaction, conn: Connection) =>
          sendTransaction(tx, conn),
      });
      if (res) {
        setPayout({
          claiming: false,
          explorerUrl: res.explorerUrl,
          message:
            "Settled on devnet via the vault program: 3% rake to the treasury, your tier share to you.",
        });
      } else {
        setPayout({
          claiming: false,
          message:
            "Simulated settlement: no on-chain vault for this demo run (the deposit was skipped).",
        });
      }
    } catch (e) {
      setPayout({
        claiming: false,
        message: e instanceof Error ? `Settle failed: ${e.message}` : "Settle failed",
      });
    }
  };

  const onVoid = async () => {
    if (!publicKey) return;
    setPayout({ claiming: true });
    try {
      const res = await voidGame({
        gameId: roomId,
        payer: publicKey,
        sendTransaction: (tx: Transaction, conn: Connection) =>
          sendTransaction(tx, conn),
      });
      if (res) {
        setPayout({
          claiming: false,
          explorerUrl: res.explorerUrl,
          message: "Abandoned game voided: every depositor refunded their entry fee.",
        });
      } else {
        setPayout({
          claiming: false,
          message: "No on-chain vault to refund for this game.",
        });
      }
    } catch (e) {
      setPayout({
        claiming: false,
        message: e instanceof Error ? `Refund failed: ${e.message}` : "Refund failed",
      });
    }
  };

  return (
    <RoomShell>
      <ArenaEntryOverlay show={entering} market={room.market} />
      <AnimatePresence>
        {view.phase === "countdown" && view.countdownValue !== undefined && (
          <CountdownOverlay value={view.countdownValue} market={room.market} />
        )}
      </AnimatePresence>

      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Link
          href="/lobby"
          className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--ink-muted)] transition hover:text-[var(--ink)]"
        >
          <ArrowLeft size={16} aria-hidden />
          Back to lobby
        </Link>
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip border-[rgba(0,255,163,0.28)] bg-[rgba(0,255,163,0.07)] text-[var(--surge)]">
            Devnet settlement
          </span>
          <span
            className="chip text-[var(--ink-muted)]"
            title="Real-time room and round state runs on a local adapter behind the MagicBlock Ephemeral Rollup interface"
          >
            MagicBlock: mock adapter
          </span>
          <span className="chip font-num text-[var(--ink-muted)]">room #{room.id}</span>
        </div>
      </div>

      {view.phase === "finished" ? (
        <div className="mx-auto max-w-xl">
          <ResultCard
            room={room}
            myWallet={wallet}
            commitRef={view.commitRef}
            payout={payout}
            onClaim={onClaim}
            onVoid={onVoid}
          />
        </div>
      ) : view.phase === "ready" ? (
        <ReadyPanel
          market={room.market}
          entryFeeSol={solFromLamports(room.entryFeeLamports)}
          prizeSol={solFromLamports(room.entryFeeLamports * room.maxPlayers)}
          players={Object.keys(room.players).length}
          maxPlayers={room.maxPlayers}
          escrow={escrow}
          depositing={depositing}
          depositUrl={depositUrl}
          depositErr={depositErr}
          onDepositAndStart={onDepositAndStart}
          onStart={onStart}
        />
      ) : (
        <div className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
          <div className="flex flex-col gap-6">
            <section className="app-hero p-5 md:p-6">
              <div className="signal-scan" />
              <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div>
                  <div className="app-kicker">
                    <Zap size={15} aria-hidden />
                    Prediction cockpit
                  </div>
                  <h1 className="mt-4 font-display text-4xl font-bold leading-none md:text-6xl">
                    Market signal
                  </h1>
                </div>
                <span className="chip text-[var(--ink-muted)]">
                  Round {Math.min(room.currentRoundIndex + 1, room.totalRounds)}/
                  {room.totalRounds}
                </span>
              </div>
              <PricePanel
                market={room.market}
                price={view.livePrice}
                startPrice={round?.startPrice}
                endPrice={round?.endPrice}
                resolved={view.phase === "round-resolved"}
                feedLive={view.feedLive}
              />
            </section>

            <TradingViewChart symbol={MARKETS[room.market].tvSymbol} />

            <div className="grid gap-5 lg:grid-cols-[180px_1fr]">
              <div className="app-panel grid place-items-center p-5">
                <RoundTimer
                  endsAt={view.roundEndsAt}
                  durationSeconds={room.roundDurationSeconds}
                />
              </div>
              <PredictionControls
                active={roundActive}
                myPrediction={myPrediction}
                onLock={lock}
                livePrice={view.livePrice}
                startPrice={round?.startPrice}
              />
            </div>

            {view.phase === "round-resolved" && round && (
              <RoundResult
                startPrice={round.startPrice}
                endPrice={round.endPrice ?? round.startPrice}
                myWallet={wallet}
                predictions={round.predictions}
              />
            )}
          </div>

          <Scoreboard room={room} myWallet={wallet} phase={view.phase} />
        </div>
      )}
    </RoomShell>
  );
}

function RoomShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell flex min-h-screen flex-col text-[var(--ink)]">
      <Header />
      <main className="app-main">{children}</main>
    </div>
  );
}

function ArenaEntryOverlay({
  show,
  market,
}: {
  show: boolean;
  market: Market;
}) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={false}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, filter: "blur(10px)" }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
          className="fixed inset-0 z-50 grid place-items-center bg-[var(--canvas)]"
        >
          <div className="flex flex-col items-center text-center">
            <motion.div
              initial={{ y: 30 }}
              animate={{ y: 0 }}
              transition={{ duration: 0.5, delay: 0.05 }}
              className="gradient-text font-display text-5xl font-bold md:text-6xl"
            >
              Entering arena
            </motion.div>
            <motion.div
              initial={false}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="mt-4 text-sm uppercase tracking-[0.35em] text-[var(--ink-muted)]"
            >
              {market} / 5 rounds
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function CenterCard({
  title,
  body,
  icon: Icon,
  children,
}: {
  title: string;
  body: string;
  icon: typeof Wallet;
  children?: React.ReactNode;
}) {
  return (
    <div className="grid min-h-[60svh] place-items-center">
      <div className="app-panel flex max-w-xl flex-col items-center p-8 text-center md:p-10">
        <div className="signal-scan" />
        <div className="grid h-12 w-12 place-items-center rounded-lg border border-[rgba(3,225,255,0.3)] bg-[rgba(3,225,255,0.08)] text-[var(--ocean)]">
          <Icon size={24} aria-hidden />
        </div>
        <div className="mt-4 app-eyebrow">
          <span className="status-dot" />
          Devnet room access
        </div>
        <h1 className="mt-4 font-display text-3xl font-bold">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{body}</p>
        {children}
      </div>
    </div>
  );
}

function ReadyPanel({
  market,
  entryFeeSol,
  prizeSol,
  players,
  maxPlayers,
  escrow,
  depositing,
  depositUrl,
  depositErr,
  onDepositAndStart,
  onStart,
}: {
  market: Market;
  entryFeeSol: number;
  prizeSol: number;
  players: number;
  maxPlayers: number;
  escrow: string;
  depositing: boolean;
  depositUrl: string | null;
  depositErr: string | null;
  onDepositAndStart: () => void;
  onStart: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="app-hero p-6 md:p-8">
        <div className="signal-scan" />
        <div className="text-center">
          <div className="app-kicker">
            <Swords size={15} aria-hidden />
            Arena armed
          </div>
          <h1 className="mt-5 font-display text-5xl font-bold leading-none">
            Match ready
          </h1>
          <p className="mt-4 text-sm leading-6 text-[var(--ink-muted)]">
            {maxPlayers}-player arena / 5 rounds /{" "}
            <span className="text-[var(--ink)]">{market}</span>
          </p>
        </div>

        <div className="mt-7 grid grid-cols-3 gap-3 text-center">
          <ReadyMetric label="Entry fee" value={`${entryFeeSol} SOL`} />
          <ReadyMetric label="Players" value={`${players}/${maxPlayers}`} />
          <ReadyMetric label="Prize pool" value={`${prizeSol} SOL`} accent />
        </div>

        <div className="mt-5 rounded-lg border border-[var(--hairline)] bg-[rgba(255,255,255,0.04)] p-4 text-sm leading-6 text-[var(--ink-muted)]">
          <div className="flex items-center gap-2 font-semibold text-[var(--ink)]">
            <ShieldCheck size={16} className="text-[var(--surge)]" aria-hidden />
            Devnet settlement
          </div>
          <p className="mt-2">
            Entry-fee escrow:{" "}
            <span className="font-num text-[var(--ink)]">
              {shortAddress(escrow, 6)}
            </span>
          </p>
          <p className="mt-1">
            Paying the entry fee is a real devnet transfer. Empty seats can be
            filled by bots for the demo.
          </p>
        </div>

        {depositUrl && (
          <a
            href={depositUrl}
            target="_blank"
            rel="noreferrer"
            className="mt-4 inline-flex items-center justify-center gap-2 text-sm font-bold text-[var(--ocean)] underline"
          >
            Entry fee deposited
            <ExternalLink size={15} aria-hidden />
          </a>
        )}
        {depositErr && (
          <p className="mt-4 text-center text-sm font-semibold text-[var(--magenta)]">
            {depositErr}
          </p>
        )}

        <div className="mt-6 flex flex-col gap-2">
          <button
            className="btn btn-primary min-h-12 w-full pulse text-base"
            onClick={onDepositAndStart}
            disabled={depositing}
          >
            <BadgeDollarSign size={18} aria-hidden />
            {depositing ? "Paying entry fee..." : `Pay ${entryFeeSol} SOL & Start`}
          </button>
          <button
            className="rounded-lg px-4 py-3 text-center text-xs font-semibold text-[var(--ink-muted)] transition hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--ink)] disabled:opacity-45"
            onClick={onStart}
            disabled={depositing}
          >
            Skip deposit and start (demo only)
          </button>
        </div>
      </div>
    </div>
  );
}

function ReadyMetric({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="metric-tile">
      <div className="metric-label">{label}</div>
      <div className={`metric-value text-xl ${accent ? "text-[var(--ocean)]" : ""}`}>
        {value}
      </div>
    </div>
  );
}

function PricePanel({
  market,
  price,
  startPrice,
  endPrice,
  resolved,
  feedLive,
}: {
  market: Market;
  price: number;
  startPrice?: number;
  endPrice?: number;
  resolved: boolean;
  feedLive: boolean;
}) {
  const reference = startPrice ?? price;
  const shown = resolved ? (endPrice ?? price) : price;
  const delta = reference ? ((shown - reference) / reference) * 100 : 0;
  const positive = delta > 0.001;
  const negative = delta < -0.001;
  const color = positive ? "var(--up)" : negative ? "var(--down)" : "var(--flat)";
  const Trend = positive ? TrendingUp : negative ? TrendingDown : Radio;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip text-[var(--ink-muted)]">
            {market}
          </span>
          <span
            className={`chip ${
              feedLive
                ? "border-[rgba(0,255,163,0.28)] bg-[rgba(0,255,163,0.07)] text-[var(--surge)]"
                : "border-[rgba(245,165,36,0.28)] bg-[rgba(245,165,36,0.07)] text-[var(--flat)]"
            }`}
          >
            <span className="status-dot" />
            {feedLive ? "Binance live" : "simulated fallback"}
          </span>
        </div>
        <div className="mt-4 font-display text-6xl font-black leading-none md:text-7xl">
          ${formatPrice(shown, market)}
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-2 lg:w-64 lg:grid-cols-1">
        <div className="metric-tile">
          <div className="metric-label">Move from open</div>
          <div className="metric-value flex items-center gap-2 text-xl" style={{ color }}>
            <Trend size={18} aria-hidden />
            {delta >= 0 ? "+" : "-"}
            {Math.abs(delta).toFixed(3)}%
          </div>
        </div>
        {startPrice !== undefined && (
          <div className="metric-tile">
            <div className="metric-label">Round open</div>
            <div className="metric-value text-lg">
              ${formatPrice(startPrice, market)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function RoundResult({
  startPrice,
  endPrice,
  myWallet,
  predictions,
}: {
  startPrice: number;
  endPrice: number;
  myWallet: string;
  predictions: {
    player: string;
    direction: string;
    confidence: number;
    scoreDelta?: number;
    correct?: boolean;
  }[];
}) {
  const actual = resolveDirection(startPrice, endPrice);
  return (
    <div className="app-panel p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="app-eyebrow">Round result</div>
          <h3 className="mt-1 font-display text-2xl font-bold">
            Signal resolved
          </h3>
        </div>
        <span className="chip" style={{ color: dirColor(actual) }}>
          actual: {actual}
        </span>
      </div>
      <div className="mt-4 grid gap-2">
        {predictions.map((p) => (
          <div
            key={p.player}
            className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-lg border border-[var(--hairline)] bg-[rgba(255,255,255,0.04)] px-3 py-3 text-sm"
          >
            <span className="font-semibold">
              {p.player === myWallet ? "You" : "Signal Bot"}
            </span>
            <span className="font-num">
              <span style={{ color: dirColor(p.direction) }}>
                {p.direction}
              </span>{" "}
              {p.confidence}x
            </span>
            <span
              className="font-num font-black"
              style={{ color: p.correct ? "var(--up)" : "var(--down)" }}
            >
              {(p.scoreDelta ?? 0) >= 0 ? "+" : ""}
              {p.scoreDelta ?? 0}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function dirColor(d: string): string {
  return d === "UP" ? "var(--up)" : d === "DOWN" ? "var(--down)" : "var(--flat)";
}

function CountdownOverlay({ value, market }: { value: number; market: Market }) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.25 }}
      className="fixed inset-0 z-40 grid place-items-center bg-[rgba(7,9,14,0.9)] backdrop-blur-sm"
    >
      <div className="flex flex-col items-center gap-6 text-center">
        <AnimatePresence mode="wait">
          <motion.div
            key={value}
            initial={{ scale: 1.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.6, opacity: 0, filter: "blur(10px)" }}
            transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
            className="gradient-text font-display font-black leading-none"
            style={{ fontSize: "clamp(8rem, 20vw, 14rem)" }}
          >
            {value}
          </motion.div>
        </AnimatePresence>
        <div className="font-mono text-sm uppercase tracking-[0.4em] text-[var(--ink-muted)]">
          [ {market} · round starting ]
        </div>
      </div>
    </motion.div>
  );
}
