"use client";

import { useRouter } from "next/navigation";
import { Languages } from "lucide-react";

import { useLocale } from "@/components/locale-context";

const COOKIE_NAME = "s-news-locale";
const COOKIE_PATH = "/";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

function setLocaleCookie(locale: "zh" | "en") {
  if (typeof document === "undefined") return;
  document.cookie = `${COOKIE_NAME}=${locale}; path=${COOKIE_PATH}; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function LocaleSwitch() {
  const router = useRouter();
  const locale = useLocale();
  const nextLocale = locale === "zh" ? "en" : "zh";

  const label = locale === "zh" ? "中文" : "EN";
  const ariaLabel = locale === "zh" ? "Switch to English" : "切换到中文";

  const handleClick = () => {
    setLocaleCookie(nextLocale);
    router.refresh();
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      aria-label={ariaLabel}
      title={ariaLabel}
      className="flex h-10 w-10 min-w-10 cursor-pointer items-center justify-center rounded-full border border-(--color-border) bg-[color-mix(in_srgb,var(--color-surface)_90%,transparent)] text-(--color-text-primary) shadow-(--shadow-card) backdrop-blur-md transition-[transform,color,border-color,box-shadow] duration-200 hover:scale-105 hover:border-(--color-border-strong) hover:shadow-(--shadow-card-hover) focus:outline-none focus:ring-2 focus:ring-(--color-border-strong) focus:ring-offset-2 focus:ring-offset-(--color-bg-primary) active:scale-[0.98] sm:h-11 sm:w-11 md:h-12 md:w-12">
      <Languages className="h-[18px] w-[18px] sm:h-5 sm:w-5" strokeWidth={1.75} aria-hidden />
      <span className="sr-only">{label}</span>
    </button>
  );
}
