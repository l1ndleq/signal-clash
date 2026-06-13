"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import Header from "@/components/Header";

const SECTIONS: { id: string; label: string }[] = [
  { id: "introduction", label: "Introduction" },
  { id: "quickstart", label: "Quickstart" },
  { id: "how-it-works", label: "How it works" },
  { id: "scoring", label: "Scoring" },
  { id: "markets", label: "Markets & price feed" },
  { id: "tournaments", label: "Tournaments" },
  { id: "architecture", label: "Architecture" },
  { id: "magicblock", label: "MagicBlock seam" },
  { id: "settlement", label: "Devnet & safety" },
  { id: "faq", label: "FAQ" },
];

export default function DocsPage() {
  const [active, setActive] = useState(SECTIONS[0].id);

  // Scroll-spy: highlight the section currently in view.
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-20% 0px -70% 0px" },
    );
    SECTIONS.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="app-shell flex min-h-screen flex-col text-white">
      <Header />
      <div className="mx-auto w-full max-w-7xl flex-1 px-5 py-10 md:px-8 md:py-14">
        <div className="grid gap-10 lg:grid-cols-[220px_1fr]">
          {/* Sidebar */}
          <aside className="lg:sticky lg:top-24 lg:h-[calc(100vh-7rem)] lg:overflow-y-auto">
            <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-[0.2em] text-white/50">
              <BookOpen size={14} aria-hidden />
              Documentation
            </div>
            <nav className="mt-4 flex flex-col gap-1">
              {SECTIONS.map((s) => (
                <a
                  key={s.id}
                  href={`#${s.id}`}
                  onClick={(e) => {
                    e.preventDefault();
                    document
                      .getElementById(s.id)
                      ?.scrollIntoView({ behavior: "smooth" });
                  }}
                  className={`rounded-lg border-l-2 px-3 py-1.5 text-sm transition-colors ${
                    active === s.id
                      ? "border-[#14F195] bg-white/[0.04] text-white"
                      : "border-transparent text-white/60 hover:text-white"
                  }`}
                >
                  {s.label}
                </a>
              ))}
            </nav>
          </aside>

          {/* Content */}
          <article className="min-w-0 max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#14F195]/30 bg-[#14F195]/10 px-4 py-1.5 text-xs font-medium text-[#14F195]">
              Signal Clash docs
            </div>
            <h1 className="mt-5 text-4xl font-medium tracking-tighter md:text-6xl">
              Signal Clash <Accent>documentation</Accent>
            </h1>
            <p className="mt-4 text-lg text-white/70">
              A skill-based 1v1 market-prediction arena on Solana, with real-time
              game state designed for MagicBlock Ephemeral Rollups.
            </p>

            <Section id="introduction" title="Introduction">
              <P>
                Two players connect a wallet, join a room, and out-predict each
                other across five fast SOL/USD rounds. The winner is decided by{" "}
                <B>score</B> — direction accuracy, prediction timing, confidence
                multipliers, and streaks — not a single binary bet. Winner takes
                the devnet prize pool.
              </P>
              <ul className="mt-4 grid gap-3">
                <Bullet title="Skill, not gambling">
                  Score rewards being right, being fast, sizing confidence, and
                  stringing streaks — depth that binary up/down betting lacks.
                </Bullet>
                <Bullet title="Built for speed">
                  All real-time state (rooms, rounds, scoring, leaderboard) sits
                  behind a MagicBlock Ephemeral Rollup seam, with settlement on
                  Solana.
                </Bullet>
                <Bullet title="Honest and safe">
                  Devnet only, non-custodial — no private-key storage, no
                  backend-signed user transactions, no real-money custody.
                </Bullet>
              </ul>
            </Section>

            <Section id="quickstart" title="Quickstart">
              <P>
                You need a Solana wallet (Phantom / Solflare) set to{" "}
                <B>Devnet</B>. Fund a fresh wallet at{" "}
                <ExtLink href="https://faucet.solana.com">
                  faucet.solana.com
                </ExtLink>
                .
              </P>
              <Code>{`npm install --legacy-peer-deps   # wallet-adapter peers predate React 19
npm run dev                      # http://localhost:3000`}</Code>
              <P>Then walk the demo flow:</P>
              <ol className="mt-3 grid list-decimal gap-2 pl-5 text-white/70">
                <li>
                  <B>Landing</B> (<Mono>/</Mono>) — pitch + Enter Arena.
                </li>
                <li>
                  <B>Lobby</B> (<Mono>/lobby</Mono>) — join an open room or create
                  one (pick SOL / BTC / ETH and an entry fee).
                </li>
                <li>
                  <B>Room</B> (<Mono>/room/[id]</Mono>) — optionally deposit the
                  entry fee (real devnet tx), then start the match.
                </li>
                <li>
                  <B>Play</B> — 5 rounds: live price + chart, 30s timer, pick
                  UP / DOWN / FLAT with a 1x / 2x / 3x confidence, lock it in.
                </li>
                <li>
                  <B>Result</B> — winner, accuracy, best streak, prize pool, and a
                  claim payout (real devnet tx when escrow holds funds).
                </li>
              </ol>
            </Section>

            <Section id="how-it-works" title="How it works">
              <P>
                Every round opens with a moving market. The price shifts, the
                timer starts, and you have seconds to read the signal and lock a
                direction with a confidence multiplier. A move only counts as
                UP / DOWN once it passes <B>±0.05%</B>; otherwise the round is
                FLAT. Five rounds decide the match — consistency wins, not one
                lucky call.
              </P>
            </Section>

            <Section id="scoring" title="Scoring">
              <P>
                Pure scoring lives in <Mono>lib/game/scoring.ts</Mono> and is
                unit-tested. Each round contributes a base score, scaled by your
                confidence, plus timing and streak modifiers.
              </P>
              <Table
                head={["Outcome", "Base", "Modifiers"]}
                rows={[
                  ["Correct UP / DOWN", "+100", "× confidence (1 / 2 / 3)"],
                  ["Correct FLAT", "+80", "× confidence"],
                  ["Wrong", "−60", "× confidence"],
                  ["Timing ≤10s / ≤30s", "+30 / +15", "only when correct"],
                  ["Streak ≥5 / ≥3", "+60 / +25", "counted after the round"],
                ]}
              />
            </Section>

            <Section id="markets" title="Markets & price feed">
              <P>
                Pairs: <B>SOL/USD, BTC/USD, ETH/USD</B>, chosen per room.
              </P>
              <ul className="mt-3 grid gap-2 text-white/70">
                <li>
                  <B>Scoring</B> uses real Binance quotes (REST seed +{" "}
                  <Mono>@miniTicker</Mono> WebSocket). Rounds resolve on the real
                  market move between round start and the end of the timer.
                </li>
                <li>
                  <B>Chart</B> uses the TradingView Advanced Chart widget — visual
                  only; it does not feed scoring.
                </li>
                <li>
                  If Binance is unreachable, the feed falls back to a synthetic
                  walk and the room badge shows <Mono>simulated feed</Mono>.
                </li>
              </ul>
            </Section>

            <Section id="tournaments" title="Tournaments">
              <P>
                Beyond 1v1 rooms, admins schedule tournaments with a set field
                size, round count, entry fee, and an exact start date and time.
                The prize pool is split <B>50 / 30 / 20</B> across the top three
                after a 3% platform rake. Players register before the start; the
                match begins automatically at the scheduled time.
              </P>
            </Section>

            <Section id="architecture" title="Architecture">
              <P>Four separated layers:</P>
              <ul className="mt-3 grid gap-2 text-white/70">
                <li>
                  <B>Frontend UI</B> — <Mono>app/</Mono> +{" "}
                  <Mono>components/</Mono>.
                </li>
                <li>
                  <B>Game engine</B> — <Mono>lib/game/</Mono> (pure scoring,
                  room / round lifecycle, bot, match controller). Framework-free
                  and testable.
                </li>
                <li>
                  <B>MagicBlock real-time layer</B> — <Mono>lib/magicblock/</Mono>{" "}
                  (adapter interface + local in-memory mock). The Ephemeral Rollup
                  integration seam.
                </li>
                <li>
                  <B>Solana settlement</B> — <Mono>lib/solana/</Mono> (real devnet
                  entry-fee + payout transfers; Anchor vault program next).
                </li>
              </ul>
            </Section>

            <Section id="magicblock" title="MagicBlock seam">
              <P>
                <Mono>lib/magicblock/types.ts</Mono> defines the{" "}
                <Mono>MagicBlockAdapter</Mono> interface (
                <Mono>createRoomState</Mono>, <Mono>startRound</Mono>,{" "}
                <Mono>submitPrediction</Mono>, <Mono>resolveRound</Mono>, …). The
                in-memory mock implements it today. A real integration delegates
                room state to an Ephemeral Rollup and commits the final result
                back to Solana — with no game-engine changes required.
              </P>
            </Section>

            <Section id="settlement" title="Devnet & safety">
              <P>
                The match plays fast; the result settles on Solana devnet. The
                app is non-custodial: it never sees a private key and never signs
                on the user&apos;s behalf. Entry fee in and payout out happen via{" "}
                <Mono>SystemProgram.transfer</Mono>, confirmed on devnet, with
                explorer links in the UI.
              </P>
              <Callout>
                Each room currently uses an ephemeral client-side escrow keypair —
                fine for a devnet demo, <B>not</B> production-safe. An Anchor vault
                program (room PDA custody, payout gated on the committed result) is
                the planned replacement.
              </Callout>
            </Section>

            <Section id="faq" title="FAQ">
              <Faq q="Is this real money?">
                No. Devnet only — fund a test wallet from the faucet. There is no
                mainnet custody.
              </Faq>
              <Faq q="Who is my opponent?">
                In the solo demo the opponent is a local Signal Bot. The same
                engine calls support networked human submissions.
              </Faq>
              <Faq q="What's real vs mocked?">
                Real: wallet connect, devnet balance, entry-fee deposit and winner
                payout, live Binance feed, TradingView chart, all scoring. Mocked:
                the bot opponent and the MagicBlock real-time layer (behind a
                production interface).
              </Faq>
            </Section>

            <div className="mt-14 flex flex-wrap gap-3 border-t border-white/10 pt-8">
              <Link
                href="/lobby"
                className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-black px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-900"
              >
                Enter the arena
                <ArrowRight
                  size={18}
                  aria-hidden
                  className="transition-transform duration-300 group-hover:translate-x-1"
                />
              </Link>
              <Link
                href="/"
                className="inline-flex items-center gap-2 rounded-full border border-white/15 px-6 py-3 text-sm font-semibold text-white/80 transition-colors hover:text-white"
              >
                Back to home
              </Link>
            </div>
          </article>
        </div>
      </div>
    </div>
  );
}

