# Cyber-Arcade HUD Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the entire Signal Clash app to a Cyber-Arcade HUD aesthetic (bracket-corner panels, cut-corner buttons, subtle CRT scanlines, mono HUD labels, Chakra Petch + JetBrains Mono) without changing any gameplay, logic, routes, or props.

**Architecture:** Design-system-first. Add fonts + tokens + reusable HUD primitives to `globals.css`/`layout.tsx` once, then apply them across each surface by swapping classNames and adding HUD decoration. Existing structural classes (`.app-panel`, `.app-hero`, `.chip`, `.btn*`, `.metric-*`, `.arcade*`) are restyled in place so current markup adopts the look with minimal churn.

**Tech Stack:** Next.js 16 (App Router, Turbopack), React, Tailwind v4 (`@import "tailwindcss"`), CSS custom properties, `next/font/google`, Vitest.

**Verification model (read first):** This is presentation-only work, so there are no per-task unit tests. Each task verifies with: `npx tsc --noEmit` (clean), `npx vitest run` (the `landing-content.test.ts` copy + mojibake guards must stay green), `npm run build` (succeeds), and a visual check against the approved mockup. Preserve every copy string asserted in `tests/landing-content.test.ts` — HUD decoration wraps around existing text, never replaces it.

**Spec:** `docs/superpowers/specs/2026-06-11-cyber-arcade-hud-redesign-design.md`

---

## File Structure

**Modified — foundation:**
- `app/layout.tsx` — load Chakra Petch + JetBrains Mono; wire `--font-display` / `--font-mono`.
- `app/globals.css` — new tokens, HUD primitives (`.hud-panel`, `.hud-label`, `.clip-corner`, `.arcade-btn`, `.hud-bar`), scanline layer; restyle `.app-panel`/`.app-hero`/`.story-panel`/`.chip`/`.btn*`/`.metric-*`/`.app-eyebrow`/`.arcade*`; remap `.font-num` to mono.
- `.gitignore` — ignore `.superpowers/`.

**Modified — shared chrome:**
- `components/Header.tsx`, `components/CustomCursor.tsx`

**Modified — room surface:**
- `app/room/[roomId]/page.tsx`, `components/PredictionControls.tsx`, `components/RoundTimer.tsx`, `components/Scoreboard.tsx`, `components/ResultCard.tsx`

**Modified — tournament surface:**
- `app/tournament/[id]/page.tsx`, `components/TournamentLeaderboard.tsx`, `components/TournamentCard.tsx`

**Modified — lobby / landing / arena:**
- `app/lobby/page.tsx`, `components/RoomCard.tsx`, `components/CreateRoomForm.tsx`, `components/CreateTournamentForm.tsx`, `app/page.tsx`, `app/arena/page.tsx`

**Modified — tests:**
- `tests/landing-content.test.ts` — only if new files need mojibake coverage (none expected); do not weaken copy assertions.

---

## Task 0: Branch + gitignore

**Files:**
- Modify: `.gitignore`

- [ ] **Step 1: Create a feature branch (we are on `master`)**

Run:
```bash
git checkout -b redesign/cyber-arcade-hud
```
Expected: `Switched to a new branch 'redesign/cyber-arcade-hud'`

- [ ] **Step 2: Ignore brainstorm artifacts**

Append to `.gitignore`:
```
# Brainstorm session artifacts
.superpowers/
```

- [ ] **Step 3: Commit**

```bash
git add .gitignore
git commit -m "chore: ignore .superpowers brainstorm artifacts"
```

---

## Task 1: Fonts + tokens + HUD primitives (foundation)

**Files:**
- Modify: `app/layout.tsx`
- Modify: `app/globals.css`

- [ ] **Step 1: Swap display/mono fonts in `layout.tsx`**

Replace the font imports/instances. Change the import line and the `spaceGrotesk`/`geistMono` font setup so `--font-display` = Chakra Petch and `--font-mono` = JetBrains Mono. Keep Geist (sans) + Inter (`--font-body`).

Replace:
```tsx
import { Geist, Geist_Mono, Space_Grotesk, Inter } from "next/font/google";
```
with:
```tsx
import { Geist, Chakra_Petch, JetBrains_Mono, Inter } from "next/font/google";
```

