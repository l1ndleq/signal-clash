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
 * holds a single entry fee and `buildSettleWinners` pays just that wallet its
 * own finishing place — the unclaimed places + rake fall through to the treasury
 * on-chain.
 */

import {
  Connection,
  PublicKey,
  Transaction,
} from "@solana/web3.js";
import { RAKE_BPS } from "@/lib/config";
import { explorerTxUrl, getConnection } from "./client";
import {
  buildDepositIx,
  buildInitializeVaultIx,
  buildSettleIx,
  buildVoidIx,
  deriveVaultPda,
  parseVaultPlayers,
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
 * Build the winner/place lists for `settle`. Each real in-the-money wallet is
 * paid the share for its own finishing place; unclaimed places fall through to
 * the treasury on-chain. Returns empty lists when the wallet finished out of the
 * money (the whole pot then goes to the treasury).
 *
 * Solo demo: only the connected wallet is a real depositor, so this is just that
 * wallet at its place. A true multi-human game would pass every winning wallet
 * with its place — the on-chain program checks each is a recorded depositor.
 */
export function buildSettleWinners(
  room: Room,
  myWallet: string,
): { winners: PublicKey[]; places: number[] } {
  const standings = rankStandings(room);
  const paid = paidPlacesForField(room.maxPlayers);
  const mine = standings.find((s) => s.wallet === myWallet);
  if (!mine || mine.rank > paid) return { winners: [], places: [] };

  return { winners: [new PublicKey(myWallet)], places: [mine.rank - 1] };
}

export interface SettleParams {
  gameId: string;
  /** The wallet that initialized the vault (the depositor in the solo demo). */
  authority: PublicKey;
  winners: PublicKey[];
  /** Prize place (0-based) for each winner, aligned with `winners`. */
  places: number[];
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
      places: params.places,
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

export interface VoidParams {
  gameId: string;
  payer: PublicKey;
  sendTransaction: WalletSend;
}

/**
 * Void an abandoned game: refund every recorded depositor their own entry fee.
 * Only succeeds once the on-chain abandonment window has elapsed. Reads the
 * depositor registry from the vault account; returns null if no vault exists.
 */
export async function voidGame(
  params: VoidParams,
): Promise<SettlementResult | null> {
  const connection = getConnection();
  const vault = deriveVaultPda(params.gameId);
  const info = await connection.getAccountInfo(vault);
  if (!info) return null;

  const players = parseVaultPlayers(info.data);
  const tx = new Transaction().add(
    buildVoidIx({ gameId: params.gameId, payer: params.payer, players }),
  );
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
