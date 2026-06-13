"use client";

import { type ReactNode } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { ReactLenis } from "lenis/react";
import { motion, useReducedMotion, useScroll, useSpring } from "framer-motion";
import {
  Activity,
  ArrowRight,
  Clock3,
  Crosshair,
  Gauge,
  Layers,
  Lock,
  Minus,
  ShieldCheck,
  Timer,
  TrendingDown,
  TrendingUp,
  Trophy,
  Wallet,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Hero from "@/components/Hero";

// One shared 3D background for the whole page (same scene as the hero block).
const HeroScene = dynamic(() => import("@/components/HeroScene"), { ssr: false });

// Shared style tokens — minimal, premium, matching the hero.
const CARD =
  "rounded-2xl border border-white/10 bg-white/[0.03] p-6 backdrop-blur-md md:p-7";
const H2 =
  "mt-5 text-4xl font-medium leading-[0.95] tracking-tighter text-white md:text-6xl";
const BODY = "mt-6 max-w-xl text-base leading-relaxed text-white/70 md:text-lg";

const UP = "#14F195";
const DOWN = "#FF5C7C";
const FLAT = "#F5A524";
const PURPLE = "#9945FF";
const CYAN = "#03E1FF";

const scoringPillars: { title: string; body: string; icon: LucideIcon }[] = [
  {
    title: "Accuracy",
    body: "Direction matters, but the market has to actually move your way.",
    icon: Crosshair,
  },
  {
    title: "Timing",
    body: "Fast reads earn extra edge before the countdown gets tight.",
    icon: Clock3,
  },
  {
    title: "Confidence",
    body: "1x, 2x, or 3x makes conviction part of the skill expression.",
    icon: Gauge,
  },
  {
    title: "Streaks",
    body: "Consistent calls compound across the whole five-round match.",
    icon: Activity,
  },
];

const scoreRows = [
  { name: "YOU", score: 640, detail: "3 streak", color: UP },
  { name: "RIVAL", score: 515, detail: "2 streak", color: DOWN },
  { name: "ROUND", score: "4 / 5", detail: "next signal", color: PURPLE },
];

const safetyItems: { title: string; body: string; icon: LucideIcon }[] = [
  {
    title: "no private-key storage",
    body: "The wallet signs its own devnet transactions. The app never stores keys.",
    icon: Lock,
  },
  {
    title: "no backend custody",
    body: "There is no backend-signed user transaction flow or hidden custodian.",
    icon: ShieldCheck,
  },
  {
    title: "no mainnet funds",
    body: "This demo is devnet only, so judges can try the loop without real money.",
    icon: Wallet,
  },
];

export default function Landing() {
  const shouldReduceMotion = useReducedMotion();

  return (
    <ReactLenis
      root
      options={{ lerp: shouldReduceMotion ? 1 : 0.08, smoothWheel: !shouldReduceMotion }}
    >
      <main className="relative min-h-screen overflow-hidden bg-black text-white">
        {/* Shared living 3D background behind the whole page. */}
        <div className="pointer-events-none fixed inset-0 z-0">
          <HeroScene />
        </div>
        {/* Scrim keeps body copy readable over the particle field. */}
        <div
          className="pointer-events-none fixed inset-0 z-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,0.25) 0%, rgba(0,0,0,0.45) 50%, rgba(0,0,0,0.6) 100%)",
          }}
        />

        <ScrollProgress />

        <div className="relative z-10">
          <Hero />
          <MarketAlive />
          <NotCoinFlip />
          <LockYourCall />
          <WinSeries />
          <ArenaLayer />
          <DevnetSettlement />
          <FinalCta />
        </div>
      </main>
    </ReactLenis>
  );
}

function MarketAlive() {
  return (
    <StorySection
      marker="01"
      title="Market Is Alive"
      copy="Every round starts with a moving market. The price shifts, the timer opens, and you have seconds to read the signal."
      visual={<MarketPanel />}
    />
  );
}

