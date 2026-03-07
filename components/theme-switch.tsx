"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Monitor, Moon, Sun } from "lucide-react";

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
const THEME_LABELS: Record<Theme, string> = {
  light: "浅色",
  dark: "深色",
  system: "跟随系统",
};

function ThemeButton({
  theme,
  setTheme,
  mounted,
}: {
  theme: Theme;
  setTheme: (t: Theme) => void;
  mounted: boolean;
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
        className="h-10 w-10 rounded-full border border-[var(--color-border)] bg-[var(--color-surface)] opacity-0 sm:h-11 sm:w-11 md:h-12 md:w-12"
        aria-hidden
      />
    );
  }

  return (
    <button
      type="button"
      onClick={cycleTheme}
      className="flex h-10 w-10 min-w-10 cursor-pointer items-center justify-center rounded-full border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_90%,transparent)] text-[var(--color-text-primary)] shadow-[var(--shadow-card)] backdrop-blur-md transition-[transform,color,border-color,box-shadow] duration-200 hover:scale-105 hover:border-[var(--color-border-strong)] hover:shadow-[var(--shadow-card-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--color-border-strong)] focus:ring-offset-2 focus:ring-offset-[var(--color-bg-primary)] active:scale-[0.98] sm:h-11 sm:w-11 md:h-12 md:w-12"
      aria-label={`主题：${THEME_LABELS[theme]}，点击切换`}
      title={THEME_LABELS[theme]}
    >
      <Icon className="h-[18px] w-[18px] sm:h-5 sm:w-5" strokeWidth={1.75} aria-hidden />
    </button>
  );
}

export function ThemeSwitch() {
  const [theme, setTheme] = useState<Theme>("system");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(getStoredTheme());
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    applyTheme(theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }, [mounted, theme]);

  const button = (
    <div className="fixed right-3 top-3 z-[9999] sm:right-6 sm:top-4 md:top-5" style={{ pointerEvents: "auto" }}>
      <ThemeButton theme={theme} setTheme={setTheme} mounted={mounted} />
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(button, document.body);
}
