import Link from "next/link";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/platform";
import { cn } from "@/lib/utils";

/** Geometric mark. No photograph. */
export function Mark({ size = 36, className }: { size?: number; className?: string }) {
  return (
    <span
      aria-hidden
      className={cn("relative inline-flex items-center justify-center font-display font-bold text-primary", className)}
      style={{ width: size, height: size, fontSize: size * 0.46 }}
    >
      Q
      <span
        className="absolute rounded-full bg-gold"
        style={{ width: size * 0.18, height: size * 0.18, top: size * 0.08, right: size * 0.02 }}
      />
    </span>
  );
}

export function Logo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn("inline-flex items-center justify-center rounded-2xl bg-white shadow-[inset_0_0_0_1px_var(--border)]", className)}
      style={{ width: size, height: size }}
    >
      <Mark size={size * 0.72} />
    </span>
  );
}

export function BrandLockup({
  size = 40,
  tagline = true,
  href = "/",
}: {
  size?: number;
  tagline?: boolean;
  href?: string | null;
}) {
  const content = (
    <span className="flex items-center gap-2.5">
      <Logo size={size} />
      <span className="flex flex-col leading-tight">
        <span className="font-display text-lg font-semibold tracking-tight">{BRAND_NAME}</span>
        {tagline ? (
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
            {BRAND_TAGLINE}
          </span>
        ) : null}
      </span>
    </span>
  );

  if (!href) return content;
  return <Link href={href}>{content}</Link>;
}
