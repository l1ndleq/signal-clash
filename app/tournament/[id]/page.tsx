"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { type Connection, type Transaction } from "@solana/web3.js";
import {
  ArrowLeft,
  ArrowRight,
  BadgeDollarSign,
  Clock3,
  ExternalLink,
  Play,
  Radio,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Trophy,
  Wallet,
  Zap,
} from "lucide-react";
import Header from "@/components/Header";
import PredictionControls from "@/components/PredictionControls";
import RoundTimer from "@/components/RoundTimer";
import TradingViewChart from "@/components/TradingViewChart";
import TournamentLeaderboard from "@/components/TournamentLeaderboard";
import { useMatch } from "@/lib/state/useMatch";
import { lobbyEngine } from "@/lib/game/instances";
import { MARKETS, formatPrice } from "@/lib/game/markets";
import { solFromLamports } from "@/lib/config";
import {
  computePrizeBreakdown,
  rankStandings,
  PAID_PLACES,
} from "@/lib/game/tournament";
import {
  buildSettleWinners,
  depositEntryFee,
  getVaultAddress,
  settleGame,
  type SettlementResult,
} from "@/lib/solana/settlement";
import { shortAddress } from "@/lib/solana/client";
import type { Market } from "@/lib/game/types";

function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 500);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

