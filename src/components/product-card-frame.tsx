import type { ReactNode } from "react";
import Image from "next/image";
import { PRODUCTS_IMAGE } from "@/lib/platform";

/**
 * Product card shell. The brand image occupies the left edge and softens,
 * then dissolves into the card colour so the details stay readable.
 */
export function ProductCardFrame({ children }: { children: ReactNode }) {
  return (
    <article className="app-card relative overflow-hidden">
      <div className="pointer-events-none absolute inset-y-0 left-0 w-[46%]" aria-hidden>
        <Image
          src={PRODUCTS_IMAGE}
          alt=""
          fill
          sizes="220px"
          className="object-cover object-[center_22%]"
        />
        <div
          className="absolute inset-y-0 right-0 w-[58%] overflow-hidden"
          style={{
            maskImage: "linear-gradient(90deg, transparent 0%, #000 78%)",
            WebkitMaskImage: "linear-gradient(90deg, transparent 0%, #000 78%)",
          }}
        >
          <Image
            src={PRODUCTS_IMAGE}
            alt=""
            fill
            sizes="220px"
            className="scale-110 object-cover object-[center_22%] blur-[5px]"
          />
        </div>
        <div
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(90deg, rgb(6 20 51 / 0.18) 0%, transparent 18%, color-mix(in srgb, var(--card) 40%, transparent) 58%, var(--card) 100%)",
          }}
        />
        <span className="absolute inset-y-5 right-0 w-px bg-gradient-to-b from-transparent via-primary/55 to-transparent" />
      </div>
      <span className="pointer-events-none absolute left-2.5 top-2.5 size-2.5 border-l border-t border-gold/80" />
      <span className="pointer-events-none absolute bottom-2.5 left-2.5 size-2.5 border-b border-l border-primary/40" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-primary via-gold/80 to-transparent" />
      <div className="relative py-3.5 pr-3.5 pl-[44%]">{children}</div>
    </article>
  );
}
