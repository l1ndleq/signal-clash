"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { shortAddress } from "@/lib/solana/client";

// Rendered client-only: the connect button's label differs between server and
// client, which would otherwise cause a hydration mismatch.
const WalletMultiButton = dynamic(
  () =>
    import("@solana/wallet-adapter-react-ui").then(
      (m) => m.WalletMultiButton,
    ),
  { ssr: false },
);

export default function WalletButton() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const [balance, setBalance] = useState<number | null>(null);

  // Fetch balance whenever the connected wallet changes. All setState calls
  // happen after an await, so the effect never sets state synchronously.
  useEffect(() => {
    if (!publicKey) return;
    let cancelled = false;
    (async () => {
      try {
        const lamports = await connection.getBalance(publicKey);
        if (!cancelled) setBalance(lamports / LAMPORTS_PER_SOL);
      } catch {
        if (!cancelled) setBalance(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [connection, publicKey]);

  return (
    <div className="flex flex-wrap items-center gap-2">
      {publicKey && (
        <span className="chip border-[rgba(0,255,163,0.26)] bg-[rgba(0,255,163,0.07)] font-num text-[var(--surge)]">
          <span className="text-[var(--ink-muted)]">
            {shortAddress(publicKey.toBase58(), 4)}
          </span>
          {balance === null ? "-" : `${balance.toFixed(3)} SOL`}
        </span>
      )}
      <WalletMultiButton />
    </div>
  );
}
