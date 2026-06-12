"use client";

import { useRef, type MouseEvent, type ReactNode } from "react";
import Link from "next/link";
import { ReactLenis } from "lenis/react";
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
} from "framer-motion";
import {
  Activity,
  ArrowRight,
  Clock3,
  Crosshair,
  Gauge,
  Layers,
  Lock,
  Minus,
  Play,
  Radio,
  ShieldCheck,
  Timer,
  TrendingDown,
  TrendingUp,
  Trophy,
  Wallet,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import HeroSignal from "@/components/HeroSignal";

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
  { name: "YOU", score: 640, detail: "3 streak", color: "var(--surge)" },
  { name: "RIVAL", score: 515, detail: "2 streak", color: "var(--magenta)" },
  { name: "ROUND", score: "4 / 5", detail: "next signal", color: "var(--ocean)" },
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
      <main className="landing-shell relative min-h-screen overflow-hidden text-[var(--ink)]">
        <ScrollProgress />
        <SignalAtmosphere />
        <TopBar />
        <Hero />
        <MarketAlive />
        <NotCoinFlip />
        <LockYourCall />
        <WinSeries />
        <ArenaLayer />
        <DevnetSettlement />
        <FinalCta />
      </main>
    </ReactLenis>
  );
}

function TopBar() {
  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b border-[var(--hairline)] bg-[rgba(7,9,14,0.72)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4 md:px-8">
        <Link href="/" className="flex items-center gap-3" aria-label="Signal Clash home">
          <span className="clip-corner grid h-9 w-9 place-items-center border border-[rgba(0,255,163,0.35)] bg-[var(--surge)] font-display text-sm font-bold text-[#04060a] shadow">
            SC
          </span>
          <span className="font-display tracking-[0.06em] text-base font-bold">Signal Clash</span>
        </Link>
        <nav className="flex items-center gap-3">
          <Link
            href="/arena"
            className="hidden rounded-lg border border-[var(--hairline)] px-4 py-2 text-sm text-[var(--ink-muted)] transition hover:border-[rgba(3,225,255,0.55)] hover:text-[var(--ink)] sm:inline-flex"
          >
            Demo
          </Link>
          <Link
            href="/lobby"
            className="inline-flex items-center gap-2 rounded-lg bg-[var(--surge)] px-4 py-2 text-sm font-bold text-[#06101f] transition hover:bg-[var(--ocean)]"
          >
            Enter Arena
            <ArrowRight size={16} aria-hidden />
          </Link>
        </nav>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative flex min-h-[92svh] items-center px-5 pb-20 pt-32 md:px-8">
      <HeroSignal />
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-col items-center text-center">
        <div className="flex flex-col items-center">
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-lg border border-[rgba(3,225,255,0.28)] bg-[rgba(3,225,255,0.07)] px-4 py-2 text-xs font-semibold text-[var(--ocean)]"
          >
            <Radio size={15} aria-hidden />
            Solana devnet PvP arena
          </div>

          <h1
            className="font-display text-6xl font-bold leading-none text-[var(--ink)] md:text-8xl lg:text-[7.5rem]"
          >
            Signal Clash
          </h1>

          <p
            className="mt-6 max-w-4xl font-display text-4xl font-semibold leading-tight text-[var(--ink)] md:text-6xl"
          >
            Markets move.
            <br />
            <span className="gradient-text">You call the signal.</span>
          </p>

          <p
            className="mt-5 max-w-2xl text-base leading-8 text-[var(--ink-muted)] md:text-xl"
          >
            A real-time PvP prediction arena where players compete on market instinct,
            timing, confidence, and streaks.
          </p>

          <div
            className="mt-4 inline-flex flex-wrap items-center justify-center gap-3 rounded-lg border border-[var(--hairline)] bg-[rgba(7,9,14,0.68)] px-4 py-3 text-sm backdrop-blur"
          >
            <span className="font-semibold text-[var(--ink-muted)]">Next: Market Is Alive</span>
            <span className="font-num text-[var(--surge)]">SOL/USD 00:12</span>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <MagneticLink href="/lobby" icon={ArrowRight} variant="primary">
              Enter Arena
            </MagneticLink>
            <MagneticLink href="/arena" icon={Play} variant="secondary">
              View Demo
            </MagneticLink>
          </div>
        </div>
      </div>
    </section>
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
            <h2 className="mt-5 font-display text-5xl font-bold leading-none md:text-7xl">
              Not A Coin Flip
            </h2>
            <p className="mt-6 max-w-xl text-base leading-8 text-[var(--ink-muted)] md:text-lg">
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
            <h2 className="mt-5 font-display text-5xl font-bold leading-none md:text-7xl">
              Devnet Settlement
            </h2>
            <p className="mt-6 text-base leading-8 text-[var(--ink-muted)] md:text-lg">
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
    <section className="relative grid min-h-[88svh] place-items-center px-5 py-24 text-center md:px-8">
      <div className="mx-auto flex max-w-5xl flex-col items-center">
        <Reveal>
          <div className="mb-6 inline-flex items-center gap-2 rounded-lg border border-[rgba(0,255,163,0.28)] bg-[rgba(0,255,163,0.07)] px-4 py-2 text-sm font-semibold text-[var(--surge)]">
            <Zap size={16} fill="currentColor" aria-hidden />
            Final signal
          </div>
          <h2 className="font-display text-5xl font-bold leading-tight md:text-7xl">
            Think you can read the next move?
          </h2>
          <p className="mt-5 text-2xl font-semibold text-[var(--ink)]">
            Enter the Arena.
          </p>
        </Reveal>
        <Reveal delay={0.12}>
          <div className="mt-10">
            <MagneticLink href="/lobby" icon={ArrowRight} variant="primary">
              Enter Arena
            </MagneticLink>
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
            <h2 className="mt-5 font-display text-5xl font-bold leading-none md:text-7xl">
              {title}
            </h2>
            <p className="mt-6 max-w-xl text-base leading-8 text-[var(--ink-muted)] md:text-lg">
              {copy}
            </p>
          </div>
        </Reveal>
        <Reveal delay={0.12}>{visual}</Reveal>
      </div>
    </section>
  );
}

