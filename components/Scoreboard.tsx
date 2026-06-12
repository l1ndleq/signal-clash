"use client";

import { useEffect, useRef, useState } from "react";
import { Crown, Radio, Trophy } from "lucide-react";
import type { Room } from "@/lib/game/types";
import type { MatchPhase } from "@/lib/game/matchController";
import { shortAddress } from "@/lib/solana/client";

export default function Scoreboard({
  room,
  myWallet,
  phase,
}: {
  room: Room;
  myWallet: string;
  phase: MatchPhase;
}) {
  const wallets = Object.keys(room.players).sort(
    (a, b) => room.players[b].score - room.players[a].score,
  );
  const leader = topWallet(room);

  // --- score delta tracking ---
  const prevScoresRef = useRef<Record<string, number>>({});
  const [deltas, setDeltas] = useState<Record<string, number>>({});

  // Capture baseline scores when a new round goes active
  useEffect(() => {
    if (phase === "round-active") {
      for (const [w, p] of Object.entries(room.players)) {
        prevScoresRef.current[w] = p.score;
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  // Compute deltas when round resolves
  useEffect(() => {
    if (phase !== "round-resolved") return;
    const newDeltas: Record<string, number> = {};
    for (const [w, p] of Object.entries(room.players)) {
      const prev = prevScoresRef.current[w];
      if (prev !== undefined && p.score !== prev) {
        newDeltas[w] = p.score - prev;
      }
    }
    if (Object.keys(newDeltas).length > 0) {
      setDeltas(newDeltas);
      const timer = setTimeout(() => setDeltas({}), 2200);
      return () => clearTimeout(timer);
    }
  }, [phase, room.players]);

  const currentRound = room.rounds[room.currentRoundIndex];

  return (
    <aside className="app-panel flex flex-col gap-5 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="app-eyebrow">
            <Trophy size={15} aria-hidden />
            Live scoreboard
          </div>
          <h3 className="mt-2 font-display text-2xl font-bold">
            Player vs signal
          </h3>
        </div>
        <span className="chip text-[var(--ink-muted)]">
          Round {Math.min(room.currentRoundIndex + 1, room.totalRounds)}/
          {room.totalRounds}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {wallets.map((w, index) => {
          const p = room.players[w];
          const isMe = w === myWallet;
          const isLeader = w === leader && p.score !== 0;
          const delta = deltas[w];

          // Bot activity: has the bot locked this round?
          const botLocked = !isMe
            ? currentRound?.predictions.some((pred) => pred.player === w && pred.locked) ?? false
            : false;
          const showBotStatus = !isMe && phase === "round-active";

          return (
            <div
              key={w}
              className="relative clip-corner border p-3"
              style={{
                background: isLeader
                  ? "linear-gradient(90deg, rgba(0,255,163,0.12), rgba(3,225,255,0.04))"
                  : "rgba(255,255,255,0.04)",
                borderColor: isLeader ? "rgba(0,255,163,0.38)" : "var(--hairline)",
              }}
            >
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-num text-xs text-[var(--ink-muted)]">
                      #{index + 1}
                    </span>
                    <span className="truncate font-display text-lg font-bold">
                      {isMe ? "You" : p.displayName ?? "Signal Bot"}
                    </span>
                    {isLeader && (
                      <Crown size={15} className="text-[var(--surge)]" aria-hidden />
                    )}
                  </div>
                  <div className="mt-0.5 font-num text-[0.72rem] text-[var(--ink-muted)]">
                    {shortAddress(w)}
                  </div>
                  {showBotStatus && (
                    <div className="mt-1.5">
                      {botLocked ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-[var(--surge)]">
                          ✓ locked in
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-[var(--ink-muted)]">
                          <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-[var(--ink-muted)]" />
                          <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-[var(--ink-muted)]" />
                          <span className="thinking-dot h-1.5 w-1.5 rounded-full bg-[var(--ink-muted)]" />
                          <span className="ml-0.5">thinking</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
                <div className="relative text-right">
                  {delta !== undefined && (
                    <div
                      className="score-delta-pop absolute -top-1 right-0 font-num text-sm font-black"
                      style={{ color: delta >= 0 ? "var(--surge)" : "var(--magenta)" }}
                    >
                      {delta >= 0 ? "+" : ""}{delta}
                    </div>
                  )}
                  <div className="font-num text-3xl font-black">{p.score}</div>
                  <div className="text-xs font-semibold text-[var(--ink-muted)]">
                    streak x{p.streak}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div>
        <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
          <Radio size={14} className="text-[var(--ocean)]" aria-hidden />
          Round track
        </div>
        <RoundStrip room={room} />
      </div>
    </aside>
  );
}

function RoundStrip({ room }: { room: Room }) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {Array.from({ length: room.totalRounds }).map((_, i) => {
        const round = room.rounds[i];
        const resolved = round?.status === "resolved";
        const active = round?.status === "active";
        return (
          <div
            key={i}
            title={`Round ${i + 1}`}
            className="h-2 rounded-full"
            style={{
              background: resolved
                ? "var(--surge)"
                : active
                  ? "var(--ocean)"
                  : "rgba(255,255,255,0.08)",
              boxShadow: active ? "0 0 18px rgba(3,225,255,0.55)" : "none",
            }}
          />
        );
      })}
    </div>
  );
}

function topWallet(room: Room): string | null {
  const wallets = Object.keys(room.players);
  if (wallets.length === 0) return null;
  return wallets.reduce((best, w) =>
    room.players[w].score > room.players[best].score ? w : best,
  );
}
