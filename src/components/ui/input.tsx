import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Flat field. The focus ring is the only decoration.
 */
export function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "app-panel h-11 w-full px-[15px] text-[15px] text-foreground outline-none placeholder:text-muted-foreground",
        "focus-visible:shadow-[inset_0_0_0_1px_var(--ring)]",
        className,
      )}
      {...props}
    />
  );
}
