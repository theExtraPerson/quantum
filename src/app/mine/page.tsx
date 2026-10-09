"use client";

import Link from "next/link";
import { AppShell } from "@/components/app-shell";
import { Bot, Clock, Headphones, Shield, TrendingUp } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { useProducts } from "@/hooks/use-app-data";
import { formatAmount } from "@/lib/money";
import type { Product } from "@/lib/types";

const CATALOG: Pick<Product, "name" | "price" | "daily_income" | "days">[] = [
  { name: "QM5", price: 5000, daily_income: 500, days: 20 },
  { name: "QM10", price: 10000, daily_income: 1000, days: 20 },
  { name: "QM50", price: 50000, daily_income: 4200, days: 21 },
  { name: "QM100", price: 100000, daily_income: 8400, days: 22 },
  { name: "QM150", price: 150000, daily_income: 10500, days: 25 },
  { name: "QM250", price: 250000, daily_income: 21400, days: 26 },
  { name: "QM350", price: 350000, daily_income: 31070, days: 27 },
  { name: "QM500", price: 500000, daily_income: 40400, days: 30 },
  { name: "QM1000", price: 1000000, daily_income: 80800, days: 40 },
];

const FACTS = [
  { icon: Bot, title: "AI powered", text: "Smarter decisions, better results" },
  { icon: Shield, title: "Secure & trusted", text: "Your funds are protected" },
  { icon: Clock, title: "Round the clock", text: "Never misses a trading opportunity" },
  { icon: TrendingUp, title: "Consistent returns", text: "Built for long-term growth" },
  { icon: Headphones, title: "Support team", text: "Here for you every step of the way" },
] as const;

export default function MinePage() {
  const { data: products, isLoading } = useProducts();
  const rows = (products ?? []).filter((product) => product.category === "product" && product.active);
  const table = rows.length ? rows : CATALOG;

  return (
    <AppShell title="Mine">
      <div className="space-y-4 px-4 py-4">
        <section>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">AI trading</p>
          <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">Our trading products</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Powered by sentiment and algorithmic trading. We use artificial intelligence to analyze
            market sentiment and execute high-precision trades for you, 24/7.
          </p>
        </section>

        <div className="app-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] border-collapse text-left">
              <thead>
                <tr className="bg-primary text-[10px] font-semibold uppercase tracking-wider text-white">
                  <th className="px-3 py-2.5 font-semibold">Product</th>
                  <th className="px-3 py-2.5 font-semibold">Price (UGX)</th>
                  <th className="px-3 py-2.5 font-semibold">Daily income</th>
                  <th className="px-3 py-2.5 font-semibold">Duration</th>
                  <th className="px-3 py-2.5 font-semibold">Total income</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && !products ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-sm text-muted-foreground">
                      Loading products…
                    </td>
                  </tr>
                ) : (
                  table.map((product) => {
                    const total = Number(product.daily_income) * Number(product.days);
                    const flagship = product.name === "QM1000";
                    return (
                      <tr
                        key={product.name}
                        className={`border-t border-border text-sm ${flagship ? "bg-gold/15" : ""}`}
                      >
                        <td className="px-3 py-2.5 font-display font-semibold">{product.name}</td>
                        <td className="px-3 py-2.5 tabular-nums">{formatAmount(product.price)}</td>
                        <td className="px-3 py-2.5 font-semibold tabular-nums text-primary">
                          {formatAmount(product.daily_income)}
                        </td>
                        <td className="px-3 py-2.5 tabular-nums">{product.days} days</td>
                        <td className="px-3 py-2.5 font-semibold tabular-nums">{formatAmount(total)}</td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {FACTS.map(({ icon: Icon, title, text }, index) => (
            <div key={title} className={`app-card p-3 ${index === FACTS.length - 1 ? "col-span-2" : ""}`}>
              <Icon className="size-4 text-primary" />
              <p className="mt-2 text-sm font-semibold leading-tight">{title}</p>
              <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>

        <div className="app-card space-y-3 p-4 text-center">
          <p className="font-display text-lg font-semibold">Invest today</p>
          <p className="text-sm text-muted-foreground">And let AI trade for you.</p>
          <Link href="/products">
            <Button className="w-full">See trading products</Button>
          </Link>
        </div>
      </div>
    </AppShell>
  );
}
