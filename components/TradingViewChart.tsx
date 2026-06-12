"use client";

import { useEffect, useRef } from "react";

/**
 * TradingView Advanced Real-Time Chart widget.
 *
 * This is the VISUAL layer only — it renders a live chart in an iframe and does
 * not expose price data to JS. Scoring uses the separate Binance feed
 * (`lib/game/binancePriceFeed.ts`). `symbol` is a TradingView symbol such as
 * "BINANCE:SOLUSDT".
 */
export default function TradingViewChart({
  symbol,
  height = 540,
}: {
  symbol: string;
  height?: number;
}) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Reset (handles symbol changes and React strict-mode double mounts).
    container.innerHTML = "";
    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    widget.style.height = `${height}px`;
    widget.style.width = "100%";
    container.appendChild(widget);

    const script = document.createElement("script");
    script.src =
      "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.type = "text/javascript";
    script.async = true;
    script.innerHTML = JSON.stringify({
      symbol,
      interval: "1",
      timezone: "Etc/UTC",
      theme: "dark",
      style: "1",
      locale: "en",
      hide_side_toolbar: true,
      allow_symbol_change: false,
      save_image: false,
      calendar: false,
      hide_volume: true,
      backgroundColor: "rgba(13, 20, 36, 1)",
      gridColor: "rgba(30, 42, 68, 0.5)",
      autosize: true,
    });
    container.appendChild(script);

    return () => {
      container.innerHTML = "";
    };
  }, [symbol, height]);

  return (
    <div className="app-panel overflow-hidden p-2">
      <div className="mb-2 flex items-center justify-between px-2 pt-1">
        <span className="app-eyebrow">Market chart</span>
        <span className="chip text-[var(--ink-muted)]">TradingView visual</span>
      </div>
      <div
        className="tradingview-widget-container overflow-hidden rounded-lg border border-[var(--hairline)]"
        ref={containerRef}
        style={{ height, width: "100%" }}
      />
    </div>
  );
}
