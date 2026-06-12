"use client";

/**
 * Hero background imagery: a live-feeling market "signal" line that scrolls
 * seamlessly, over a faint grid, with a neon glow. Deterministic geometry
 * (fixed point array) so SSR and client markup match — no hydration mismatch.
 * Pure SVG + one transform animation; very light.
 */

import { motion } from "framer-motion";

// Normalised heights (0..1). First == last so the tile loops seamlessly.
const Y = [
  0.55, 0.5, 0.62, 0.45, 0.58, 0.4, 0.52, 0.66, 0.48, 0.6, 0.42, 0.56, 0.5,
  0.64, 0.46, 0.58, 0.44, 0.6, 0.5, 0.7, 0.52, 0.46, 0.58, 0.5, 0.55,
];
const STEP = 60;
const H = 400;
const SEG = STEP * (Y.length - 1); // 1440

// Two tiles back-to-back for a seamless leftward scroll.
const POINTS = [...Y, ...Y.slice(1)];
const D = POINTS.map(
  (v, i) => `${i === 0 ? "M" : "L"} ${i * STEP} ${(1 - v) * H}`,
).join(" ");

export default function HeroSignal() {
  return (
    <div
      className="pointer-events-none absolute inset-0 z-0 overflow-hidden"
      style={{
        maskImage:
          "radial-gradient(120% 80% at 50% 45%, #000 35%, transparent 78%)",
        WebkitMaskImage:
          "radial-gradient(120% 80% at 50% 45%, #000 35%, transparent 78%)",
        filter: "drop-shadow(0 0 14px rgba(0,255,163,0.35))",
        opacity: 0.5,
      }}
    >
      <svg
        className="h-full w-full"
        viewBox={`0 0 ${SEG} ${H}`}
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id="signalGrad" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--surge)" />
            <stop offset="50%" stopColor="var(--ocean)" />
            <stop offset="100%" stopColor="var(--purple)" />
          </linearGradient>
        </defs>

        {/* faint grid */}
        {[0.25, 0.5, 0.75].map((g) => (
          <line
            key={g}
            x1={0}
            x2={SEG}
            y1={g * H}
            y2={g * H}
            stroke="rgba(255,255,255,0.05)"
            strokeWidth={1}
          />
        ))}

        {/* scrolling signal line */}
        <motion.g
          animate={{ x: [0, -SEG] }}
          transition={{ duration: 14, repeat: Infinity, ease: "linear" }}
        >
          <path
            d={D}
            fill="none"
            stroke="url(#signalGrad)"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </motion.g>
      </svg>
    </div>
  );
}
