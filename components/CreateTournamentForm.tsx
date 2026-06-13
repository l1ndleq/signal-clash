"use client";

import { useEffect, useState } from "react";
import { BadgeDollarSign, Clock3, Radio, Timer, Trophy, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import {
  ENTRY_FEE_PRESETS_SOL,
  DEFAULT_TOURNAMENT_FIELD,
  MAX_ENTRY_FEE_SOL,
  MIN_ENTRY_FEE_SOL,
  ROUND_DURATION_OPTIONS,
  ROUND_DURATION_SECONDS,
  TOURNAMENT_FIELD_OPTIONS,
  TOURNAMENT_ROUND_OPTIONS,
} from "@/lib/config";
import { computePrizeBreakdown } from "@/lib/game/tournament";
import { lamports, solFromLamports } from "@/lib/config";
import { MARKET_LIST } from "@/lib/game/markets";
import type { Market } from "@/lib/game/types";

/** Format a Date as a `datetime-local` value string in the user's timezone. */
function toLocalInputValue(d: Date): string {
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

export default function CreateTournamentForm({
  disabled,
  onCreate,
}: {
  disabled?: boolean;
  onCreate: (
    market: Market,
    entryFeeSol: number,
    field: number,
    rounds: number,
    startsAtMs: number,
    roundSeconds: number,
  ) => void;
}) {
  const [market, setMarket] = useState<Market>(MARKET_LIST[0]);
  const [fee, setFee] = useState<number>(ENTRY_FEE_PRESETS_SOL[0]);
  const [field, setField] = useState<number>(DEFAULT_TOURNAMENT_FIELD);
  const [rounds, setRounds] = useState<number>(TOURNAMENT_ROUND_OPTIONS[1]);
  // Default the start to 5 minutes from now, editable as an exact date + time.
  const [startAt, setStartAt] = useState<string>(() =>
    toLocalInputValue(new Date(Date.now() + 5 * 60_000)),
  );
  const [roundSeconds, setRoundSeconds] = useState<number>(
    ROUND_DURATION_SECONDS,
  );
  // Live clock so the "in the future" check stays accurate without calling
  // Date.now() during render (React Compiler purity).
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const startsAtMs = new Date(startAt).getTime();
  const startValid = Number.isFinite(startsAtMs) && startsAtMs > now;

  const feeValid =
    Number.isFinite(fee) && fee >= MIN_ENTRY_FEE_SOL && fee <= MAX_ENTRY_FEE_SOL;

  const poolLamports = feeValid ? lamports(fee) * field : 0;
  const { payouts, rakeLamports } = computePrizeBreakdown(poolLamports);

  return (
    <div className="app-panel flex flex-col gap-5 p-5">
      <div>
        <div className="app-kicker">
          <Trophy size={15} aria-hidden />
          Host a tournament
        </div>
        <h3 className="mt-4 font-display text-3xl font-bold">Schedule a clash</h3>
        <p className="mt-2 text-sm leading-6 text-[var(--ink-muted)]">
          Set the field, rounds, and an exact start date and time. Top 3 split
          the pool 50 / 30 / 20 after a 3% platform rake.
        </p>
      </div>

      <Field icon={Radio} label="Market">
        <div className="grid grid-cols-3 gap-2">
          {MARKET_LIST.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMarket(m)}
              className={`btn min-h-11 px-2 ${market === m ? "btn-primary" : "btn-ghost"}`}
            >
              {m.replace("/USD", "")}
            </button>
          ))}
        </div>
      </Field>

      <Field icon={Users} label="Field size">
        <div className="grid grid-cols-3 gap-2">
          {TOURNAMENT_FIELD_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setField(n)}
              className={`btn min-h-11 px-2 ${field === n ? "btn-primary" : "btn-ghost"}`}
            >
              {n}
            </button>
          ))}
        </div>
      </Field>

      <Field icon={Radio} label="Rounds">
        <div className="grid grid-cols-3 gap-2">
          {TOURNAMENT_ROUND_OPTIONS.map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => setRounds(n)}
              className={`btn min-h-11 px-2 ${rounds === n ? "btn-primary" : "btn-ghost"}`}
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
              className={`btn min-h-11 px-2 ${roundSeconds === s ? "btn-primary" : "btn-ghost"}`}
            >
              {s}s
            </button>
          ))}
        </div>
      </Field>

      <Field icon={Clock3} label="Start date & time">
        <input
          type="datetime-local"
          value={startAt}
          onChange={(e) => setStartAt(e.target.value)}
          className="w-full rounded-lg border border-[var(--hairline)] bg-[rgba(255,255,255,0.045)] px-3 py-3 font-num text-sm outline-none transition focus:border-[var(--ocean)] focus:ring-2 focus:ring-[rgba(3,225,255,0.18)] [color-scheme:dark]"
        />
        {startValid ? (
          <p className="mt-2 text-xs text-[var(--ink-muted)]">
            Starts {new Date(startsAtMs).toLocaleString()}
          </p>
        ) : (
          <p className="mt-2 text-xs font-semibold text-[var(--magenta)]">
            Pick a date and time in the future.
          </p>
        )}
      </Field>

      <Field icon={BadgeDollarSign} label="Entry fee (devnet SOL)">
        <div className="grid grid-cols-3 gap-2">
          {ENTRY_FEE_PRESETS_SOL.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setFee(preset)}
              className={`btn min-h-11 px-2 ${fee === preset ? "btn-primary" : "btn-ghost"}`}
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

      <div className="metric-tile clip-corner p-4">
        <div className="flex items-center justify-between">
          <span className="metric-label">Prize pool if filled</span>
          <span className="font-num text-xl font-black text-[var(--ocean)]">
            {solFromLamports(poolLamports).toFixed(3)} SOL
          </span>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-center">
          {payouts.map((p, i) => (
            <div key={i} className="metric-tile clip-corner p-2">
              <div className="metric-label">{["1st", "2nd", "3rd"][i]}</div>
              <div className="metric-value text-sm">
                {solFromLamports(p).toFixed(3)}
              </div>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-[var(--ink-muted)]">
          Platform rake 3% · {solFromLamports(rakeLamports).toFixed(3)} SOL
        </p>
      </div>

      <button
        className="btn btn-primary min-h-12 w-full text-base"
        disabled={disabled || !feeValid || !startValid}
        onClick={() =>
          onCreate(market, fee, field, rounds, startsAtMs, roundSeconds)
        }
      >
        {disabled ? "Connect wallet" : "Create tournament"}
        <Trophy size={18} aria-hidden />
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
