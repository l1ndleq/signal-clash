"use client";

/**
 * Lobby state: a thin Zustand wrapper over the MagicBlock room store. No demo
 * seeding — rooms are only the real ones players create.
 */

import { create } from "zustand";
import type { Market, Room } from "@/lib/game/types";
import { lobbyEngine } from "@/lib/game/instances";
import { magicBlock } from "@/lib/magicblock";
import { TOTAL_ROUNDS, lamports } from "@/lib/config";

interface LobbyState {
  rooms: Room[];
  refresh: () => void;
  ensureSeeded: () => Promise<void>;
  createRoom: (
    creator: string,
    market: Market,
    entryFeeSol: number,
    maxPlayers: number,
    roundDurationSeconds: number,
  ) => Promise<string>;
  createTournament: (
    creator: string,
    market: Market,
    entryFeeSol: number,
    field: number,
    rounds: number,
    startsAtMs: number,
    roundDurationSeconds: number,
  ) => Promise<string>;
  joinRoom: (roomId: string, wallet: string) => Promise<void>;
}

export const useLobbyStore = create<LobbyState>((set, get) => ({
  rooms: [],

  refresh: () => set({ rooms: magicBlock.listRooms() }),

  // Kept for the lobby page's call site; no seeding — just sync real rooms.
  ensureSeeded: async () => {
    get().refresh();
  },

  createRoom: async (
    creator,
    market,
    entryFeeSol,
    maxPlayers,
    roundDurationSeconds,
  ) => {
    const room = await lobbyEngine.createRoom({
      creator,
      market,
      entryFeeLamports: lamports(entryFeeSol),
      maxPlayers,
      totalRounds: TOTAL_ROUNDS,
      roundDurationSeconds,
    });
    get().refresh();
    return room.id;
  },

  createTournament: async (
    creator,
    market,
    entryFeeSol,
    field,
    rounds,
    startsAtMs,
    roundDurationSeconds,
  ) => {
    const room = await lobbyEngine.createRoom({
      kind: "tournament",
      creator,
      market,
      entryFeeLamports: lamports(entryFeeSol),
      maxPlayers: field,
      totalRounds: rounds,
      roundDurationSeconds,
      startsAt: startsAtMs,
    });
    get().refresh();
    return room.id;
  },

  joinRoom: async (roomId, wallet) => {
    await lobbyEngine.joinRoom(roomId, wallet);
    get().refresh();
  },
}));
