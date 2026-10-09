"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { redeemGiftCode } from "@/app/actions";
import { formatMoney } from "@/lib/money";

export default function GiftsPage() {
  const qc = useQueryClient();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    const entered = code.trim().toUpperCase();
    if (entered.length < 4) {
      toast.error("Enter a gift code");
      return;
    }
    setBusy(true);
    const { error, amount } = await redeemGiftCode(entered);
    setBusy(false);
    if (error) {
      toast.error(error);
      return;
    }
    toast.success(`${formatMoney(amount)} added to your available balance`);
    setCode("");
    await qc.invalidateQueries();
  }

  return (
    <AppShell title="Gift codes" back="/">
      <div className="space-y-4 px-4 py-4">
        <div className="app-card space-y-4 p-4">
          <p className="text-sm text-muted-foreground">
            Enter a code from QuantumMine AI. The reward is added to your available balance
            immediately.
          </p>
          <div className="space-y-1.5">
            <Label htmlFor="code">Gift code</Label>
            <Input
              id="code"
              value={code}
              autoCapitalize="characters"
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="CODE"
            />
          </div>
          <Button className="w-full" size="lg" disabled={busy} onClick={() => void submit()}>
            {busy ? "Checking…" : "Redeem"}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
