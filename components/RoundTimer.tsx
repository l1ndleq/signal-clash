"use client";

import { useEffect, useState } from "react";

export default function RoundTimer({
  endsAt,
  durationSeconds,
}: {
  endsAt: number | null;
  durationSeconds: number;
}) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!endsAt) return;
    const id = setInterval(() => setNow(Date.now()), 200);
    return () => clearInterval(id);
  }, [endsAt]);

  const remainingMs = endsAt ? Math.max(0, endsAt - now) : 0;
  const remaining = remainingMs / 1000;
  const pct = endsAt
    ? Math.max(0, Math.min(1, remainingMs / (durationSeconds * 1000)))
    : 0;

  const urgent = remaining <= 5 && !!endsAt;
  const critical = remaining <= 3 && !!endsAt;

  const color =
    remaining <= 5 ? "var(--down)" : remaining <= 15 ? "var(--flat)" : "var(--cyan)";
  const label = !endsAt ? "waiting" : remaining <= 5 ? "closing" : "open";

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        className={`relative grid h-28 w-28 place-items-center rounded-full transition-shadow ${urgent ? "timer-urgent" : ""}`}
        style={{
          background: `conic-gradient(${color} ${pct * 360}deg, rgba(255,255,255,0.07) 0deg)`,
          boxShadow: urgent ? undefined : `0 0 34px rgba(3,225,255,0.2)`,
        }}
      >
        <div className="grid h-[5.85rem] w-[5.85rem] place-items-center rounded-full border border-[var(--hairline)] bg-[rgba(7,9,14,0.92)]">
          <span
            className={`font-display text-3xl font-black ${critical ? "timer-number-critical" : ""}`}
          >
            {endsAt ? Math.ceil(remaining) : "-"}
          </span>
        </div>
      </div>
      <div className="text-center">
        <span
          className={`chip ${urgent ? "border-[rgba(255,77,109,0.35)] bg-[rgba(255,77,109,0.08)] text-[var(--magenta)]" : "text-[var(--ink-muted)]"}`}
        >
          {label}
        </span>
        <div className="mt-2 text-xs font-bold uppercase tracking-[0.08em] text-[var(--ink-muted)]">
          seconds left
        </div>
        <div className="hud-bar mt-3 w-full">
          <span style={{ width: `${pct * 100}%` }} />
        </div>
      </div>
    </div>
  );
}
