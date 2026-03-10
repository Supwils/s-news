import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type NewsMarkdownProps = {
  content: string;
};

type InlineMarkdownProps = {
  content: string;
  className?: string;
};

/** Renders short markdown (e.g. description, highlights, takeaway) so **bold** is displayed correctly. */
export function InlineMarkdown({ content, className = "" }: InlineMarkdownProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="m-0">{children}</p>,
          strong: ({ children }) => (
            <strong className="font-semibold text-(--color-text-primary)">{children}</strong>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-(--color-border-strong) underline-offset-4 transition hover:text-(--color-text-primary)"
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

export function NewsMarkdown({ content }: NewsMarkdownProps) {
  return (
    <div className="news-prose">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="font-display text-4xl leading-none tracking-[-0.04em] text-(--color-text-primary) sm:text-5xl">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="font-display mt-12 border-t border-(--color-border) pt-8 text-3xl leading-none tracking-[-0.03em] text-(--color-text-primary)">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="mt-8 text-xl leading-8 font-semibold text-(--color-text-primary) sm:text-2xl">
              {children}
            </h3>
          ),
          p: ({ children }) => (
            <p className="text-[15px] leading-8 text-(--color-text-secondary) sm:text-base">
              {children}
            </p>
          ),
          strong: ({ children }) => (
            <strong className="font-semibold text-(--color-text-primary)">{children}</strong>
          ),
          blockquote: ({ children }) => (
            <blockquote className="rounded-[24px] border border-(--color-border) bg-(--color-surface-muted) px-5 py-4 text-(--color-text-secondary)">
              {children}
            </blockquote>
          ),
          ul: ({ children }) => <ul className="space-y-3">{children}</ul>,
          li: ({ children }) => (
            <li className="ml-4 list-disc pl-2 text-[15px] leading-8 text-(--color-text-secondary) sm:text-base">
              {children}
            </li>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noreferrer"
              className="underline decoration-(--color-border-strong) underline-offset-4 transition hover:text-(--color-text-primary)"
            >
              {children}
            </a>
          ),
          hr: () => <hr className="my-8 border-(--color-border)" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
