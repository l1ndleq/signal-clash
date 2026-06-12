/**
 * MatchErSession — drives one match's on-chain mirror on a MagicBlock
 * Ephemeral Rollup (devnet).
 *
 * The local in-memory engine remains the authoritative source for gameplay/UX;
 * this session mirrors the running score on-chain so the match is provable:
 *
 *   L1  create_match + delegate   (wallet-signed, once at match start)
 *   ER  submit_prediction         (session-key-signed, gasless, per lock)
 *   ER  resolve_round             (session-key-signed, gasless, per round)
 *   ER  finish_and_undelegate     (session-key-signed, commits score -> L1)
 *
 * Every method is best-effort: an ER failure is reported but never thrown into
 * the gameplay loop, so the arcade match keeps running even if the rollup is
 * unreachable. The Magic Router auto-routes each transaction to the base layer
 * or the ER based on whether `match_state` is delegated.
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  type TransactionInstruction,
  type TransactionSignature,
} from "@solana/web3.js";
import { ConnectionMagicRouter } from "@magicblock-labs/ephemeral-rollups-sdk";
import { ER_ROUTER_ENDPOINT, SOLANA_RPC_ENDPOINT } from "@/lib/config";
import {
  buildCreateMatchIx,
  buildDelegateIx,
  buildFinishIx,
  buildResolveRoundIx,
  buildSubmitPredictionIx,
  deriveMatchPda,
} from "./match";

/** Wallet-adapter `sendTransaction` shape (signs with the user's wallet). */
export type WalletSend = (
  transaction: Transaction,
  connection: Connection,
  options?: { skipPreflight?: boolean },
) => Promise<TransactionSignature>;

type Direction = "UP" | "DOWN" | "FLAT";

export interface ErStepResult {
  ok: boolean;
  signature?: string;
  error?: string;
}

export class MatchErSession {
  private readonly l1 = new Connection(SOLANA_RPC_ENDPOINT, "confirmed");
  private readonly router = new ConnectionMagicRouter(
    ER_ROUTER_ENDPOINT,
    "confirmed",
  );
  /** Ephemeral fee-payer for gasless ER writes (kept only for this match). */
  private readonly session = Keypair.generate();
  private readonly matchPda: PublicKey;
  private delegated = false;

  constructor(
    private readonly gameId: string,
    private readonly authority: PublicKey,
    private readonly walletSend: WalletSend,
    private readonly totalRounds: number,
  ) {
    this.matchPda = deriveMatchPda(gameId);
  }

  get sessionPublicKey(): PublicKey {
    return this.session.publicKey;
  }

  get matchAddress(): PublicKey {
    return this.matchPda;
  }

  /**
   * L1, wallet-signed: create the match-state PDA and hand it to the ER. After
   * this resolves, round writes route to the rollup.
   */
  async start(): Promise<ErStepResult> {
    try {
      const tx = new Transaction().add(
        buildCreateMatchIx({
          gameId: this.gameId,
          authority: this.authority,
          totalRounds: this.totalRounds,
        }),
        buildDelegateIx({ gameId: this.gameId, payer: this.authority }),
      );
      tx.feePayer = this.authority;
      const { blockhash } = await this.l1.getLatestBlockhash("confirmed");
      tx.recentBlockhash = blockhash;
      const signature = await this.walletSend(tx, this.l1);
      await this.l1.confirmTransaction(signature, "confirmed");
      this.delegated = true;
      return { ok: true, signature };
    } catch (err) {
      return { ok: false, error: describe(err) };
    }
  }

  /** ER, session-signed: lock a prediction for the current round. */
  submitPrediction(direction: Direction, confidence: number): Promise<ErStepResult> {
    return this.sendOnEr(
      buildSubmitPredictionIx({ gameId: this.gameId, direction, confidence }),
    );
  }

  /** ER, session-signed: apply the off-chain-scored delta + new streak. */
  resolveRound(scoreDelta: number, newStreak: number): Promise<ErStepResult> {
    return this.sendOnEr(
      buildResolveRoundIx({ gameId: this.gameId, scoreDelta, newStreak }),
    );
  }

  /** ER, session-signed: commit the final score to L1 and undelegate. */
  async finish(): Promise<ErStepResult> {
    const res = await this.sendOnEr(
      buildFinishIx({ gameId: this.gameId, payer: this.session.publicKey }),
    );
    if (res.ok) this.delegated = false;
    return res;
  }

  /** Build, sign with the session key, and route a single-ix ER transaction. */
  private async sendOnEr(ix: TransactionInstruction): Promise<ErStepResult> {
    if (!this.delegated) {
      return { ok: false, error: "match not delegated to ER" };
    }
    try {
      const tx = new Transaction().add(ix);
      tx.feePayer = this.session.publicKey;
      const { blockhash } =
        await this.router.getLatestBlockhashForTransaction(tx);
      tx.recentBlockhash = blockhash;
      const signature = await this.router.sendAndConfirmTransaction(tx, [
        this.session,
      ]);
      return { ok: true, signature };
    } catch (err) {
      return { ok: false, error: describe(err) };
    }
  }
}

function describe(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}
