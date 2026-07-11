import { notFound } from "next/navigation";

/**
 * Catch-all for unmatched `/en/*` URLs. Without it Next resolves them against
 * the root `app/not-found.tsx`, which renders Chinese copy on an English route.
 * Static segments (`/en/about`, `/en/news/...`, …) still win over this catch-all.
 */
export default function EnglishCatchAll(): never {
  notFound();
}
