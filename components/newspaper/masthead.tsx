"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useEffect, useRef, type CSSProperties } from "react";

import { isTopicKey } from "@/lib/news-meta";

import { useLocale } from "@/components/locale-context";
import { LocaleSwitch } from "@/components/locale-switch";
import { MobileDrawer } from "@/components/newspaper/mobile-drawer";
import { ThemeSwitch } from "@/components/theme-switch";
import { localizePath } from "@/lib/locale-routing";
import { prefetchPagefind } from "@/lib/pagefind-client";
import { useShortcutLabel } from "@/lib/use-shortcut-label";

const WEEKDAYS_EN = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTHS_EN = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];

type NavRoute = "today" | "archive" | "weekly" | "events" | "topics" | "about" | null;

/**
 * The newest digest date, resolved at build time from the generated index (see
 * next.config.ts). Pages without an issue of their own (about, search, runtime,
 * 404) stamp this instead of reading the wall clock during render — which used
 * to bake the build date into `force-static` HTML and mismatch on hydration.
 */
const LATEST_ISSUE_DATE = process.env.NEXT_PUBLIC_LATEST_ISSUE_DATE ?? "";

type MastheadProps = {
  /** Which nav item to mark as active. `null` = no active item (e.g. detail page). */
  active?: NavRoute;
  /** Date used for the mono stamp. Falls back to the latest issue's date. */
  date?: string;
  /** Archive month for the "Archive" link (YYYY-MM). Defaults to the latest issue's month. */
  archiveMonth?: string;
  /**
   * Click handler for the search button. If provided (e.g. on the home page),
   * opens the in-page SearchModal. Otherwise the button links to `/search`.
   */
  onSearchClick?: () => void;
};

function formatStamp(date: string) {
  const [year, month, day] = date.split("-").map(Number);
  if (!year || !month || !day) return "";
  const d = new Date(Date.UTC(year, month - 1, day));
  const weekday = WEEKDAYS_EN[d.getUTCDay()];
  const monthLabel = MONTHS_EN[month - 1];
  const dayStr = String(day).padStart(2, "0");
  const monthStr = String(month).padStart(2, "0");
  return `${weekday} · ${monthLabel} ${dayStr} · ${year} · ISSUE № ${year}.${monthStr}.${dayStr}`;
}

