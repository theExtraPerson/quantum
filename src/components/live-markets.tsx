"use client";

import { useEffect, useState } from "react";

type Market = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  color: string;
  mark: string;
  dir: -1 | 0 | 1;
};

const SEED: Market[] = [
  { symbol: "BTC", name: "Bitcoin", price: 82598, change: -0.54, color: "#f7931a", mark: "₿", dir: 0 },
  { symbol: "ETH", name: "Ethereum", price: 2500.68, change: -2.55, color: "#627eea", mark: "◆", dir: 0 },
  { symbol: "BNB", name: "BNB", price: 742.49, change: -3.4, color: "#f3ba2f", mark: "B", dir: 0 },
  { symbol: "XRP", name: "XRP", price: 1.4, change: -1.09, color: "#7d8b9a", mark: "X", dir: 0 },
  { symbol: "SOL", name: "Solana", price: 110.31, change: -4.11, color: "#14f195", mark: "S", dir: 0 },
];

function formatPrice(price: number) {
  return price.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatChange(change: number) {
  const sign = change > 0 ? "+" : "";
  return `${sign}${change.toFixed(2)}%`;
}

function kampalaClock(date: Date) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "Africa/Kampala",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(date);
}

/** Homepage tape. Prices drift on a timer so the list looks like a live book. */
export function LiveMarkets() {
  const [rows, setRows] = useState(SEED);
  const [clock, setClock] = useState("--:--:--");

  useEffect(() => {
    const tick = () => {
      setClock(kampalaClock(new Date()));
      setRows((current) =>
        current.map((row) => {
          const drift = (Math.random() - 0.48) * row.price * 0.0014;
          const price = Math.max(row.price * 0.82, row.price + drift);
          const change = Math.max(-9.5, Math.min(9.5, row.change + (Math.random() - 0.5) * 0.06));
          return { ...row, price, change, dir: drift >= 0 ? 1 : -1 };
        }),
      );
    };
    tick();
    const id = window.setInterval(tick, 1800);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section aria-label="Live markets">
      <div className="mb-2 flex items-center justify-between px-0.5">
        <p className="flex items-center gap-2 text-sm font-semibold">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400/70" />
            <span className="relative inline-flex size-2 rounded-full bg-emerald-400" />
          </span>
          Live markets
        </p>
        <p className="font-mono text-[11px] tabular-nums text-muted-foreground">{clock}</p>
      </div>
      <div className="app-card divide-y divide-border">
        {rows.map((row) => {
          const up = row.change >= 0;
          return (
            <div key={row.symbol} className="flex items-center gap-3 px-3.5 py-2.5">
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
                style={{ background: row.color, color: row.symbol === "SOL" ? "#06281a" : "#fff" }}
              >
                {row.mark}
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold leading-tight">{row.symbol}/USDT</p>
                <p className="text-[11px] text-muted-foreground">{row.name}</p>
              </div>
              <div className="ml-auto text-right">
                <p
                  className={`text-sm font-semibold tabular-nums ${
                    row.dir > 0 ? "text-emerald-500" : row.dir < 0 ? "text-rose-500" : ""
                  }`}
                >
                  {formatPrice(row.price)}
                </p>
                <p className={`text-[11px] font-semibold tabular-nums ${up ? "text-emerald-500" : "text-rose-500"}`}>
                  {formatChange(row.change)}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
