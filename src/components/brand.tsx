import Image from "next/image";
import Link from "next/link";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/platform";
import { cn } from "@/lib/utils";

export function Logo({ size = 40, className }: { size?: number; className?: string }) {
  return (
    <span
      className={cn("relative inline-flex overflow-hidden rounded-2xl bg-[#061433]", className)}
      style={{ width: size, height: size }}
    >
      <Image
        src="/brand/logo.jpg"
        alt={BRAND_NAME}
        fill
        sizes={`${size}px`}
        className="object-cover"
      />
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
