"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { transferToRecharge } from "@/app/actions";
import { useEarnings, useSessionUser } from "@/hooks/use-app-data";
import { formatMoney } from "@/lib/money";

export default function TransferPage() {
  const qc = useQueryClient();
  const { user } = useSessionUser();
  const { data: earnings } = useEarnings(user?.id);
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const available = Number(earnings?.available ?? 0);

  async function submit() {
    const value = Math.round(Number(amount));
    if (!Number.isFinite(value) || value <= 0) {
      toast.error("Enter an amount to transfer");
      return;
    }
    if (value > available) {
      toast.error("Amount is more than your available balance");
      return;
    }
    setBusy(true);
    const { error } = await transferToRecharge(value);
    setBusy(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(`${formatMoney(value)} is now in your recharge wallet`);
    setAmount("");
    await qc.invalidateQueries();
  }

  return (
    <AppShell title="Transfer" back="/">
      <div className="space-y-4 px-4 py-4">
        <div className="grid grid-cols-2 gap-2">
          <div className="app-card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Available
            </p>
            <p className="mt-1 font-display text-xl font-bold">{formatMoney(available)}</p>
          </div>
          <div className="app-card p-4">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              Recharge
            </p>
            <p className="mt-1 font-display text-xl font-bold text-primary">
              {formatMoney(earnings?.recharge ?? 0)}
            </p>
          </div>
        </div>

        <div className="app-card space-y-4 p-4">
          <p className="text-sm text-muted-foreground">
            Move earnings into the recharge wallet. Products are activated from recharge. Withdrawals
            stay on the available balance.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              inputMode="numeric"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
            />
          </div>
          <Button className="w-full" size="lg" disabled={busy} onClick={() => void submit()}>
            {busy ? "Transferring…" : "Transfer to recharge"}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
