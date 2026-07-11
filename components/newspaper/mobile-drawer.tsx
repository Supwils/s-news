"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

import { useLocale } from "@/components/locale-context";
import { LocaleSwitch } from "@/components/locale-switch";
import { ThemeSwitch } from "@/components/theme-switch";
import { localizePath } from "@/lib/locale-routing";

type MobileDrawerProps = {
  homeHref: string;
  archiveHref: string;
  weeklyHref: string;
  eventsHref: string;
  topicsHref: string;
  aboutHref: string;
  searchHref: string;
  active: "today" | "archive" | "weekly" | "events" | "topics" | "about" | "search" | null;
};

export function MobileDrawer({
  homeHref,
  archiveHref,
  weeklyHref,
  eventsHref,
  topicsHref,
  aboutHref,
  searchHref,
  active,
}: MobileDrawerProps) {
  const locale = useLocale();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const items: Array<{ href: string; key: typeof active; label: string }> = [
    { href: homeHref, key: "today", label: locale === "zh" ? "今日" : "Today" },
    { href: searchHref, key: "search", label: locale === "zh" ? "搜索" : "Search" },
    { href: archiveHref, key: "archive", label: locale === "zh" ? "归档" : "Archive" },
    { href: weeklyHref, key: "weekly", label: locale === "zh" ? "周报" : "Weekly" },
    { href: eventsHref, key: "events", label: locale === "zh" ? "事件" : "Events" },
    { href: topicsHref, key: "topics", label: locale === "zh" ? "主题" : "Topics" },
    { href: aboutHref, key: "about", label: locale === "zh" ? "关于" : "About" },
  ];

  return (
    <>
      <button
        type="button"
        className="np-mobile-trigger"
        aria-label={locale === "zh" ? "打开菜单" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <Menu size={18} />
      </button>

      {open ? (
        <>
          <div
            className="np-drawer-scrim"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside
            className="np-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={locale === "zh" ? "导航" : "Navigation"}
          >
            <div className="np-drawer-head">
              <span className="np-serif" style={{ fontSize: 22, fontWeight: 700 }}>
                Swil-News
              </span>
              <button
                type="button"
                className="np-utility-btn"
                aria-label={locale === "zh" ? "关闭" : "Close"}
                onClick={() => setOpen(false)}
              >
                <X size={16} />
              </button>
            </div>

            <nav className="np-drawer-nav">
              {items.map((item) => (
                <Link
                  key={item.key}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className="np-drawer-link"
                  data-active={active === item.key || undefined}
                >
                  {item.label}
                </Link>
              ))}
            </nav>

            <div className="np-drawer-foot">
              <LocaleSwitch />
              <ThemeSwitch />
            </div>
          </aside>
        </>
      ) : null}
    </>
  );
}

export function buildDrawerHrefs(locale: "zh" | "en", archiveMonth: string) {
  return {
    homeHref: localizePath("/", locale),
    archiveHref: localizePath(`/archive/${archiveMonth}`, locale),
    weeklyHref: localizePath("/weekly", locale),
    eventsHref: localizePath("/events", locale),
    topicsHref: localizePath("/#topics", locale),
    aboutHref: localizePath("/about", locale),
    searchHref: localizePath("/search", locale),
  };
}