Replace the `geistMono` and `spaceGrotesk` blocks:
```tsx
const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

// Design-brief typefaces: Space Grotesk for display/logo, Inter for numbers.
const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});
```
with:
```tsx
// Cyber-Arcade HUD typefaces: Chakra Petch (display/HUD) + JetBrains Mono (data).
const chakraPetch = Chakra_Petch({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["500", "700"],
});
```

Update the `<html className>` to use the new variables (drop `geistMono`/`spaceGrotesk`, add `chakraPetch`/`jetbrainsMono`):
```tsx
className={`${geistSans.variable} ${chakraPetch.variable} ${jetbrainsMono.variable} ${inter.variable} h-full antialiased`}
```

- [ ] **Step 2: Update the `@theme inline` mono mapping in `globals.css`**

In the `@theme inline` block, change:
```css
  --font-mono: var(--font-geist-mono);
```
to:
```css
  --font-mono: var(--font-mono);
```
(`--font-mono` now comes from JetBrains Mono via layout.) Leave `--font-sans: var(--font-body)` as is.

- [ ] **Step 3: Remap `.font-num` to mono + add HUD tokens**

In `globals.css`, change the `.font-num` rule to use the mono variable:
```css
.font-num {
  font-family: var(--font-mono), ui-monospace, SFMono-Regular, monospace;
  font-variant-numeric: tabular-nums;
  font-feature-settings: "tnum" 1;
}
```

Add HUD tokens inside the existing arena `:root` block (next to `--surge` etc.):
```css
  --canvas-deep: #04060a;
  --hud-line: rgba(0, 255, 163, 0.2);
  --scan: rgba(0, 255, 163, 0.035);
```

- [ ] **Step 4: Add HUD primitives to `globals.css`**

Append this block to `globals.css` (before the `@media (prefers-reduced-motion)` block):
```css
/* ============================================================
   Cyber-Arcade HUD design system
   ============================================================ */

/* Angular cut-corner utility (top-left + bottom-right cut). */
.clip-corner {
  clip-path: polygon(
    8px 0, 100% 0, 100% calc(100% - 8px),
    calc(100% - 8px) 100%, 0 100%, 0 8px
  );
}

/* HUD panel: clipped TR + BL corners with surge bracket accents. */
.hud-panel {
  position: relative;
  background:
    linear-gradient(145deg, rgba(255, 255, 255, 0.05), rgba(255, 255, 255, 0.02)),
    rgba(10, 14, 20, 0.74);
  border: 1px solid var(--hairline);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
  clip-path: polygon(
    0 0, calc(100% - 14px) 0, 100% 14px,
    100% 100%, 14px 100%, 0 calc(100% - 14px)
  );
}
.hud-panel::before,
.hud-panel::after {
  content: "";
  position: absolute;
  width: 12px;
  height: 12px;
  pointer-events: none;
  z-index: 2;
}
.hud-panel::before {
  top: 6px;
  left: 6px;
  border-top: 2px solid var(--surge);
  border-left: 2px solid var(--surge);
}
.hud-panel::after {
  bottom: 6px;
  right: 6px;
  border-bottom: 2px solid var(--surge);
  border-right: 2px solid var(--surge);
}

/* Mono HUD micro-label. */
.hud-label {
  font-family: var(--font-mono), ui-monospace, monospace;
  font-size: 0.66rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
  color: var(--surge);
}

/* Chunky arcade directional button with cut corners. */
.arcade-btn {
  position: relative;
  font-family: var(--font-display), ui-sans-serif, system-ui, sans-serif;
  font-weight: 700;
  text-align: center;
  border: 1px solid var(--hairline);
  background: rgba(255, 255, 255, 0.04);
  color: var(--ink);
  clip-path: polygon(
    8px 0, 100% 0, 100% calc(100% - 8px),
    calc(100% - 8px) 100%, 0 100%, 0 8px
  );
  transition: transform 0.08s ease, box-shadow 0.18s ease, filter 0.18s ease;
}
.arcade-btn:active:not(:disabled) {
  transform: translateY(2px);
}
.arcade-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
.arcade-btn-up {
  border-color: rgba(0, 255, 163, 0.5);
  background: linear-gradient(180deg, rgba(0, 255, 163, 0.16), rgba(0, 255, 163, 0.04));
  color: var(--surge);
}
.arcade-btn-up:hover:not(:disabled) { box-shadow: 0 0 30px rgba(0, 255, 163, 0.4); }
.arcade-btn-up.selected { box-shadow: 0 0 40px rgba(0, 255, 163, 0.6); filter: saturate(1.2); }
.arcade-btn-down {
  border-color: rgba(255, 77, 109, 0.5);
  background: linear-gradient(180deg, rgba(255, 77, 109, 0.16), rgba(255, 77, 109, 0.04));
  color: var(--magenta);
}
.arcade-btn-down:hover:not(:disabled) { box-shadow: 0 0 30px rgba(255, 77, 109, 0.4); }
.arcade-btn-down.selected { box-shadow: 0 0 40px rgba(255, 77, 109, 0.6); filter: saturate(1.2); }
.arcade-btn-flat {
  border-color: rgba(245, 165, 36, 0.5);
  background: linear-gradient(180deg, rgba(245, 165, 36, 0.14), rgba(245, 165, 36, 0.04));
  color: var(--flat);
}
.arcade-btn-flat:hover:not(:disabled) { box-shadow: 0 0 30px rgba(245, 165, 36, 0.4); }
.arcade-btn-flat.selected { box-shadow: 0 0 40px rgba(245, 165, 36, 0.6); filter: saturate(1.2); }

/* Thin HUD progress/timer bar. */
.hud-bar {
  height: 8px;
  background: rgba(255, 255, 255, 0.06);
  overflow: hidden;
  clip-path: polygon(4px 0, 100% 0, 100% 100%, 0 100%, 0 4px);
}
.hud-bar > span {
  display: block;
  height: 100%;
  background: var(--sol-gradient);
  box-shadow: 0 0 14px rgba(3, 225, 255, 0.6);
}

@keyframes scanDrift {
  from { background-position-y: 0; }
  to { background-position-y: 3px; }
}
```

