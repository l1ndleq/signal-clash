"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radio } from "lucide-react";
import WalletButton from "./WalletButton";

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-[var(--hairline)] bg-[rgba(7,9,14,0.78)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3" aria-label="Signal Clash home">
            <span className="clip-corner grid h-9 w-9 place-items-center bg-[var(--surge)] font-display text-sm font-bold text-[#04060a] shadow-[0_0_20px_rgba(0,255,163,0.5)]">
              SC
            </span>
            <span className="flex flex-col">
              <span className="font-display text-base font-bold leading-none tracking-[0.06em] text-[var(--ink)]">
                SIGNAL CLASH
              </span>
              <span className="mt-1 hidden text-[0.66rem] font-semibold uppercase tracking-[0.18em] text-[var(--ink-muted)] sm:block">
                PvP signal arena
              </span>
            </span>
          </Link>
          <span className="chip hidden border-[rgba(0,255,163,0.28)] bg-[rgba(0,255,163,0.07)] text-[var(--surge)] sm:inline-flex">
            <span className="status-dot" />
            Devnet
          </span>
        </div>

        <nav className="flex flex-wrap items-center gap-2 lg:justify-end">
          <NavLink href="/" label="Home" active={pathname === "/"} />
          <NavLink href="/lobby" label="Lobby" active={pathname === "/lobby"} />
          <NavLink href="/arena" label="Demo" active={pathname === "/arena"} />
          <span className="chip border-[rgba(3,225,255,0.24)] bg-[rgba(3,225,255,0.07)] text-[var(--ocean)]">
            <Radio size={13} aria-hidden />
            MagicBlock mock
          </span>
          <WalletButton />
        </nav>
      </div>
    </header>
  );
}

function NavLink({
  href,
  label,
  active,
}: {
  href: string;
  label: string;
  active: boolean;
}) {
  return (
    <Link
      href={href}
      className={`clip-corner border px-3 py-1.5 font-mono text-xs uppercase tracking-[0.1em] transition ${
        active
          ? "border-[rgba(0,255,163,0.38)] bg-[rgba(0,255,163,0.08)] text-[var(--surge)]"
          : "border-[rgba(255,255,255,0.08)] text-[var(--ink-muted)] hover:border-[rgba(3,225,255,0.35)] hover:text-[var(--ink)]"
      }`}
    >
      {label}
    </Link>
  );
}
