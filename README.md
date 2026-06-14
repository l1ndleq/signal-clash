# Signal Clash

**Signal Clash is a skill-based 1v1 market-prediction arena on Solana devnet, with real-time game state designed for MagicBlock Ephemeral Rollups.**

Two players connect a wallet, join a room, and out-predict each other across
five fast SOL/USD rounds. The winner is decided by **score** — direction
accuracy, prediction timing, confidence multipliers, and streaks — not a single
binary bet. Winner takes the devnet prize pool.

Hackathon MVP for **Solana Blitz V5 / MagicBlock**. Devnet only, non-custodial.

## Why it matters

- **Skill, not gambling.** Score rewards being right, being fast, sizing
  confidence, and stringing streaks — a depth that binary up/down betting lacks.
- **Built for speed.** Prediction games need sub-second state updates. The
  architecture puts all real-time state (rooms, rounds, scoring, leaderboard)
  behind a **MagicBlock Ephemeral Rollup** seam, with settlement on Solana.
- **Honest and safe.** Devnet only, non-custodial, no private-key storage, no
  backend-signed user transactions, no real-money custody.

## Run locally

```bash
npm install --legacy-peer-deps   # wallet-adapter peers predate React 19
npm run dev                      # http://localhost:3000
```

You need a Solana wallet (Phantom/Solflare) set to **Devnet**. Fund a fresh
wallet with the in-app **Airdrop 1** button, or https://faucet.solana.com.

| Command         | Description                          |
| --------------- | ------------------------------------ |
| `npm run dev`   | Dev server                           |
| `npm run build` | Production build (+ TypeScript)      |
| `npm run start` | Serve the production build           |
| `npm test`      | Vitest unit tests (scoring + engine) |
| `npm run lint`  | ESLint                               |

## Demo flow

1. **Landing** (`/`) — one-screen pitch + "Enter Arena".
2. **Lobby** (`/lobby`) — join an open room, or create one (pick SOL/BTC/ETH and
   an entry fee).
3. **Room** (`/room/[id]`) — optionally deposit the entry fee (real devnet tx),
   then **Start match**.
4. **Play** — 5 rounds. Each round: live price + TradingView chart, a 30s timer,
   pick UP / DOWN / FLAT and a 1x/2x/3x confidence, lock it in.
5. **Result** — winner, accuracy, best streak, prize pool, and a **Claim prize
   pool** payout (real devnet tx when the escrow holds funds).

## How scoring works

| Outcome             | Base       | Modifiers                          |
| ------------------- | ---------- | ---------------------------------- |
| Correct UP / DOWN   | +100       | x confidence (1/2/3)               |
| Correct FLAT        | +80        | x confidence                       |
| Wrong               | -60        | x confidence                       |
| Timing <=10s / <=30s| +30 / +15  | only when correct                  |
| Streak >=5 / >=3    | +60 / +25  | streak counted **after** the round |

A move counts as UP/DOWN only past +/-0.05%; otherwise FLAT.
Pure scoring lives in `lib/game/scoring.ts` and is unit-tested.

## Architecture overview

Four separated layers — see [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md):

- **Frontend UI** — `app/` (landing, lobby, room) + `components/`.
- **Game engine** — `lib/game/` (pure scoring, room/round lifecycle, bot, match
  controller). Game logic is kept framework-free and testable.
- **MagicBlock real-time layer** — `lib/magicblock/` (adapter interface + local
  in-memory mock). This is the Ephemeral Rollup integration seam.
- **Solana settlement** — `lib/solana/` (real devnet entry-fee + payout
  transfers; Anchor vault program next).

## Markets & price feed

Pairs: **SOL/USD, BTC/USD, ETH/USD** (chosen per room).

- **Scoring** uses real **Binance** quotes (REST seed + `@miniTicker` WebSocket,
  `lib/game/binancePriceFeed.ts`). Rounds resolve on the real market move
  between round start and the end of the round timer.
- **Chart** uses the **TradingView** Advanced Chart widget — visual only; it does
  not feed scoring.
- If Binance is unreachable (e.g. geo-blocked without a VPN), the feed falls back
  to a synthetic walk so a match still plays; the room badge shows
  `simulated feed` instead of `Binance live`.

## What is real vs mocked

