import type { ReactNode } from "react";
import { Logo } from "@/components/brand";
import { ThemeToggle } from "@/components/theme";

/** Sign-in card: a blue band, a white mark, then the form. Nothing else. */
export function AuthFrame({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-10">
      <ThemeToggle className="fixed right-3 top-3 text-muted-foreground hover:text-foreground" />
      <div className="w-full max-w-[420px] overflow-hidden rounded-[22px] bg-card shadow-lift">
        <div className="flex h-24 items-end justify-center bg-primary">
          <span className="mb-[-22px]">
            <Logo size={64} className="shadow-soft" />
          </span>
        </div>
        <div className="px-6 pb-7 pt-10">
          <h1 className="text-center text-xl font-semibold tracking-tight">{title}</h1>
          {subtitle ? (
            <p className="mt-1 text-center text-[13px] text-muted-foreground">{subtitle}</p>
          ) : null}
          <div className="mt-6">{children}</div>
          {footer ? <div className="mt-5 text-center text-sm text-muted-foreground">{footer}</div> : null}
        </div>
      </div>
    </div>
  );
}
