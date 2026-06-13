/**
 * Supabase-backed implementation of the MagicBlock adapter — the realtime
 * online-PvP store.
 *
 * Each room is a row in `rooms` (`data` jsonb = full Room). A local cache keeps
 * the synchronous `getRoom`/`listRooms` API intact; a Realtime subscription
 * keeps the cache fresh and notifies UI subscribers. Mutations apply the shared
 * pure reducers, optimistically update the cache, and upsert the row.
 *
 * Caveat (for the security/finalization pass): updates are last-write-wins on
 * the whole JSON blob. The room creator is authoritative for round lifecycle;
 * guests only write their own prediction, so conflicts are rare but possible.
 * Production should move to per-prediction rows or atomic RPCs.
 */

import type { Room } from "@/lib/game/types";
import * as reduce from "@/lib/game/roomReducers";
import { getSupabase } from "@/lib/supabase/client";
import type {
  CreateRoomParams,
  MagicBlockAdapter,
  ScoredPrediction,
  SubmitPredictionParams,
} from "./types";

type Subscriber = (room: Room) => void;
const TABLE = "rooms";

export class SupabaseAdapter implements MagicBlockAdapter {
  private cache = new Map<string, Room>();
  private subscribers = new Map<string, Set<Subscriber>>();
  private started = false;

  private get db() {
    const client = getSupabase();
    if (!client) throw new Error("Supabase is not configured");
    return client;
  }

  /** Lazily load all rooms and open the realtime channel (idempotent). */
  private ensureStarted(): void {
    if (this.started) return;
    this.started = true;

    void this.db
      .from(TABLE)
      .select("id,data")
      .then(({ data }) => {
        if (!data) return;
        for (const row of data as { id: string; data: Room }[]) {
          this.cache.set(row.id, row.data);
          this.notify(row.id);
        }
      });

    this.db
      .channel("rooms-stream")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: TABLE },
        (payload) => {
          const row = payload.new as { id?: string; data?: Room } | null;
          if (row?.id && row.data) {
            this.cache.set(row.id, row.data);
            this.notify(row.id);
          }
        },
      )
      .subscribe();
  }

  private notify(roomId: string): void {
    const room = this.cache.get(roomId);
    if (!room) return;
    const snapshot = structuredClone(room);
    this.subscribers.get(roomId)?.forEach((cb) => cb(snapshot));
  }

  /** Apply a reducer result: cache + emit immediately, persist in the background. */
  private async commit(room: Room): Promise<Room> {
    this.cache.set(room.id, room);
    this.notify(room.id);
    const { error } = await this.db
      .from(TABLE)
      .upsert({ id: room.id, data: room });
    if (error) throw new Error(`Supabase write failed: ${error.message}`);
    return structuredClone(room);
  }

  private require(roomId: string): Room {
    const room = this.cache.get(roomId);
    if (!room) throw new Error(`Room not found: ${roomId}`);
    return room;
  }

  // --- room lifecycle ---

  async createRoomState(params: CreateRoomParams): Promise<Room> {
    this.ensureStarted();
    return this.commit(reduce.createRoom(params));
  }

  async joinRoomState(
    roomId: string,
    player: string,
    displayName?: string,
  ): Promise<Room> {
    return this.commit(reduce.joinRoom(this.require(roomId), player, displayName));
  }

  async finalizeRoom(roomId: string, winner?: string, isDraw?: boolean): Promise<Room> {
    return this.commit(reduce.finalizeRoom(this.require(roomId), winner, isDraw));
  }

  async commitFinalResult(roomId: string): Promise<string> {
    return `mb-commit:${roomId}:${Date.now()}`;
  }

  // --- round lifecycle ---

  async startRound(roomId: string, startPrice: number) {
    const room = await this.commit(reduce.startRound(this.require(roomId), startPrice));
    return structuredClone(room.rounds[room.currentRoundIndex]);
  }

  async submitPrediction(params: SubmitPredictionParams): Promise<void> {
    await this.commit(reduce.submitPrediction(this.require(params.roomId), params));
  }

  async lockPrediction(roomId: string, player: string): Promise<void> {
    await this.commit(reduce.lockPrediction(this.require(roomId), player));
  }

  async resolveRound(roomId: string, endPrice: number, scored: ScoredPrediction[]) {
    const room = await this.commit(
      reduce.resolveRound(this.require(roomId), endPrice, scored),
    );
    return structuredClone(room.rounds[room.currentRoundIndex]);
  }

  async updateScore(
    roomId: string,
    player: string,
    scoreDelta: number,
    streak: number,
  ): Promise<void> {
    await this.commit(reduce.updateScore(this.require(roomId), player, scoreDelta, streak));
  }

  // --- reads / subscriptions ---

  getRoom(roomId: string): Room | undefined {
    const room = this.cache.get(roomId);
    return room ? structuredClone(room) : undefined;
  }

  listRooms(): Room[] {
    return Array.from(this.cache.values()).map((r) => structuredClone(r));
  }

  subscribe(roomId: string, cb: Subscriber): () => void {
    this.ensureStarted();
    let set = this.subscribers.get(roomId);
    if (!set) {
      set = new Set();
      this.subscribers.set(roomId, set);
    }
    set.add(cb);

    const cached = this.cache.get(roomId);
    if (cached) {
      cb(structuredClone(cached));
    } else {
      // Not in cache yet — fetch this room directly, then notify.
      void this.db
        .from(TABLE)
        .select("data")
        .eq("id", roomId)
        .maybeSingle()
        .then(({ data }) => {
          const row = data as { data?: Room } | null;
          if (row?.data) {
            this.cache.set(roomId, row.data);
            this.notify(roomId);
          }
        });
    }
    return () => set?.delete(cb);
  }
}
