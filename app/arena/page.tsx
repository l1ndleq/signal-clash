"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowRight, ArrowUp, Minus, Radio, Trophy, Zap } from "lucide-react";
import Header from "@/components/Header";

const ROUND_SECONDS = 30;

interface Row {
  id: number;
  name: string;
  score: number;
}

const INITIAL_ROWS: Row[] = [
  { id: 1, name: "you", score: 640 },
  { id: 2, name: "signal-bot", score: 515 },
  { id: 3, name: "phantom.sol", score: 430 },
  { id: 4, name: "magicrunner", score: 365 },
];

export default function ArenaPage() {
  return (
    <div className="app-shell flex min-h-screen flex-col text-[var(--ink)]">
      <Header />
      <main className="app-main">
        <section className="app-hero p-5 md:p-8">
          <div className="signal-scan" />
          <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
            <div>
              <div className="app-kicker">
                <Radio size={15} aria-hidden />
                Visual demo arena
              </div>
              <h1 className="mt-5 max-w-3xl font-display text-5xl font-bold leading-none md:text-7xl">
                Feel the match before you enter the lobby.
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-8 text-[var(--ink-muted)] md:text-lg">
                A polished preview of Signal Clash: moving market, timer, signal
                lock, confidence, and scoreboard updates.
              </p>
              <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                <Link href="/lobby" className="btn btn-primary min-h-12">
                  Enter Arena
                  <ArrowRight size={18} aria-hidden />
                </Link>
                <Link href="/" className="btn btn-ghost min-h-12">
                  Back to story
                </Link>
              </div>
            </div>
            <DemoConsole />
          </div>
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_360px]">
          <MarketPulse />
          <Leaderboard />
        </section>
      </main>
    </div>
  );
}

function DemoConsole() {
  const [choice, setChoice] = useState<"UP" | "DOWN" | "FLAT">("UP");

  return (
    <div className="app-panel p-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="app-eyebrow">
            <Zap size={15} aria-hidden />
            Round 2 / 5
          </div>
          <h2 className="mt-2 font-display text-3xl font-bold">Signal lock</h2>
        </div>
        <span className="chip border-[rgba(0,255,163,0.28)] bg-[rgba(0,255,163,0.07)] text-[var(--surge)]">
          Locked in 8ms
        </span>
      </div>

      <div className="mt-5 rounded-lg border border-[var(--hairline)] bg-[rgba(255,255,255,0.04)] p-4">
        <div className="metric-label">SOL/USD</div>
        <div className="mt-2 font-num text-5xl font-black">$146.91</div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <DemoButton
          label="UP"
          icon={ArrowUp}
          active={choice === "UP"}
          onClick={() => setChoice("UP")}
        />
        <DemoButton
          label="DOWN"
          icon={ArrowDown}
          active={choice === "DOWN"}
          onClick={() => setChoice("DOWN")}
        />
        <DemoButton
          label="FLAT"
          icon={Minus}
          active={choice === "FLAT"}
          onClick={() => setChoice("FLAT")}
        />
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {["1x", "2x", "3x"].map((level) => (
          <div
            key={level}
            className={`clip-corner rounded-lg border px-3 py-3 text-center font-num font-black ${
              level === "2x"
                ? "border-[rgba(0,255,163,0.42)] bg-[rgba(0,255,163,0.1)] text-[var(--surge)]"
                : "border-[var(--hairline)] bg-[rgba(255,255,255,0.04)] text-[var(--ink-muted)]"
            }`}
          >
            {level}
          </div>
        ))}
      </div>
    </div>
  );
}

function variantClass(label: string): string {
  return label === "UP" ? "arcade-btn-up" : label === "DOWN" ? "arcade-btn-down" : "arcade-btn-flat";
}

function DemoButton({
  label,
  icon: Icon,
  active,
  onClick,
}: {
  label: string;
  icon: typeof ArrowUp;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`arcade-btn ${variantClass(label)} ${active ? "selected" : ""} grid min-h-24 place-items-center p-3 text-center`}
      onClick={onClick}
    >
      <Icon size={24} aria-hidden />
      <span className="font-display text-lg font-black">{label}</span>
    </button>
  );
}

