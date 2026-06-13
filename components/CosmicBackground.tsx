"use client";

import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";

// Client-only WebGL scene — skip SSR.
const HeroScene = dynamic(() => import("@/components/HeroScene"), { ssr: false });

/**
 * Site-wide fixed cosmic background: the deep-space HeroScene behind every page,
 * plus a dark scrim so body copy stays readable. Sits at -z-10 so all page
 * content renders above it (pages must keep transparent backgrounds).
 *
 * Hidden on /docs, where dense text needs a calm, fully legible background.
 */
export default function CosmicBackground() {
  const pathname = usePathname();
  if (pathname?.startsWith("/docs")) return null;

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <HeroScene />
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg, rgba(0,0,0,0.32) 0%, rgba(0,0,0,0.5) 55%, rgba(0,0,0,0.62) 100%)",
        }}
      />
    </div>
  );
}
