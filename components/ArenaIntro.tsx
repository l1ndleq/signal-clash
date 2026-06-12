"use client";

/**
 * Cinematic intro screen shown before the arena (DESIGN.md palette).
 *
 * Self-contained and toggleable: render <ArenaIntro onEnter={...} /> and call
 * `onEnter` to advance. No scroll, so no Lenis — just Framer Motion. Animations
 * are transform/opacity only (GPU-friendly) to stay light.
 *
 * Flow: preloader counter 0 -> 100% -> "Ready" -> content reveal
 * (title cascade, subtitle fade, magnetic Enter button).
 */

import { useEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useSpring,
} from "framer-motion";

const WORDS = ["Signal", "Clash"];
const SUBTITLE = "Predict the next move. On-chain. In milliseconds.";

type Phase = "loading" | "ready" | "content";

export default function ArenaIntro({ onEnter }: { onEnter: () => void }) {
  const [count, setCount] = useState(0);
  const [phase, setPhase] = useState<Phase>("loading");
  const countRef = useRef(0);

  useEffect(() => {
    let readyT: ReturnType<typeof setTimeout>;
    let contentT: ReturnType<typeof setTimeout>;
    const id = setInterval(() => {
      const next = Math.min(100, countRef.current + 3);
      countRef.current = next;
      setCount(next);
      if (next >= 100) {
        clearInterval(id);
        readyT = setTimeout(() => setPhase("ready"), 200);
        contentT = setTimeout(() => setPhase("content"), 800);
      }
    }, 26);
    return () => {
      clearInterval(id);
      clearTimeout(readyT);
      clearTimeout(contentT);
    };
  }, []);

  return (
    <main className="arena-canvas relative grid min-h-screen place-items-center overflow-hidden text-[var(--ink)]">
      <Beams />

      <AnimatePresence mode="wait">
        {phase !== "content" ? (
          <motion.div
            key="loader"
            exit={{ opacity: 0, filter: "blur(8px)" }}
            transition={{ duration: 0.5 }}
            className="relative z-10 flex flex-col items-center"
          >
            <div className="font-num text-7xl font-semibold tabular-nums">
              {phase === "ready" ? "Ready" : `${count}%`}
            </div>
            <div className="mt-3 h-4 text-xs uppercase tracking-[0.35em] text-[var(--ink-muted)]">
              {phase === "ready" ? "" : "Loading arena"}
            </div>
          </motion.div>
        ) : (
          <Content key="content" onEnter={onEnter} />
        )}
      </AnimatePresence>
    </main>
  );
}

/* --------------------------- Content reveal -------------------------- */

function Content({ onEnter }: { onEnter: () => void }) {
  return (
    <motion.div
      className="relative z-10 flex flex-col items-center px-6 text-center"
      initial="hidden"
      animate="show"
      variants={{ hidden: {}, show: { transition: { staggerChildren: 0.18 } } }}
    >
      <motion.h1
        className="font-display flex flex-wrap justify-center gap-x-4 text-6xl font-bold leading-none md:text-8xl"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.15, delayChildren: 0.05 } },
        }}
      >
        {WORDS.map((word) => (
          <motion.span
            key={word}
            className="gradient-text inline-block"
            variants={{
              hidden: { y: 70 },
              show: {
                y: 0,
                transition: { type: "spring", stiffness: 120, damping: 17 },
              },
            }}
          >
            {word}
          </motion.span>
        ))}
      </motion.h1>

      <motion.p
        className="mt-6 max-w-md text-base text-[var(--ink-muted)] md:text-lg"
        variants={{
          hidden: { y: 14 },
          show: { y: 0, transition: { duration: 0.6 } },
        }}
      >
        {SUBTITLE}
      </motion.p>

      <motion.div
        className="mt-10"
        variants={{
          hidden: { y: 18 },
          show: { y: 0, transition: { duration: 0.5 } },
        }}
      >
        <MagneticEnter onEnter={onEnter} />
      </motion.div>
    </motion.div>
  );
}

/* --------------------------- Magnetic button ------------------------- */

function MagneticEnter({ onEnter }: { onEnter: () => void }) {
  const ref = useRef<HTMLButtonElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 200, damping: 15 });
  const sy = useSpring(y, { stiffness: 200, damping: 15 });

  const onMove = (e: React.MouseEvent) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * 0.35);
    y.set((e.clientY - (r.top + r.height / 2)) * 0.35);
  };
  const reset = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={reset}
      onClick={onEnter}
      style={{ x: sx, y: sy, background: "var(--sol-gradient)" }}
      whileHover={{ scale: 1.05, boxShadow: "0 0 50px rgba(3,225,255,0.55)" }}
      whileTap={{ scale: 0.96 }}
      className="font-display rounded-2xl px-10 py-4 text-lg font-semibold text-[#06101f]"
    >
      Enter Arena
    </motion.button>
  );
}

/* ----------------------------- Light beams --------------------------- */

function Beams() {
  const positions = [10, 26, 42, 58, 74, 90];
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {positions.map((left, i) => (
        <motion.span
          key={left}
          className="absolute top-[-15%] h-[130%] w-px"
          style={{
            left: `${left}%`,
            background:
              "linear-gradient(to bottom, transparent, rgba(29,158,117,0.5), transparent)",
          }}
          initial={{ opacity: 0.12, y: "-4%" }}
          animate={{ opacity: [0.1, 0.42, 0.1], y: ["-4%", "4%", "-4%"] }}
          transition={{
            duration: 7 + i,
            repeat: Infinity,
            ease: "easeInOut",
            delay: i * 0.6,
          }}
        />
      ))}
    </div>
  );
}
