"use client";

import { useEffect, useState } from "react";
import { ArrowRight, BadgeDollarSign, Clock3, Radio, Trophy, Users } from "lucide-react";
import type { Room } from "@/lib/game/types";
import { solFromLamports } from "@/lib/config";
import { computePrizeBreakdown } from "@/lib/game/tournament";

function useCountdown(target?: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  return target ? Math.max(0, target - now) : 0;
}

function fmt(ms: number): string {
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default function TournamentCard({
  room,
  onEnter,
  busy,
}: {
  room: Room;
  onEnter: (room: Room) => void;
  busy?: boolean;
}) {
  const remaining = useCountdown(room.startsAt);
  const entrySol = solFromLamports(room.entryFeeLamports);
  // Prize pool is the sum of every seat's entry fee (full committed field).
  const poolLamports = room.entryFeeLamports * room.maxPlayers;
  const poolSol = solFromLamports(poolLamports);
  const { payouts } = computePrizeBreakdown(poolLamports);
  const firstPrize = solFromLamports(payouts[0] ?? 0);

  const live = room.status === "active";
  const finished = room.status === "finished";
  const starting = !live && !finished && remaining <= 0;

  const statusChip = finished
    ? { label: "Finished", cls: "border-[var(--hairline)] bg-[rgba(255,255,255,0.04)] text-[var(--ink-muted)]" }
    : live
      ? { label: "Live", cls: "border-[rgba(0,255,163,0.3)] bg-[rgba(0,255,163,0.07)] text-[var(--surge)]" }
      : starting
        ? { label: "Starting", cls: "border-[rgba(245,165,36,0.32)] bg-[rgba(245,165,36,0.08)] text-[var(--flat)]" }
        : { label: "Registering", cls: "border-[rgba(3,225,255,0.3)] bg-[rgba(3,225,255,0.07)] text-[var(--ocean)]" };

  return (
    <article className="app-panel group relative flex min-h-full flex-col gap-4 overflow-hidden p-5 transition hover:-translate-y-1 hover:border-[rgba(220,31,255,0.4)]">
      <div className="signal-scan" />
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink-muted)]">
            <Trophy size={15} className="text-[var(--purple)]" aria-hidden />
            {room.market} tournament
          </div>
          <h3 className="mt-2 font-display text-3xl font-black">
            {poolSol.toFixed(3)} SOL
            <span className="ml-2 align-middle text-xs font-bold uppercase tracking-[0.1em] text-[var(--ink-muted)]">
              prize pool
            </span>
          </h3>
          <div className="mt-1 text-xs text-[var(--ink-muted)]">
            {entrySol} SOL × {room.maxPlayers} seats
          </div>
        </div>
        <span className={`chip ${statusChip.cls}`}>
          <span className="status-dot" />
          {statusChip.label}
        </span>
      </div>

      {!live && !finished && (
        <div className="flex items-center gap-3 rounded-lg border border-[rgba(220,31,255,0.28)] bg-[rgba(220,31,255,0.06)] px-4 py-3">
          <Clock3 size={20} className="text-[var(--purple)]" aria-hidden />
          <div>
            <div className="text-xs font-bold uppercase tracking-[0.1em] text-[var(--ink-muted)]">
              {starting ? "Field is locking in" : "Starts in"}
            </div>
            <div className="font-display text-2xl font-black">
              {starting ? "now" : fmt(remaining)}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-4 gap-2">
        <Stat icon={BadgeDollarSign} label="Entry" value={`${entrySol}`} />
        <Stat label="1st prize" value={`${firstPrize.toFixed(2)}`} accent />
        <Stat icon={Users} label="Field" value={`${room.maxPlayers}`} />
        <Stat icon={Radio} label="Rounds" value={`${room.totalRounds}`} />
      </div>

      <button
        className="btn btn-primary mt-auto w-full"
        disabled={busy || finished}
        onClick={() => onEnter(room)}
      >
        {busy
          ? "Opening..."
          : finished
            ? "Tournament over"
            : live
              ? "Spectate / join"
              : "Register"}
        <ArrowRight size={17} aria-hidden />
      </button>
    </article>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon?: typeof Users;
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="metric-tile clip-corner p-2.5">
      <div className="flex items-center gap-1 text-[var(--ocean)]">
        {Icon && <Icon size={12} aria-hidden />}
        <span className="metric-label">{label}</span>
      </div>
      <div className={`metric-value text-sm ${accent ? "text-[var(--ocean)]" : ""}`}>
        {value}
      </div>
    </div>
  );
}
