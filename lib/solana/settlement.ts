/**
 * Devnet settlement — the Solana BASE layer of Signal Clash.
 *
 * Backed by the on-chain `signal_clash_vault` program (see `anchor/`):
 *   - entry fee: `initialize_vault` (first depositor) + `deposit` move SOL into a
 *     per-game vault PDA derived from the game id.
 *   - settle: pays the ranked winners by the field's tier (winner-take-all /
 *     70-30 / 50-30-20), takes a 3% rake to the treasury, and routes any
 *     unfilled-place shares to the treasury — all in one program instruction.
 *
 * In the solo demo only the connected wallet is a real depositor, so the vault
 * holds a single entry fee and `buildSettleWinners` fills the unpayable higher
 * places (bot seats) with the treasury so the human still receives their own
 * place's share.
 */

import {
  Connection,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import { RAKE_BPS } from "@/lib/config";
import { explorerTxUrl, getConnection } from "./client";
import {
  TREASURY,
  buildDepositIx,
  buildInitializeVaultIx,
  buildSettleIx,
  deriveVaultPda,
} from "./vault";
import { paidPlacesForField, rankStandings } from "@/lib/game/tournament";
import type { Room } from "@/lib/game/types";

export interface SettlementResult {
  signature: string;
  explorerUrl: string;
}

export type WalletSend = (
  transaction: Transaction,
  connection: Connection,
) => Promise<string>;

/** The vault PDA address for a game (shown in the UI as the escrow). */
export function getVaultAddress(gameId: string): string {
  return deriveVaultPda(gameId).toBase58();
}

export interface DepositParams {
  gameId: string;
  payer: PublicKey;
  entryFeeLamports: number;
  maxPlayers: number;
  sendTransaction: WalletSend;
}

/**
 * Pay the entry fee into the game vault. Initializes the vault on the first
 * deposit (so the whole flow is a single wallet approval).
 */
export async function depositEntryFee(
  params: DepositParams,
): Promise<SettlementResult> {
  const connection = getConnection();
  const vault = deriveVaultPda(params.gameId);

  const tx = new Transaction();
  const existing = await connection.getAccountInfo(vault);
  if (!existing) {
    tx.add(
      buildInitializeVaultIx({
        gameId: params.gameId,
        authority: params.payer,
        entryFeeLamports: params.entryFeeLamports,
        maxPlayers: params.maxPlayers,
        feeBps: RAKE_BPS,
      }),
    );
  }
  tx.add(buildDepositIx({ gameId: params.gameId, player: params.payer }));

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = params.payer;

  const signature = await params.sendTransaction(tx, connection);
  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed",
  );
  return { signature, explorerUrl: explorerTxUrl(signature) };
}

/**
 * Build the ranked recipient list for `settle`. Real in-the-money wallets sit
 * at their rank; unpayable higher places (bot seats with no wallet) are filled
 * with the treasury so their shares are routed there. Returns [] when the
 * wallet finished out of the money (the whole pot then goes to the treasury).
 *
 * In a true multi-human game this would instead pass every real winner wallet.
 */
export function buildSettleWinners(room: Room, myWallet: string): PublicKey[] {
  const standings = rankStandings(room);
  const paid = paidPlacesForField(room.maxPlayers);
  const mine = standings.find((s) => s.wallet === myWallet);
  if (!mine || mine.rank > paid) return [];

  const winners: PublicKey[] = [];
  for (let i = 1; i < mine.rank; i++) winners.push(TREASURY);
  winners.push(new PublicKey(myWallet));
  return winners;
}

export interface SettleParams {
  gameId: string;
  /** The wallet that initialized the vault (the depositor in the solo demo). */
  authority: PublicKey;
  winners: PublicKey[];
  sendTransaction: WalletSend;
}

/**
 * Settle the game on-chain. Returns null if no vault exists for this game
 * (e.g. the deposit was skipped in the demo), so the UI can fall back to a
 * simulated-payout message.
 */
export async function settleGame(
  params: SettleParams,
): Promise<SettlementResult | null> {
  const connection = getConnection();
  const vault = deriveVaultPda(params.gameId);
  const info = await connection.getAccountInfo(vault);
  if (!info) return null;

  const tx = new Transaction().add(
    buildSettleIx({
      gameId: params.gameId,
      authority: params.authority,
      winners: params.winners,
    }),
  );
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash();
  tx.recentBlockhash = blockhash;
  tx.feePayer = params.authority;

  const signature = await params.sendTransaction(tx, connection);
  await connection.confirmTransaction(
    { signature, blockhash, lastValidBlockHeight },
    "confirmed",
  );
  return { signature, explorerUrl: explorerTxUrl(signature) };
}
