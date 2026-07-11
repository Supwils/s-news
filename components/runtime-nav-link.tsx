"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

type RuntimeNavLinkProps = {
  href?: string;
  className?: string;
  style?: React.CSSProperties;
  children: React.ReactNode;
};

/**
 * Renders a link to /runtime only when the API allows execution (e.g. localhost).
 * On deployed (e.g. Vercel) runtime is disabled, so the link is hidden and users only see read-only news.
 */
export function RuntimeNavLink({ href = "/runtime", className, style, children }: RuntimeNavLinkProps) {
  const [allowed, setAllowed] = useState<boolean | null>(null);

  useEffect(() => {
    fetch("/api/runtime/generate")
      .then((res) => res.json())
      .then((data) => setAllowed(data.allowed === true))
      .catch(() => setAllowed(false));
  }, []);

  if (allowed !== true) {
    return null;
  }

  return (
    <Link href={href} className={className} style={style}>
      {children}
    </Link>
  );
}