- **Real:** wallet connect, devnet balance + airdrop, entry-fee deposit and
  winner payout (real devnet transfers), live Binance price feed, TradingView
  chart, all scoring/winner logic.
- **Mocked (clean interfaces in place):** the opponent is a local **Signal Bot**;
  the MagicBlock real-time layer is a local in-memory adapter behind the
  production interface.
- **Not built yet:** Anchor vault program, networked MagicBlock ER adapter.

> Settlement detail: each room uses an ephemeral client-side escrow keypair —
> fine for a devnet demo, **not** production-safe. In the solo demo only the
> human's entry fee is deposited on-chain; the bot's stake is represented at the
> game layer (shown in the prize-pool display).

## Security model

**Scope:** devnet only, non-custodial. No real funds are ever at risk, which is
the deliberate boundary for this MVP.

**What's protected today**

- **Keys/secrets:** nothing secret is committed (`.env*`, `treasury-devnet.json`,
  `*-keypair.json` are git-ignored); only `NEXT_PUBLIC_*` values reach the client.
- **Wallet:** non-custodial — the app never sees a private key and never signs on
  the user's behalf. Every transaction is wallet-approved.
- **On-chain vault:** `settle` pays only recorded depositors, each place/winner
  once, rake + unpaid shares always to the fixed treasury, no double-settle, and
  an abandonment `void` refunds every depositor. `overflow-checks = true`.
- **App/transport:** security headers (CSP subset, `X-Frame-Options: DENY`,
  `nosniff`, `Referrer-Policy`, `HSTS`, `Permissions-Policy`), React's built-in
  output escaping, parameterized Supabase queries, and Supabase row integrity
  constraints (id consistency + size cap; deletes denied by RLS).

**Known trade-offs (accepted for a devnet MVP — by design)**

- **Settlement is authority-trusted.** The match result is asserted off-chain;
  the program bounds *amounts/places/depositors* but not *who actually won*, so a
  player could in principle claim the pot. (Bounded to devnet funds.)
- **Realtime room state is written with the public anon key**, so clients can
  write room/score state; integrity constraints limit griefing but not
  authenticity.
- **Predictions live in shared state** and are not cryptographically hidden from
  the opponent before lock.

**How these close in production**

- *Trustless target:* run round lifecycle + scoring on-chain via **MagicBlock
  Ephemeral Rollups**, take price from the **Pyth** on-chain oracle, and gate
  vault `settle` on the committed on-chain result. Add commit-reveal for moves.
- *Interim:* an authoritative server (Supabase Edge Functions) that verifies
  wallet-signed inputs, computes the score, and signs the result; the vault
  `settle` then requires that server signature. RLS goes read-only for clients.

**Dependencies:** lockfile committed; `npm audit` findings are transitive
(`postcss` inside Next, `uuid` inside `@solana/web3.js`) with no non-breaking fix
and no exploitable path in this app.

## Solana devnet usage

- Cluster: **devnet** (`https://api.devnet.solana.com`, overridable via
  `NEXT_PUBLIC_SOLANA_RPC`).
- Wallet: `@solana/wallet-adapter` (Wallet Standard auto-detect). Non-custodial —
  the app never sees a private key and never signs on the user's behalf.
- Entry fee in / payout out via `SystemProgram.transfer`, confirmed on devnet,
  with explorer links in the UI.

## MagicBlock integration seam

`lib/magicblock/types.ts` defines the `MagicBlockAdapter` interface
(`createRoomState`, `startRound`, `submitPrediction`, `resolveRound`,
`updateScore`, `finalizeRoom`, `commitFinalResult`, ...).
`lib/magicblock/mockAdapter.ts` implements it in-memory today. A real
integration delegates room state to an Ephemeral Rollup and commits the final
result back to Solana for settlement — no game-engine changes required.

## Future work

1. **Anchor vault program** — custody both deposits in a room PDA; gate payout on
   the committed match result (replaces the ephemeral escrow keypair).
2. **Networked MagicBlock ER adapter** — real Ephemeral Rollup delegation +
   commit, replacing the in-memory mock.
3. **Online PvP** — swap the bot seat for networked human submissions through the
   same engine calls.

## Tech

Next.js 16 (App Router) + React 19 + TypeScript + Tailwind v4, Zustand for
lobby/match state, `@solana/web3.js` + wallet-adapter, lucide-react icons,
Vitest. No backend, no database, no real-money custody.
