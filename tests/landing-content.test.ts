import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const textFiles = [
  "app/page.tsx",
  "app/globals.css",
  "app/lobby/page.tsx",
  "app/arena/page.tsx",
  "app/room/[roomId]/page.tsx",
  "components/Header.tsx",
  "components/WalletButton.tsx",
  "components/RoomCard.tsx",
  "components/CreateRoomForm.tsx",
  "components/TournamentCard.tsx",
  "components/CreateTournamentForm.tsx",
  "components/TournamentLeaderboard.tsx",
  "app/tournament/[id]/page.tsx",
  "components/PredictionControls.tsx",
  "components/Scoreboard.tsx",
  "components/ResultCard.tsx",
  "components/RoundTimer.tsx",
  "components/TradingViewChart.tsx",
  "README.md",
  "docs/ARCHITECTURE.md",
];

const read = (path: string) => readFileSync(path, "utf8");

describe("landing page copy", () => {
  it("contains the required hackathon storytelling beats", () => {
    const page = read("app/page.tsx");

    [
      "Signal Clash",
      "Markets move.",
      "You call the signal.",
      "Market Is Alive",
      "Not A Coin Flip",
      "Lock Your Call",
      "Win The Series",
      "Real-Time Arena Layer",
      "Devnet Settlement",
      "Think you can read the next move?",
      "Enter Arena",
      "View Demo",
      "/lobby",
      "/arena",
    ].forEach((copy) => expect(page).toContain(copy));
  });
});

describe("app shell copy", () => {
  it("keeps lobby, arena, and room flows aligned with the premium product UI", () => {
    const lobby = read("app/lobby/page.tsx");
    const arena = read("app/arena/page.tsx");
    const room = read("app/room/[roomId]/page.tsx");
    const header = read("components/Header.tsx");

    ["Home", "Lobby", "Demo", "Devnet"].forEach((copy) =>
      expect(header).toContain(copy),
    );

    [
      "Enter the arena lobby",
      "Scheduled tournaments",
      "Quick-match rooms",
      "Connect wallet",
      "Top 3 split 50 / 30 / 20",
    ].forEach((copy) => expect(lobby).toContain(copy));

    ["Visual demo arena", "Market pulse", "Live Leaderboard"].forEach((copy) =>
      expect(arena).toContain(copy),
    );

    [
      "Prediction cockpit",
      "Market signal",
      "Devnet settlement",
      "MagicBlock: mock adapter",
    ].forEach((copy) => expect(room).toContain(copy));
  });
});

describe("text encoding", () => {
  it("keeps user-facing text free of common mojibake sequences", () => {
    const badPatterns = [
      /\uFFFD/,
      /\u00E2[\u0080-\u00BF]/,
      /\u00C3[\u0080-\u00BF]/,
      /\u00C2[\u0080-\u00BF]/,
      /\u0432[\u0400-\u045F]/,
      /\u0412[\u00A0-\u00BF]/,
    ];

    const offenders = textFiles.flatMap((path) => {
      const content = read(path);
      return badPatterns
        .filter((pattern) => pattern.test(content))
        .map((pattern) => `${path}: ${pattern.source}`);
    });

    expect(offenders).toEqual([]);
  });
});
