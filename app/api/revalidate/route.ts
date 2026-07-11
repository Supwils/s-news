import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";

/**
 * Token-protected on-demand revalidation. POST only — it mutates cache state,
 * so it must not be reachable by a prefetch or an <img> tag.
 *
 * Usage:
 *   # whole route tree, both locales
 *   curl -X POST "$SITE_URL/api/revalidate?token=$REVALIDATE_TOKEN"
 *   # one or more specific paths
 *   curl -X POST "$SITE_URL/api/revalidate?path=/news/finance&token=$REVALIDATE_TOKEN"
 *
 * The daily job (scripts/daily-news-and-commit.sh) pushes to git and lets Vercel
 * redeploy, so it does not call this. This endpoint exists for the case where
 * content lands without a deploy.
 */
export const dynamic = "force-dynamic";

/**
 * Fresh markdown changes far more than the home page: the topic pages, the
 * month archives, every detail page, and the sitemap are all `force-static`.
 * Revalidating the root as a layout invalidates the whole route tree in one
 * call, which is what "picks up new content without a full redeploy" requires.
 */
const DEFAULT_LAYOUT_PATHS = ["/", "/en"];

function isAuthorized(provided: string | null) {
  const expected = process.env.REVALIDATE_TOKEN;
  if (!expected) return false;
  if (!provided) return false;
  // Constant-time compare to avoid timing leaks.
  if (provided.length !== expected.length) return false;
  let mismatch = 0;
  for (let i = 0; i < provided.length; i += 1) {
    mismatch |= provided.charCodeAt(i) ^ expected.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function POST(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");

  if (!isAuthorized(token)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  const explicitPaths = url.searchParams.getAll("path");

  if (explicitPaths.length > 0) {
    for (const target of explicitPaths) {
      revalidatePath(target);
    }
    return NextResponse.json({ ok: true, revalidated: explicitPaths, at: Date.now() });
  }

  for (const target of DEFAULT_LAYOUT_PATHS) {
    revalidatePath(target, "layout");
  }

  return NextResponse.json({ ok: true, revalidated: DEFAULT_LAYOUT_PATHS, scope: "layout", at: Date.now() });
}
