import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { reparseInlineChildren } from "@/components/news-markdown";
import type { Locale } from "@/data/copy";
import { archiveUrl, type DeadLinks } from "@/lib/link-health";

type NewsMarkdownProps = {
  content: string;
  /** URLs the link checker found unreachable; their links get an archive fallback. */
  deadLinks?: DeadLinks;
  /** This digest's date, used to pick the Wayback snapshot for a dead link. */
  articleDate?: string;
  locale?: Locale;
};

// Structural labels the cursor commands emit. Some legacy digests pack them
// onto the same line as adjacent prose / list items (no blank line around
// them), which CommonMark then folds into a single paragraph or list item.
// We normalize before handing to react-markdown so each label always becomes
// its own block.
const STRUCTURAL_LABEL_GROUP =
  "摘要|链接|简评|总体定性|今日定性|今日小结|Summary|Links?|Commentary|Daily Framing|Today's Summary";
const STRUCTURAL_LABEL = `\\*\\*(?:${STRUCTURAL_LABEL_GROUP})[:：]\\*\\*`;

function normalizeStructuralLabels(content: string): string {
  let out = content;
  // 1) Blank line BEFORE each label so it starts a fresh block, even when
  //    the cursor output glued it onto the end of a list item or paragraph.
  out = out.replace(new RegExp(STRUCTURAL_LABEL, "g"), (match) => `\n\n${match}`);
  // 2) Blank line AFTER each label when it's followed inline by content
  //    (e.g. "**简评：** 这是一段评论…").
  out = out.replace(
    new RegExp(`(${STRUCTURAL_LABEL})[ \\t]+(?=[^\\n])`, "g"),
    "$1\n\n",
  );
  // 3) Blank line AFTER a label that sits on its own line but is immediately
  //    followed by the next non-blank line (e.g. "**链接：**\n- ..."), so a
  //    following list/paragraph is recognized as its own block.
  out = out.replace(
    new RegExp(`(${STRUCTURAL_LABEL})\\n(?!\\n)`, "g"),
    "$1\n\n",
  );
  // 4) Collapse runs of newlines back to at most one blank line.
  out = out.replace(/\n{3,}/g, "\n\n");
  return out;
}

/**
 * Server-rendered article body. Renders the full markdown tree at build time
 * (every news detail page is `force-static`) so `react-markdown` + `remark-gfm`
 * never ship to the client. Do NOT import this from a client component.
 */
export function NewsMarkdown({ content, deadLinks, articleDate, locale = "zh" }: NewsMarkdownProps) {
  const normalized = normalizeStructuralLabels(content);
  const archivedLabel = locale === "en" ? "archived" : "存档";
  const archivedTitle =
    locale === "en"
      ? "Original link is unreachable — opening the Web Archive snapshot instead"
      : "原链接已失效——改为打开 Web Archive 存档快照";
  return (
    <div className="news-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="font-display text-4xl leading-none tracking-[-0.04em] text-(--color-text-primary) sm:text-5xl">
              {reparseInlineChildren(children, false)}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="font-display mt-12 border-t border-(--color-border) pt-8 text-3xl leading-none tracking-[-0.03em] text-(--color-text-primary)">
              {reparseInlineChildren(children, false)}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-8 text-xl leading-8 font-semibold text-(--color-text-primary) sm:text-2xl">
              {reparseInlineChildren(children, false)}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-[15px] leading-8 text-(--color-text-secondary) sm:text-base">
              {reparseInlineChildren(children, false)}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-(--color-text-primary)">{children}</strong>
          ),
          blockquote: ({ children }) => (
            <blockquote className="border-l-[3px] border-(--color-text-primary) bg-(--color-surface-muted) px-5 py-4 text-(--color-text-secondary) italic">
              {reparseInlineChildren(children, false)}
            </blockquote>
          ),
          ul: ({ children }) => <ul className="space-y-3">{children}</ul>,
          li: ({ children }) => (
            <li className="ml-4 list-disc pl-2 text-[15px] leading-8 text-(--color-text-secondary) sm:text-base">
              {reparseInlineChildren(children, false)}
            </li>
          ),
          a: ({ href, children }) => {
            const isDead = Boolean(href && deadLinks?.has(href));
            const resolvedHref = isDead && articleDate ? archiveUrl(articleDate, href!) : href;
            return (
              <a
                href={resolvedHref}
                target="_blank"
                rel="noreferrer"
                data-link-status={isDead ? "archived" : undefined}
                title={isDead ? archivedTitle : undefined}
                className="underline decoration-(--color-border-strong) underline-offset-4 transition hover:text-(--color-text-primary)"
              >
                {reparseInlineChildren(children, true)}
                {isDead ? (
                  <sup className="np-mono ml-0.5 align-super text-[0.62em] tracking-[0.08em] text-(--np-ink-red)">
                    {archivedLabel}
                  </sup>
                ) : null}
              </a>
            );
          },
          hr: () => <hr className="my-8 border-(--color-border)" />,
        }}
      >
        {normalized}
      </ReactMarkdown>
    </div>
  );
}