function SectionMarker({ n }: { n: string }) {
  return (
    <div className="inline-flex items-center gap-3 text-sm font-semibold text-[var(--ocean)]">
      <span className="hud-label font-mono">[ {n} ]</span>
      <span>Signal protocol</span>
    </div>
  );
}

function MarketPanel() {
  return (
    <div className="story-panel relative overflow-hidden p-5 md:p-7">
      <div className="relative z-10 flex items-start justify-between gap-5">
        <div>
          <div className="flex items-center gap-2 text-sm font-semibold text-[var(--ink-muted)]">
            <span className="landing-pulse h-2 w-2 rounded-full bg-[var(--surge)]" />
            SOL/USD price
          </div>
          <div className="mt-4 font-display text-6xl font-bold leading-none text-[var(--ink)] md:text-7xl">
            $146.82
          </div>
          <div className="mt-3 text-sm text-[var(--surge)]">+0.42% this round</div>
        </div>

        <div className="grid h-24 w-24 shrink-0 place-items-center rounded-lg border border-[rgba(3,225,255,0.28)] bg-[rgba(3,225,255,0.07)]">
          <Timer size={18} className="text-[var(--ocean)]" aria-hidden />
          <div className="font-num text-2xl font-bold">00:12</div>
          <div className="text-xs text-[var(--ink-muted)]">countdown</div>
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
    <div className="rounded-lg border border-[var(--hairline)] bg-[rgba(255,255,255,0.035)] p-3">
      <div className="text-xs text-[var(--ink-muted)]">{label}</div>
      <div className="mt-1 font-num text-sm font-bold">{value}</div>
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
          <stop offset="0%" stopColor="var(--surge)" />
          <stop offset="48%" stopColor="var(--ocean)" />
          <stop offset="100%" stopColor="var(--purple)" />
        </linearGradient>
      </defs>
      {[40, 90, 140, 190].map((y) => (
        <line
          key={y}
          x1="0"
          x2="720"
          y1={y}
          y2={y}
          stroke="rgba(255,255,255,0.055)"
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
    <div className="story-panel h-full p-5 transition hover:-translate-y-1 hover:border-[rgba(0,255,163,0.35)]">
      <div className="grid h-10 w-10 place-items-center rounded-lg border border-[rgba(3,225,255,0.28)] bg-[rgba(3,225,255,0.07)] text-[var(--ocean)]">
        <Icon size={20} aria-hidden />
      </div>
      <h3 className="mt-5 font-display text-2xl font-bold">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-[var(--ink-muted)]">{body}</p>
    </div>
  );
}

function PredictionDemoCard() {
  return (
    <div className="story-panel p-5 md:p-7">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-semibold text-[var(--ink-muted)]">Round 2 / 5</div>
          <div className="mt-1 font-display text-2xl font-bold">Lock phase</div>
        </div>
        <div className="rounded-lg border border-[rgba(255,77,109,0.35)] bg-[rgba(255,77,109,0.08)] px-3 py-2 font-num text-lg font-bold text-[var(--magenta)]">
          00:08
        </div>
      </div>

      <div className="mt-7 rounded-lg border border-[var(--hairline)] bg-[rgba(255,255,255,0.035)] p-4">
        <div className="text-sm text-[var(--ink-muted)]">SOL/USD price</div>
        <div className="mt-1 flex items-end justify-between gap-4">
          <div className="font-display text-5xl font-bold">$146.91</div>
          <div className="flex items-center gap-1 text-sm font-bold text-[var(--surge)]">
            <TrendingUp size={17} aria-hidden />
            live
          </div>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        <DemoChoice icon={TrendingUp} label="UP" color="var(--surge)" active />
        <DemoChoice icon={TrendingDown} label="DOWN" color="var(--magenta)" />
        <DemoChoice icon={Minus} label="FLAT" color="var(--flat)" />
      </div>

      <div className="mt-5">
        <div className="mb-2 text-sm font-semibold text-[var(--ink-muted)]">Confidence</div>
        <div className="grid grid-cols-3 gap-2">
          {["1x", "2x", "3x"].map((level) => (
            <div
              key={level}
              className={`clip-corner border px-4 py-3 text-center font-num font-bold ${
                level === "2x"
                  ? "border-[rgba(0,255,163,0.45)] bg-[rgba(0,255,163,0.12)] text-[var(--surge)]"
                  : "border-[var(--hairline)] bg-[rgba(255,255,255,0.035)] text-[var(--ink-muted)]"
              }`}
            >
              {level}
            </div>
          ))}
        </div>
      </div>

      <div className="mt-5 inline-flex items-center gap-2 rounded-lg border border-[rgba(0,255,163,0.32)] bg-[rgba(0,255,163,0.08)] px-4 py-2 text-sm font-bold text-[var(--surge)]">
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
      className="clip-corner grid min-h-24 place-items-center border p-3 text-center"
      style={{
        color,
        borderColor: active ? color : "var(--hairline)",
        background: active ? "rgba(0,255,163,0.11)" : "rgba(255,255,255,0.035)",
      }}
    >
      <Icon size={24} aria-hidden />
      <div className="font-display text-lg font-bold">{label}</div>
    </div>
  );
}

function ScoreboardVisual() {
  return (
    <div className="story-panel p-5 md:p-7">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm text-[var(--ink-muted)]">Series board</div>
          <div className="mt-1 font-display text-2xl font-bold">Best signal wins</div>
        </div>
        <Trophy size={28} className="text-[var(--ocean)]" aria-hidden />
      </div>

      <div className="mt-7 flex flex-col gap-3">
        {scoreRows.map((row) => (
          <div
            key={row.name}
            className="grid grid-cols-[1fr_auto] gap-4 rounded-lg border border-[var(--hairline)] bg-[rgba(255,255,255,0.035)] p-4"
          >
            <div>
              <div className="font-display text-xl font-bold" style={{ color: row.color }}>
                {row.name}
              </div>
              <div className="mt-1 text-sm text-[var(--ink-muted)]">{row.detail}</div>
            </div>
            <div className="font-num text-3xl font-bold">{row.score}</div>
          </div>
        ))}
      </div>

      <div className="mt-6 grid grid-cols-5 gap-2">
        {["UP", "UP", "DOWN", "UP", "?"].map((call, index) => (
          <div
            key={`${call}-${index}`}
            className="rounded-lg border border-[var(--hairline)] bg-[rgba(255,255,255,0.035)] py-3 text-center font-num text-sm font-bold"
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
    <div className="story-panel p-5 md:p-7">
      <div className="flex items-center gap-3">
        <div className="grid h-11 w-11 place-items-center rounded-lg border border-[rgba(220,31,255,0.32)] bg-[rgba(220,31,255,0.08)] text-[var(--purple)]">
          <Layers size={22} aria-hidden />
        </div>
        <div>
          <div className="font-display text-2xl font-bold">MagicBlock path</div>
          <div className="text-sm text-[var(--ink-muted)]">Designed for Ephemeral Rollups</div>
        </div>
      </div>

      <div className="mt-7 grid gap-3">
        <LayerStep title="Room state" body="Create, join, ready, and scoreboard updates." tone="var(--ocean)" />
        <LayerStep title="Prediction lock" body="Instant direction and confidence submission." tone="var(--surge)" />
        <LayerStep title="Round resolution" body="Scores update as soon as the round closes." tone="var(--purple)" />
      </div>

      <div className="mt-6 rounded-lg border border-[rgba(0,255,163,0.28)] bg-[rgba(0,255,163,0.07)] p-4 text-sm leading-7 text-[var(--ink-muted)]">
        <span className="font-bold text-[var(--surge)]">Mock adapter today.</span>{" "}
        Production MagicBlock adapter next.
      </div>
    </div>
  );
}

function LayerStep({ title, body, tone }: { title: string; body: string; tone: string }) {
  return (
    <div className="grid grid-cols-[auto_1fr] gap-4 rounded-lg border border-[var(--hairline)] bg-[rgba(255,255,255,0.035)] p-4">
      <span className="mt-1 h-3 w-3 rounded-full" style={{ background: tone, boxShadow: `0 0 18px ${tone}` }} />
      <div>
        <div className="font-display text-lg font-bold">{title}</div>
        <div className="mt-1 text-sm leading-6 text-[var(--ink-muted)]">{body}</div>
      </div>
    </div>
  );
}

function SafetyCard({ title, body, icon: Icon }: { title: string; body: string; icon: LucideIcon }) {
  return (
    <div className="story-panel h-full p-5">
      <div className="grid h-10 w-10 place-items-center rounded-lg border border-[rgba(0,255,163,0.28)] bg-[rgba(0,255,163,0.07)] text-[var(--surge)]">
        <Icon size={20} aria-hidden />
      </div>
      <h3 className="mt-5 font-display text-2xl font-bold">{title}</h3>
      <p className="mt-3 text-sm leading-7 text-[var(--ink-muted)]">{body}</p>
    </div>
  );
}

function MagneticLink({
  href,
  icon: Icon,
  variant,
  children,
}: {
  href: string;
  icon: LucideIcon;
  variant: "primary" | "secondary";
  children: ReactNode;
}) {
  const shouldReduceMotion = useReducedMotion();
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 18 });
  const sy = useSpring(y, { stiffness: 220, damping: 18 });

  const onMove = (event: MouseEvent<HTMLAnchorElement>) => {
    if (shouldReduceMotion) return;
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    x.set((event.clientX - (rect.left + rect.width / 2)) * 0.22);
    y.set((event.clientY - (rect.top + rect.height / 2)) * 0.22);
  };

  const reset = () => {
    x.set(0);
    y.set(0);
  };

  const className =
    variant === "primary"
      ? "bg-[var(--surge)] text-[#06101f] hover:bg-[var(--ocean)]"
      : "border border-[var(--hairline)] bg-[rgba(255,255,255,0.04)] text-[var(--ink)] hover:border-[rgba(3,225,255,0.55)]";

  return (
    <motion.div style={{ x: sx, y: sy }} className="inline-flex">
      <Link
        ref={ref}
        href={href}
        onMouseMove={onMove}
        onMouseLeave={reset}
        className={`clip-corner inline-flex min-h-12 items-center justify-center gap-2 px-6 py-3 font-display text-base font-bold transition ${className}`}
      >
        {children}
        <Icon size={18} aria-hidden />
      </Link>
    </motion.div>
  );
}

function Reveal({
  children,
  delay = 0,
}: {
  children: ReactNode;
  delay?: number;
}) {
  const shouldReduceMotion = useReducedMotion();

  return (
    <motion.div
      initial={shouldReduceMotion ? false : { y: 28 }}
      whileInView={shouldReduceMotion ? undefined : { y: 0 }}
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
      style={{ scaleX, background: "var(--sol-gradient)" }}
      className="fixed left-0 top-0 z-50 h-[2px] w-full origin-left"
    />
  );
}

function SignalAtmosphere() {
  const shards = [
    ["8%", "18%", "0s"],
    ["18%", "72%", "1.4s"],
    ["78%", "22%", "0.7s"],
    ["88%", "64%", "2.1s"],
    ["52%", "84%", "1.1s"],
  ];

  return (
    <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {shards.map(([left, top, delay]) => (
        <span
          key={`${left}-${top}`}
          className="signal-shard"
          style={{ left, top, animationDelay: delay }}
        />
      ))}
      {[14, 31, 47, 63, 82, 94].map((left, index) => (
        <span
          key={left}
          className="signal-particle"
          style={{ left: `${left}%`, animationDelay: `${index * 0.55}s` }}
        />
      ))}
    </div>
  );
}
