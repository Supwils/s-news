"use client";

import { createContext, useContext, type ReactNode } from "react";

import type { Locale } from "@/data/copy";

const LocaleContext = createContext<Locale>("zh");

export function LocaleProvider({
  initialLocale,
  children,
}: {
  initialLocale: Locale;
  children: ReactNode;
}) {
  return (
    <LocaleContext.Provider value={initialLocale}>
      {children}
    </LocaleContext.Provider>
  );
}

export function useLocale(): Locale {
  return useContext(LocaleContext);
}