function NotCoinFlip() {
  return (
    <section className="relative px-5 py-24 md:px-8 md:py-32">
      <div className="mx-auto grid max-w-7xl gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-end">
        <Reveal>
          <div>
            <SectionMarker n="02" />
            <h2 className={H2}>Not A Coin Flip</h2>
            <p className={BODY}>
              This is not binary options. One correct guess is not enough. Signal
              Clash rewards consistent reads across the whole match.
            </p>
          </div>
        </Reveal>

        <div className="grid gap-3 sm:grid-cols-2">
          {scoringPillars.map((pillar, index) => (
            <Reveal key={pillar.title} delay={index * 0.06}>
              <PillarCard {...pillar} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function LockYourCall() {
  return (
    <StorySection
      marker="03"
      title="Lock Your Call"
      copy="You get one clean window to choose direction and confidence. The landing demo is visual-only; the real engine stays in the arena flow."
      reverse
      visual={<PredictionDemoCard />}
    />
  );
}

function WinSeries() {
  return (
    <StorySection
      marker="04"
      title="Win The Series"
      copy="Five rounds. One arena. The best signal reader wins."
      visual={<ScoreboardVisual />}
    />
  );
}

function ArenaLayer() {
  return (
    <StorySection
      marker="05"
      title="Real-Time Arena Layer"
      copy="Fast room state, instant predictions, round resolution, and leaderboard updates are designed for MagicBlock Ephemeral Rollups. Mock adapter today. Production MagicBlock adapter next."
      reverse
      visual={<LayerVisual />}
    />
  );
}

function DevnetSettlement() {
  return (
    <section className="relative px-5 py-24 md:px-8 md:py-32">
      <div className="mx-auto max-w-7xl">
        <Reveal>
          <div className="max-w-3xl">
            <SectionMarker n="06" />
            <h2 className={H2}>Devnet Settlement</h2>
            <p className="mt-6 text-base leading-relaxed text-white/70 md:text-lg">
              The match plays fast; the result settles on Solana devnet.
            </p>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-3 md:grid-cols-3">
          {safetyItems.map((item, index) => (
            <Reveal key={item.title} delay={index * 0.08}>
              <SafetyCard {...item} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function FinalCta() {
  return (
    <section className="relative grid min-h-[80svh] place-items-center px-5 py-24 text-center md:px-8">
      <div className="mx-auto flex max-w-4xl flex-col items-center">
        <Reveal>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#14F195]/30 bg-[#14F195]/10 px-4 py-2 text-sm font-medium text-[#14F195]">
            <Zap size={16} fill="currentColor" aria-hidden />
            Final signal
          </div>
          <h2 className="text-4xl font-medium leading-tight tracking-tighter text-white md:text-7xl">
            Think you can read the next move?
          </h2>
          <p className="mt-6 text-lg text-white/70">Enter the Arena.</p>
        </Reveal>
        <Reveal delay={0.12}>
          <div className="mt-10">
            <ArenaPill />
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function StorySection({
  marker,
  title,
  copy,
  visual,
  reverse = false,
}: {
  marker: string;
  title: string;
  copy: string;
  visual: ReactNode;
  reverse?: boolean;
}) {
  return (
    <section className="relative px-5 py-24 md:px-8 md:py-32">
      <div
        className={`mx-auto grid max-w-7xl gap-12 lg:grid-cols-2 lg:items-center ${
          reverse ? "lg:[&>*:first-child]:order-2" : ""
        }`}
      >
        <Reveal>
          <div>
            <SectionMarker n={marker} />
            <h2 className={H2}>{title}</h2>
            <p className={BODY}>{copy}</p>
          </div>
        </Reveal>
        <Reveal delay={0.12}>{visual}</Reveal>
      </div>
    </section>
  );
}

function SectionMarker({ n }: { n: string }) {
  return (
    <div className="inline-flex items-center gap-2.5 text-xs font-medium uppercase tracking-[0.25em] text-white/50">
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: UP }} />
      {n} · Signal protocol
    </div>
  );
}

function ArenaPill({
  href = "/lobby",
  children = "Enter Arena",
}: {
  href?: string;
  children?: ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-black px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-900 md:px-8 md:py-4 md:text-base"
    >
      {children}
      <ArrowRight
        size={18}
        aria-hidden
        className="transition-transform duration-300 group-hover:translate-x-1"
      />
    </Link>
  );
}

function MarketPanel() {
  return (
    <div className={`${CARD} relative overflow-hidden`}>
      <div className="flex items-start justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 text-sm text-white/60">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: UP }} />
            SOL/USD price
          </div>
          <div className="mt-4 text-5xl font-medium tracking-tighter text-white md:text-6xl">
            $146.82
          </div>
          <div className="mt-3 text-sm" style={{ color: UP }}>
            +0.42% this round
          </div>
        </div>

        <div className="grid h-24 w-24 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04]">
          <Timer size={18} className="text-white/70" aria-hidden />
          <div className="font-num text-2xl font-bold text-white">00:12</div>
          <div className="text-xs text-white/50">countdown</div>
        </div>
      </div>
      <MiniWave />
      <div className="mt-5 grid grid-cols-3 gap-2 text-sm">
        <MarketStat label="Open" value="$146.20" />
        <MarketStat label="Now" value="$146.82" />
        <MarketStat label="Window" value="30s" />
      </div>
    </div>
  );
}

function MarketStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
      <div className="text-xs text-white/50">{label}</div>
      <div className="mt-1 font-num text-sm font-bold text-white">{value}</div>
    </div>
  );
}

function MiniWave() {
  return (
    <svg
      className="mt-8 h-44 w-full overflow-visible"
      viewBox="0 0 720 220"
      role="img"
      aria-label="Animated market wave"
    >
      <defs>
        <linearGradient id="landingWave" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor={PURPLE} />
          <stop offset="100%" stopColor={UP} />
        </linearGradient>
      </defs>
      {[40, 90, 140, 190].map((y) => (
        <line
          key={y}
          x1="0"
          x2="720"
          y1={y}
          y2={y}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="1"
        />
      ))}
      <path
        className="wave-path"
        d="M0 142 C70 80 120 88 172 118 C230 152 275 176 342 104 C404 38 480 54 530 104 C585 158 640 136 720 70"
        fill="none"
        stroke="url(#landingWave)"
        strokeLinecap="round"
        strokeWidth="5"
      />
      <path
        d="M0 142 C70 80 120 88 172 118 C230 152 275 176 342 104 C404 38 480 54 530 104 C585 158 640 136 720 70 L720 220 L0 220 Z"
        fill="url(#landingWave)"
        opacity="0.08"
      />
    </svg>
  );
}

function PillarCard({ title, body, icon: Icon }: { title: string; body: string; icon: LucideIcon }) {
  return (
    <div className={`${CARD} h-full transition-colors hover:border-white/20`}>
      <div
        className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04]"
        style={{ color: UP }}
      >
        <Icon size={20} aria-hidden />
      </div>
      <h3 className="mt-5 text-xl font-medium text-white">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-white/60">{body}</p>
    </div>
  );
}

function PredictionDemoCard() {
  return (
    <div className={CARD}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-white/60">Round 2 / 5</div>
          <div className="mt-1 text-xl font-medium text-white">Lock phase</div>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 font-num text-lg font-bold text-white">
          00:08
        </div>
      </div>

      <div className="mt-7 rounded-xl border border-white/10 bg-white/[0.03] p-4">
        <div className="text-sm text-white/50">SOL/USD price</div>
        <div className="mt-1 flex items-end justify-between gap-4">
          <div className="text-4xl font-medium tracking-tighter text-white md:text-5xl">
            $146.91
          </div>
          <div className="flex items-center gap-1 text-sm font-semibold" style={{ color: UP }}>
            <TrendingUp size={17} aria-hidden />
            live
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <DemoChoice icon={TrendingUp} label="UP" color={UP} active />
        <DemoChoice icon={TrendingDown} label="DOWN" color={DOWN} />
        <DemoChoice icon={Minus} label="FLAT" color={FLAT} />
      </div>

      <div className="mt-5">
        <div className="mb-2 text-sm text-white/60">Confidence</div>
        <div className="grid grid-cols-3 gap-2">
          {["1x", "2x", "3x"].map((level) => (
            <div
              key={level}
              className="rounded-xl border px-4 py-3 text-center font-num font-bold"
              style={
                level === "2x"
                  ? { borderColor: `${UP}80`, background: `${UP}1a`, color: UP }
                  : {
                      borderColor: "rgba(255,255,255,0.1)",
                      background: "rgba(255,255,255,0.03)",
                      color: "rgba(255,255,255,0.5)",
                    }
              }
            >
              {level}
            </div>
          ))}
        </div>
      </div>

      <div
        className="mt-5 inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-semibold"
        style={{ borderColor: `${UP}4d`, background: `${UP}1a`, color: UP }}
      >
        <Zap size={16} fill="currentColor" aria-hidden />
        Locked in 8ms
      </div>
    </div>
  );
}

function DemoChoice({
  icon: Icon,
  label,
  color,
  active = false,
}: {
  icon: LucideIcon;
  label: string;
  color: string;
  active?: boolean;
}) {
  return (
    <div
      className="grid min-h-24 place-items-center rounded-xl border p-3 text-center transition-colors"
      style={{
        color,
        borderColor: active ? color : "rgba(255,255,255,0.1)",
        background: active ? `${color}1a` : "rgba(255,255,255,0.03)",
      }}
    >
      <Icon size={24} aria-hidden />
      <div className="text-lg font-medium">{label}</div>
    </div>
  );
}

function ScoreboardVisual() {
  return (
    <div className={CARD}>
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-white/50">Series board</div>
          <div className="mt-1 text-xl font-medium text-white">Best signal wins</div>
        </div>
        <Trophy size={26} className="text-white/70" aria-hidden />
      </div>

      <div className="mt-7 flex flex-col gap-3">
        {scoreRows.map((row) => (
          <div
            key={row.name}
            className="grid grid-cols-[1fr_auto] gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4"
          >
            <div>
              <div className="text-lg font-semibold" style={{ color: row.color }}>
                {row.name}
              </div>
              <div className="mt-1 text-sm text-white/50">{row.detail}</div>
            </div>
            <div className="font-num text-3xl font-bold text-white">{row.score}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-5 gap-2">
        {["UP", "UP", "DOWN", "UP", "?"].map((call, index) => (
          <div
            key={`${call}-${index}`}
            className="rounded-xl border border-white/10 bg-white/[0.03] py-3 text-center font-num text-sm font-bold text-white/80"
          >
            {call}
          </div>
        ))}
      </div>
    </div>
  );
}

function LayerVisual() {
  return (
    <div className={CARD}>
      <div className="flex items-center gap-3">
        <div
          className="grid h-11 w-11 place-items-center rounded-xl border border-white/10 bg-white/[0.04]"
          style={{ color: PURPLE }}
        >
          <Layers size={22} aria-hidden />
        </div>
        <div>
          <div className="text-xl font-medium text-white">MagicBlock path</div>
          <div className="text-sm text-white/50">Designed for Ephemeral Rollups</div>
        </div>
      </div>

      <div className="mt-7 grid gap-3">
        <LayerStep title="Room state" body="Create, join, ready, and scoreboard updates." tone={CYAN} />
        <LayerStep title="Prediction lock" body="Instant direction and confidence submission." tone={UP} />
        <LayerStep title="Round resolution" body="Scores update as soon as the round closes." tone={PURPLE} />
      </div>

      <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.03] p-4 text-sm leading-relaxed text-white/60">
        <span className="font-semibold" style={{ color: UP }}>
          Mock adapter today.
        </span>{" "}
        Production MagicBlock adapter next.
      </div>
    </div>
  );
}

function LayerStep({ title, body, tone }: { title: string; body: string; tone: string }) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <span
        className="mt-1.5 h-3 w-3 rounded-full"
        style={{ background: tone, boxShadow: `0 0 18px ${tone}` }}
      />
      <div>
        <div className="text-base font-medium text-white">{title}</div>
        <div className="mt-1 text-sm leading-relaxed text-white/60">{body}</div>
      </div>
    </div>
  );
}

function SafetyCard({ title, body, icon: Icon }: { title: string; body: string; icon: LucideIcon }) {
  return (
    <div className={`${CARD} h-full`}>
      <div
        className="grid h-10 w-10 place-items-center rounded-xl border border-white/10 bg-white/[0.04]"
        style={{ color: UP }}
      >
        <Icon size={20} aria-hidden />
      </div>
      <h3 className="mt-5 text-xl font-medium text-white">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-white/60">{body}</p>
    </div>
  );
}

function Reveal({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { opacity: 0, y: 28 }}
      whileInView={shouldReduceMotion ? undefined : { opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-10%" }}
      transition={{ duration: 0.65, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}

function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 120, damping: 26 });

  return (
    <motion.div
      style={{ scaleX, backgroundImage: "var(--gradient-solana)" }}
      className="fixed left-0 top-0 z-50 h-[2px] w-full origin-left"
    />
  );
}
