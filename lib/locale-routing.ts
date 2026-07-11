import type { Locale } from "@/data/copy";

const EN_PREFIX = "/en";

function normalizePath(path: string) {
  return path.startsWith("/") ? path : `/${path}`;
}

export function stripLocalePrefix(path: string) {
  const normalized = normalizePath(path);

  if (normalized === EN_PREFIX) {
    return "/";
  }

  if (normalized.startsWith(`${EN_PREFIX}/`)) {
    return normalized.slice(EN_PREFIX.length);
  }

  return normalized;
}

export function localizePath(path: string, locale: Locale) {
  const basePath = stripLocalePrefix(path);

  if (locale === "en") {
    return basePath === "/" ? EN_PREFIX : `${EN_PREFIX}${basePath}`;
  }

  return basePath;
}

export function detectLocaleFromPath(path: string): Locale {
  const normalized = normalizePath(path);
  return normalized === EN_PREFIX || normalized.startsWith(`${EN_PREFIX}/`) ? "en" : "zh";
}

/**
 * Routes that exist only in the default locale. `/runtime` is a local-only
 * developer tool with no `/en` twin, so switching language there must not
 * navigate into a 404.
 */
const SINGLE_LOCALE_PREFIXES = ["/runtime"];

export function hasLocaleTwin(path: string) {
  const basePath = stripLocalePrefix(path);
  return !SINGLE_LOCALE_PREFIXES.some(
    (prefix) => basePath === prefix || basePath.startsWith(`${prefix}/`),
  );
}

export function switchPathLocale(path: string, locale: Locale) {
  const basePath = stripLocalePrefix(path);
  if (!hasLocaleTwin(basePath)) {
    return localizePath("/", locale);
  }
  return localizePath(basePath, locale);
}
