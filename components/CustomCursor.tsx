"use client";

/**
 * Custom cursor: an instant dot + a spring-lagged ring that grows over
 * interactive elements. Only activates on fine pointers (desktop); touch
 * devices keep their native behaviour. Hides the native cursor while active.
 */

import { useEffect, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

export default function CustomCursor() {
  const [enabled, setEnabled] = useState(false);
  const [hovering, setHovering] = useState(false);

  const x = useMotionValue(-100);
  const y = useMotionValue(-100);
  const ringX = useSpring(x, { stiffness: 350, damping: 28, mass: 0.4 });
  const ringY = useSpring(y, { stiffness: 350, damping: 28, mass: 0.4 });

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;
    // Defer the state flip out of the effect body (avoids cascading renders).
    const raf = requestAnimationFrame(() => setEnabled(true));
    document.documentElement.classList.add("cursor-none");

    const move = (e: MouseEvent) => {
      x.set(e.clientX);
      y.set(e.clientY);
    };
    const over = (e: MouseEvent) => {
      const t = e.target as HTMLElement | null;
      setHovering(!!t?.closest("a, button, [role='button'], [data-cursor]"));
    };

    window.addEventListener("mousemove", move, { passive: true });
    window.addEventListener("mouseover", over, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseover", over);
      document.documentElement.classList.remove("cursor-none");
    };
  }, [x, y]);

  if (!enabled) return null;

  return (
    <>
      {/* Crosshair arms (lagged) */}
      <motion.div
        style={{ x: ringX, y: ringY }}
        className="pointer-events-none fixed left-0 top-0 z-[100]"
        animate={{ opacity: hovering ? 1 : 0.7 }}
        transition={{ type: "spring", stiffness: 300, damping: 25 }}
      >
        {/* Horizontal left arm */}
        <div
          className="absolute"
          style={{
            background: "var(--surge)",
            width: hovering ? 14 : 8,
            height: 1,
            top: -0.5,
            right: 4,
          }}
        />
        {/* Horizontal right arm */}
        <div
          className="absolute"
          style={{
            background: "var(--surge)",
            width: hovering ? 14 : 8,
            height: 1,
            top: -0.5,
            left: 4,
          }}
        />
        {/* Vertical top arm */}
        <div
          className="absolute"
          style={{
            background: "var(--surge)",
            width: 1,
            height: hovering ? 14 : 8,
            left: -0.5,
            bottom: 4,
          }}
        />
        {/* Vertical bottom arm */}
        <div
          className="absolute"
          style={{
            background: "var(--surge)",
            width: 1,
            height: hovering ? 14 : 8,
            left: -0.5,
            top: 4,
          }}
        />
      </motion.div>

      {/* Center dot (instant) */}
      <motion.div
        style={{ x, y }}
        className="pointer-events-none fixed left-0 top-0 z-[100]"
      >
        <div
          className="h-[3px] w-[3px] -translate-x-1/2 -translate-y-1/2"
          style={{ background: "var(--surge)" }}
        />
      </motion.div>
    </>
  );
}
