"use client";

import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatMoney } from "@/lib/money";

type GiftCode = {
  id: string;
  code: string;
  amount: number;
  max_uses: number;
  uses: number;
  note: string | null;
  active: boolean;
};

export function AdminGifts() {
  const [codes, setCodes] = useState<GiftCode[]>([]);
  const [amount, setAmount] = useState("");
  const [code, setCode] = useState("");
  const [uses, setUses] = useState("1");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    const res = await fetch("/api/admin/gifts", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { codes: GiftCode[] };
    setCodes(data.codes);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function create() {
    setBusy(true);
    const res = await fetch("/api/admin/gifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount: Number(amount),
        code,
        max_uses: Number(uses),
        note,
      }),
    });
    const data = (await res.json()) as { error?: string; code?: string };
    setBusy(false);
    if (!res.ok) {
      toast.error(data.error ?? "Could not create the code");
      return;
    }
    toast.success(`Gift code ${data.code} is ready`);
    setAmount("");
    setCode("");
    setNote("");
    await load();
  }

  async function toggle(row: GiftCode) {
    const res = await fetch("/api/admin/gifts", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: row.id, active: !row.active }),
    });
    if (!res.ok) {
      toast.error("Could not update the code");
      return;
    }
    await load();
  }

  return (
    <div className="space-y-3">
      <div className="app-card space-y-3 p-4">
        <h3 className="text-sm font-bold">New gift code</h3>
        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label htmlFor="gift-amount">Amount</Label>
            <Input id="gift-amount" inputMode="numeric" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="gift-uses">Uses</Label>
            <Input id="gift-uses" inputMode="numeric" value={uses} onChange={(e) => setUses(e.target.value)} />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="gift-code">Code</Label>
          <Input
            id="gift-code"
            value={code}
            placeholder="Leave blank to generate one"
            onChange={(e) => setCode(e.target.value.toUpperCase())}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="gift-note">Note</Label>
          <Input id="gift-note" value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
        <Button className="w-full" disabled={busy || !amount} onClick={() => void create()}>
          {busy ? "Creating…" : "Create gift code"}
        </Button>
      </div>

      {codes.map((row) => (
        <div key={row.id} className="app-card flex items-center justify-between gap-3 p-4">
          <div className="min-w-0">
            <p className="font-display text-lg font-bold tracking-[0.12em]">{row.code}</p>
            <p className="text-xs text-muted-foreground">
              {formatMoney(row.amount)} · {row.uses}/{row.max_uses} used
              {row.note ? ` · ${row.note}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => void toggle(row)}
            className={`chip shrink-0 px-3 py-1.5 text-xs ${row.active ? "chip-good" : "chip-off"}`}
          >
            {row.active ? "Live" : "Off"}
          </button>
        </div>
      ))}
    </div>
  );
}
