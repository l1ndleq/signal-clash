/**
 * Shared singletons wiring the engine to the local MagicBlock adapter.
 * The lobby uses `lobbyEngine` to create/join rooms; the match controller
 * creates its own engine per room but against the same `magicBlock` store.
 */

import { GameEngine } from "./engine";
import { MockPriceFeed } from "./mockPriceFeed";
import { magicBlock } from "@/lib/magicblock/mockAdapter";

export const lobbyEngine = new GameEngine(magicBlock, new MockPriceFeed());
