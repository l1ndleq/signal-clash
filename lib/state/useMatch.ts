"use client";

/**
 * React binding for MatchController. Holds no game logic — it just creates one
 * controller per (room, wallet), subscribes to its view, and exposes stable
 * action callbacks.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { MatchController, type MatchView } from "@/lib/game/matchController";
import { magicBlock } from "@/lib/magicblock/mockAdapter";
import type { Confidence, Direction } from "@/lib/game/types";

export function useMatch(roomId: string, myWallet: string | null) {
  const [view, setView] = useState<MatchView | null>(null);
  const ref = useRef<MatchController | null>(null);

  useEffect(() => {
    if (!myWallet) return;
    const controller = new MatchController(magicBlock, roomId, myWallet);
    ref.current = controller;
    const unsubscribe = controller.subscribe(setView);
    return () => {
      unsubscribe();
      controller.destroy();
      ref.current = null;
    };
  }, [roomId, myWallet]);

  const start = useCallback(() => ref.current?.start(), []);
  const lock = useCallback(
    (direction: Direction, confidence: Confidence) =>
      ref.current?.lockMyPrediction(direction, confidence),
    [],
  );

  return { view, start, lock };
}