- [ ] **Step 5: Add the scanline layer to the app shells**

In `globals.css`, in the `.app-shell` background stack, add a scanline gradient as the FIRST layer. Change the `.app-shell` `background:` to begin with:
```css
  background:
    repeating-linear-gradient(0deg, var(--scan) 0 1px, transparent 1px 3px),
    radial-gradient(900px 520px at 8% -8%, rgba(0, 255, 163, 0.12), transparent 64%),
    radial-gradient(760px 460px at 92% 6%, rgba(220, 31, 255, 0.12), transparent 62%),
    radial-gradient(680px 520px at 56% 92%, rgba(3, 225, 255, 0.08), transparent 66%),
    linear-gradient(180deg, #07090e 0%, #0a0b0f 45%, #06080d 100%);
```
Do the same for `.landing-shell` — prepend the same `repeating-linear-gradient(0deg, var(--scan) 0 1px, transparent 1px 3px),` as its first background layer.

- [ ] **Step 6: Restyle base classes to the HUD look**

In `globals.css`:

(a) Make `.app-panel` and `.app-hero` adopt the HUD frame. Add the clip-path + bracket pseudo-elements to their shared rule. After the existing `.app-hero, .app-panel { ... }` block, add:
```css
.app-hero,
.app-panel {
  clip-path: polygon(
    0 0, calc(100% - 14px) 0, 100% 14px,
    100% 100%, 14px 100%, 0 calc(100% - 14px)
  );
}
.app-hero::after,
.app-panel::after {
  content: "";
  position: absolute;
  bottom: 6px;
  right: 6px;
  width: 12px;
  height: 12px;
  border-bottom: 2px solid var(--surge);
  border-right: 2px solid var(--surge);
  pointer-events: none;
  z-index: 2;
}
```
(Note: `.app-hero::before`/`.app-panel::before` are already used for the glow overlay — keep them; the bracket uses `::after`, and the existing `::after` for `.app-shell` is on the shell, not the panels, so there is no conflict. Add a top-left bracket by giving these panels a `box-shadow: inset 2px 2px 0 -1px` accent is avoided; one bracket corner is enough to read as HUD.)