export default function TournamentPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { publicKey, sendTransaction } = useWallet();
  const wallet = publicKey?.toBase58() ?? null;

  const { view, start, lock } = useMatch(id, wallet);

  const [registered, setRegistered] = useState(false);
  const [pageStarted, setPageStarted] = useState(false);
  const [depositing, setDepositing] = useState(false);
  const [depositUrl, setDepositUrl] = useState<string | null>(null);
  const [depositErr, setDepositErr] = useState<string | null>(null);

  const escrow = useMemo(() => getVaultAddress(id), [id]);

  const room = view?.room ?? null;
  const startsAt = room?.startsAt;
  const now = useNow(!pageStarted && !!startsAt);
  const remainingMs = startsAt ? Math.max(0, startsAt - now) : 0;

  // Ensure the connected wallet holds a seat, then start the controller. Only
  // the room creator (host) drives rounds; other registrants play by submitting
  // predictions against the host's authoritative round state.
  const beginPlay = useCallback(async () => {
    if (!wallet || !room || pageStarted) return;
    setPageStarted(true);
    const amParticipant =
      room.creator === wallet || room.players[wallet] !== undefined;
    if (!amParticipant && Object.keys(room.players).length < room.maxPlayers) {
      await lobbyEngine.joinRoom(id, wallet);
    }
    await start();
  }, [wallet, room, pageStarted, id, start]);

  // Kick off play once the timer expires (or immediately on a late entry),
  // provided the player has registered.
  useEffect(() => {
    if (pageStarted || !registered || !startsAt) return;
    if (now >= startsAt) void beginPlay();
  }, [pageStarted, registered, startsAt, now, beginPlay]);

  if (!wallet) {
    return (
      <Shell>
        <CenterCard
          title="Connect wallet"
          body="Tournaments need a connected devnet wallet so you can register, pay the entry fee, and claim your prize share if you finish in the money."
          icon={Wallet}
        >
          <Link href="/lobby" className="btn btn-primary mt-6 min-h-12 w-full">
            Back to lobby
            <ArrowRight size={17} aria-hidden />
          </Link>
        </CenterCard>
      </Shell>
    );
  }

  if (!view || !room) {
    return (
      <Shell>
        <CenterCard
          title={view && !room ? "Tournament not found" : "Loading tournament"}
          body={
            view && !room
              ? "This tournament id does not exist or has expired in the in-memory real-time layer for this demo session."
              : "Syncing the local MagicBlock mock adapter and tournament controller."
          }
          icon={view && !room ? Trophy : Radio}
        >
          {view && !room && (
            <Link href="/lobby" className="btn btn-primary mt-6 min-h-12 w-full">
              Back to lobby
              <ArrowRight size={17} aria-hidden />
            </Link>
          )}
        </CenterCard>
      </Shell>
    );
  }

  const round = room.rounds[room.currentRoundIndex];
  const myPrediction = round?.predictions.find((p) => p.player === wallet);
  const roundActive = view.phase === "round-active";

  const onDeposit = async (): Promise<boolean> => {
    if (!publicKey || depositUrl) return !!depositUrl;
    setDepositing(true);
    setDepositErr(null);
    try {
      const res = await depositEntryFee({
        gameId: id,
        payer: publicKey,
        entryFeeLamports: room.entryFeeLamports,
        maxPlayers: room.maxPlayers,
        sendTransaction: (tx: Transaction, conn: Connection) =>
          sendTransaction(tx, conn),
      });
      setDepositUrl(res.explorerUrl);
      setRegistered(true);
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

  // ---- Registration (pre-start) ----
  if (!pageStarted && view.phase === "ready") {
    return (
      <Shell>
        <TopRow id={room.id} />
        <RegistrationPanel
          market={room.market}
          entryFeeSol={solFromLamports(room.entryFeeLamports)}
          field={room.maxPlayers}
          rounds={room.totalRounds}
          poolLamports={room.entryFeeLamports * room.maxPlayers}
          escrow={escrow}
          remainingMs={remainingMs}
          registered={registered}
          depositing={depositing}
          depositUrl={depositUrl}
          depositErr={depositErr}
          onRegister={onDeposit}
          onSkip={() => setRegistered(true)}
          onStartNow={() => void beginPlay()}
        />
      </Shell>
    );
  }

  // ---- Results ----
  if (view.phase === "finished") {
    return (
      <Shell>
        <TopRow id={room.id} />
        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <TournamentResult room={room} myWallet={wallet} />
          <TournamentLeaderboard room={room} myWallet={wallet} phase={view.phase} />
        </div>
      </Shell>
    );
  }

  // ---- Live ----
  return (
    <Shell>
      <AnimatePresence>
        {view.phase === "countdown" && view.countdownValue !== undefined && (
          <CountdownOverlay value={view.countdownValue} market={room.market} />
        )}
      </AnimatePresence>

      <TopRow id={room.id} />

      <div className="grid gap-6 xl:grid-cols-[1.45fr_0.95fr]">
        <div className="flex flex-col gap-6">
          <section className="app-hero p-5 md:p-6">
            <div className="signal-scan" />
            <div className="mb-5 flex items-start justify-between gap-3">
              <div>
                <div className="app-kicker">
                  <Trophy size={15} aria-hidden />
                  Tournament cockpit
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
            <PriceHeader
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
        </div>

        <TournamentLeaderboard room={room} myWallet={wallet} phase={view.phase} />
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="app-shell flex min-h-screen flex-col text-[var(--ink)]">
      <Header />
      <main className="app-main">{children}</main>
    </div>
  );
}

function TopRow({ id }: { id: string }) {
  return (
    <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <Link
        href="/lobby"
        className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--ink-muted)] transition hover:text-[var(--ink)]"
      >
        <ArrowLeft size={16} aria-hidden />
        Back to lobby
      </Link>
      <div className="flex flex-wrap items-center gap-2">
        <span className="chip border-[rgba(220,31,255,0.3)] bg-[rgba(220,31,255,0.07)] text-[var(--purple)]">
          Tournament
        </span>
        <span className="chip border-[rgba(0,255,163,0.28)] bg-[rgba(0,255,163,0.07)] text-[var(--surge)]">
          Devnet settlement
        </span>
        <span className="chip font-num text-[var(--ink-muted)]">#{id}</span>
      </div>
    </div>
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
        <h1 className="mt-4 font-display text-3xl font-bold">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">{body}</p>
        {children}
      </div>
    </div>
  );
}

function fmtClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function RegistrationPanel({
  market,
  entryFeeSol,
  field,
  rounds,
  poolLamports,
  escrow,
  remainingMs,
  registered,
  depositing,
  depositUrl,
  depositErr,
  onRegister,
  onSkip,
  onStartNow,
}: {
  market: Market;
  entryFeeSol: number;
  field: number;
  rounds: number;
  poolLamports: number;
  escrow: string;
  remainingMs: number;
  registered: boolean;
  depositing: boolean;
  depositUrl: string | null;
  depositErr: string | null;
  onRegister: () => void;
  onSkip: () => void;
  onStartNow: () => void;
}) {
  const { payouts, rakeLamports } = computePrizeBreakdown(poolLamports);
  const starting = remainingMs <= 0;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="app-hero p-6 md:p-8">
        <div className="signal-scan" />
        <div className="text-center">
          <div className="app-kicker">
            <Trophy size={15} aria-hidden />
            Tournament registration
          </div>
          <h1 className="mt-5 font-display text-5xl font-bold leading-none">
            {solFromLamports(poolLamports).toFixed(2)} SOL pool
          </h1>
          <p className="mt-4 text-sm leading-6 text-[var(--ink-muted)]">
            {field}-player field / {rounds} rounds /{" "}
            <span className="text-[var(--ink)]">{market}</span>
          </p>
        </div>

        <div className="mt-7 flex items-center justify-center gap-3 rounded-lg border border-[rgba(220,31,255,0.28)] bg-[rgba(220,31,255,0.06)] px-5 py-4">
          <Clock3 size={24} className="text-[var(--purple)]" aria-hidden />
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--ink-muted)]">
              {starting ? "Field is locking" : "Starts in"}
            </div>
            <div className="font-display text-3xl font-black">
              {starting ? "now" : fmtClock(remainingMs)}
            </div>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 text-center">
          {payouts.map((p, i) => (
            <div
              key={i}
              className="metric-tile clip-corner"
              style={{
                borderColor:
                  i === 0 ? "rgba(255,210,74,0.4)" : "var(--hairline)",
              }}
            >
              <div className="metric-label">{["1st · 50%", "2nd · 30%", "3rd · 20%"][i]}</div>
              <div className="metric-value text-lg text-[var(--ocean)]">
                {solFromLamports(p).toFixed(3)}
              </div>
            </div>
          ))}
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
            Top {PAID_PLACES} split the pool 50 / 30 / 20. Platform rake 3% ·{" "}
            <span className="font-num text-[var(--ink)]">
              {solFromLamports(rakeLamports).toFixed(3)} SOL
            </span>
            . Players register before the start; the bracket plays out between
            everyone who joined.
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

        {registered ? (
          <div className="mt-6 flex flex-col gap-2">
            <div className="inline-flex items-center justify-center gap-2 rounded-lg border border-[rgba(0,255,163,0.32)] bg-[rgba(0,255,163,0.08)] px-4 py-3 text-sm font-bold text-[var(--surge)]">
              <Zap size={16} fill="currentColor" aria-hidden />
              Registered — {starting ? "starting now" : `auto-starts in ${fmtClock(remainingMs)}`}
            </div>
            {!starting && (
              <button
                className="rounded-lg px-4 py-3 text-center text-xs font-semibold text-[var(--ink-muted)] transition hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--ink)]"
                onClick={onStartNow}
              >
                Start now (demo only)
              </button>
            )}
          </div>
        ) : (
          <div className="mt-6 flex flex-col gap-2">
            <button
              className="btn btn-primary min-h-12 w-full pulse text-base"
              onClick={onRegister}
              disabled={depositing}
            >
              <BadgeDollarSign size={18} aria-hidden />
              {depositing ? "Paying entry fee..." : `Register · Pay ${entryFeeSol} SOL`}
            </button>
            <button
              className="rounded-lg px-4 py-3 text-center text-xs font-semibold text-[var(--ink-muted)] transition hover:bg-[rgba(255,255,255,0.04)] hover:text-[var(--ink)]"
              onClick={onSkip}
            >
              Skip deposit and register (demo only)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function TournamentResult({
  room,
  myWallet,
}: {
  room: import("@/lib/game/types").Room;
  myWallet: string;
}) {
  const { publicKey, sendTransaction } = useWallet();
  const standings = rankStandings(room);
  const mine = standings.find((s) => s.wallet === myWallet);
  const inMoney = !!mine && mine.rank <= PAID_PLACES;

  const [claiming, setClaiming] = useState(false);
  const [result, setResult] = useState<SettlementResult | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  const onClaim = async () => {
    if (!inMoney || !publicKey) return;
    setClaiming(true);
    setMsg(null);
    try {
      const { winners, places } = buildSettleWinners(room, myWallet);
      const res = await settleGame({
        gameId: room.id,
        authority: publicKey,
        winners,
        places,
        sendTransaction: (tx: Transaction, conn: Connection) =>
          sendTransaction(tx, conn),
      });
      if (res) {
        setResult(res);
      } else {
        setMsg(
          "Simulated settlement: no on-chain vault for this demo run (the entry fee was skipped). Your prize share is shown at the game layer.",
        );
      }
    } catch (e) {
      setMsg(e instanceof Error ? `Settle failed: ${e.message}` : "Settle failed");
    } finally {
      setClaiming(false);
    }
  };

  const titleColor = inMoney ? "var(--surge)" : "var(--ink)";
  const title = !mine
    ? "Tournament complete"
    : inMoney
      ? `You finished #${mine.rank}`
      : `You finished #${mine.rank}`;

  return (
    <div className="app-panel flex flex-col gap-6 p-6 md:p-7">
      <div className="text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg border border-[rgba(255,210,74,0.4)] bg-[rgba(255,210,74,0.08)] text-[#ffd24a]">
          <Trophy size={24} aria-hidden />
        </div>
        <div className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
          Tournament complete
        </div>
        <h2
          className="mt-2 font-display text-5xl font-black leading-none"
          style={{ color: titleColor }}
        >
          {title}
        </h2>
        {mine && (
          <p className="mt-3 font-num text-lg text-[var(--ink-muted)]">
            {mine.score} pts ·{" "}
            {inMoney ? (
              <span className="font-bold text-[var(--surge)]">
                {solFromLamports(mine.payoutLamports).toFixed(3)} SOL prize
              </span>
            ) : (
              <span>out of the money (top {PAID_PLACES} pays)</span>
            )}
          </p>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        {standings.slice(0, 3).map((s) => (
          <div
            key={s.wallet}
            className="metric-tile clip-corner"
            style={{
              borderColor:
                s.wallet === myWallet ? "rgba(3,225,255,0.45)" : "var(--hairline)",
            }}
          >
            <div className="metric-label">{["1st", "2nd", "3rd"][s.rank - 1]}</div>
            <div className="mt-1 truncate text-sm font-bold">
              {s.wallet === myWallet ? "You" : s.displayName ?? shortAddress(s.wallet, 4)}
            </div>
            <div className="font-num text-sm font-black text-[var(--ocean)]">
              {solFromLamports(s.payoutLamports).toFixed(3)} SOL
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-lg border border-[var(--hairline)] bg-[rgba(255,255,255,0.04)] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--ink-muted)]">
            <Radio size={15} className="text-[var(--ocean)]" aria-hidden />
            Devnet settlement
          </span>
          {result ? (
            <a
              href={result.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-bold text-[var(--ocean)] underline"
            >
              View payout tx
              <ArrowRight size={15} aria-hidden />
            </a>
          ) : (
            <button
              className="btn btn-primary text-sm"
              disabled={claiming || !inMoney}
              onClick={onClaim}
            >
              <BadgeDollarSign size={16} aria-hidden />
              {claiming
                ? "Settling..."
                : inMoney
                  ? "Claim prize share"
                  : "No payout"}
            </button>
          )}
        </div>
        {result && (
          <p className="mt-3 text-xs leading-5 text-[var(--ink-muted)]">
            Settled on-chain by the vault program: your tier share to you, 3% rake
            to the treasury. In this solo demo the vault holds only your real
            deposit, so the on-chain amount is your share of that single deposit —
            the prizes above assume a full field of real players. The exact
            lamports are visible in the tx.
          </p>
        )}
        {msg && (
          <p className="mt-3 text-xs leading-5 text-[var(--ink-muted)]">{msg}</p>
        )}
      </div>

      <Link href="/lobby" className="btn btn-ghost w-full">
        Back to lobby
      </Link>
    </div>
  );
}

function PriceHeader({
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
  const shown = resolved ? endPrice ?? price : price;
  const delta = reference ? ((shown - reference) / reference) * 100 : 0;
  const positive = delta > 0.001;
  const negative = delta < -0.001;
  const color = positive ? "var(--up)" : negative ? "var(--down)" : "var(--flat)";
  const Trend = positive ? TrendingUp : negative ? TrendingDown : Radio;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-end">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="chip text-[var(--ink-muted)]">{market}</span>
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
          [ {market} · tournament round starting ]
        </div>
      </div>
    </motion.div>
  );
}
