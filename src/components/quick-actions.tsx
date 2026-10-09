"use client";

import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Bot,
  CalendarCheck,
  Download,
  Gift,
  History,
  Package,
} from "@/components/icons";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { BRAND_NAME } from "@/lib/platform";

const ACTIONS = [
  { href: "/deposit", label: "Recharge", icon: ArrowDownToLine },
  { href: "/withdraw", label: "Withdraw", icon: ArrowUpFromLine },
  { href: "/products", label: "Products", icon: Bot, accent: true },
  { href: "/transfer", label: "Transfer", icon: ArrowLeftRight },
  { href: "/records", label: "Records", icon: History },
  { href: "/orders", label: "Revenue", icon: Package },
  { href: "/gifts", label: "Gift codes", icon: Gift },
  { href: "/check-in", label: "Check in", icon: CalendarCheck },
] as const;

/** Shortcuts under the balance. Products is the only yellow one. */
export function QuickActions() {
  const { install, iosHelp, setIosHelp } = usePwaInstall();

  return (
    <>
      <nav aria-label="Quick actions" className="grid grid-cols-3 gap-x-2 gap-y-4">
        {ACTIONS.map(({ href, label, icon: Icon, ...rest }) => {
          const accent = "accent" in rest && rest.accent;
          return (
            <Link key={href} href={href} className="flex flex-col items-center gap-2">
              <span
                className={`flex size-12 items-center justify-center rounded-2xl ${
                  accent
                    ? "bg-gold text-[#0B1F4B]"
                    : "bg-card text-primary shadow-[inset_0_0_0_1px_var(--border)]"
                }`}
              >
                <Icon className="size-5" />
              </span>
              <span className="text-center text-[11px] font-semibold leading-tight">{label}</span>
            </Link>
          );
        })}
        <button type="button" onClick={() => void install()} className="flex flex-col items-center gap-2">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-card text-primary shadow-[inset_0_0_0_1px_var(--border)]">
            <Download className="size-5" />
          </span>
          <span className="text-center text-[11px] font-semibold leading-tight">Download app</span>
        </button>
      </nav>
      {iosHelp ? (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 pb-28">
          <div className="app-card w-full max-w-[560px] space-y-3 p-5">
            <h2 className="text-lg font-semibold">Add {BRAND_NAME} to your home screen</h2>
            <p className="text-sm text-muted-foreground">
              On iPhone or iPad, tap the Share button in Safari, then tap{" "}
              <span className="font-semibold text-foreground">Add to Home Screen</span>.
            </p>
            <button
              type="button"
              className="h-11 w-full rounded-[14px] bg-primary text-[15px] font-semibold text-primary-foreground"
              onClick={() => setIosHelp(false)}
            >
              Got it
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}
