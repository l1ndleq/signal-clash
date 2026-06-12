"use client";

/**
 * Lobby state: a thin Zustand wrapper over the MagicBlock room store. Seeds a
 * couple of open demo rooms and scheduled tournaments on first load so the
 * lobby isn't empty.
 */

import { create } from "zustand";
import type { Market, Room } from "@/lib/game/types";
import { lobbyEngine } from "@/lib/game/instances";
import { magicBlock } from "@/lib/magicblock/mockAdapter";
import { ROUND_DURATION_SECONDS, TOTAL_ROUNDS, lamports } from "@/lib/config";

const SEED_ROOMS: {
  creator: string;
  market: Market;
  entryFeeSol: number;
  maxPlayers: number;
}[] = [
  {
    creator: "ArenaSeedAlpha1111111111111111111111111111",
    market: "SOL/USD",
    entryFeeSol: 0.05,
    maxPlayers: 2,
  },
  {
    creator: "ArenaSeedBravo22222222222222222222222222222",
    market: "BTC/USD",
    entryFeeSol: 0.01,
    maxPlayers: 4,
  },
  {
    creator: "ArenaSeedCharlie333333333333333333333333333",
    market: "ETH/USD",
    entryFeeSol: 0.1,
    maxPlayers: 3,
  },
];

interface LobbyState {
  rooms: Room[];
  seeded: boolean;
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
    startsInSec: number,
    roundDurationSeconds: number,
  ) => Promise<string>;
  joinRoom: (roomId: string, wallet: string) => Promise<void>;
}

export const useLobbyStore = create<LobbyState>((set, get) => ({
  rooms: [],
  seeded: false,

  refresh: () => set({ rooms: magicBlock.listRooms() }),

  ensureSeeded: async () => {
    if (get().seeded) {
      get().refresh();
      return;
    }
    set({ seeded: true });
    for (const seed of SEED_ROOMS) {
      await lobbyEngine.createRoom({
        creator: seed.creator,
        market: seed.market,
        entryFeeLamports: lamports(seed.entryFeeSol),
        maxPlayers: seed.maxPlayers,
        totalRounds: TOTAL_ROUNDS,
        roundDurationSeconds: ROUND_DURATION_SECONDS,
      });
    }
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
    startsInSec,
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
      startsAt: Date.now() + startsInSec * 1000,
    });
    get().refresh();
    return room.id;
  },

  joinRoom: async (roomId, wallet) => {
    await lobbyEngine.joinRoom(roomId, wallet);
    get().refresh();
  },
}));
