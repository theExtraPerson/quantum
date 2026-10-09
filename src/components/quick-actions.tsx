"use client";

import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowLeftRight,
  ArrowUpFromLine,
  Bot,
  History,
  Package,
} from "@/components/icons";

const ACTIONS = [
  { href: "/deposit", label: "Recharge", icon: ArrowDownToLine },
  { href: "/withdraw", label: "Withdraw", icon: ArrowUpFromLine },
  { href: "/products", label: "Products", icon: Bot, accent: true },
  { href: "/transfer", label: "Transfer", icon: ArrowLeftRight },
  { href: "/records", label: "Records", icon: History },
  { href: "/orders", label: "Revenue", icon: Package },
] as const;

/** Shortcuts under the balance. Products is the only yellow one. */
export function QuickActions() {
  return (
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
    </nav>
  );
}