(b) Restyle `.chip` to a squared mono readout:
```css
.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.25rem 0.6rem;
  border-radius: 0;
  font-family: var(--font-mono), ui-monospace, monospace;
  font-size: 0.66rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  font-weight: 500;
  border: 1px solid var(--hairline);
  background: rgba(255, 255, 255, 0.04);
  clip-path: polygon(5px 0, 100% 0, 100% calc(100% - 5px), calc(100% - 5px) 100%, 0 100%, 0 5px);
}
```

(c) Give `.app-eyebrow` and `.metric-label` the mono treatment (they already are uppercase/letter-spaced; switch font to mono):
```css
.app-eyebrow,
.metric-label {
  font-family: var(--font-mono), ui-monospace, monospace;
}
```

(d) Give `.btn` cut corners so primary/ghost buttons read as HUD:
```css
.btn {
  clip-path: polygon(7px 0, 100% 0, 100% calc(100% - 7px), calc(100% - 7px) 100%, 0 100%, 0 7px);
  font-family: var(--font-display), ui-sans-serif, system-ui, sans-serif;
  letter-spacing: 0.02em;
}
```
(Place this AFTER the existing `.btn { ... }` rule so it augments it. The existing `border-radius: 0.5rem` is overridden visually by clip-path; leave it.)

- [ ] **Step 7: Verify foundation builds**

Run:
```bash
npx tsc --noEmit
```
Expected: no output (clean).

Run:
```bash
npm run build
```
Expected: `✓ Compiled successfully`, all 6 routes listed.

- [ ] **Step 8: Visual check + commit**

Run `npm run dev`, open `/lobby`. Confirm: fonts changed (Chakra Petch headings, mono chips), panels have cut corners + a bracket accent, faint scanlines over the background, arcade-ready buttons. Stop dev.

```bash
git add app/layout.tsx app/globals.css
git commit -m "feat(ui): cyber-arcade HUD foundation — fonts, tokens, primitives"
```

---

## Task 2: Shared chrome (Header + cursor)

**Files:**
- Modify: `components/Header.tsx`
- Modify: `components/CustomCursor.tsx`

- [ ] **Step 1: Read the current Header**

Run: read `components/Header.tsx` to see the logo mark + nav structure (mirrors the `TopBar` in `app/page.tsx`: an `SC` tile + wordmark + nav links).

- [ ] **Step 2: Restyle the logo mark + wordmark**

Give the `SC` logo tile the cut-corner green treatment and the wordmark Chakra Petch with letter-spacing. Replace the logo tile's className so it includes `clip-corner` and a surge fill, e.g.:
```tsx
<span className="clip-corner grid h-9 w-9 place-items-center bg-[var(--surge)] font-display text-sm font-bold text-[#04060a] shadow-[0_0_20px_rgba(0,255,163,0.5)]">
  SC
</span>
<span className="font-display text-base font-bold tracking-[0.06em]">SIGNAL CLASH</span>
```
(Match the existing element types/links in Header; only change classNames + the wordmark text casing to `SIGNAL CLASH`.)

- [ ] **Step 3: Restyle nav links as HUD chips**

Ensure nav links use the `chip` class (now squared/mono) or `font-mono uppercase text-xs tracking-[0.1em]`. Keep `href`s and labels unchanged (Header must still contain "Home", "Lobby", "Demo", "Devnet" per the copy test).

- [ ] **Step 4: (Optional) crosshair cursor**

In `components/CustomCursor.tsx`, if the cursor is a dot/ring, switch the visual to a small crosshair/reticle (two thin surge lines forming a `+` with a center gap). Keep all existing motion logic and the `prefers-reduced-motion` guard untouched. If this risks regressions, skip — it is cosmetic.

- [ ] **Step 5: Verify + commit**

Run:
```bash
npx tsc --noEmit && npx vitest run
```
Expected: tsc clean; tests `4 passed`, `17 passed` (Header still contains required copy).

