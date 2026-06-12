"use client";

/**
 * Client providers: Buffer polyfill (web3.js needs it in the browser) plus the
 * Solana connection + wallet-adapter context. Wallets are auto-detected via the
 * Wallet Standard, so no per-wallet adapter packages are required.
 */

import { Buffer } from "buffer";
import { useMemo } from "react";
import {
  ConnectionProvider,
  WalletProvider,
} from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import "@solana/wallet-adapter-react-ui/styles.css";
import { SOLANA_RPC_ENDPOINT } from "@/lib/config";

if (typeof window !== "undefined") {
  const w = window as unknown as { Buffer?: typeof Buffer };
  w.Buffer = w.Buffer ?? Buffer;
}

export default function Providers({ children }: { children: React.ReactNode }) {
  const endpoint = useMemo(() => SOLANA_RPC_ENDPOINT, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={[]} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
