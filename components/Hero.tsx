"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowRight, Menu } from "lucide-react";
import WalletButton from "@/components/WalletButton";
import ShinyText from "@/components/ShinyText";

const NAV_LINKS: { label: string; href: string }[] = [
  { label: "Home", href: "/" },
  { label: "How it Works", href: "/#market-is-alive" },
  { label: "Arena", href: "/arena" },
  { label: "Leaderboard", href: "/lobby" },
  { label: "Docs", href: "/#market-is-alive" },
];

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const container: Variants = {
  hidden: {},
  show: { transition: { delayChildren: 0.2, staggerChildren: 0.12 } },
};
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE } },
};

export default function Hero() {
  const reduce = useReducedMotion();

  return (
    <section className="relative mx-auto flex min-h-screen max-w-7xl flex-col px-5 text-white md:px-8">
      <Nav />

      {/* Top section: two-column intro paragraphs */}
      <div className="grid gap-4 pt-2 md:pt-4 lg:grid-cols-2">
        <p className="max-w-md text-sm text-white/80 md:text-base">
          A real-time PvP price-prediction arena on Solana, powered by MagicBlock
          Ephemeral Rollups for instant, gasless rounds.
        </p>
        <p className="text-sm text-white/80 md:text-base lg:text-right">
          Predictions settled in milliseconds !
        </p>
      </div>

      {/* Center hero */}
      <motion.div
        variants={container}
        initial={reduce ? false : "hidden"}
        animate={reduce ? false : "show"}
        className="flex flex-1 flex-col items-center justify-center py-16 text-center"
      >
        <motion.p
          variants={reduce ? undefined : fadeUp}
          className="text-xs uppercase tracking-tight text-white/80 md:text-sm"
        >
          Round Starts in Seconds
        </motion.p>

        <motion.h1
          variants={reduce ? undefined : fadeUp}
          className="mt-4 text-5xl font-medium leading-[0.85] tracking-tighter sm:text-7xl lg:text-8xl xl:text-9xl"
        >
          <span className="block">Predict the</span>
          <span className="block">
            <ShinyText>Market.</ShinyText>
          </span>
        </motion.h1>

        <motion.div variants={reduce ? undefined : fadeUp} className="mt-10">
          <EnterArenaButton />
        </motion.div>
      </motion.div>
    </section>
  );
}

function Nav() {
  return (
    <header className="flex items-center justify-between gap-4 py-5 md:py-6">
      <Link href="/" aria-label="Signal Clash home" className="flex items-center gap-3">
        <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-white">
          <span className="h-3 w-3 rounded-full bg-white" />
        </span>
        <span className="text-sm font-semibold text-white">Signal Clash</span>
      </Link>

      <div className="flex items-center gap-3">
        <nav className="hidden items-center gap-1 rounded-full border border-gray-700 px-2 py-1 lg:flex">
          {NAV_LINKS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className="rounded-full px-3 py-1.5 text-sm text-white/80 transition-colors hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Real wallet connect (kept — working logic). */}
        <div className="hidden lg:block">
          <WalletButton />
        </div>

        <button
          type="button"
          aria-label="Open menu"
          className="grid h-9 w-9 place-items-center rounded-full border border-gray-700 text-white/80 transition-colors hover:text-white lg:hidden"
        >
          <Menu size={18} aria-hidden />
        </button>
      </div>
    </header>
  );
}

function EnterArenaButton() {
  const router = useRouter();

  return (
    <button
      type="button"
      onClick={() => router.push("/lobby")}
      className="group inline-flex items-center gap-2 rounded-full border border-white/15 bg-black px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-900 md:px-8 md:py-4 md:text-base"
    >
      Enter Arena
      <ArrowRight
        size={18}
        aria-hidden
        className="transition-transform duration-300 group-hover:translate-x-1"
      />
    </button>
  );
}
