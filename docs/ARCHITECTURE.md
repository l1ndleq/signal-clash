# Signal Clash — Architecture

Signal Clash is a skill-based PvP market-prediction arena. Two players join a
1v1 room, pay an entry fee, and compete across five short SOL/USD prediction
rounds. The winner is decided by **score** (accuracy + timing + confidence +
streaks), not a single binary bet.

The codebase is split into four clearly separated concerns so each layer can be
developed, tested, and replaced independently.

```
┌──────────────────────────────────────────────────────────────┐
│ Frontend UI (app/, components/)                                │
│   landing · lobby · room · result                              │
└───────────────┬───────────────────────────┬──────────────────┘
                │                            │
        ┌───────▼────────┐          ┌────────▼─────────┐
        │ Game engine    │          │ Solana settlement │
        │ lib/game/*     │          │ lib/solana/*      │
        │ pure scoring,  │          │ entry fee + payout│
        │ room/round     │          │ (real devnet tx)  │
        │ lifecycle      │          └────────┬──────────┘
        └───────┬────────┘                   │
                │                             │
        ┌───────▼─────────────┐      ┌────────▼──────────┐
        │ MagicBlock adapter  │      │ Solana base layer │
        │ lib/magicblock/*    │      │ (devnet today,    │
        │ real-time state     │      │  Anchor vault     │
        │ (local mock today)  │      │  next)            │
        └─────────────────────┘      └───────────────────┘
```

## 1. Frontend UI (`app/`, `components/`)

- `app/page.tsx` — landing page (concept, CTA, architecture summary).
- `app/lobby/page.tsx` — room list + create-room form.
- `app/room/[roomId]/page.tsx` — pre-match deposit, live gameplay, result.
- `components/` — presentational pieces (RoomCard, PredictionControls,
  RoundTimer, Scoreboard, ResultCard, WalletButton, …).

Components hold **no game logic**. They render `MatchView` snapshots and call
action callbacks. All timing, bot, and lifecycle orchestration lives in
`lib/game/matchController.ts`, bridged to React by `lib/state/useMatch.ts`.

## 2. Game engine (`lib/game/`)

- `types.ts` — domain models (Player, Room, Round, Prediction).
- `scoring.ts` — **pure** `calculateRoundScore` (the most-tested module).
- `engine.ts` — room/round lifecycle + winner calculation over the adapter.
- `markets.ts` — tradable pairs (SOL/BTC/ETH) and their Binance + TradingView
  symbol mappings.
- `binancePriceFeed.ts` — **real** SOL/USD·BTC/USD·ETH/USD feed (Binance REST
  seed + `@miniTicker` WebSocket) behind the `PriceFeed` interface, with a
  synthetic fallback if Binance is unreachable.
- `mockPriceFeed.ts` — the `PriceFeed` interface + a random-walk implementation
  (used by the lobby engine and tests).
- `bot.ts` — local opponent used for the solo demo.
- `matchController.ts` — drives one match: price ticks, per-round timers, bot
  submissions, early resolution when both seats lock, finalization.

### Scoring rules

| Outcome              | Base  | Notes                              |
| -------------------- | ----- | ---------------------------------- |
| Correct UP / DOWN    | +100  | × confidence (1/2/3)               |
| Correct FLAT         | +80   | × confidence                       |
| Wrong                | −60   | × confidence                       |
| Timing ≤10s / ≤30s   | +30 / +15 | only when correct              |
| Streak ≥5 / ≥3       | +60 / +25 | streak measured **after** round |

A move counts as UP/DOWN only past a ±0.05% threshold; otherwise it is FLAT.

## 3. MagicBlock ER layer (`lib/magicblock/`)

`MagicBlockAdapter` (`types.ts`) is the abstraction for **real-time game
state**: room/round lifecycle, prediction submission/lock, scoring updates,
finalization, and `commitFinalResult`.

`LocalMagicBlockAdapter` (`mockAdapter.ts`) implements it in-memory with a
subscribe/notify model that mirrors how clients react to ER state changes.

**Real integration (next step):**

- `createRoomState` → delegate the room PDA to a MagicBlock Ephemeral Rollup.
- `submitPrediction` / `lockPrediction` / `resolveRound` / `updateScore` → cheap,
  low-latency ER transactions.
- `commitFinalResult` → commit final state and undelegate the PDA back to
  Solana base layer so settlement can read a trusted result.

Because the bot and the (future) networked opponent both feed the same
`submitPrediction` / `lockPrediction` calls, online PvP requires no engine
changes — only a networked adapter implementation.

## 4. Solana base layer (`lib/solana/`)

- `client.ts` — devnet `Connection`, balance reads, dev airdrop, explorer links.
- `settlement.ts` — **real devnet transfers**:
  - `depositEntryFee` — connected wallet → per-room escrow.
  - `payoutWinner` — escrow → winner after the match.

For the MVP the escrow is an ephemeral client-side `Keypair` per room. This is
intentionally simple and **not production-safe** (the escrow secret lives in the
browser).

**Real integration (next step):** replace the ephemeral escrow with an Anchor
program:

- a vault PDA derived from the room id custodies both deposits,
- deposits and payouts become program instructions,
- payout is gated by the committed MagicBlock result.

## Devnet MVP status

| Capability                          | Status                                |
| ----------------------------------- | ------------------------------------- |
| Wallet connect + devnet balance     | ✅ real (wallet-adapter)              |
| Lobby / create / join 1v1 rooms     | ✅                                    |
| 5 rounds, scoring, live scoreboard  | ✅                                    |
| Winner + result screen              | ✅                                    |
| Entry-fee deposit / payout          | ✅ real devnet transfers (escrow KP)  |
| Opponent                            | 🟡 local bot (online seam in place)   |
| Price feed (scoring)                | ✅ real Binance REST + WS (3 pairs)   |
| Live chart                          | ✅ TradingView Advanced Chart widget  |
| MagicBlock ER                       | 🟡 local adapter (interface in place) |
| Anchor vault program                | ⬜ TODO                               |

## Next steps

1. **Anchor vault program** — custody deposits in a room PDA; gate payout on the
   committed result.
2. **MagicBlock ER** — implement a networked `MagicBlockAdapter` that delegates
   room state to an Ephemeral Rollup and commits the final result on-chain.
3. **Real price feed** — back `PriceFeed` with Pyth (or an ER-streamed oracle).
4. **Online PvP** — replace the bot seat with networked human submissions
   through the same engine calls.
