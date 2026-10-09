import type { ReactNode } from "react";
import Image from "next/image";
import { PRODUCTS_IMAGE } from "@/lib/platform";

/**
 * Product card: the brand image fills the top, and the details sit on a
 * gradient that covers the bottom of the photo.
 */
export function ProductCardFrame({ children }: { children: ReactNode }) {
  return (
    <article className="app-card relative overflow-hidden">
      <div className="relative h-40">
        <Image
          src={PRODUCTS_IMAGE}
          alt=""
          fill
          sizes="(max-width: 640px) 100vw, 560px"
          className="object-cover object-[center_16%]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-[#061433]/20 via-transparent to-[#061433]/45" />
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-gold/90 to-transparent" />
      </div>
      <div
        className="relative -mt-10 px-3.5 pt-7 pb-3.5"
        style={{
          background: "linear-gradient(180deg, transparent 0%, var(--card) 36px)",
        }}
      >
        {children}
      </div>
    </article>
  );
}