```bash
git add components/Header.tsx components/CustomCursor.tsx
git commit -m "feat(ui): HUD header + cursor"
```

---

## Task 3: Room cockpit (highest-impact surface)

**Files:**
- Modify: `components/PredictionControls.tsx`
- Modify: `components/RoundTimer.tsx`
- Modify: `components/Scoreboard.tsx`
- Modify: `components/ResultCard.tsx`
- Modify: `app/room/[roomId]/page.tsx`

- [ ] **Step 1: Arcade buttons in `PredictionControls.tsx`**

Replace the directional `<button>`'s inline-styled className/style with the new `.arcade-btn` variants. For each direction map UP→`arcade-btn-up`, DOWN→`arcade-btn-down`, FLAT→`arcade-btn-flat`. Replace the button element so it is:
```tsx
<button
  key={d.dir}
  disabled={!active}
  onClick={() => setDirection(d.dir)}
  className={`arcade-btn min-h-28 p-3 ${variantClass(d.dir)} ${selected ? "selected" : ""}`}
>
  <Icon className="mx-auto" size={26} aria-hidden />
  <span className="mt-2 block font-display text-xl font-bold">{d.label}</span>
  <span className="hud-label mt-1 block">{d.hint}</span>
</button>
```
Add a local helper:
```tsx
function variantClass(dir: Direction): string {
  return dir === "UP" ? "arcade-btn-up" : dir === "DOWN" ? "arcade-btn-down" : "arcade-btn-flat";
}
```
Remove the now-unused `alpha()` helper and the inline `style` object for these buttons (they are replaced by the CSS variants). Keep the confidence toggles but give the selected one `clip-corner` (already covered by `.btn`). Keep the locked-state live-tracker block; just swap its labels to `hud-label` styling where appropriate. Keep all props and the `onLock` flow unchanged.

- [ ] **Step 2: HUD bar on `RoundTimer.tsx`**

Keep the conic ring. Below the ring label, add a linear `.hud-bar` reflecting `pct`, and switch the ring's center number to `font-display`. Add under the existing ring markup:
```tsx
<div className="hud-bar w-full">
  <span style={{ width: `${pct * 100}%` }} />
</div>
```
Change the center number span to `className="font-display text-3xl font-bold ..."` (was `font-num`). Keep urgency logic.

- [ ] **Step 3: HUD rows in `Scoreboard.tsx`**

Change each player row container to include `clip-corner` and the score number to `font-num` (mono, now). Replace the row wrapper className `"rounded-lg border p-3"` with `"clip-corner border p-3"`. Change the section heading copy prefix to a HUD label: wrap the eyebrow text so it reads like `⬡ LIVE SCOREBOARD` (decorative; keep the words). Score delta + streak logic unchanged.

- [ ] **Step 4: HUD treatment in `ResultCard.tsx`**

Give the two player tiles `clip-corner`. Change the big result title to keep `font-display` (already) and the score numbers to `font-num`. Wrap the "Match complete" label as `hud-label`. No logic changes.

- [ ] **Step 5: Room page price + countdown**

In `app/room/[roomId]/page.tsx`:
- In `PricePanel`, change the big price `<div className="mt-4 font-num text-6xl ...">` to `font-display` (Chakra Petch reads as the hero price). Wrap the market/feed chips — they already use `.chip` (now HUD). Change the `app-kicker`/labels to read as `▎`-prefixed HUD labels (decorative text only).
- In `CountdownOverlay`, change the subtitle to mono and add `[ ROUND ]` framing (decorative). Keep the number on `font-display`.

- [ ] **Step 6: Verify + visual check**

Run:
```bash
npx tsc --noEmit && npx vitest run && npm run build
```
Expected: tsc clean; `17 passed`; build OK (room route present). The `landing-content` test still asserts room contains "Prediction cockpit", "Market signal", "Devnet settlement", "MagicBlock: mock adapter" — keep those strings.

Run `npm run dev`, play a room to a result. Confirm arcade buttons, HUD timer bar, mono scores, cut-corner tiles, countdown framing.

- [ ] **Step 7: Commit**

