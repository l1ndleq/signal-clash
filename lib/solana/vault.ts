/**
 * Client for the on-chain `signal_clash_vault` program (devnet).
 *
 * Instructions are built by hand on top of @solana/web3.js (no @coral-xyz/anchor
 * dependency): the 8-byte Anchor discriminators come straight from the IDL and
 * the args are small enough to Borsh-encode inline. The PDA seed is
 * `["vault", game_id]`, matching the program.
 */

import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import { RAKE_BPS, TREASURY_PUBKEY, VAULT_PROGRAM_ID } from "@/lib/config";

export const VAULT_PROGRAM = new PublicKey(VAULT_PROGRAM_ID);
export const TREASURY = new PublicKey(TREASURY_PUBKEY);

// Anchor instruction discriminators (from anchor/idl/signal_clash_vault.json).
const DISC = {
  initializeVault: Uint8Array.from([48, 191, 163, 44, 71, 129, 63, 164]),
  deposit: Uint8Array.from([242, 35, 198, 137, 82, 225, 242, 182]),
  settle: Uint8Array.from([175, 42, 185, 87, 144, 131, 102, 212]),
  void: Uint8Array.from([55, 130, 74, 24, 235, 14, 16, 3]),
};

/** Byte offset of the `players` Vec<Pubkey> in the Vault account data. */
const PLAYERS_OFFSET =
  8 + 32 + 32 + 8 + 2 + 1 + 8 + 1 + 1 + 8; // disc..created_at = 101

/** Parse the on-chain depositor registry from a Vault account's raw data. */
export function parseVaultPlayers(data: Uint8Array): PublicKey[] {
  const view = new DataView(data.buffer, data.byteOffset, data.byteLength);
  const count = view.getUint32(PLAYERS_OFFSET, true);
  const players: PublicKey[] = [];
  let off = PLAYERS_OFFSET + 4;
  for (let i = 0; i < count; i++) {
    players.push(new PublicKey(data.subarray(off, off + 32)));
    off += 32;
  }
  return players;
}

// ---- tiny Borsh encoders ----

function concat(parts: Uint8Array[]): Uint8Array {
  const len = parts.reduce((n, p) => n + p.length, 0);
  const out = new Uint8Array(len);
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

function encU16(n: number): Uint8Array {
  const b = new Uint8Array(2);
  new DataView(b.buffer).setUint16(0, n, true);
  return b;
}

function encU64(n: number): Uint8Array {
  const b = new Uint8Array(8);
  new DataView(b.buffer).setBigUint64(0, BigInt(Math.round(n)), true);
  return b;
}

/** Borsh string: 4-byte LE length prefix + utf8 bytes. */
function encString(s: string): Uint8Array {
  const bytes = new TextEncoder().encode(s);
  const len = new Uint8Array(4);
  new DataView(len.buffer).setUint32(0, bytes.length, true);
  return concat([len, bytes]);
}

/** Borsh Vec<u8>: 4-byte LE length prefix + raw bytes. */
function encVecU8(values: number[]): Uint8Array {
  const len = new Uint8Array(4);
  new DataView(len.buffer).setUint32(0, values.length, true);
  return concat([len, Uint8Array.from(values)]);
}

/** Derive the vault PDA for a game id. */
export function deriveVaultPda(gameId: string): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [new TextEncoder().encode("vault"), new TextEncoder().encode(gameId)],
    VAULT_PROGRAM,
  );
  return pda;
}

export function buildInitializeVaultIx(params: {
  gameId: string;
  authority: PublicKey;
  entryFeeLamports: number;
  maxPlayers: number;
  feeBps?: number;
}): TransactionInstruction {
  const vault = deriveVaultPda(params.gameId);
  const data = concat([
    DISC.initializeVault,
    encString(params.gameId),
    encU64(params.entryFeeLamports),
    encU16(params.feeBps ?? RAKE_BPS),
    Uint8Array.from([params.maxPlayers]),
  ]);
  return new TransactionInstruction({
    programId: VAULT_PROGRAM,
    keys: [
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: params.authority, isSigner: true, isWritable: true },
      { pubkey: TREASURY, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });
}

export function buildDepositIx(params: {
  gameId: string;
  player: PublicKey;
}): TransactionInstruction {
  const vault = deriveVaultPda(params.gameId);
  const data = concat([DISC.deposit, encString(params.gameId)]);
  return new TransactionInstruction({
    programId: VAULT_PROGRAM,
    keys: [
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: params.player, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });
}

/**
 * Build the settle instruction. `winners[i]` is paid the share for prize place
 * `places[i]` (0 = 1st, 1 = 2nd, 2 = 3rd); the program routes the rake + any
 * unclaimed-place shares to the treasury. Every winner must be a recorded
 * depositor, and winners/places must be distinct (enforced on-chain).
 */
export function buildSettleIx(params: {
  gameId: string;
  authority: PublicKey;
  winners: PublicKey[];
  places: number[];
}): TransactionInstruction {
  const vault = deriveVaultPda(params.gameId);
  const data = concat([
    DISC.settle,
    encString(params.gameId),
    encVecU8(params.places),
  ]);
  return new TransactionInstruction({
    programId: VAULT_PROGRAM,
    keys: [
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: params.authority, isSigner: true, isWritable: false },
      { pubkey: TREASURY, isSigner: false, isWritable: true },
      // Winner accounts as writable remaining_accounts, 1:1 with `places`.
      ...params.winners.map((w) => ({
        pubkey: w,
        isSigner: false,
        isWritable: true,
      })),
    ],
    data: Buffer.from(data),
  });
}

/**
 * Build the void instruction: after the on-chain abandonment window, anyone may
 * refund every depositor their own entry fee at once. `players` must be the full
 * recorded depositor set, in registry order (use `parseVaultPlayers`).
 */
export function buildVoidIx(params: {
  gameId: string;
  payer: PublicKey;
  players: PublicKey[];
}): TransactionInstruction {
  const vault = deriveVaultPda(params.gameId);
  const data = concat([DISC.void, encString(params.gameId)]);
  return new TransactionInstruction({
    programId: VAULT_PROGRAM,
    keys: [
      { pubkey: vault, isSigner: false, isWritable: true },
      { pubkey: params.payer, isSigner: true, isWritable: true },
      // Every recorded depositor as writable remaining_accounts, in order.
      ...params.players.map((p) => ({
        pubkey: p,
        isSigner: false,
        isWritable: true,
      })),
    ],
    data: Buffer.from(data),
  });
}
