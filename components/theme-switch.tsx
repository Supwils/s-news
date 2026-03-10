"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { Monitor, Moon, Sun } from "lucide-react";

import { useLocale } from "@/components/locale-context";
import { getCopy } from "@/data/copy";

const STORAGE_KEY = "s-news-theme";
type Theme = "light" | "dark" | "system";

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "system";
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw === "light" || raw === "dark" || raw === "system") return raw;
  return "system";
}

function applyTheme(theme: Theme) {
  const root = document.documentElement;
  if (theme === "system") {
    root.removeAttribute("data-theme");
    return;
  }
  root.setAttribute("data-theme", theme);
}

function resolveEffectiveTheme(theme: Theme): "light" | "dark" {
  if (theme === "light") return "light";
  if (theme === "dark") return "dark";
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

const THEME_ORDER: Theme[] = ["light", "dark", "system"];

function subscribeToHydration() {
  return () => {};
}

function ThemeButton({
  theme,
  setTheme,
  mounted,
  themeLabels,
  ariaLabelFn,
}: {
  theme: Theme;
  setTheme: (t: Theme) => void;
  mounted: boolean;
  themeLabels: Record<Theme, string>;
  ariaLabelFn: (label: string) => string;
}) {
  const cycleTheme = useCallback(() => {
    const next = THEME_ORDER[(THEME_ORDER.indexOf(theme) + 1) % THEME_ORDER.length];
    applyTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
    setTheme(next);
  }, [theme, setTheme]);

  const effective = mounted ? resolveEffectiveTheme(theme) : "light";
  const Icon = effective === "dark" ? Moon : effective === "light" ? Sun : Monitor;

  if (!mounted) {
    return (
      <div
        className="h-10 w-10 rounded-full border border-(--color-border) bg-(--color-surface) opacity-0 sm:h-11 sm:w-11 md:h-12 md:w-12"
        aria-hidden
      />
    );
  }

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className="flex h-10 w-10 min-w-10 cursor-pointer items-center justify-center rounded-full border border-(--color-border) bg-[color-mix(in_srgb,var(--color-surface)_90%,transparent)] text-(--color-text-primary) shadow-(--shadow-card) backdrop-blur-md transition-[transform,color,border-color,box-shadow] duration-200 hover:scale-105 hover:border-(--color-border-strong) hover:shadow-(--shadow-card-hover) focus:outline-none focus:ring-2 focus:ring-(--color-border-strong) focus:ring-offset-2 focus:ring-offset-(--color-bg-primary) active:scale-[0.98] sm:h-11 sm:w-11 md:h-12 md:w-12"
      aria-label={ariaLabelFn(themeLabels[theme])}
      title={themeLabels[theme]}
    >
      <Icon className="h-[18px] w-[18px] sm:h-5 sm:w-5" strokeWidth={1.75} aria-hidden />
    </button>
  );
}

export function ThemeSwitch() {
  const locale = useLocale();
  const copy = getCopy(locale);
  const themeLabels: Record<Theme, string> = {
    light: copy.ui.theme.light,
    dark: copy.ui.theme.dark,
    system: copy.ui.theme.system,
  };
  const [theme, setTheme] = useState<Theme>(() => getStoredTheme());
  const mounted = useSyncExternalStore(subscribeToHydration, () => true, () => false);

  useEffect(() => {
    if (!mounted) return;
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [mounted, theme]);

  return (
    <ThemeButton
      theme={theme}
      setTheme={setTheme}
      mounted={mounted}
      themeLabels={themeLabels}
      ariaLabelFn={copy.ui.theme.ariaLabel}
    />
  );
}