export function NewspaperMasthead({
  active = null,
  date,
  archiveMonth,
  onSearchClick,
}: MastheadProps) {
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  const shortcutLabel = useShortcutLabel();
  const stampDate = date ?? LATEST_ISSUE_DATE;
  const stamp = stampDate ? formatStamp(stampDate) : "";
  const archiveTarget = archiveMonth ?? (stampDate ? stampDate.slice(0, 7) : null);
  const archiveHref = localizePath(archiveTarget ? `/archive/${archiveTarget}` : "/", locale);
  const homeHref = localizePath("/", locale);
  const topicsHref = localizePath("/#topics", locale);
  const aboutHref = localizePath("/about", locale);
  const weeklyHref = localizePath("/weekly", locale);
  const eventsHref = localizePath("/events", locale);
  const searchHref = localizePath("/search", locale);

  const handleSearchClick = () => {
    if (onSearchClick) {
      onSearchClick();
      return;
    }
    // If we're on a /news/<topic>/<date> page, pre-fill the topic facet so
    // search context follows the user.
    const seg = (pathname ?? "").replace(/^\/en/, "").split("/").filter(Boolean);
    const topicFromPath = seg[0] === "news" && seg[1] && isTopicKey(seg[1]) ? seg[1] : null;
    const url = topicFromPath
      ? `${searchHref}?topic=${encodeURIComponent(topicFromPath)}`
      : searchHref;
    router.push(url);
  };

  // Site-wide ⌘K / Ctrl+K. Lives on the masthead because it's rendered on
  // every route — keeps a single source of truth. Stable ref pattern lets the
  // listener (mounted once) always call the latest handler without re-binding.
  const handlerRef = useRef(handleSearchClick);
  useEffect(() => {
    handlerRef.current = handleSearchClick;
  });
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        handlerRef.current();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Warmup: pre-fetch the Pagefind runtime on idle so the first search opens
  // instantly. Skips the network round-trip when the user finally hits ⌘K.
  useEffect(() => {
    const idle =
      (window as Window & { requestIdleCallback?: (cb: () => void) => number })
        .requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    const handle = idle(() => prefetchPagefind());
    return () => {
      const cancel = (
        window as Window & { cancelIdleCallback?: (h: number) => void }
      ).cancelIdleCallback;
      if (cancel && typeof handle === "number") cancel(handle);
    };
  }, []);

  return (
    <header
      style={{
        background: "var(--color-surface)",
        borderBottom: "1px solid var(--color-border)",
        padding: "14px 40px",
      }}
    >
      <div
        className="mx-auto flex w-full flex-wrap items-baseline justify-between"
        style={{ maxWidth: 1280, gap: 16 }}
      >
        <div className="flex items-baseline" style={{ gap: 16 }}>
          <Link href={homeHref} className="np-serif" style={wordmark}>
            Swil-News
          </Link>
          {stamp ? (
            <span className="np-mono" style={stampStyle}>
              {stamp}
            </span>
          ) : null}
        </div>

        <nav className="np-nav-hide flex items-center" style={{ gap: 20 }}>
          <NavItem href={homeHref} active={active === "today"}>
            {locale === "zh" ? "今日" : "Today"}
          </NavItem>
          <NavItem href={archiveHref} active={active === "archive"}>
            {locale === "zh" ? "归档" : "Archive"}
          </NavItem>
          <NavItem href={weeklyHref} active={active === "weekly"}>
            {locale === "zh" ? "周报" : "Weekly"}
          </NavItem>
          <NavItem href={eventsHref} active={active === "events"}>
            {locale === "zh" ? "事件" : "Events"}
          </NavItem>
          <NavItem href={topicsHref} active={active === "topics"}>
            {locale === "zh" ? "主题" : "Topics"}
          </NavItem>
          <NavItem href={aboutHref} active={active === "about"}>
            {locale === "zh" ? "关于" : "About"}
          </NavItem>
          <button
            type="button"
            className="np-masthead-search"
            onClick={handleSearchClick}
            aria-label={locale === "zh" ? "搜索日报" : "Search digests"}
            aria-keyshortcuts="Meta+K Control+K"
            title={locale === "zh" ? `搜索 (${shortcutLabel})` : `Search (${shortcutLabel})`}
          >
            <Search size={14} aria-hidden />
          </button>
          <span
            className="np-mono"
            style={{ ...stampStyle, letterSpacing: "0.06em", marginLeft: 4, marginRight: 4 }}
            aria-hidden
          >
            ·
          </span>
          <LocaleSwitch />
          <ThemeSwitch />
        </nav>

        <div className="np-nav-show-mobile">
          <button
            type="button"
            className="np-masthead-search"
            onClick={handleSearchClick}
            aria-label={locale === "zh" ? "搜索日报" : "Search digests"}
            aria-keyshortcuts="Meta+K Control+K"
            title={locale === "zh" ? `搜索 (${shortcutLabel})` : `Search (${shortcutLabel})`}
          >
            <Search size={16} aria-hidden />
          </button>
          <MobileDrawer
            homeHref={homeHref}
            archiveHref={archiveHref}
            weeklyHref={weeklyHref}
            eventsHref={eventsHref}
            topicsHref={topicsHref}
            aboutHref={aboutHref}
            searchHref={searchHref}
            active={active}
          />
        </div>
      </div>
    </header>
  );
}

function NavItem({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="np-sans"
      style={{
        fontSize: 13,
        color: active ? "var(--color-text-primary)" : "var(--color-text-secondary)",
        textDecoration: active ? "underline" : "none",
        textUnderlineOffset: 6,
        textDecorationThickness: 1,
      }}
    >
      {children}
    </Link>
  );
}

const wordmark: CSSProperties = {
  fontSize: 26,
  fontWeight: 700,
  letterSpacing: "-0.02em",
  color: "var(--color-text-primary)",
  lineHeight: 1,
};

const stampStyle: CSSProperties = {
  fontSize: 11,
  letterSpacing: "0.08em",
  color: "var(--color-text-muted)",
};
