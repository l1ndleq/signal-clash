"use client";

/**
 * React binding for MatchController. Holds no game logic — it just creates one
 * controller per (room, wallet), subscribes to its view, and exposes stable
 * action callbacks.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { MatchController, type MatchView } from "@/lib/game/matchController";
import { magicBlock } from "@/lib/magicblock/mockAdapter";
import { MatchErSession } from "@/lib/solana/matchEr";
import { ER_MIRROR_ENABLED } from "@/lib/config";
import type { Confidence, Direction } from "@/lib/game/types";

export function useMatch(roomId: string, myWallet: string | null) {
  const [view, setView] = useState<MatchView | null>(null);
  const ref = useRef<MatchController | null>(null);
  const { publicKey, sendTransaction } = useWallet();

  useEffect(() => {
    if (!myWallet) return;

    // Build the on-chain ER mirror only when enabled and a real wallet is
    // connected; otherwise the controller runs purely off-chain (demo mode).
    let mirror: MatchErSession | undefined;
    if (ER_MIRROR_ENABLED && publicKey) {
      const room = magicBlock.getRoom(roomId);
      if (room) {
        mirror = new MatchErSession(
          roomId,
          publicKey,
          sendTransaction,
          room.totalRounds,
        );
      }
    }

    const controller = new MatchController(magicBlock, roomId, myWallet, mirror);
    ref.current = controller;
    const unsubscribe = controller.subscribe(setView);
    return () => {
      unsubscribe();
      controller.destroy();
      ref.current = null;
    };
  }, [roomId, myWallet, publicKey, sendTransaction]);

  const start = useCallback(() => ref.current?.start(), []);
  const lock = useCallback(
    (direction: Direction, confidence: Confidence) =>
      ref.current?.lockMyPrediction(direction, confidence),
    [],
  );

  return { view, start, lock };
}
