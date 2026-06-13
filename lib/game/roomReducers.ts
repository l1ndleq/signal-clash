/**
 * Pure room state transitions, shared by adapters.
 *
 * Each function takes a Room (or none, for create) plus args and returns a new
 * Room — no I/O, no side effects. The in-memory mock and the Supabase adapter
 * both apply these so their state machines stay identical.
 */

import type { Player, Prediction, Room, Round } from "./types";
import type {
  CreateRoomParams,
  ScoredPrediction,
  SubmitPredictionParams,
} from "@/lib/magicblock/types";

function newPlayer(wallet: string, displayName?: string): Player {
  return { wallet, displayName, score: 0, streak: 0, predictions: [] };
}

export function createRoom(params: CreateRoomParams): Room {
  return {
    id: params.id,
    kind: params.kind,
    creator: params.creator,
    market: params.market,
    entryFeeLamports: params.entryFeeLamports,
    prizePoolLamports: params.entryFeeLamports,
    status: "waiting",
    rounds: [],
    currentRoundIndex: 0,
    players: { [params.creator]: newPlayer(params.creator) },
    maxPlayers: Math.max(2, params.maxPlayers),
    totalRounds: params.totalRounds,
    roundDurationSeconds: params.roundDurationSeconds,
    createdAt: Date.now(),
    startsAt: params.startsAt,
  };
}

export function joinRoom(room: Room, player: string, displayName?: string): Room {
  const r = structuredClone(room);
  const count = Object.keys(r.players).length;
  if (!r.players[player] && count >= r.maxPlayers) {
    throw new Error("Room is already full");
  }
  r.players[player] ??= newPlayer(player, displayName);
  if (!r.opponent && player !== r.creator) r.opponent = player;
  r.prizePoolLamports = r.entryFeeLamports * Object.keys(r.players).length;
  return r;
}

export function startRound(room: Room, startPrice: number): Room {
  const r = structuredClone(room);
  r.status = "active";
  const round: Round = {
    index: r.rounds.length,
    startPrice,
    startedAt: Date.now(),
    durationSeconds: r.roundDurationSeconds,
    status: "active",
    predictions: [],
  };
  r.rounds.push(round);
  r.currentRoundIndex = round.index;
  return r;
}

export function submitPrediction(room: Room, params: SubmitPredictionParams): Room {
  const r = structuredClone(room);
  const round = r.rounds[r.currentRoundIndex];
  if (!round || round.status !== "active") {
    throw new Error("No active round to predict on");
  }
  const existing = round.predictions.find((p) => p.player === params.player);
  if (existing?.locked) throw new Error("Prediction already locked");

  const prediction: Prediction = {
    player: params.player,
    direction: params.direction,
    confidence: params.confidence,
    submittedAt: params.submittedAt,
    locked: false,
  };
  if (existing) Object.assign(existing, prediction);
  else round.predictions.push(prediction);
  return r;
}

export function lockPrediction(room: Room, player: string): Room {
  const r = structuredClone(room);
  const round = r.rounds[r.currentRoundIndex];
  const prediction = round?.predictions.find((p) => p.player === player);
  if (prediction) prediction.locked = true;
  return r;
}

export function resolveRound(
  room: Room,
  endPrice: number,
  scored: ScoredPrediction[],
): Room {
  const r = structuredClone(room);
  const round = r.rounds[r.currentRoundIndex];
  if (!round) throw new Error("No round to resolve");
  round.endPrice = endPrice;
  round.status = "resolved";
  for (const s of scored) {
    const prediction = round.predictions.find((p) => p.player === s.player);
    if (prediction) {
      prediction.scoreDelta = s.scoreDelta;
      prediction.correct = s.correct;
      prediction.locked = true;
      r.players[s.player]?.predictions.push(structuredClone(prediction));
    }
  }
  return r;
}

export function updateScore(
  room: Room,
  player: string,
  scoreDelta: number,
  streak: number,
): Room {
  const r = structuredClone(room);
  const p = r.players[player];
  if (!p) throw new Error(`Player not in room: ${player}`);
  p.score += scoreDelta;
  p.streak = streak;
  return r;
}

export function finalizeRoom(room: Room, winner?: string, isDraw?: boolean): Room {
  const r = structuredClone(room);
  r.status = "finished";
  r.winner = winner;
  r.isDraw = isDraw ?? false;
  return r;
}
