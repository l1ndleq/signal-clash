"use client";

import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";

const BASE = "#9945FF"; // Solana purple
const SHINE = "#14F195"; // Solana green

/**
 * Reusable shiny text. Renders children in a purple base with a green shine
 * sweeping continuously left to right over 3s (framer-motion animates the
 * gradient position). Uses background-clip:text with a transparent fill.
 */
export default function ShinyText({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.span
      className={className}
      style={{
        backgroundImage: `linear-gradient(100deg, ${BASE} 40%, ${SHINE} 50%, ${BASE} 60%)`,
        backgroundSize: "200% 100%",
        WebkitBackgroundClip: "text",
        backgroundClip: "text",
        WebkitTextFillColor: "transparent",
        color: "transparent",
      }}
      animate={reduce ? undefined : { backgroundPositionX: ["200%", "-200%"] }}
      transition={
        reduce ? undefined : { duration: 3, ease: "linear", repeat: Infinity }
      }
    >
      {children}
    </motion.span>
  );
}
