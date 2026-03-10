import { cookies } from "next/headers";

import type { Locale } from "@/data/copy";

const COOKIE_NAME = "s-news-locale";

/**
 * Read locale from cookie in Server Components / route handlers.
 * Defaults to "zh" when missing or invalid.
 */
export async function getLocaleFromCookie(): Promise<Locale> {
  try {
    const cookieStore = await cookies();
    const value = cookieStore.get(COOKIE_NAME)?.value;
    if (value === "zh" || value === "en") return value;
  } catch {
    // cookies() may throw in edge or during static generation
  }
  return "zh";
}
