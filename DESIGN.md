# 🎨 Signal Clash — Design Brief

> Read this before building or restyling ANY UI. The frontend must look like it belongs
> in the Solana + MagicBlock ecosystem: dark, neon-accented, fast, premium. Judges see
> the look before they read the code — this matters.

## Vibe (one line)
Dark cyberpunk trading terminal meets arcade game. Black canvas, neon Solana gradients,
MagicBlock's emerald glow, glassy panels, fast and alive.

## Color palette (use these exact values)

Solana brand — PRIMARY gradient (official, from solana.com/branding):
- Solana Purple `#9945FF`  (main)
- Solana Green  `#14F195`  (main)
- Main gradient: `linear-gradient(135deg, #9945FF 0%, #14F195 100%)`

Solana brand — extended accents (also official, the "disco" palette):
- Surge Green   `#00FFA3`
- Ocean Blue    `#03E1FF`  (great for neon accents)
- Purple Dino   `#DC1FFF`
- Black         `#000000`

MagicBlock accents (from their decks): deep emerald + teal
- Emerald       `#0F6E56`
- Teal glow     `#1D9E75`

Neutrals:
- Canvas bg     `#0A0B0F` (near-black, slightly warm)
- Panel bg      `#12141A` (glassy surface)
- Border        `rgba(255,255,255,0.08)`
- Text primary  `#F5F7FA`
- Text muted    `#8A8F99`

## Signature treatments (this is what makes it "look Solana")
1. **Solana gradient** on hero text, the logo, and the primary CTA:
   `linear-gradient(90deg, #00FFA3 0%, #03E1FF 50%, #DC1FFF 100%)`
   Apply as `background-clip: text` for headings, or as a button background.
2. **Emerald glow** behind the live price + timer:
   `box-shadow: 0 0 40px rgba(29,158,117,0.35)` and subtle vertical light streaks
   in the background (MagicBlock's signature — faint vertical lines, low opacity).
3. **Glassmorphism panels**: `background: rgba(18,20,26,0.7); backdrop-filter: blur(12px);
   border: 1px solid rgba(255,255,255,0.08); border-radius: 16px;`
4. **UP = surge green, DOWN = a warm magenta/red** (`#FF4D6D`), both with a soft glow
   on press. Big, tactile, arcade-feel buttons.
5. **The latency badge is the star** — when a prediction lands, flash the ms number in
   surge green with a quick pulse animation. This is the "wow, it's instant" moment.

## Typography
- Headings / logo: **Space Grotesk** (geometric, techy) — Google Fonts.
- Body / numbers: **Inter** — Google Fonts. Use tabular figures for the price/timer
  so digits don't jitter: `font-variant-numeric: tabular-nums;`

## Motion
- Timer ticks smoothly. Price updates with a tiny flash (green up / red down).
- Leaderboard rows animate up/down on rank change (Framer Motion if available, or CSS).
- Keep it snappy — this app's whole pitch is speed; nothing should feel laggy.

## Layout (mobile-first, ~460px column, centered)
1. Top bar: ⚡ Signal Clash logo (gradient) + wallet connect button.
2. Live SOL/USD price, large, with emerald glow.
3. Round timer (60s countdown), prominent.
4. Big UP / DOWN buttons side by side.
5. Latency badge (appears on prediction).
6. Leaderboard panel (glassy), live-updating.
7. Tiny footer: "Solana + MagicBlock Ephemeral Rollups · Solana Blitz v5".

## Tech for the frontend
- Next.js + Tailwind CSS.
- **shadcn/ui** for base components (cards, buttons, dialogs) — then recolor to the
  palette above. Don't ship default shadcn slate; override with our tokens.
- @solana/wallet-adapter for Phantom connect (style the button to match).
- lucide-react for icons (Zap, ArrowUp, ArrowDown, Trophy, Wallet).
- Framer Motion for the leaderboard + latency pulse (optional but high-impact).

## Hard don'ts
- ❌ Don't paste the official Solana logo and call it ours — use OUR ⚡ Signal Clash mark.
- ❌ No default bootstrap/shadcn-slate look. It must feel custom and neon.
- ❌ No light mode. This is a dark product.
- ❌ Don't overload with effects to the point it lags — speed is the brand.

## Reference look (describe to the design tool / for inspiration)
- Solana brand: https://solana.com/branding  (palette + gradient vibe)
- MagicBlock docs/decks: dark emerald, vertical light streaks, glass panels.
- Think: Hyperliquid / Phantom wallet / a premium DEX terminal, but arcade-fun.