function Section({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-24 border-t border-white/10 pt-10 mt-12">
      <h2 className="text-2xl font-medium tracking-tight text-white md:text-3xl">
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function P({ children }: { children: ReactNode }) {
  return <p className="text-base leading-relaxed text-white/70">{children}</p>;
}

function B({ children }: { children: ReactNode }) {
  return <strong className="font-semibold text-white">{children}</strong>;
}

function Accent({ children }: { children: ReactNode }) {
  return (
    <span
      style={{
        backgroundImage: "var(--gradient-solana)",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        WebkitTextFillColor: "transparent",
        color: "transparent",
      }}
    >
      {children}
    </span>
  );
}

function Mono({ children }: { children: ReactNode }) {
  return (
    <code className="rounded bg-white/[0.06] px-1.5 py-0.5 font-num text-[0.85em] text-[#14F195]">
      {children}
    </code>
  );
}

function ExtLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="text-[#03E1FF] underline underline-offset-2 hover:text-white"
    >
      {children}
    </a>
  );
}

function Code({ children }: { children: string }) {
  return (
    <pre className="mt-4 overflow-x-auto rounded-xl border border-white/10 bg-black/60 p-4 font-num text-sm leading-relaxed text-white/85">
      <code>{children}</code>
    </pre>
  );
}

function Bullet({ title, children }: { title: string; children: ReactNode }) {
  return (
    <li className="rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="font-medium text-white">{title}</div>
      <div className="mt-1 text-sm leading-relaxed text-white/60">{children}</div>
    </li>
  );
}

function Table({ head, rows }: { head: string[]; rows: string[][] }) {
  return (
    <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="bg-white/[0.04]">
            {head.map((h) => (
              <th
                key={h}
                className="px-4 py-3 font-medium uppercase tracking-wide text-white/60"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t border-white/10">
              {r.map((c, j) => (
                <td
                  key={j}
                  className={`px-4 py-3 ${j === 0 ? "text-white" : "font-num text-white/70"}`}
                >
                  {c}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Callout({ children }: { children: ReactNode }) {
  return (
    <div className="mt-4 rounded-xl border border-[#F5A524]/30 bg-[#F5A524]/[0.07] p-4 text-sm leading-relaxed text-white/75">
      {children}
    </div>
  );
}

function Faq({ q, children }: { q: string; children: ReactNode }) {
  return (
    <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
      <div className="font-medium text-white">{q}</div>
      <div className="mt-1.5 text-sm leading-relaxed text-white/60">{children}</div>
    </div>
  );
}