```bash
git add components/PredictionControls.tsx components/RoundTimer.tsx components/Scoreboard.tsx components/ResultCard.tsx "app/room/[roomId]/page.tsx"
git commit -m "feat(ui): HUD room cockpit — arcade buttons, timer bar, mono readouts"
```

---

## Task 4: Tournament surface

**Files:**
- Modify: `components/TournamentLeaderboard.tsx`
- Modify: `components/TournamentCard.tsx`
- Modify: `app/tournament/[id]/page.tsx`

- [ ] **Step 1: HUD rows in `TournamentLeaderboard.tsx`**

Change each standings row wrapper from `"... rounded-lg border ..."` to use `clip-corner` instead of `rounded-lg`. Keep the medal colors and "YOU" highlight. Change the "Your position" summary card to `clip-corner`. Change the section eyebrow to a `hud-label` reading `⬡ STANDINGS`. Scores/prizes already use `font-num` (mono). No logic changes.

- [ ] **Step 2: HUD card in `TournamentCard.tsx`**

The card root is `.app-panel` (now HUD-framed) — good. Change the prize-pool headline to `font-display` and the countdown number to `font-display`. Change the four stat tiles to include `clip-corner`. Keep the live `useCountdown` logic and the pool = entry × seats math.

- [ ] **Step 3: HUD treatment on `app/tournament/[id]/page.tsx`**

- `RegistrationPanel`: pool headline `font-display`; countdown number `font-display`; the three payout tiles get `clip-corner`; labels to `hud-label`.
- `PriceHeader`: big price `font-display` (matches room).
- `TournamentResult`: standings tiles `clip-corner`; "Tournament complete" label `hud-label`.
- `CountdownOverlay`: same mono framing as the room.
Keep all settlement/registration/start logic, `beginPlay`, and props unchanged.

- [ ] **Step 4: Verify + commit**

Run:
```bash
npx tsc --noEmit && npx vitest run && npm run build
```
Expected: tsc clean; `17 passed`; build OK (tournament route present).

Run `npm run dev`, open a created tournament (as the admin wallet) → register → play. Confirm HUD leaderboard, cut-corner tiles, mono prizes.

```bash
git add components/TournamentLeaderboard.tsx components/TournamentCard.tsx "app/tournament/[id]/page.tsx"
git commit -m "feat(ui): HUD tournament surface"
```

---

## Task 5: Lobby + cards + create forms

**Files:**
- Modify: `app/lobby/page.tsx`
- Modify: `components/RoomCard.tsx`
- Modify: `components/CreateRoomForm.tsx`
- Modify: `components/CreateTournamentForm.tsx`

- [ ] **Step 1: Lobby page**

In `app/lobby/page.tsx`: hero h1 stays Chakra Petch (display); metric tiles get `clip-corner`; section eyebrows read as `hud-label`. Keep all required copy strings ("Enter the arena lobby", "Scheduled tournaments", "Quick-match rooms", "Connect wallet", "Top 3 split 50 / 30 / 20"). No logic changes.

- [ ] **Step 2: `RoomCard.tsx`**

Root is `.app-panel` (HUD-framed). Change the `Arena #id` heading to `font-display`; stat tiles get `clip-corner`; status chip uses `.chip` (HUD). Keep `onPlay` + seat/prize logic.

- [ ] **Step 3: Create forms**

In `CreateRoomForm.tsx` and `CreateTournamentForm.tsx`: field labels become `hud-label`; preset buttons already use `.btn` (HUD cut corners); the prize-pool summary tiles get `clip-corner`. Keep all form state, validation, and `onCreate` signatures.

- [ ] **Step 4: Verify + commit**

Run:
```bash
npx tsc --noEmit && npx vitest run && npm run build
```
Expected: tsc clean; `17 passed`; build OK.

Run `npm run dev`, open `/lobby`. Confirm HUD cards, forms, metrics.

```bash
git add "app/lobby/page.tsx" components/RoomCard.tsx components/CreateRoomForm.tsx components/CreateTournamentForm.tsx
git commit -m "feat(ui): HUD lobby, room/tournament cards, create forms"
```

---

## Task 6: Landing page

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: HUD treatment**