function MarketPulse() {
  const [price, setPrice] = useState(146.82);
  const [remaining, setRemaining] = useState(ROUND_SECONDS);

  useEffect(() => {
    const priceId = setInterval(() => {
      setPrice((prev) => Number(Math.max(1, prev + (Math.random() - 0.48) * 0.7).toFixed(2)));
    }, 1200);
    const timerId = setInterval(() => {
      setRemaining((r) => (r <= 0.1 ? ROUND_SECONDS : r - 0.1));
    }, 100);
    return () => {
      clearInterval(priceId);
      clearInterval(timerId);
    };
  }, []);

  const pct = remaining / ROUND_SECONDS;

  return (
    <div className="app-panel p-5 md:p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="app-kicker">Market pulse</div>
          <h2 className="mt-4 font-display text-4xl font-bold">SOL/USD live preview</h2>
          <div className="mt-4 font-display text-6xl font-black">${price.toFixed(2)}</div>
        </div>
        <div
          className="grid h-28 w-28 shrink-0 place-items-center rounded-full"
          style={{
            background: `conic-gradient(var(--ocean) ${pct * 360}deg, rgba(255,255,255,0.07) 0deg)`,
          }}
        >
          <div className="grid h-[5.85rem] w-[5.85rem] place-items-center rounded-full border border-[var(--hairline)] bg-[rgba(7,9,14,0.92)]">
            <span className="font-num text-3xl font-black">
              {Math.ceil(remaining)}
            </span>
          </div>
        </div>
      </div>
      <MiniWave />
    </div>
  );
}

function MiniWave() {
  return (
    <svg className="mt-8 h-44 w-full" viewBox="0 0 720 220" aria-hidden>
      <defs>
        <linearGradient id="arenaWave" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="var(--surge)" />
          <stop offset="50%" stopColor="var(--ocean)" />
          <stop offset="100%" stopColor="var(--purple)" />
        </linearGradient>
      </defs>
      {[45, 95, 145, 195].map((y) => (
        <line
          key={y}
          x1="0"
          x2="720"
          y1={y}
          y2={y}
          stroke="rgba(255,255,255,0.055)"
        />
      ))}
      <path
        className="wave-path"
        d="M0 142 C72 70 126 112 174 128 C232 148 278 174 342 104 C406 36 474 54 532 104 C590 156 642 132 720 70"
        fill="none"
        stroke="url(#arenaWave)"
        strokeLinecap="round"
        strokeWidth="5"
      />
    </svg>
  );
}

function Leaderboard() {
  const [rows, setRows] = useState<Row[]>(INITIAL_ROWS);
  const [bumped, setBumped] = useState<number | null>(null);

  useEffect(() => {
    const id = setInterval(() => {
      setRows((prev) => {
        const next = prev.map((r) => ({
          ...r,
          score: r.score + Math.floor(Math.random() * 70),
        }));
        next.sort((a, b) => b.score - a.score);
        setBumped(next[0]?.id ?? null);
        return next;
      });
    }, 2400);
    return () => clearInterval(id);
  }, []);

  const medal = useMemo(() => ["#00ffa3", "#03e1ff", "#dc1fff"], []);

  return (
    <div className="app-panel p-5">
      <div className="mb-4 flex items-center gap-2">
        <Trophy size={17} className="text-[var(--ocean)]" aria-hidden />
        <span className="font-display text-lg font-bold">Live Leaderboard</span>
        <span className="ml-auto chip text-[var(--ink-muted)]">updating</span>
      </div>
      <div className="flex flex-col gap-2">
        {rows.map((row, index) => (
          <div
            key={row.id}
            className={`clip-corner flex items-center gap-3 rounded-lg border border-[var(--hairline)] px-3 py-3 ${
              bumped === row.id && index === 0 ? "row-bump" : ""
            }`}
          >
            <span
              className="font-num w-6 text-sm font-black"
              style={{ color: medal[index] ?? "var(--ink-muted)" }}
            >
              {index + 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold">
              {row.name}
            </span>
            <span className="font-num text-sm font-black">
              {row.score.toLocaleString("en-US")}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
