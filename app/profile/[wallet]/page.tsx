"use client";

import { useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import {
  ArrowLeft,
  Crosshair,
  Flame,
  Gauge,
  Swords,
  Trophy,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Header from "@/components/Header";
import {
  computeStats,
  subscribePlayerStats,
  historySnapshot,
  historyServerSnapshot,
  displayNameFor,
  type MatchRecord,
} from "@/lib/state/playerStats";

export default function ProfilePage() {
  const params = useParams<{ wallet: string }>();
  const wallet = params.wallet;
  const { publicKey } = useWallet();
  const isMe = publicKey?.toBase58() === wallet;

  // External-store read bound to this wallet (SSR-safe, no setState-in-effect).
  const getSnap = useCallback(() => historySnapshot(wallet), [wallet]);
  const getServerSnap = useCallback(() => historyServerSnapshot(wallet), [wallet]);
  const history = useSyncExternalStore(subscribePlayerStats, getSnap, getServerSnap);
  const data = { history, stats: computeStats(wallet, history) };

  return (
    <div className="app-shell flex min-h-screen flex-col text-white">
      <Header />
      <main className="app-main">
        <Link
          href="/leaderboard"
          className="inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white"
        >
          <ArrowLeft size={16} aria-hidden />
          Back to leaderboard
        </Link>

        <section className="app-hero mt-4 p-5 md:p-8">
          <div className="flex flex-wrap items-center gap-4">
            <span
              className="grid h-14 w-14 place-items-center rounded-full text-xl font-bold text-black"
              style={{ backgroundImage: "var(--gradient-solana)" }}
            >
              {displayNameFor(wallet).slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <h1 className="truncate text-3xl font-medium tracking-tight md:text-4xl">
                {displayNameFor(wallet)}
                {isMe && (
                  <span className="ml-3 align-middle text-xs font-medium text-[#14F195]">
                    you
                  </span>
                )}
              </h1>
              <p className="mt-1 break-all font-num text-xs text-white/50">{wallet}</p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
            <Stat icon={Swords} label="Matches" value={`${data.stats.matches}`} />
            <Stat
              icon={Trophy}
              label="Win rate"
              value={`${Math.round(data.stats.winRate * 100)}%`}
              accent="#14F195"
            />
            <Stat icon={Gauge} label="Total score" value={`${data.stats.totalScore}`} />
            <Stat icon={Flame} label="Best streak" value={`${data.stats.bestStreak}`} />
          </div>
        </section>

        <div className="mt-3 grid grid-cols-3 gap-3">
          <Stat icon={Trophy} label="Wins" value={`${data.stats.wins}`} accent="#14F195" tile />
          <Stat icon={Swords} label="Losses" value={`${data.stats.losses}`} accent="#FF5C7C" tile />
          <Stat icon={Crosshair} label="Accuracy" value={`${Math.round(data.stats.accuracy * 100)}%`} tile />
        </div>

        <section className="app-panel mt-6 p-5 md:p-6">
          <h2 className="text-xl font-medium">Match history</h2>
          {data.history.length === 0 ? (
            <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-6 text-center text-sm text-white/60">
              No matches yet.{" "}
              <Link href="/lobby" className="text-[#03E1FF] underline">
                Enter the arena
              </Link>{" "}
              to start a history.
            </div>
          ) : (
            <ul className="mt-4 flex flex-col gap-2">
              {data.history.map((m) => (
                <HistoryRow key={m.id} m={m} />
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
  tile,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  accent?: string;
  tile?: boolean;
}) {
  return (
    <div
      className={
        tile
          ? "rounded-xl border border-white/10 bg-white/[0.03] p-4"
          : "rounded-xl border border-white/10 bg-white/[0.04] p-4"
      }
    >
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-white/50">
        <Icon size={14} aria-hidden />
        {label}
      </div>
      <div
        className="mt-2 font-num text-2xl font-bold"
        style={{ color: accent ?? "#fff" }}
      >
        {value}
      </div>
    </div>
  );
}

const RESULT_STYLE: Record<
  MatchRecord["result"],
  { label: string; color: string }
> = {
  win: { label: "WIN", color: "#14F195" },
  loss: { label: "LOSS", color: "#FF5C7C" },
  draw: { label: "DRAW", color: "#F5A524" },
};

function HistoryRow({ m }: { m: MatchRecord }) {
  const r = RESULT_STYLE[m.result];
  return (
    <li className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3">
      <span
        className="rounded-md px-2 py-1 text-xs font-bold"
        style={{ color: r.color, background: `${r.color}1a` }}
      >
        {r.label}
      </span>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium text-white">
          {m.market} · vs {m.opponentName}
        </div>
        <div className="text-xs text-white/50">
          {new Date(m.ts).toLocaleDateString()} · {m.rounds} rounds ·{" "}
          {m.correct}/{m.total} correct
        </div>
      </div>
      <div className="text-right font-num">
        <span className="text-base font-bold" style={{ color: r.color }}>
          {m.myScore}
        </span>
        <span className="text-white/40"> – {m.opponentScore}</span>
      </div>
    </li>
  );
}
