import Link from "next/link";

import { getCopy } from "@/data/copy";
import { getLocaleFromCookie } from "@/lib/get-locale";

export default async function NotFound() {
  const locale = await getLocaleFromCookie();
  const copy = getCopy(locale);

  return (
    <main className="flex min-h-screen items-center justify-center bg-(--color-bg-primary) px-4 text-(--color-text-primary) sm:px-6">
      <div className="w-full max-w-2xl rounded-[36px] border border-(--color-border) bg-(--color-surface) p-8 text-center shadow-(--shadow-card) sm:p-12">
        <p className="text-sm uppercase tracking-[0.28em] text-(--color-text-muted)">{copy.notFound.badge}</p>
        <h1 className="font-display mt-4 text-4xl leading-none tracking-[-0.04em] sm:text-5xl">
          {copy.notFound.title}
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-(--color-text-secondary) sm:text-base">
          {copy.notFound.body}
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center rounded-full border border-(--color-border-strong) px-5 py-2.5 text-sm font-medium transition hover:bg-(--color-surface-muted)"
        >
          {copy.notFound.backLink}
        </Link>
      </div>
    </main>
  );
}
