"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { Lock } from "@/components/icons";
import { Button } from "@/components/ui/button";
import { activatePlant } from "@/app/actions";
import { formatMoney } from "@/lib/money";
import {
  WEEKEND_CASHBACK_MIN,
  WEEKEND_CASHBACK_RATE,
  payoutClockLabel,
  weekendCashback,
} from "@/lib/platform";
import type { Product } from "@/lib/types";

/** One trading product: a fixed price in, its own daily return, for its own term. */
export function PlantCard({
  product,
  signedIn,
  bonusLocked,
}: {
  product: Product;
  signedIn: boolean;
  bonusLocked: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const qc = useQueryClient();

  const total = Number(product.daily_income) * Number(product.days);
  const price = Number(product.price);
  const cashback = weekendCashback(price);
  const qualifies = price > WEEKEND_CASHBACK_MIN;
  const isBonus = product.category === "bonus";
  const locked = isBonus && bonusLocked;
  const payoutLabel = payoutClockLabel();

  async function activate() {
    if (!signedIn) {
      router.push("/login");
      return;
    }
    if (locked) {
      toast.error("Activate a trading product first to unlock this bonus");
      return;
    }
    setBusy(true);
    const { error, cashback: paid } = await activatePlant(product.id);
    setBusy(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(
      paid
        ? `${product.name} is running. ${formatMoney(paid)} weekend cashback added. First return at ${payoutLabel}.`
        : `${product.name} is running. First return at ${payoutLabel}.`,
    );
    await qc.invalidateQueries();
  }

  return (
    <article className="app-card overflow-hidden">
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <h3 className="font-display text-base font-semibold">{product.name}</h3>
        <span className={`chip ${isBonus ? "chip-good" : "chip-accent"}`}>
          {isBonus ? "BONUS" : qualifies ? "5% WEEKENDS" : "TRADE"}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5 px-4 pb-4">
        <Stat label="ACTIVATE" value={formatMoney(product.price)} />
        <Stat label="DAYS" value={String(product.days)} />
        <Stat label={`DAILY AT ${payoutLabel}`} value={formatMoney(product.daily_income)} accent />
        <Stat label="TOTAL RETURN" value={formatMoney(total)} accent />
      </div>

      {qualifies ? (
        <p className="px-4 pb-3 text-xs text-muted-foreground">
          {cashback > 0
            ? `Weekend cashback today: ${formatMoney(cashback)}.`
            : `On weekends this product returns ${formatMoney(Math.round(price * WEEKEND_CASHBACK_RATE))} cashback.`}
        </p>
      ) : null}

      <div className="px-4 pb-4">
        <Button
          onClick={activate}
          disabled={busy || locked}
          size="lg"
          className="h-12 w-full tracking-[0.1em]"
        >
          {busy ? "Processing…" : locked ? (
            <>
              <Lock className="size-4" />
              Activate a product first
            </>
          ) : (
            "Activate now"
          )}
        </Button>
      </div>
    </article>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="stat-tile">
      <div className="text-[10px] font-medium tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 truncate text-base font-bold ${accent ? "text-primary" : ""}`}>
        {value}
      </div>
    </div>
  );
}
