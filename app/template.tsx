"use client";

/**
 * Route-level enter transition. App Router remounts this template on every
 * navigation, so a mount animation gives every page a smooth entrance and the
 * site "flows" between landing -> lobby -> room.
 *
 * Opacity only (no transform/filter) on purpose: a transformed/filtered wrapper
 * would become the containing block for the landing's `fixed` elements and
 * break Lenis + the fixed UI. Opacity creates only a stacking context.
 */

import { motion } from "framer-motion";

export default function Template({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={false}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.45, ease: "easeOut" }}
      className="flex min-h-dvh flex-col"
    >
      {children}
    </motion.div>
  );
}
