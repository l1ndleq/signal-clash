import type { NextConfig } from "next";

/**
 * Security headers. The CSP here is the non-breaking subset (it does NOT set
 * default-src/script-src/connect-src, so it can't block app integrations like
 * TradingView, wallet adapters, Supabase Realtime, Binance, or Solana RPC). It
 * still closes clickjacking, <base>/<object> injection, and forces HTTPS
 * subresources. A strict script/connect allowlist CSP is the documented next
 * step — enable it and verify the browser console shows no violations on the
 * live /room (chart) + wallet flows before enforcing.
 */
const SECURITY_HEADERS = [
  {
    key: "Content-Security-Policy",
    value: [
      "object-src 'none'",
      "base-uri 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains",
  },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  async headers() {
    return [{ source: "/(.*)", headers: SECURITY_HEADERS }];
  },
};

export default nextConfig;
