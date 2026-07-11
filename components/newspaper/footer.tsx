"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { useLocale } from "@/components/locale-context";
import { RuntimeNavLink } from "@/components/runtime-nav-link";
import { localizePath } from "@/lib/locale-routing";

/**
 * When the site was generated, inlined at build time by next.config.ts. Calling
 * `new Date()` here instead put the build timestamp into the prerendered HTML
 * and the visit timestamp into the hydrated tree — a mismatch on every page.
 */
const BUILD_STAMP = formatUtcStamp(process.env.NEXT_PUBLIC_BUILD_TIME);

function formatUtcStamp(isoTimestamp: string | undefined) {
  if (!isoTimestamp) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  const at = new Date(isoTimestamp);
  if (Number.isNaN(at.getTime())) return "";
  return `${at.getUTCFullYear()}-${pad(at.getUTCMonth() + 1)}-${pad(at.getUTCDate())} ${pad(
    at.getUTCHours(),
  )}:${pad(at.getUTCMinutes())} UTC`;
}

type NewspaperFooterProps = {
  /** UTC timestamp for the "GENERATED …" stamp. Accepts any formatted string. */
  generatedAt?: string;
};

export function NewspaperFooter({ generatedAt }: NewspaperFooterProps) {
  const locale = useLocale();
  const stamp = generatedAt ?? BUILD_STAMP;

  const feedHref = localizePath("/feed.xml", locale);
  const aboutHref = localizePath("/about", locale);

  return (
    <footer
      className="np-mono"
      style={{
        marginTop: 40,
        paddingTop: 24,
        borderTop: "1px solid var(--color-border)",
        display: "flex",
        justifyContent: "space-between",
        gap: 16,
        flexWrap: "wrap",
        fontSize: 11,
        letterSpacing: "0.08em",
        color: "var(--color-text-muted)",
      }}
    >
      <span>SWIL-NEWS · LOCAL-FIRST DAILY DIGEST</span>
      <span style={{ display: "flex", gap: 16, flexWrap: "wrap" }}>
        {stamp ? <span>GENERATED {stamp}</span> : null}
        <FooterLink href={feedHref}>RSS</FooterLink>
        <FooterLink href={aboutHref}>ABOUT</FooterLink>
        {/* Runtime is local-only; on a public deployment the nav hides it, so
            the footer must not advertise a route that answers 403. */}
        <RuntimeNavLink href="/runtime" style={{ color: "var(--color-text-secondary)" }}>
          RUNTIME
        </RuntimeNavLink>
      </span>
    </footer>
  );
}

function FooterLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link href={href} style={{ color: "var(--color-text-secondary)" }}>
      {children}
    </Link>
  );
}
