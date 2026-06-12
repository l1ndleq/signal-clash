# Signal Clash — Cyber-Arcade HUD Redesign

**Date:** 2026-06-11
**Status:** Approved (design), pending implementation plan
**Scope:** Visual redesign of the entire app. No gameplay, game-logic, settlement, or data-model changes.

## Goal

Replace the current "refined neon" look with a **Cyber-Arcade HUD** aesthetic across
every surface: a competitive-gaming / terminal-readout feel — monospace HUD labels,
bracket-corner panels, clipped-corner ("cut") buttons, subtle CRT scanlines, and
controlled neon glow. The result should read as a slick esports arena, not a generic
dark dashboard, while staying readable.

This is a **presentation-layer** change only. All wiring, state, props, routes, and
copy semantics stay the same. Where copy is touched it is HUD-styling (e.g. an
existing label gets a `//` or `[ ]` treatment), never new product behavior.

## Locked Decisions

- **Direction:** Cyber-Arcade HUD (chosen over Sharpened Neon and Pro Trading Terminal).
- **Scope:** Full app — landing (`/`), lobby, room, tournament, arena demo, shared chrome.
- **Execution:** Design-system-first. Build HUD primitives once in `globals.css` +
  swap fonts in `layout.tsx`, then apply the primitives across pages surgically.
- **Typography:**
  - Display (logo, headings, big numbers, button labels): **Chakra Petch** (500/600/700)
  - Data / HUD labels / addresses / timers: **JetBrains Mono** (500/700)
  - Long-form body copy: keep **Inter** (readability); Geist remains as system fallback.
- **Palette:** keep the existing Solana neon tokens (surge `#00ffa3`, ocean `#03e1ff`,
  purple `#dc1fff`, magenta `#ff4d6d`, amber `#f5a524`), anchored on a deeper
  near-black canvas (`#04060a` / `#05080c`). Primary HUD accent = surge green.

## Design Tokens (globals.css `:root`)

Add, without removing existing tokens (back-compat):

- `--canvas-deep: #04060a` — new near-black base for the arcade shell.
- `--hud-line: rgba(0,255,156,0.18)` — accent hairline for HUD frames.
- `--scan: rgba(0,255,156,0.035)` — scanline tint.
- `--font-display` remapped to Chakra Petch, `--font-mono` to JetBrains Mono
  (font variables wired in `layout.tsx`).
- Keep `--surge/--ocean/--purple/--magenta/--flat/--ink/--ink-muted/--hairline`.

## HUD Primitives (new, reusable — added to globals.css)

Each is a small, single-purpose utility so pages stay declarative:

1. **`.hud-panel`** — panel surface with a clipped top-right & bottom-left corner
   (`clip-path: polygon(...)`) plus two L-shaped bracket-corner accents via
   `::before`/`::after` (top-left, bottom-right) in surge green. Replaces the
   `.app-panel` / `.app-hero` / `.story-panel` glass look as the standard container.
   Existing `.app-panel`/`.app-hero` classes are restyled in place to adopt the HUD
   look so current markup picks it up with minimal churn.
2. **`.hud-label`** — uppercase JetBrains Mono micro-label, letter-spaced, surge
   green, for `▎SOL/USD //LIVE`-style readouts. (Replaces `.app-eyebrow`/`.metric-label`
   styling; class names kept and restyled where already used.)
3. **`.hud-chip`** — mono, boxed, square-ish chip (restyle of existing `.chip`).
4. **`.clip-corner`** — utility applying the angular cut-corner `clip-path` to any
   element (buttons, chips, tiles).
5. **`.arcade-btn`** — chunky directional button: cut corners, bold fill or outline,
   strong neon box-shadow when `.selected`, `translateY` press feedback. The existing
   `.arcade`/`.arcade-up`/`.arcade-down` classes are extended for UP/DOWN/FLAT and a
   FLAT (amber) variant is added.
