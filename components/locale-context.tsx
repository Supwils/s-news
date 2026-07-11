"use client";

import { usePathname } from "next/navigation";
import { createContext, useContext, useEffect, useMemo, type ReactNode } from "react";

import type { Locale } from "@/data/copy";
import { detectLocaleFromPath } from "@/lib/locale-routing";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
};

const LocaleContext = createContext<LocaleContextValue>({
  locale: "zh",
  setLocale: () => {},
});

const STORAGE_KEY = "s-news-locale";
const COOKIE_NAME = "s-news-locale";

function syncLocaleOnDocument(locale: Locale) {
  if (typeof document === "undefined") return;
  document.documentElement.lang = locale === "en" ? "en-US" : "zh-CN";
}

function persistLocalePreference(locale: Locale) {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=${locale}; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
  window.localStorage.setItem(STORAGE_KEY, locale);
}

/**
 * The route decides the locale — `/en/*` is English, everything else Chinese.
 *
 * Deriving it from the pathname rather than from a prop is what makes nesting
 * safe. The root layout used to render a zh provider around the /en layout's en
 * provider; React flushes child effects before parent effects, so the zh one ran
 * last and overwrote `document.lang`, the locale cookie, and localStorage on
 * every English page.
 */
export function LocaleProvider({
  children,
  initialLocale = "zh",
}: {
  children: ReactNode;
  /** Fallback for rendering contexts where no pathname is available. */
  initialLocale?: Locale;
}) {
  const pathname = usePathname();
  const locale: Locale = pathname ? detectLocaleFromPath(pathname) : initialLocale;

  useEffect(() => {
    syncLocaleOnDocument(locale);
    persistLocalePreference(locale);
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      // Navigating to the other locale's route is what actually switches the
      // locale. Writing the preference here only makes it survive the hop, for
      // server components that read the cookie (the 404 page).
      setLocale: persistLocalePreference,
    }),
    [locale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): Locale {
  return useContext(LocaleContext).locale;
}

export function useSetLocale() {
  return useContext(LocaleContext).setLocale;
}
