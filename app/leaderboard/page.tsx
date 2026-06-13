"use client";

import { useSyncExternalStore } from "react";
import Link from "next/link";
import { Trophy, Crown } from "lucide-react";
import Header from "@/components/Header";
import {
  subscribePlayerStats,
  leaderboardSnapshot,
  leaderboardServerSnapshot,
  displayNameFor,
} from "@/lib/state/playerStats";

const MEDAL = ["#FFD479", "#C9D2DD", "#E0A372"]; // gold / silver / bronze

export default function LeaderboardPage() {
  // External-store read: SSR-safe, no setState-in-effect.
  const rows = useSyncExternalStore(
    subscribePlayerStats,
    leaderboardSnapshot,
    leaderboardServerSnapshot,
  );

  return (
    <div className="app-shell flex min-h-screen flex-col text-white">
      <Header />
      <main className="app-main">
        <section className="app-hero p-5 md:p-8">
          <div className="app-kicker">
            <Trophy size={15} aria-hidden />
            Global leaderboard
          </div>
          <h1 className="mt-4 text-4xl font-medium tracking-tighter md:text-6xl">
            Top signal readers
          </h1>
          <p className="mt-3 max-w-2xl text-base leading-relaxed text-white/70">
            Ranked by wins, then total score. Click any player to open their
            profile, match history, and stats.
          </p>
        </section>

        <section className="app-panel mt-6 overflow-hidden p-0">
          {/* header row */}
          <div className="hidden grid-cols-[3rem_1fr_5rem_5rem_6rem_5rem] gap-3 border-b border-white/10 px-5 py-3 text-xs font-medium uppercase tracking-wide text-white/50 sm:grid">
            <span>#</span>
            <span>Player</span>
            <span className="text-right">W</span>
            <span className="text-right">L</span>
            <span className="text-right">Win&nbsp;%</span>
            <span className="text-right">Score</span>
          </div>

          {rows.length === 0 ? (
            <Empty>No matches recorded yet — play a match to appear here.</Empty>
          ) : (
            <ul>
              {rows.map((p, i) => (
                <li key={p.wallet}>
                  <Link
                    href={`/profile/${p.wallet}`}
                    className="grid grid-cols-[3rem_1fr_auto] items-center gap-3 border-b border-white/[0.06] px-5 py-4 transition-colors hover:bg-white/[0.04] sm:grid-cols-[3rem_1fr_5rem_5rem_6rem_5rem]"
                  >
                    <span
                      className="inline-flex items-center gap-1 font-num text-lg font-bold"
                      style={{ color: MEDAL[i] ?? "rgba(255,255,255,0.5)" }}
                    >
                      {i === 0 && <Crown size={16} aria-hidden />}
                      {i + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-white">
                        {displayNameFor(p.wallet)}
                      </span>
                      <span className="block text-xs text-white/50 sm:hidden">
                        {p.wins}W · {p.losses}L · {Math.round(p.winRate * 100)}% ·{" "}
                        {p.totalScore} pts
                      </span>
                    </span>
                    <span className="hidden text-right font-num text-white/80 sm:block">
                      {p.wins}
                    </span>
                    <span className="hidden text-right font-num text-white/80 sm:block">
                      {p.losses}
                    </span>
                    <span
                      className="hidden text-right font-num sm:block"
                      style={{ color: "#14F195" }}
                    >
                      {Math.round(p.winRate * 100)}%
                    </span>
                    <span className="hidden text-right font-num font-bold text-white sm:block">
                      {p.totalScore}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="px-5 py-12 text-center text-sm text-white/50">{children}</div>;
}
