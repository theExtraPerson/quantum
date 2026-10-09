"use client";

import Link from "next/link";
import { Clock, Headphones, Megaphone } from "@/components/icons";
import { AppShell } from "@/components/app-shell";
import { QuickActions } from "@/components/quick-actions";
import { WelcomePopup } from "@/components/welcome-popup";
import { Button } from "@/components/ui/button";
import { useAppSettings, useEarnings, useProfile, useSessionUser, useTeamStats } from "@/hooks/use-app-data";
import { formatMoney } from "@/lib/money";
import { timeUntil } from "@/lib/date";
import { REFERRAL_RATES, TELEGRAM_CHANNEL_URL, TELEGRAM_SUPPORT_URL, payoutClockLabel } from "@/lib/platform";

export default function HomePage() {
  const { user } = useSessionUser();
  const { data: profile } = useProfile(user?.id);
  const { data: earnings } = useEarnings(user?.id);
  const { data: team } = useTeamStats(user?.id);
  const { data: settings } = useAppSettings();
  const fromTeam = team?.total_earned ?? earnings?.referralEarned ?? 0;
  const signedIn = Boolean(user);
  const payoutLabel = payoutClockLabel(earnings?.payoutHour ?? settings?.payout_hour);
  const name = profile?.full_name?.split(" ")[0] ?? "Member";
  const channel = settings?.telegram_channel_url || TELEGRAM_CHANNEL_URL;
  const support = settings?.telegram_support_url || TELEGRAM_SUPPORT_URL;

  return (
    <AppShell>
      {settings ? (
        <WelcomePopup
          message={settings.welcome_message}
          channelUrl={settings.telegram_channel_url}
          supportUrl={settings.telegram_support_url}
        />
      ) : null}

      <div className="px-4 pt-5">
        <p className="text-sm text-muted-foreground">{signedIn ? `Hello, ${name}` : "Welcome"}</p>
        <div className="mt-3 overflow-hidden rounded-[22px] bg-card shadow-soft">
          <div className="h-1 bg-gold" />
          <div className="grid grid-cols-2 bg-primary text-white">
            <div className="px-4 py-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/70">
                Recharge
              </p>
              <p className="mt-1 font-display text-[26px] font-bold leading-none">
                {formatMoney(earnings?.recharge ?? 0)}
              </p>
            </div>
            <div className="border-l border-white/15 px-4 py-5">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-white/70">
                Available
              </p>
              <p className="mt-1 font-display text-[26px] font-bold leading-none">
                {formatMoney(earnings?.available ?? 0)}
              </p>
            </div>
          </div>
          {earnings && earnings.reserved > 0 ? (
            <p className="bg-primary px-4 pb-3 text-xs text-white/75">
              {formatMoney(earnings.reserved)} on hold
            </p>
          ) : null}
          {signedIn && earnings ? (
            <div className="grid grid-cols-3 divide-x divide-border">
              <Mini label="Daily" value={formatMoney(earnings.dailyRate)} />
              <Mini label="Active" value={String(earnings.activePlants)} />
              <Link href="/team" className="block px-2 py-3 text-center">
                <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                  Team
                </div>
                <div className="mt-0.5 truncate text-sm font-bold text-primary">{formatMoney(fromTeam)}</div>
              </Link>
            </div>
          ) : null}
        </div>

        <div className="mt-5">
          <QuickActions />
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2">
          <a href={channel} target="_blank" rel="noreferrer">
            <Button variant="secondary" className="w-full">
              <Megaphone className="size-4" />
              Channel
            </Button>
          </a>
          <a href={support} target="_blank" rel="noreferrer">
            <Button variant="secondary" className="w-full">
              <Headphones className="size-4" />
              Support
            </Button>
          </a>
        </div>

        {signedIn && earnings?.nextPayoutAt && earnings.activePlants > 0 ? (
          <p className="mt-4 flex items-center justify-center gap-1.5 text-xs font-semibold text-primary">
            <Clock className="size-3.5" />
            Next return {timeUntil(earnings.nextPayoutAt)} · {payoutLabel}
          </p>
        ) : (
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Returns at {payoutLabel}. Level 1 pays {REFERRAL_RATES[0]}%, level 2 pays {REFERRAL_RATES[1]}%.
          </p>
        )}
      </div>
    </AppShell>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-2 py-3 text-center">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 truncate text-sm font-bold">{value}</div>
    </div>
  );
}
