import Link from "next/link";

import { NewspaperFooter } from "@/components/newspaper/footer";
import { NewspaperMasthead } from "@/components/newspaper/masthead";
import { getCopy, type Locale } from "@/data/copy";
import { localizePath } from "@/lib/locale-routing";

export function NotFoundView({ locale }: { locale: Locale }) {
  const copy = getCopy(locale);

  return (
    <div className="np-root">
      <NewspaperMasthead />
      <main className="mx-auto w-full" style={{ maxWidth: 1280, padding: 40 }}>
        <section
          style={{
            padding: "80px 0",
            borderBottom: "1px solid var(--color-border)",
            textAlign: "center",
          }}
        >
          <span
            className="np-mono"
            style={{
              fontSize: 11,
              letterSpacing: "0.24em",
              textTransform: "uppercase",
              color: "var(--np-ink-red)",
              fontWeight: 600,
            }}
          >
            {copy.notFound.badge}
          </span>
          <h1
            className="np-serif"
            style={{
              fontSize: 56,
              lineHeight: 1.02,
              letterSpacing: "-0.02em",
              fontWeight: 600,
              margin: "16px auto 14px",
              color: "var(--color-text-primary)",
              maxWidth: 720,
            }}
          >
            {copy.notFound.title}
          </h1>
          <p
            className="np-serif"
            style={{
              fontStyle: "italic",
              fontSize: 18,
              lineHeight: 1.55,
              color: "var(--color-text-secondary)",
              maxWidth: 640,
              margin: "0 auto 28px",
            }}
          >
            {copy.notFound.body}
          </p>
          <Link href={localizePath("/", locale)} className="np-btn-ghost" style={{ display: "inline-flex" }}>
            {copy.notFound.backLink}
          </Link>
        </section>

        <NewspaperFooter />
      </main>
    </div>
  );
}
