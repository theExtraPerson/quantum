"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { AppShell } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { claimCheckIn } from "@/app/actions";
import { useSessionUser } from "@/hooks/use-app-data";
import { formatMoney } from "@/lib/money";
import { CHECKIN_WEEKDAY, CHECKIN_WEEKEND } from "@/lib/platform";
import { createClient, supabaseConfigured } from "@/lib/supabase/client";

type Status = {
  claimed: boolean;
  weekend: boolean;
  reward: number;
  weekday: number;
  weekendReward: number;
};

export default function CheckInPage() {
  const qc = useQueryClient();
  const { user } = useSessionUser();
  const [busy, setBusy] = useState(false);
  const { data: status } = useQuery({
    queryKey: ["checkin", user?.id],
    enabled: supabaseConfigured() && Boolean(user?.id),
    queryFn: async (): Promise<Status | null> => {
      const { data, error } = await createClient().rpc("checkin_status");
      if (error) throw error;
      const payload = (typeof data === "string" ? JSON.parse(data) : data) as Record<string, unknown> | null;
      if (!payload) return null;
      return {
        claimed: Boolean(payload.claimed),
        weekend: Boolean(payload.weekend),
        reward: Number(payload.reward ?? 0),
        weekday: Number(payload.weekday ?? CHECKIN_WEEKDAY),
        weekendReward: Number(payload.weekend_reward ?? CHECKIN_WEEKEND),
      };
    },
  });

  const weekday = status?.weekday ?? CHECKIN_WEEKDAY;
  const weekend = status?.weekendReward ?? CHECKIN_WEEKEND;
  const reward = status?.reward ?? (status?.weekend ? weekend : weekday);
  const claimed = Boolean(status?.claimed);

  async function collect() {
    setBusy(true);
    const result = await claimCheckIn();
    setBusy(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    if (result.already) {
      toast.message("You already collected today's reward");
    } else {
      toast.success(`${formatMoney(result.amount)} added to your available balance`);
    }
    await qc.invalidateQueries();
  }

  return (
    <AppShell title="Check in" back="/">
      <div className="space-y-4 px-4 py-4">
        <div className="app-card space-y-3 p-5 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            {status?.weekend ? "Weekend reward" : "Today's reward"}
          </p>
          <p className="font-display text-4xl font-bold text-primary">{formatMoney(reward)}</p>
          <p className="text-sm text-muted-foreground">
            Weekdays pay {formatMoney(weekday)}. Saturday and Sunday pay {formatMoney(weekend)}.
            One collection per day, Kampala time.
          </p>
          <Button className="w-full" size="lg" disabled={busy || claimed} onClick={() => void collect()}>
            {claimed ? "Collected today" : busy ? "Collecting…" : "Collect"}
          </Button>
        </div>
      </div>
    </AppShell>
  );
}
