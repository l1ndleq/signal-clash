/**
 * Tradable markets and their data-source mappings.
 *
 * - `binanceSymbol` drives the real price feed (REST seed + WS stream) used for
 *   scoring round outcomes.
 * - `tvSymbol` drives the visual TradingView Advanced Chart widget.
 * - `fallbackPrice` seeds the feed before the first quote arrives (and is used
 *   if Binance is unreachable, e.g. geo-blocked).
 */

import type { Market } from "./types";

export interface MarketConfig {
  label: Market;
  base: string;
  binanceSymbol: string;
  tvSymbol: string;
  fallbackPrice: number;
  priceDecimals: number;
}

export const MARKETS: Record<Market, MarketConfig> = {
  "SOL/USD": {
    label: "SOL/USD",
    base: "SOL",
    binanceSymbol: "SOLUSDT",
    tvSymbol: "BINANCE:SOLUSDT",
    fallbackPrice: 150,
    priceDecimals: 2,
  },
  "BTC/USD": {
    label: "BTC/USD",
    base: "BTC",
    binanceSymbol: "BTCUSDT",
    tvSymbol: "BINANCE:BTCUSDT",
    fallbackPrice: 65000,
    priceDecimals: 1,
  },
  "ETH/USD": {
    label: "ETH/USD",
    base: "ETH",
    binanceSymbol: "ETHUSDT",
    tvSymbol: "BINANCE:ETHUSDT",
    fallbackPrice: 3500,
    priceDecimals: 2,
  },
};

export const MARKET_LIST = Object.keys(MARKETS) as Market[];

export function formatPrice(price: number, market: Market): string {
  const decimals = MARKETS[market]?.priceDecimals ?? 2;
  return price.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
