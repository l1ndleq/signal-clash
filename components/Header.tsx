"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Radio } from "lucide-react";
import WalletButton from "./WalletButton";

export default function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-3" aria-label="Signal Clash home">
            <span className="grid h-8 w-8 place-items-center rounded-full border-2 border-white">
              <span
                className="h-3 w-3 rounded-full"
                style={{ backgroundImage: "var(--gradient-solana)" }}
              />
            </span>
            <span className="flex flex-col">
              <span className="text-sm font-semibold leading-none text-white">
                Signal Clash
              </span>
              <span className="mt-1 hidden text-[0.66rem] uppercase tracking-[0.18em] text-white/50 sm:block">
                PvP signal arena
              </span>
            </span>
          </Link>
          <span className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/70 sm:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: "#14f195" }} />
            Devnet
          </span>
        </div>

        <nav className="flex flex-wrap items-center gap-2 lg:justify-end">
          <div className="flex items-center gap-1 rounded-full border border-white/10 px-1.5 py-1">
            <NavLink href="/" label="Home" active={pathname === "/"} />
            <NavLink href="/lobby" label="Lobby" active={pathname === "/lobby"} />
            <NavLink href="/arena" label="Demo" active={pathname === "/arena"} />
            <NavLink href="/docs" label="Docs" active={pathname === "/docs"} />
          </div>
          <span className="hidden items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-white/60 sm:inline-flex">
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
      className={`rounded-full px-3 py-1.5 text-sm transition-colors ${
        active ? "bg-white/10 text-white" : "text-white/70 hover:text-white"
      }`}
    >
      {label}
    </Link>
  );
}
