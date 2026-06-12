/**
 * Local, in-memory implementation of the MagicBlock adapter.
 *
 * Owns the authoritative real-time room state for the MVP. Every mutation
 * notifies subscribers so the UI updates reactively, mirroring how clients
 * would react to ER state changes.
 *
 * TODO(magicblock): replace the in-memory Map with ER session calls:
 *   - createRoomState -> delegate room PDA to the Ephemeral Rollup
 *   - submit/lock/resolve/updateScore -> ER transactions (sub-ms, gasless)
 *   - commitFinalResult -> commit + undelegate back to Solana for settlement
 */

import type { Player, Prediction, Room, Round } from "@/lib/game/types";
import type {
  CreateRoomParams,
  MagicBlockAdapter,
  ScoredPrediction,
  SubmitPredictionParams,
} from "./types";

type Subscriber = (room: Room) => void;

function newPlayer(wallet: string, displayName?: string): Player {
  return { wallet, displayName, score: 0, streak: 0, predictions: [] };
}

export class LocalMagicBlockAdapter implements MagicBlockAdapter {
  private rooms = new Map<string, Room>();
  private subscribers = new Map<string, Set<Subscriber>>();

  private requireRoom(roomId: string): Room {
    const room = this.rooms.get(roomId);
    if (!room) throw new Error(`Room not found: ${roomId}`);
    return room;
  }

  private emit(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (!room) return;
    // Clone so React subscribers see a new reference and re-render.
    const snapshot = structuredClone(room);
    this.subscribers.get(roomId)?.forEach((cb) => cb(snapshot));
  }

  async createRoomState(params: CreateRoomParams): Promise<Room> {
    const room: Room = {
      id: params.id,
      kind: params.kind,
      creator: params.creator,
      market: params.market,
      entryFeeLamports: params.entryFeeLamports,
      prizePoolLamports: params.entryFeeLamports, // creator's stake
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
    this.rooms.set(room.id, room);
    this.emit(room.id);
    return structuredClone(room);
  }

  async joinRoomState(
    roomId: string,
    player: string,
    displayName?: string,
  ): Promise<Room> {
    const room = this.requireRoom(roomId);
    const count = Object.keys(room.players).length;
    if (!room.players[player] && count >= room.maxPlayers) {
      throw new Error("Room is already full");
    }
    room.players[player] ??= newPlayer(player, displayName);
    // First non-creator joiner is tracked as `opponent` for back-compat.
    if (!room.opponent && player !== room.creator) room.opponent = player;
    // Prize pool scales with the number of participants in the arena.
    room.prizePoolLamports =
      room.entryFeeLamports * Object.keys(room.players).length;
    this.emit(roomId);
    return structuredClone(room);
  }

  async startRound(roomId: string, startPrice: number): Promise<Round> {
    const room = this.requireRoom(roomId);
    room.status = "active";
    const round: Round = {
      index: room.rounds.length,
      startPrice,
      startedAt: Date.now(),
      durationSeconds: room.roundDurationSeconds,
      status: "active",
      predictions: [],
    };
    room.rounds.push(round);
    room.currentRoundIndex = round.index;
    this.emit(roomId);
    return structuredClone(round);
  }

  async submitPrediction(params: SubmitPredictionParams): Promise<void> {
    const room = this.requireRoom(params.roomId);
    const round = room.rounds[room.currentRoundIndex];
    if (!round || round.status !== "active") {
      throw new Error("No active round to predict on");
    }
    // Replace any existing unlocked prediction by this player this round.
    const existing = round.predictions.find((p) => p.player === params.player);
    if (existing?.locked) throw new Error("Prediction already locked");

    const prediction: Prediction = {
      player: params.player,
      direction: params.direction,
      confidence: params.confidence,
      submittedAt: params.submittedAt,
      locked: false,
    };
    if (existing) {
      Object.assign(existing, prediction);
    } else {
      round.predictions.push(prediction);
    }
    this.emit(params.roomId);
  }

  async lockPrediction(roomId: string, player: string): Promise<void> {
    const room = this.requireRoom(roomId);
    const round = room.rounds[room.currentRoundIndex];
    const prediction = round?.predictions.find((p) => p.player === player);
    if (prediction) prediction.locked = true;
    this.emit(roomId);
  }

  async resolveRound(
    roomId: string,
    endPrice: number,
    scored: ScoredPrediction[],
  ): Promise<Round> {
    const room = this.requireRoom(roomId);
    const round = room.rounds[room.currentRoundIndex];
    if (!round) throw new Error("No round to resolve");
    round.endPrice = endPrice;
    round.status = "resolved";
    for (const s of scored) {
      const prediction = round.predictions.find((p) => p.player === s.player);
      if (prediction) {
        prediction.scoreDelta = s.scoreDelta;
        prediction.correct = s.correct;
        prediction.locked = true;
        // Mirror into the player's running prediction log.
        room.players[s.player]?.predictions.push(structuredClone(prediction));
      }
    }
    this.emit(roomId);
    return structuredClone(round);
  }

  async updateScore(
    roomId: string,
    player: string,
    scoreDelta: number,
    streak: number,
  ): Promise<void> {
    const room = this.requireRoom(roomId);
    const p = room.players[player];
    if (!p) throw new Error(`Player not in room: ${player}`);
    p.score += scoreDelta;
    p.streak = streak;
    this.emit(roomId);
  }

  async finalizeRoom(
    roomId: string,
    winner?: string,
    isDraw?: boolean,
  ): Promise<Room> {
    const room = this.requireRoom(roomId);
    room.status = "finished";
    room.winner = winner;
    room.isDraw = isDraw ?? false;
    this.emit(roomId);
    return structuredClone(room);
  }

  async commitFinalResult(roomId: string): Promise<string> {
    // In production this commits ER state to Solana and undelegates the PDA.
    const room = this.requireRoom(roomId);
    return `mb-commit:${room.id}:${Date.now()}`;
  }

  getRoom(roomId: string): Room | undefined {
    const room = this.rooms.get(roomId);
    return room ? structuredClone(room) : undefined;
  }

  listRooms(): Room[] {
    return Array.from(this.rooms.values()).map((r) => structuredClone(r));
  }

  subscribe(roomId: string, cb: Subscriber): () => void {
    let set = this.subscribers.get(roomId);
    if (!set) {
      set = new Set();
      this.subscribers.set(roomId, set);
    }
    set.add(cb);
    // Push current state immediately if it exists.
    const room = this.rooms.get(roomId);
    if (room) cb(structuredClone(room));
    return () => {
      set?.delete(cb);
    };
  }
}

/**
 * Singleton adapter shared across the app (module-level so lobby + room pages
 * see the same rooms). A networked MagicBlock adapter would replace this while
 * keeping the same import site.
 */
export const magicBlock: MagicBlockAdapter = new LocalMagicBlockAdapter();
