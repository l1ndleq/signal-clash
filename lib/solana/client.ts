/**
 * Thin Solana Devnet client helpers: a shared connection, balance reads, a
 * dev-only airdrop, and explorer links. UI code talks to this module instead
 * of importing web3.js directly, keeping the settlement layer swappable.
 */

import {
  Connection,
  LAMPORTS_PER_SOL,
  PublicKey,
} from "@solana/web3.js";
import { SOLANA_NETWORK, SOLANA_RPC_ENDPOINT } from "@/lib/config";

let connection: Connection | null = null;

export function getConnection(): Connection {
  if (!connection) {
    connection = new Connection(SOLANA_RPC_ENDPOINT, "confirmed");
  }
  return connection;
}

export async function getBalanceSol(pubkey: PublicKey): Promise<number> {
  const lamports = await getConnection().getBalance(pubkey);
  return lamports / LAMPORTS_PER_SOL;
}

/**
 * Request a devnet airdrop. Handy during demos when a fresh wallet has 0 SOL.
 * Devnet faucets are rate-limited, so this can fail — callers should surface
 * the error rather than assume success.
 */
export async function requestAirdrop(
  pubkey: PublicKey,
  sol = 1,
): Promise<string> {
  const conn = getConnection();
  const sig = await conn.requestAirdrop(pubkey, sol * LAMPORTS_PER_SOL);
  const latest = await conn.getLatestBlockhash();
  await conn.confirmTransaction({ signature: sig, ...latest }, "confirmed");
  return sig;
}

export function explorerTxUrl(signature: string): string {
  return `https://explorer.solana.com/tx/${signature}?cluster=${SOLANA_NETWORK}`;
}

export function explorerAddressUrl(address: string): string {
  return `https://explorer.solana.com/address/${address}?cluster=${SOLANA_NETWORK}`;
}

export function shortAddress(address: string, chars = 4): string {
  if (address.length <= chars * 2 + 1) return address;
  return `${address.slice(0, chars)}…${address.slice(-chars)}`;
}
