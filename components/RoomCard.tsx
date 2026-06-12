"use client";

import { ArrowRight, BadgeDollarSign, Radio, Users } from "lucide-react";
import type { Room } from "@/lib/game/types";
import { solFromLamports } from "@/lib/config";
import { shortAddress } from "@/lib/solana/client";

const STATUS_LABEL: Record<Room["status"], string> = {
  waiting: "Open",
  active: "Live",
  finished: "Finished",
};

const STATUS_CLASS: Record<Room["status"], string> = {
  waiting: "border-[rgba(3,225,255,0.3)] bg-[rgba(3,225,255,0.07)] text-[var(--ocean)]",
  active: "border-[rgba(0,255,163,0.3)] bg-[rgba(0,255,163,0.07)] text-[var(--surge)]",
  finished: "border-[var(--hairline)] bg-[rgba(255,255,255,0.04)] text-[var(--ink-muted)]",
};

export default function RoomCard({
  room,
  onPlay,
  busy,
}: {
  room: Room;
  onPlay: (room: Room) => void;
  busy?: boolean;
}) {
  const seats = Object.keys(room.players).length;
  const entrySol = solFromLamports(room.entryFeeLamports);
  const prizeSol = solFromLamports(room.prizePoolLamports);

  return (
    <article className="app-panel group flex min-h-full flex-col gap-4 p-4 transition hover:-translate-y-1 hover:border-[rgba(3,225,255,0.38)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink-muted)]">
            <Radio size={15} className="text-[var(--ocean)]" aria-hidden />
            {room.market}
          </div>
          <h3 className="mt-2 font-display text-2xl font-bold">
            Arena #{room.id}
          </h3>
        </div>
        <span className={`chip ${STATUS_CLASS[room.status]}`}>
          <span className="status-dot" />
          {STATUS_LABEL[room.status]}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Stat label="Entry" value={`${entrySol} SOL`} />
        <Stat label="Prize" value={`${prizeSol} SOL`} accent />
        <Stat label="Rounds" value={`${room.totalRounds}`} />
      </div>

      <div className="flex items-center justify-between rounded-lg border border-[var(--hairline)] bg-[rgba(255,255,255,0.035)] px-3 py-2 text-xs text-[var(--ink-muted)]">
        <span>Creator {shortAddress(room.creator)}</span>
        <span className="inline-flex items-center gap-1">
          <Users size={13} aria-hidden />
          {seats}/{room.maxPlayers}
        </span>
      </div>

      <button
        className="btn btn-primary mt-auto w-full"
        disabled={busy || room.status === "finished"}
        onClick={() => onPlay(room)}
      >
        {busy ? "Opening..." : room.status === "waiting" ? "Join arena" : "Enter room"}
        <ArrowRight size={17} aria-hidden />
      </button>
    </article>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="metric-tile clip-corner p-3">
      <div className="metric-label">{label}</div>
      <div
        className={`metric-value text-sm ${
          accent ? "text-[var(--ocean)]" : ""
        }`}
      >
        {accent && <BadgeDollarSign className="mr-1 inline" size={14} aria-hidden />}
        {value}
      </div>
    </div>
  );
}
