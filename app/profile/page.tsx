"use client";

import { useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useWallet } from "@solana/wallet-adapter-react";
import { UserRound } from "lucide-react";
import Header from "@/components/Header";

export default function MyProfileRedirect() {
  const router = useRouter();
  const { publicKey } = useWallet();

  // Once a wallet is connected, send the user to their own profile.
  useEffect(() => {
    if (publicKey) router.replace(`/profile/${publicKey.toBase58()}`);
  }, [publicKey, router]);

  return (
    <div className="app-shell flex min-h-screen flex-col text-white">
      <Header />
      <main className="app-main grid flex-1 place-items-center">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-8 text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-white/10 text-white/70">
            <UserRound size={22} aria-hidden />
          </span>
          <h1 className="mt-4 text-2xl font-medium">Your profile</h1>
          <p className="mt-2 max-w-sm text-sm text-white/60">
            Connect your wallet to see your stats and match history, or browse
            the global leaderboard.
          </p>
          <Link
            href="/leaderboard"
            className="mt-6 inline-flex items-center justify-center rounded-full border border-white/15 bg-black px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-gray-900"
          >
            View leaderboard
          </Link>
        </div>
      </main>
    </div>
  );
}
