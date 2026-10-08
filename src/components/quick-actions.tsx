import Link from "next/link";
import { ArrowDownToLine, ArrowUpFromLine, Bot, Share2 } from "@/components/icons";

const ACTIONS = [
  { href: "/deposit", label: "Deposit", icon: ArrowDownToLine },
  { href: "/withdraw", label: "Withdraw", icon: ArrowUpFromLine },
  { href: "/products", label: "Products", icon: Bot, accent: true },
  { href: "/invite", label: "Invite", icon: Share2 },
] as const;

/** Four shortcuts under the balance. Products is the only yellow one. */
export function QuickActions() {
  return (
    <nav aria-label="Quick actions" className="grid grid-cols-4 gap-2">
      {ACTIONS.map(({ href, label, icon: Icon, ...rest }) => {
        const accent = "accent" in rest && rest.accent;
        return (
          <Link key={href} href={href} className="flex flex-col items-center gap-2 py-1">
            <span
              className={`flex size-12 items-center justify-center rounded-2xl ${
                accent ? "bg-gold text-[#0B1F4B]" : "bg-card text-primary shadow-[inset_0_0_0_1px_var(--border)]"
              }`}
            >
              <Icon className="size-5" />
            </span>
            <span className="text-[11px] font-semibold">{label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
