/** Single source of truth for the primary nav — used by the Header and the
 *  landing hero pill so both stay identical. */
export const NAV_LINKS: { label: string; href: string }[] = [
  { label: "Home", href: "/" },
  { label: "Lobby", href: "/lobby" },
  { label: "Arena", href: "/arena" },
  { label: "Leaderboard", href: "/leaderboard" },
  { label: "Docs", href: "/docs" },
  { label: "Profile", href: "/profile" },
];
