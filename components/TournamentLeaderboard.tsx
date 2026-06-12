"use client";

import { useEffect, useRef, useState } from "react";
import { Crown, Trophy } from "lucide-react";
import type { Room } from "@/lib/game/types";
import type { MatchPhase } from "@/lib/game/matchController";
import { rankStandings, PAID_PLACES } from "@/lib/game/tournament";
import { solFromLamports } from "@/lib/config";
import { shortAddress } from "@/lib/solana/client";

const MEDAL = ["#ffd24a", "#c8d2dc", "#e2954a"]; // gold / silver / bronze

export default function TournamentLeaderboard({
  room,
  myWallet,
  phase,
}: {
  room: Room;
  myWallet: string;
  phase: MatchPhase;
}) {
  const standings = rankStandings(room);
  const mine = standings.find((s) => s.wallet === myWallet);
  const field = standings.length;

  // --- live score-delta pops (mirror of Scoreboard) ---
  const prevScoresRef = useRef<Record<string, number>>({});
  const [deltas, setDeltas] = useState<Record<string, number>>({});

  useEffect(() => {
    if (phase === "round-active") {
      for (const s of standings) prevScoresRef.current[s.wallet] = s.score;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  useEffect(() => {
    if (phase !== "round-resolved") return;
    const next: Record<string, number> = {};
    for (const s of standings) {
      const prev = prevScoresRef.current[s.wallet];
      if (prev !== undefined && s.score !== prev) next[s.wallet] = s.score - prev;
    }
    if (Object.keys(next).length > 0) {
      setDeltas(next);
      const t = setTimeout(() => setDeltas({}), 2200);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, room.players]);

  return (
    <aside className="app-panel flex flex-col gap-4 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="app-eyebrow">
            <Trophy size={15} aria-hidden />
            ⬡ Tournament standings
          </div>
          <h3 className="mt-2 font-display text-2xl font-bold">
            {field}-player field
          </h3>
        </div>
        <span className="chip text-[var(--ink-muted)]">
          Round {Math.min(room.currentRoundIndex + 1, room.totalRounds)}/
          {room.totalRounds}
        </span>
      </div>

      {/* Your rank summary, always visible even if you're mid-pack */}
      {mine && (
        <div
          className="clip-corner border p-3"
          style={{
            borderColor:
              mine.rank <= PAID_PLACES
                ? "rgba(0,255,163,0.4)"
                : "rgba(3,225,255,0.3)",
            background:
              mine.rank <= PAID_PLACES
                ? "linear-gradient(90deg, rgba(0,255,163,0.12), rgba(3,225,255,0.04))"
                : "rgba(3,225,255,0.06)",
          }}
        >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--ink-muted)]">
                Your position
              </div>
              <div className="mt-1 font-display text-2xl font-black">
                #{mine.rank}{" "}
                <span className="text-sm font-bold text-[var(--ink-muted)]">
                  / {field}
                </span>
              </div>
            </div>
            <div className="text-right">
              <div className="font-num text-2xl font-black">{mine.score}</div>
              {mine.rank <= PAID_PLACES ? (
                <div className="text-xs font-bold text-[var(--surge)]">
                  in the money · {solFromLamports(mine.payoutLamports).toFixed(3)} SOL
                </div>
              ) : (
                <div className="text-xs font-semibold text-[var(--ink-muted)]">
                  top {PAID_PLACES} pays
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="flex max-h-[28rem] flex-col gap-1.5 overflow-y-auto pr-1">
        {standings.map((s) => {
          const isMe = s.wallet === myWallet;
          const paid = s.rank <= PAID_PLACES;
          const delta = deltas[s.wallet];
          return (
            <div
              key={s.wallet}
              className="relative grid grid-cols-[1.6rem_1fr_auto] items-center gap-2 clip-corner border px-2.5 py-2"
              style={{
                borderColor: isMe
                  ? "rgba(3,225,255,0.5)"
                  : paid
                    ? "rgba(0,255,163,0.22)"
                    : "var(--hairline)",
                background: isMe
                  ? "rgba(3,225,255,0.08)"
                  : paid
                    ? "rgba(0,255,163,0.05)"
                    : "rgba(255,255,255,0.025)",
              }}
            >
              <span
                className="font-num text-sm font-black"
                style={{ color: MEDAL[s.rank - 1] ?? "var(--ink-muted)" }}
              >
                {s.rank}
              </span>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="truncate font-display text-sm font-bold">
                    {isMe ? "You" : s.displayName ?? "Signal Bot"}
                  </span>
                  {s.rank === 1 && (
                    <Crown size={13} style={{ color: MEDAL[0] }} aria-hidden />
                  )}
                </div>
                {paid && (
                  <div className="font-num text-[0.66rem] font-bold text-[var(--surge)]">
                    {solFromLamports(s.payoutLamports).toFixed(3)} SOL
                  </div>
                )}
              </div>
              <div className="relative text-right">
                {delta !== undefined && (
                  <div
                    className="score-delta-pop absolute -top-2 right-0 font-num text-xs font-black"
                    style={{ color: delta >= 0 ? "var(--surge)" : "var(--magenta)" }}
                  >
                    {delta >= 0 ? "+" : ""}{delta}
                  </div>
                )}
                <span className="font-num text-base font-black">{s.score}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="clip-corner border border-[rgba(0,255,163,0.22)] bg-[rgba(0,255,163,0.05)] px-3 py-2 text-center text-xs font-semibold text-[var(--ink-muted)]">
        <span className="text-[var(--surge)]">Top {PAID_PLACES}</span> split the
        pool 50 / 30 / 20
      </div>
    </aside>
  );
}
