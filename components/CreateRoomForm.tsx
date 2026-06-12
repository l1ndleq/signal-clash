"use client";

import { useState } from "react";
import { BadgeDollarSign, Plus, Radio, Timer, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  ENTRY_FEE_PRESETS_SOL,
  MAX_ENTRY_FEE_SOL,
  MAX_PLAYERS_OPTIONS,
  MIN_ENTRY_FEE_SOL,
  ROUND_DURATION_OPTIONS,
  ROUND_DURATION_SECONDS,
} from "@/lib/config";
import { MARKET_LIST } from "@/lib/game/markets";
import type { Market } from "@/lib/game/types";

export default function CreateRoomForm({
  disabled,
  onCreate,
}: {
  disabled?: boolean;
  onCreate: (
    market: Market,
    entryFeeSol: number,
    maxPlayers: number,
    roundSeconds: number,
  ) => void;
}) {
  const [market, setMarket] = useState<Market>(MARKET_LIST[0]);
  const [fee, setFee] = useState<number>(ENTRY_FEE_PRESETS_SOL[0]);
  const [maxPlayers, setMaxPlayers] = useState<number>(MAX_PLAYERS_OPTIONS[0]);
  const [roundSeconds, setRoundSeconds] = useState<number>(
    ROUND_DURATION_SECONDS,
  );

  const feeValid =
    Number.isFinite(fee) && fee >= MIN_ENTRY_FEE_SOL && fee <= MAX_ENTRY_FEE_SOL;
  const prizePool = feeValid ? (fee * maxPlayers).toFixed(3) : "-";

  return (
    <div className="app-panel flex flex-col gap-5 p-5">
      <div>
        <div className="app-kicker">
          <Plus size={15} aria-hidden />
          Create a room
        </div>
        <h3 className="mt-4 font-display text-3xl font-bold">
          Launch a signal clash
        </h3>
        <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
          Pick market, seats, and devnet SOL entry fee. The match resolves over
          five fast rounds.
        </p>
      </div>

      <Field icon={Radio} label="Market">
        <div className="grid grid-cols-3 gap-2">
          {MARKET_LIST.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMarket(m)}
              className={`btn min-h-11 px-2 ${
                market === m ? "btn-primary" : "btn-ghost"
              }`}
            >
              {m.replace("/USD", "")}
            </button>
          ))}
        </div>
      </Field>

      <Field icon={Users} label="Players">
        <div className="grid grid-cols-4 gap-2">
          {MAX_PLAYERS_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setMaxPlayers(n)}
              className={`btn min-h-11 px-2 ${
                maxPlayers === n ? "btn-primary" : "btn-ghost"
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </Field>

      <Field icon={Timer} label="Round time">
        <div className="grid grid-cols-3 gap-2">
          {ROUND_DURATION_OPTIONS.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setRoundSeconds(s)}
              className={`btn min-h-11 px-2 ${
                roundSeconds === s ? "btn-primary" : "btn-ghost"
              }`}
            >
              {s}s
            </button>
          ))}
        </div>
      </Field>

      <Field icon={BadgeDollarSign} label="Entry fee (devnet SOL)">
        <div className="grid grid-cols-3 gap-2">
          {ENTRY_FEE_PRESETS_SOL.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setFee(preset)}
              className={`btn min-h-11 px-2 ${
                fee === preset ? "btn-primary" : "btn-ghost"
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
        <input
          type="number"
          min={MIN_ENTRY_FEE_SOL}
          max={MAX_ENTRY_FEE_SOL}
          step={0.001}
          value={fee}
          onChange={(e) => setFee(Number(e.target.value))}
          className="mt-2 w-full rounded-lg border border-[var(--hairline)] bg-[rgba(255,255,255,0.045)] px-3 py-3 font-num text-sm outline-none transition focus:border-[var(--ocean)] focus:ring-2 focus:ring-[rgba(3,225,255,0.18)]"
          placeholder="Custom amount"
        />
        {!feeValid && (
          <p className="mt-2 text-xs font-semibold text-[var(--magenta)]">
            Enter {MIN_ENTRY_FEE_SOL}-{MAX_ENTRY_FEE_SOL} SOL.
          </p>
        )}
      </Field>

      <div className="metric-tile clip-corner flex items-center justify-between">
        <span>
          <span className="metric-label block">Prize pool if filled</span>
          <span className="mt-1 block text-xs text-[var(--ink-muted)]">
            Devnet only, no mainnet funds
          </span>
        </span>
        <span className="font-num text-xl font-black text-[var(--ocean)]">
          {prizePool} SOL
        </span>
      </div>

      <button
        className="btn btn-primary min-h-12 w-full text-base"
        disabled={disabled || !feeValid}
        onClick={() => onCreate(market, fee, maxPlayers, roundSeconds)}
      >
        {disabled ? "Connect wallet" : "Create room"}
        <Plus size={18} aria-hidden />
      </button>
    </div>
  );
}

function Field({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: LucideIcon;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="hud-label mb-2 flex items-center gap-2">
        <Icon size={14} className="text-[var(--ocean)]" aria-hidden />
        {label}
      </div>
      {children}
    </div>
  );
}
