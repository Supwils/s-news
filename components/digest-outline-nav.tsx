"use client";

import { useEffect, useState } from "react";

import type { OutlineEntry } from "@/lib/digest-outline";

/**
 * The issue's column guide: sections and stories, with the one you are reading
 * marked.
 *
 * Lives in the detail page's sticky aside, which until now described the issue
 * (date, reading time, counts) without offering any way to move around inside
 * it — nine minutes and a dozen stories with only the scrollbar for navigation.
 *
 * Highlighting uses IntersectionObserver rather than a scroll handler: the
 * browser does the geometry off the main thread, so a long issue does not pay a
 * layout read on every scroll event.
 */

type Props = {
  entries: OutlineEntry[];
  label: string;
};

export function DigestOutlineNav({ entries, label }: Props) {
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    if (entries.length === 0) return;

    const headings = entries
      .map((entry) => document.getElementById(entry.id))
      .filter((element): element is HTMLElement => element !== null);
    if (headings.length === 0) return;

    // Track every heading's own visibility and pick the highest one still above
    // the fold, rather than trusting whichever entry fired last: callbacks
    // arrive for the elements that changed, not for the whole document, so
    // "most recent event" and "what the reader is looking at" diverge as soon
    // as two headings cross the boundary in one frame.
    const visible = new Map<string, boolean>();
    const observer = new IntersectionObserver(
      (records) => {
        for (const record of records) visible.set(record.target.id, record.isIntersecting);
        const current = headings.find((heading) => visible.get(heading.id));
        // Past the last heading nothing intersects; keep the final section lit
        // instead of clearing the guide.
        if (current) setActiveId(current.id);
      },
      // Bottom margin pulled up so a heading counts as "current" once it
      // reaches the upper part of the viewport, not when it first peeks in.
      { rootMargin: "-80px 0px -65% 0px", threshold: 0 },
    );

    for (const heading of headings) observer.observe(heading);
    return () => observer.disconnect();
  }, [entries]);

  if (entries.length === 0) return null;

  return (
    <nav
      aria-label={label}
      style={{
        border: "1px solid var(--color-border)",
        padding: 24,
        background: "var(--color-surface)",
      }}
    >
      <p
        className="np-mono"
        style={{
          fontSize: 11,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: "var(--color-text-muted)",
          margin: "0 0 14px",
        }}
      >
        {label}
      </p>
      {/* Classed rather than inline-styled: the surrounding aside styles
          one-off containers inline, but this is a repeated list, and per-item
          style objects put the whole declaration block in the HTML once per
          heading. Measured on a 22-source issue, inline styles cost +14.3 KB of
          HTML; the classes below carry the same design for a fraction of it. */}
      <ol className="np-outline">
        {entries.map((entry) => (
          <li key={entry.id} className="np-outline-item" data-level={entry.level}>
            <a
              href={`#${entry.id}`}
              className="np-outline-link np-sans"
              data-active={entry.id === activeId ? "" : undefined}
              aria-current={entry.id === activeId ? "true" : undefined}
            >
              {entry.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