6. **`.hud-bar`** — thin progress/timer bar with gradient fill + glow (used by the
   round timer's linear variant and tournament countdowns).
7. **`.scanlines`** — CRT overlay (a `repeating-linear-gradient` via a fixed
   pseudo-element on the shell), layered over the existing grid + radial glow
   background. Low opacity; gated by `prefers-reduced-motion`/contrast.

All clip-corner sizes, glow radii, and scanline opacity are defined once as the
values used in the approved mockup (corner ≈ 8–14px, scanline ≈ 0.035 alpha).

## Animations (globals.css `@keyframes`, extend existing)

Reuse current animation hooks (`flash-up/down`, `latency-flash`, `row-bump`,
`timer-urgent`, `score-delta-pop`) and add:

- **`hud-flicker`** — one-shot subtle text flicker for big readouts on value change
  (optional, used sparingly on price/score).
- **`scan-drift`** — very slow vertical drift of the scanline layer.

Everything new is added to the existing `@media (prefers-reduced-motion: reduce)`
kill-switch list.

## Per-Surface Application

The work is "apply the primitives + swap fonts," not rebuild logic.

- **Global chrome**
  - `layout.tsx`: load Chakra Petch + JetBrains Mono via `next/font/google`, wire
    `--font-display` / `--font-mono`.
  - `globals.css`: tokens, primitives, restyle `.app-shell` background to add
    scanlines; restyle `.app-panel`/`.app-hero`/`.story-panel`, `.chip`, `.btn*`,
    `.metric-*`, `.app-eyebrow`, `.arcade*` to the HUD look.
  - `components/Header.tsx`: logo mark as cut-corner green tile + Chakra Petch
    wordmark; nav links as HUD chips.
  - `components/CustomCursor.tsx`: optional crosshair/reticle cursor to match arcade
    feel (kept subtle; reduced-motion safe).
- **Landing (`app/page.tsx`)** — hero wordmark + headings in Chakra Petch; story
  panels become `.hud-panel`; section markers as `[ 01 ]` mono readouts; CTAs as
  cut-corner arcade buttons. Keep all section copy/order (guarded by the
  landing-content test).
- **Lobby (`app/lobby/page.tsx`, `RoomCard`, `TournamentCard`, `CreateRoomForm`,
  `CreateTournamentForm`)** — metrics as HUD tiles; cards as HUD panels with bracket
  corners; status chips as mono `//`-prefixed readouts; create forms restyled.
- **Room (`app/room/[roomId]/page.tsx`, `PredictionControls`, `RoundTimer`,
  `Scoreboard`, `ResultCard`)** — the money screen: cockpit as `.hud-panel`, price in
  Chakra Petch, UP/DOWN/FLAT as `.arcade-btn`, confidence as cut-corner toggles,
  timer keeps ring + gains the HUD-bar treatment and urgency state, scoreboard rows
  as HUD rows, countdown overlay restyled with mono framing.
- **Tournament (`app/tournament/[id]/page.tsx`, `TournamentLeaderboard`)** —
  registration + leaderboard + results adopt HUD rows, medal colors, prize in mono
  (◎). Reuses the same primitives as the room.
- **Arena demo (`app/arena/page.tsx`)** — demo console + market pulse + leaderboard
  restyled to match.

## Constraints / Non-Goals

- **Readability first:** scanlines and glow stay subtle; long body copy stays Inter,
  not mono. Color contrast for text must remain legible on the deep canvas.
- **Accessibility:** all new motion respects `prefers-reduced-motion`; cut-corner
  clip-paths never clip interactive hit-areas to the point of breaking clicks; focus
  rings preserved on buttons/inputs.
- **No logic changes:** no edits to `lib/**` game/engine/settlement/scoring, no route
  changes, no prop/interface changes beyond styling. No new dependencies except the
  two Google fonts (already the project's font mechanism).
- **Copy:** preserve all strings asserted by `tests/landing-content.test.ts`
  (landing beats, lobby/header/room/arena copy). HUD decoration wraps around them.

## Success Criteria / Verification

1. `npx tsc --noEmit` clean.
2. `npx vitest run` — all tests pass, including `landing-content.test.ts` (copy +
   mojibake guards). Update only the encoding file-list if new component files need
   coverage; do not weaken copy assertions.
3. `npm run build` succeeds for all routes.
4. Visual check in the running app: each surface matches the approved HUD mockup
   (fonts loaded, bracket corners, cut-corner buttons, scanlines, mono readouts).
5. Reduced-motion check: animations disabled under `prefers-reduced-motion`.

## Rollout Order (for the implementation plan)

1. Fonts + tokens + HUD primitives in `globals.css` / `layout.tsx` (foundation).
2. Shared chrome: Header, app-shell, buttons/chips/panels.
3. Room cockpit (highest-impact surface).
4. Tournament surfaces.
5. Lobby + cards + create forms.
6. Landing.
7. Arena demo.
8. Full verification pass (tsc + tests + build + visual).

Note: add `.superpowers/` to `.gitignore` if not already ignored (brainstorm
session artifacts).