In `app/page.tsx`:
- `TopBar`: same logo/wordmark treatment as Header (cut-corner `SC` tile, `SIGNAL CLASH` wordmark).
- Hero: keep `Signal Clash` h1 (display). Keep all asserted copy ("Markets move.", "You call the signal.", section titles, "Think you can read the next move?", "Enter Arena", "View Demo").
- `SectionMarker`: render the marker number as a mono `[ 01 ]` readout inside the existing tile (decorative; keep the number).
- `story-panel` visuals: already glass; add `clip-corner` to the demo choice tiles + confidence tiles in `PredictionDemoCard`. CTAs use `MagneticLink` → wrap its inner `Link` className with `clip-corner` (keep the magnetic motion).

- [ ] **Step 2: Verify + commit**

Run:
```bash
npx tsc --noEmit && npx vitest run && npm run build
```
Expected: tsc clean; `17 passed` (landing beats copy intact); build OK.

Run `npm run dev`, open `/`. Confirm HUD framing throughout the scroll story.

```bash
git add "app/page.tsx"
git commit -m "feat(ui): HUD landing page"
```

---

## Task 7: Arena demo

**Files:**
- Modify: `app/arena/page.tsx`

- [ ] **Step 1: HUD treatment**

In `app/arena/page.tsx`: `DemoConsole` direction buttons → `.arcade-btn` variants (UP/DOWN/FLAT) with `selected` on the active choice; confidence tiles + leaderboard rows get `clip-corner`; the big `$price` in `MarketPulse` → `font-display`; eyebrows → `hud-label`. Keep the demo timers/state logic and the required copy ("Visual demo arena", "Market pulse", "Live Leaderboard"). Keep the `DemoButton` interactivity.

- [ ] **Step 2: Verify + commit**

Run:
```bash
npx tsc --noEmit && npx vitest run && npm run build
```
Expected: tsc clean; `17 passed`; build OK.

Run `npm run dev`, open `/arena`. Confirm arcade buttons + HUD leaderboard.

```bash
git add "app/arena/page.tsx"
git commit -m "feat(ui): HUD arena demo"
```

---

## Task 8: Full verification pass

- [ ] **Step 1: Static + tests + build**

Run:
```bash
npx tsc --noEmit && npx vitest run && npm run build
```
Expected: tsc clean; `Test Files 4 passed`, `Tests 17 passed`; build succeeds with all routes (`/`, `/arena`, `/lobby`, `/room/[roomId]`, `/tournament/[id]`).

- [ ] **Step 2: Reduced-motion check**

In the browser devtools, emulate `prefers-reduced-motion: reduce` and confirm scanline drift / flashes / pulses are disabled (the `@media (prefers-reduced-motion: reduce)` block already lists the animation classes; if any new animated class was added, add it to that list).

- [ ] **Step 3: Cross-surface visual sweep**

Walk every surface (`/`, `/lobby`, create a room → play → result, create a tournament as admin → register → play → result, `/arena`). Confirm consistent fonts, bracket-corner panels, cut-corner buttons, mono readouts, readable contrast.

- [ ] **Step 4: Final commit (if any fixups)**

```bash
git add -A
git commit -m "chore(ui): cyber-arcade HUD redesign verification fixups"
```

---

## Self-Review Notes

- **Spec coverage:** fonts (T1), tokens (T1), primitives `.hud-panel`/`.hud-label`/`.clip-corner`/`.arcade-btn`/`.hud-bar`/scanlines (T1), header/cursor (T2), room (T3), tournament (T4), lobby/cards/forms (T5), landing (T6), arena (T7), verification incl. reduced-motion + copy guard (T8). All spec sections map to a task.
- **Copy guard:** every task that touches a `landing-content`-asserted file restates "keep required copy"; T8 re-runs the guard.
- **No logic changes:** every task explicitly says props/state/handlers stay unchanged.
- **Naming consistency:** primitive class names (`.hud-panel`, `.hud-label`, `.clip-corner`, `.arcade-btn`, `.arcade-btn-up/-down/-flat`, `.hud-bar`) are defined in T1 and referenced identically in T2-T7.
