"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Logo } from "@/components/brand";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Bot,
  Download,
  Headphones,
  History,
  House,
  Info,
  LogOut,
  ChevronLeft,
  Menu,
  Package,
  Share2,
  User,
  Users,
} from "@/components/icons";
import { ThemeToggle } from "@/components/theme";
import { useSessionUser } from "@/hooks/use-app-data";
import { usePwaInstall } from "@/hooks/use-pwa-install";
import { BRAND_NAME } from "@/lib/platform";
import { createClient, supabaseConfigured } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

const MENU = [
  { href: "/", label: "Dashboard", icon: House },
  { href: "/products", label: "Products", icon: Bot },
  { href: "/deposit", label: "Deposit", icon: ArrowDownToLine },
  { href: "/orders", label: "Revenue", icon: Package },
  { href: "/records", label: "Records", icon: History },
  { href: "/withdraw", label: "Withdraw", icon: ArrowUpFromLine },
  { href: "/invite", label: "Invite & Earn", icon: Share2 },
  { href: "/team", label: "Team", icon: Users },
] as const;

const BOTTOM = [
  { href: "/", label: "Home", icon: House },
  { href: "/products", label: "Products", icon: Bot },
  { href: "/invite", label: "Invite", icon: Share2 },
  { href: "/orders", label: "Revenue", icon: Package },
  { href: "/me", label: "Mine", icon: User },
] as const;

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppShell({
  children,
  title,
  back,
  hideNav,
  wide,
}: {
  children: React.ReactNode;
  title?: string;
  back?: string;
  hideNav?: boolean;
  wide?: boolean;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-screen">
      <TopBar title={title} hideNav={hideNav} onMenu={() => setOpen(true)} />
      {hideNav ? null : <SideNav open={open} onClose={() => setOpen(false)} />}
      <div className={cn("mx-auto px-0 pb-28 pt-14", wide ? "max-w-[720px]" : "max-w-[560px]")}>
        {title ? (
          <header className="flex items-center gap-2 px-5 pb-1 pt-4">
            {back ? (
              <Link href={back} className="-ml-1 rounded-full p-1 text-muted-foreground hover:text-foreground">
                <span className="sr-only">Back</span>
                <ChevronLeft className="size-6" />
              </Link>
            ) : null}
            <h1 className="text-xl font-semibold tracking-[-0.015em]">{title}</h1>
          </header>
        ) : null}
        {children}
      </div>
      {hideNav ? null : <BottomNav />}
    </div>
  );
}

function TopBar({
  title,
  hideNav,
  onMenu,
}: {
  title?: string;
  hideNav?: boolean;
  onMenu: () => void;
}) {
  return (
    <header className="fixed inset-x-0 top-0 z-40 h-14 text-[var(--chrome-foreground)]" style={{ background: "var(--chrome)" }}>
      <div className="mx-auto flex h-full max-w-[720px] items-center px-1">
        {hideNav ? (
          <span className="px-3 text-sm font-semibold text-white">{title ?? BRAND_NAME}</span>
        ) : (
          <button
            type="button"
            onClick={onMenu}
            title="Menu"
            aria-label="Menu"
            className="flex size-10 items-center justify-center rounded-xl hover:text-white"
          >
            <Menu className="size-5" />
          </button>
        )}
        {!hideNav ? (
          <nav className="flex min-w-0 flex-1 items-center">
            <TopLink href="/" label="Home" icon={House} />
            <TopLink href="/deposit" label="Deposit" icon={ArrowDownToLine} />
            <TopLink href="/withdraw" label="Withdraw" icon={ArrowUpFromLine} />
            <TopLink href="/products" label="Products" icon={Bot} />
            <TopLink href="/team" label="Team" icon={Users} />
          </nav>
        ) : (
          <span className="flex-1" />
        )}
        <ThemeToggle />
      </div>
    </header>
  );
}

function TopLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: typeof House;
}) {
  const pathname = usePathname();
  const active = isActive(pathname, href);
  return (
    <Link
      href={href}
      title={label}
      aria-label={label}
      className={cn(
        "flex size-10 items-center justify-center rounded-xl",
        active ? "text-white" : "hover:text-white",
      )}
    >
      <Icon className="size-5" />
    </Link>
  );
}

function SideNav({ open, onClose }: { open: boolean; onClose: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useSessionUser();
  const { install, iosHelp, setIosHelp } = usePwaInstall();

  async function signOut() {
    onClose();
    if (!supabaseConfigured()) return;
    await createClient().auth.signOut();
    toast.success("Signed out");
    router.replace("/login");
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        aria-label="Close menu"
        onClick={onClose}
        className={cn(
          "fixed inset-0 z-50 bg-black/45 transition-opacity",
          open ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-[245px] flex-col text-[var(--chrome-foreground)] transition-transform duration-200",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        style={{ background: "var(--chrome)" }}
      >
        <div className="flex items-center gap-2.5 px-5 pb-4 pt-5">
          <Logo size={40} />
          <span className="font-display text-[15px] font-semibold leading-tight text-white">{BRAND_NAME}</span>
        </div>
        <nav className="flex-1 overflow-y-auto px-3 pb-6">
          <p className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">Menu</p>
          {MENU.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
                  active ? "bg-[var(--chrome-active)] font-semibold text-white" : "hover:bg-white/5 hover:text-white",
                )}
              >
                <Icon className="size-[18px]" />
                {label}
              </Link>
            );
          })}
          <p className="mt-5 px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">More</p>
          <Link
            href="/me"
            className={cn(
              "mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm",
              isActive(pathname, "/me") ? "bg-[var(--chrome-active)] font-semibold text-white" : "hover:bg-white/5 hover:text-white",
            )}
          >
            <User className="size-[18px]" />
            My Profile
          </Link>
          <Link href="/support" className="mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-white/5 hover:text-white">
            <Headphones className="size-[18px]" />
            Support
          </Link>
          <Link href="/about" className="mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-white/5 hover:text-white">
            <Info className="size-[18px]" />
            About
          </Link>
          <button
            type="button"
            onClick={() => void install()}
            className="mb-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-white/5 hover:text-white"
          >
            <Download className="size-[18px]" />
            Download app
          </button>
          {user ? (
            <button
              type="button"
              onClick={() => void signOut()}
              className="mb-0.5 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm hover:bg-white/5 hover:text-white"
            >
              <LogOut className="size-[18px]" />
              Logout
            </button>
          ) : (
            <Link href="/login" className="mb-0.5 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm hover:bg-white/5 hover:text-white">
              <LogOut className="size-[18px]" />
              Sign in
            </Link>
          )}
        </nav>
      </aside>
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

function BottomNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/5 text-[var(--chrome-foreground)]"
      style={{ background: "var(--chrome)" }}
    >
      <div className="mx-auto flex max-w-[560px] items-stretch justify-between px-1 py-1.5">
        {BOTTOM.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-w-0 flex-1 flex-col items-center gap-1 px-0.5 py-1.5 text-[10px] font-medium",
                active ? "text-white" : "hover:text-white",
              )}
            >
              <Icon className="size-5" strokeWidth={active ? 2.2 : 1.7} />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="mb-2.5 text-base font-semibold">{children}</h2>;
}
