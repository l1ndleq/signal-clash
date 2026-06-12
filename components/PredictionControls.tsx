"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Lock, Minus, TrendingDown, TrendingUp, Zap } from "lucide-react";
import type { Confidence, Direction, Prediction } from "@/lib/game/types";

const DIRECTIONS: {
  dir: Direction;
  label: string;
  hint: string;
  icon: typeof ArrowUp;
}[] = [
  { dir: "UP", label: "UP", hint: "+100 base", icon: ArrowUp },
  { dir: "DOWN", label: "DOWN", hint: "+100 base", icon: ArrowDown },
  { dir: "FLAT", label: "FLAT", hint: "+80 base", icon: Minus },
];

const CONFIDENCE: Confidence[] = [1, 2, 3];

export default function PredictionControls({
  active,
  myPrediction,
  onLock,
  livePrice,
  startPrice,
}: {
  active: boolean;
  myPrediction?: Prediction;
  onLock: (direction: Direction, confidence: Confidence) => void;
  livePrice?: number;
  startPrice?: number;
}) {
  const [direction, setDirection] = useState<Direction | null>(null);
  const [confidence, setConfidence] = useState<Confidence>(1);

  const locked = myPrediction?.locked ?? false;

  if (locked && myPrediction) {
    const liveDir =
      livePrice !== undefined && startPrice !== undefined
        ? livePrice > startPrice
          ? "UP"
          : livePrice < startPrice
            ? "DOWN"
            : "FLAT"
        : null;
    const isTracking = liveDir !== null && liveDir === myPrediction.direction;
    const delta =
      livePrice !== undefined && startPrice !== undefined
        ? ((livePrice - startPrice) / startPrice) * 100
        : null;

    return (
      <div className="app-panel flex flex-col items-center gap-4 p-5 text-center">
        <div className="grid h-11 w-11 place-items-center rounded-lg border border-[rgba(0,255,163,0.3)] bg-[rgba(0,255,163,0.08)] text-[var(--surge)]">
          <Lock size={20} aria-hidden />
        </div>
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
            Prediction locked
          </div>
          <div className="mt-1 font-display text-3xl font-black">
            <span style={{ color: dirColor(myPrediction.direction) }}>
              {myPrediction.direction}
            </span>{" "}
            <span className="text-[var(--ink-muted)]">/</span>{" "}
            {myPrediction.confidence}x
          </div>
        </div>

        {liveDir !== null && livePrice !== undefined && (
          <div className="w-full rounded-lg border p-3"
            style={{
              borderColor: isTracking ? "rgba(0,255,163,0.35)" : "rgba(255,77,109,0.35)",
              background: isTracking ? "rgba(0,255,163,0.07)" : "rgba(255,77,109,0.07)",
            }}
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.08em]"
                style={{ color: isTracking ? "var(--surge)" : "var(--magenta)" }}
              >
                {isTracking
                  ? <><TrendingUp size={14} aria-hidden /> tracking</>
                  : <><TrendingDown size={14} aria-hidden /> reversing</>
                }
              </div>
              <div className="font-num text-sm font-black text-[var(--ink)]">
                ${livePrice.toFixed(2)}
              </div>
            </div>
            {delta !== null && (
              <div
                className="mt-1 font-num text-xs font-bold"
                style={{ color: delta >= 0 ? "var(--surge)" : "var(--magenta)" }}
              >
                {delta >= 0 ? "+" : ""}{delta.toFixed(3)}% from open
              </div>
            )}
          </div>
        )}

        {liveDir === null && (
          <div className="text-sm text-[var(--ink-muted)]">
            Waiting for round resolution...
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="app-panel flex flex-col gap-5 p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="app-eyebrow">
            <Zap size={15} aria-hidden />
            Lock your signal
          </div>
          <h3 className="mt-2 font-display text-2xl font-bold">Your call</h3>
        </div>
        <span
          className={`chip ${
            active
              ? "border-[rgba(0,255,163,0.28)] bg-[rgba(0,255,163,0.07)] text-[var(--surge)]"
              : "text-[var(--ink-muted)]"
          }`}
        >
          <span className="status-dot" />
          {active ? "Open" : "Closed"}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {DIRECTIONS.map((d) => {
          const Icon = d.icon;
          return (
            <button
              key={d.dir}
              disabled={!active}
              onClick={() => setDirection(d.dir)}
              className={`arcade-btn min-h-28 p-3 ${variantClass(d.dir)} ${direction === d.dir ? "selected" : ""}`}
            >
              <Icon className="mx-auto" size={26} aria-hidden />
              <span className="mt-2 block font-display text-xl font-bold">{d.label}</span>
              <span className="hud-label mt-1 block">{d.hint}</span>
            </button>
          );
        })}
      </div>

      <div>
        <div className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
          Confidence multiplier
        </div>
        <div className="grid grid-cols-3 gap-2">
          {CONFIDENCE.map((c) => (
            <button
              key={c}
              disabled={!active}
              onClick={() => setConfidence(c)}
              className={`btn min-h-11 flex-1 ${
                confidence === c ? "btn-primary" : "btn-ghost"
              }`}
            >
              {c}x
            </button>
          ))}
        </div>
      </div>

      <button
        className="btn btn-primary min-h-12 w-full text-base"
        disabled={!active || !direction}
        onClick={() => direction && onLock(direction, confidence)}
      >
        {active ? "Lock prediction" : "Round not active"}
        <Lock size={18} aria-hidden />
      </button>
    </div>
  );
}

function dirColor(d: Direction): string {
  return d === "UP" ? "var(--up)" : d === "DOWN" ? "var(--down)" : "var(--flat)";
}

function variantClass(dir: Direction): string {
  return dir === "UP" ? "arcade-btn-up" : dir === "DOWN" ? "arcade-btn-down" : "arcade-btn-flat";
}
