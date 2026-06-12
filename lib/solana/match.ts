/**
 * Client for the on-chain `signal_clash_match` program — the Ephemeral Rollups
 * (ER) game-state layer (devnet).
 *
 * create_match + delegate run on the base layer; submit_prediction +
 * resolve_round run on the ER (gasless); finish_and_undelegate commits the
 * final score back to L1. Instructions are built by hand (discriminators from
 * anchor/idl/signal_clash_match.json) and the delegation PDAs come from the
 * MagicBlock SDK helpers.
 */

import {
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  DELEGATION_PROGRAM_ID,
  MAGIC_CONTEXT_ID,
  MAGIC_PROGRAM_ID,
  delegateBufferPdaFromDelegatedAccountAndOwnerProgram,
  delegationMetadataPdaFromDelegatedAccount,
  delegationRecordPdaFromDelegatedAccount,
} from "@magicblock-labs/ephemeral-rollups-sdk";
import { MATCH_PROGRAM_ID } from "@/lib/config";

export const MATCH_PROGRAM = new PublicKey(MATCH_PROGRAM_ID);
const MATCH_SEED = "match";

// Discriminators (from anchor/idl/signal_clash_match.json).
const DISC = {
  createMatch: Uint8Array.from([107, 2, 184, 145, 70, 142, 17, 165]),
  delegate: Uint8Array.from([90, 147, 75, 178, 85, 88, 4, 137]),
  submitPrediction: Uint8Array.from([193, 113, 41, 36, 160, 60, 247, 55]),
  resolveRound: Uint8Array.from([165, 114, 237, 158, 1, 36, 70, 254]),
  finish: Uint8Array.from([229, 48, 206, 121, 227, 31, 245, 36]),
};

// ---- tiny Borsh encoders ----

function concat(parts: Uint8Array[]): Uint8Array {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let off = 0;
  for (const p of parts) {
    out.set(p, off);
    off += p.length;
  }
  return out;
}

function encString(s: string): Uint8Array {
  const bytes = new TextEncoder().encode(s);
  const len = new Uint8Array(4);
  new DataView(len.buffer).setUint32(0, bytes.length, true);
  return concat([len, bytes]);
}

function encI64(n: number): Uint8Array {
  const b = new Uint8Array(8);
  new DataView(b.buffer).setBigInt64(0, BigInt(Math.round(n)), true);
  return b;
}

/** Map a Direction string to the program's u8 encoding. */
export function dirToU8(direction: "UP" | "DOWN" | "FLAT"): number {
  return direction === "UP" ? 1 : direction === "DOWN" ? 2 : 3;
}

/** Derive the match-state PDA for a game id. */
export function deriveMatchPda(gameId: string): PublicKey {
  const [pda] = PublicKey.findProgramAddressSync(
    [new TextEncoder().encode(MATCH_SEED), new TextEncoder().encode(gameId)],
    MATCH_PROGRAM,
  );
  return pda;
}

// ---- L1 instructions ----

export function buildCreateMatchIx(params: {
  gameId: string;
  authority: PublicKey;
  totalRounds: number;
}): TransactionInstruction {
  const matchPda = deriveMatchPda(params.gameId);
  const data = concat([
    DISC.createMatch,
    encString(params.gameId),
    Uint8Array.from([params.totalRounds]),
  ]);
  return new TransactionInstruction({
    programId: MATCH_PROGRAM,
    keys: [
      { pubkey: matchPda, isSigner: false, isWritable: true },
      { pubkey: params.authority, isSigner: true, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });
}

export function buildDelegateIx(params: {
  gameId: string;
  payer: PublicKey;
}): TransactionInstruction {
  const matchPda = deriveMatchPda(params.gameId);
  const buffer = delegateBufferPdaFromDelegatedAccountAndOwnerProgram(
    matchPda,
    MATCH_PROGRAM,
  );
  const record = delegationRecordPdaFromDelegatedAccount(matchPda);
  const metadata = delegationMetadataPdaFromDelegatedAccount(matchPda);
  const data = concat([DISC.delegate, encString(params.gameId)]);
  return new TransactionInstruction({
    programId: MATCH_PROGRAM,
    keys: [
      { pubkey: params.payer, isSigner: true, isWritable: false },
      { pubkey: buffer, isSigner: false, isWritable: true },
      { pubkey: record, isSigner: false, isWritable: true },
      { pubkey: metadata, isSigner: false, isWritable: true },
      { pubkey: matchPda, isSigner: false, isWritable: true },
      { pubkey: MATCH_PROGRAM, isSigner: false, isWritable: false },
      { pubkey: DELEGATION_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(data),
  });
}

// ---- ER instructions ----

export function buildSubmitPredictionIx(params: {
  gameId: string;
  direction: "UP" | "DOWN" | "FLAT";
  confidence: number;
}): TransactionInstruction {
  const matchPda = deriveMatchPda(params.gameId);
  const data = concat([
    DISC.submitPrediction,
    encString(params.gameId),
    Uint8Array.from([dirToU8(params.direction)]),
    Uint8Array.from([params.confidence]),
  ]);
  return new TransactionInstruction({
    programId: MATCH_PROGRAM,
    keys: [{ pubkey: matchPda, isSigner: false, isWritable: true }],
    data: Buffer.from(data),
  });
}

export function buildResolveRoundIx(params: {
  gameId: string;
  scoreDelta: number;
  newStreak: number;
}): TransactionInstruction {
  const matchPda = deriveMatchPda(params.gameId);
  const data = concat([
    DISC.resolveRound,
    encString(params.gameId),
    encI64(params.scoreDelta),
    Uint8Array.from([params.newStreak]),
  ]);
  return new TransactionInstruction({
    programId: MATCH_PROGRAM,
    keys: [{ pubkey: matchPda, isSigner: false, isWritable: true }],
    data: Buffer.from(data),
  });
}

export function buildFinishIx(params: {
  gameId: string;
  payer: PublicKey;
}): TransactionInstruction {
  const matchPda = deriveMatchPda(params.gameId);
  const data = concat([DISC.finish, encString(params.gameId)]);
  return new TransactionInstruction({
    programId: MATCH_PROGRAM,
    keys: [
      { pubkey: params.payer, isSigner: true, isWritable: true },
      { pubkey: matchPda, isSigner: false, isWritable: true },
      { pubkey: MAGIC_PROGRAM_ID, isSigner: false, isWritable: false },
      { pubkey: MAGIC_CONTEXT_ID, isSigner: false, isWritable: true },
    ],
    data: Buffer.from(data),
  });
}
