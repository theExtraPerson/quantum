"use client";

import Image from "next/image";
import { AppShell } from "@/components/app-shell";
import { PlantCard } from "@/components/plant-card";
import { useOrders, useProducts, useSessionUser } from "@/hooks/use-app-data";
import { formatMoney } from "@/lib/money";
import { PRODUCTS_IMAGE, WEEKEND_CASHBACK_MIN, isKampalaWeekend, payoutClockLabel } from "@/lib/platform";

export default function ProductsPage() {
  const { user } = useSessionUser();
  const { data: products, isLoading } = useProducts();
  const { data: orders } = useOrders(user?.id);
  const hasProduct = (orders ?? []).some((order) => order.product_category === "product");
  const weekend = isKampalaWeekend();
  const payoutLabel = payoutClockLabel();

  return (
    <AppShell title="Trading products" back="/">
      <div className="space-y-4 px-4 py-4">
        <div className="relative h-52 overflow-hidden rounded-[22px]">
          <Image
            src={PRODUCTS_IMAGE}
            alt=""
            fill
            priority
            sizes="(max-width: 640px) 100vw, 560px"
            className="object-cover object-[center_20%]"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#071433] via-[#0b2f78]/80 to-[#1558c0]/20" />
          <div className="absolute inset-x-0 bottom-0 p-5 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">Products</p>
            <p className="mt-1 font-display text-2xl font-semibold">QM5 to QM1000</p>
            <p className="mt-1 text-xs text-white/80">
              Daily income at {payoutLabel}
              {weekend ? " · weekend cashback is on" : ` · 5% cashback on weekends above ${formatMoney(WEEKEND_CASHBACK_MIN)}`}
            </p>
          </div>
        </div>

        {isLoading ? <p className="text-sm text-muted-foreground">Loading products…</p> : null}

        {!isLoading && !products?.length ? (
          <p className="app-card p-4 text-sm text-muted-foreground">
            Trading products are not available right now.
          </p>
        ) : null}

        {(products ?? []).map((product) => (
          <PlantCard
            key={product.id}
            product={product}
            signedIn={Boolean(user)}
            bonusLocked={!hasProduct}
          />
        ))}
      </div>
    </AppShell>
  );
}
