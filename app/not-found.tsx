import { NotFoundView } from "@/components/not-found-view";
import { getLocaleFromCookie } from "@/lib/get-locale";

/**
 * Global 404. Unmatched URLs outside `/en` land here; the visitor's stored
 * preference decides the language. Unmatched `/en/*` URLs are caught by
 * `app/en/[...rest]/page.tsx` and render `app/en/not-found.tsx` instead.
 */
export default async function NotFound() {
  const locale = await getLocaleFromCookie();
  return <NotFoundView locale={locale} />;
}
