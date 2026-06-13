"use client";

import Link from "next/link";
import { ArrowRight, BadgeDollarSign, Radio, Trophy } from "lucide-react";
import type { Player, Room } from "@/lib/game/types";
import { solFromLamports } from "@/lib/config";
import { paidPlacesForField, rankStandings } from "@/lib/game/tournament";

export interface PayoutState {
  claiming: boolean;
  message?: string;
  explorerUrl?: string;
}

export default function ResultCard({
  room,
  myWallet,
  commitRef,
  payout,
  onClaim,
  onVoid,
}: {
  room: Room;
  myWallet: string;
  commitRef?: string;
  payout: PayoutState;
  onClaim: () => void;
  onVoid: () => void;
}) {
  const me = room.players[myWallet];
  const standings = rankStandings(room);
  const mine = standings.find((s) => s.wallet === myWallet);
  const paid = paidPlacesForField(room.maxPlayers);
  const iTop = mine?.rank === 1;
  const inMoney = !!mine && mine.rank <= paid;
  const title = room.isDraw
    ? "Draw"
    : iTop
      ? "You win"
      : inMoney
        ? `You placed #${mine!.rank}`
        : "You lose";
  const titleColor = room.isDraw
    ? "var(--flat)"
    : inMoney
      ? "var(--up)"
      : "var(--down)";

  return (
    <div className="app-panel flex flex-col gap-6 p-6 md:p-7">
      <div className="text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-lg border border-[rgba(3,225,255,0.3)] bg-[rgba(3,225,255,0.08)] text-[var(--ocean)]">
          <Trophy size={24} aria-hidden />
        </div>
        <div className="mt-4 text-xs font-bold uppercase tracking-[0.14em] text-[var(--ink-muted)]">
          Match complete
        </div>
        <h2
          className="mt-2 font-display text-5xl font-black leading-none"
          style={{ color: titleColor }}
        >
          {title}
        </h2>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {(Object.values(room.players) as Player[]).map((p) => (
          <div
            key={p.wallet}
            className="metric-tile clip-corner text-center"
            style={{
              borderColor:
                room.winner === p.wallet ? "rgba(0,255,163,0.42)" : "var(--hairline)",
            }}
          >
            <div className="text-sm font-semibold">
              {p.wallet === myWallet ? "You" : p.displayName ?? "Bot"}
            </div>
            <div className="font-num text-4xl font-black">{p.score}</div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-3 text-center">
        <Metric label="Accuracy" value={`${Math.round(accuracy(me) * 100)}%`} />
        <Metric label="Best streak" value={`${bestStreak(me)}`} />
        <Metric
          label={inMoney ? "Your prize" : "Prize pool"}
          value={`${solFromLamports(
            inMoney ? mine!.payoutLamports : room.prizePoolLamports,
          ).toFixed(3)} SOL`}
        />
      </div>

      <div className="rounded-lg border border-[var(--hairline)] bg-[rgba(255,255,255,0.04)] p-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <span className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--ink-muted)]">
            <Radio size={15} className="text-[var(--ocean)]" aria-hidden />
            Devnet settlement
          </span>
          {payout.explorerUrl ? (
            <a
              href={payout.explorerUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-bold text-[var(--ocean)] underline"
            >
              View payout tx
              <ArrowRight size={15} aria-hidden />
            </a>
          ) : (
            <button
              className="btn btn-primary text-sm"
              disabled={payout.claiming || !inMoney}
              onClick={onClaim}
            >
              <BadgeDollarSign size={16} aria-hidden />
              {payout.claiming
                ? "Settling..."
                : inMoney
                  ? "Settle on-chain"
                  : "No payout"}
            </button>
          )}
        </div>
        {payout.message && (
          <p className="mt-3 text-xs leading-5 text-[var(--ink-muted)]">
            {payout.message}
          </p>
        )}
        {!payout.explorerUrl && (
          <button
            className="mt-3 text-xs font-semibold text-[var(--ink-muted)] underline underline-offset-2 transition hover:text-[var(--ink)] disabled:opacity-45"
            disabled={payout.claiming}
            onClick={onVoid}
            title="Refund every depositor their entry fee from an abandoned game (available 24h after deposit if it was never settled)"
          >
            Game abandoned? Refund all deposits
          </button>
        )}
        {commitRef && (
          <p className="mt-3 break-all font-num text-[0.7rem] text-[var(--ink-muted)]">
            MagicBlock commit: {commitRef}
          </p>
        )}
      </div>

      <Link href="/lobby" className="btn btn-ghost w-full">
        Back to lobby
      </Link>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric-tile">
      <div className="metric-label">{label}</div>
      <div className="metric-value text-lg">{value}</div>
    </div>
  );
}

function accuracy(player?: Player): number {
  if (!player || player.predictions.length === 0) return 0;
  const correct = player.predictions.filter((p) => p.correct).length;
  return correct / player.predictions.length;
}

function bestStreak(player?: Player): number {
  if (!player) return 0;
  let best = 0;
  let run = 0;
  for (const p of player.predictions) {
    if (p.correct) {
      run += 1;
      best = Math.max(best, run);
    } else {
      run = 0;
    }
  }
  return best;
}
