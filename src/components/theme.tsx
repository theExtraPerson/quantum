"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { Moon, Sun } from "@/components/icons";
import { cn } from "@/lib/utils";

export type ThemeName = "light" | "dark";

const STORAGE_KEY = "quantummine_theme";

const ThemeContext = createContext<{ theme: ThemeName; toggle: () => void }>({
  theme: "light",
  toggle: () => {},
});

function readTheme(): ThemeName {
  if (typeof document === "undefined") return "light";
  return document.documentElement.dataset.theme === "dark" ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<ThemeName>("light");

  useEffect(() => {
    setTheme(readTheme());
  }, []);

  function apply(next: ThemeName) {
    document.documentElement.dataset.theme = next;
    document.documentElement.style.colorScheme = next;
    localStorage.setItem(STORAGE_KEY, next);
    setTheme(next);
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle: () => apply(theme === "dark" ? "light" : "dark") }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}

export function ThemeToggle({ className }: { className?: string }) {
  const { theme, toggle } = useTheme();
  const dark = theme === "dark";
  const Icon = dark ? Sun : Moon;
  return (
    <button
      type="button"
      onClick={toggle}
      title="Change theme"
      aria-label="Change theme"
      className={cn("flex size-10 items-center justify-center rounded-xl text-[#aab8c5] hover:text-white", className)}
    >
      <Icon className="size-5" />
    </button>
  );
}
