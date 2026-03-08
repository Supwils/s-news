import { getTopicMeta, type TopicKey } from "@/lib/news-meta";

type TopicIconProps = {
  topic: TopicKey;
  size?: number;
  variant?: "outline" | "badge" | "muted";
  className?: string;
};

export function TopicIcon({
  topic,
  size = 18,
  variant = "outline",
  className,
}: TopicIconProps) {
  const meta = getTopicMeta(topic);

  if (!meta) {
    return null;
  }

  const styles =
    variant === "badge"
      ? {
          color: meta.accent,
          backgroundColor: `color-mix(in srgb, ${meta.accent} 14%, transparent)`,
          borderColor: `color-mix(in srgb, ${meta.accent} 28%, var(--color-border))`,
        }
      : variant === "muted"
        ? {
            color: `color-mix(in srgb, ${meta.accent} 82%, var(--color-text-muted))`,
            backgroundColor: "color-mix(in srgb, var(--color-surface) 86%, transparent)",
            borderColor: "var(--color-border)",
          }
        : {
            color: meta.accent,
            backgroundColor: "transparent",
            borderColor: `color-mix(in srgb, ${meta.accent} 22%, var(--color-border))`,
          };

  return (
    <span
      className={[
        "inline-flex items-center justify-center rounded-full border transition-transform duration-200",
        className ?? "",
      ].join(" ")}
      style={{
        ...styles,
        width: size,
        height: size,
      }}
      aria-hidden="true"
    >
      <svg
        viewBox="0 0 24 24"
        width={Math.max(12, size - 6)}
        height={Math.max(12, size - 6)}
        fill="none"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        {renderGlyph(topic)}
      </svg>
    </span>
  );
}

function renderGlyph(topic: TopicKey) {
  switch (topic) {
    case "general":
      return (
        <>
          <path d="M5.5 6.5h10a3 3 0 0 1 3 3v8h-10a3 3 0 0 0-3 3v-14Z" />
          <path d="M8.5 6.5v14" />
          <path d="M11.5 10h4" />
          <path d="M11.5 13h4" />
          <path d="M11.5 16h2.5" />
        </>
      );
    case "finance":
      return (
        <>
          <path d="M5 18.5h14" />
          <path d="M7.5 15.5 10 13l2.4 1.8 4.1-5.3" />
          <path d="m14.8 9.5 1.7-.2-.2 1.7" />
          <path d="M7 9.5v6" />
        </>
      );
    case "ai-tech":
      return (
        <>
          <rect x="7" y="7" width="10" height="10" rx="2.5" />
          <path d="M10 10h4v4h-4z" />
          <path d="M9 4.5v2" />
          <path d="M12 4.5v2" />
          <path d="M15 4.5v2" />
          <path d="M9 17.5v2" />
          <path d="M12 17.5v2" />
          <path d="M15 17.5v2" />
        </>
      );
    case "science":
      return (
        <>
          <circle cx="11" cy="11" r="4.5" />
          <path d="m14.4 14.4 4.1 4.1" />
          <path d="m16 7.5.8-1.7.8 1.7 1.8.4-1.3 1.3.2 1.9-1.5-.9-1.6.9.3-1.9-1.3-1.3 1.8-.4Z" />
        </>
      );
    case "crypto":
      return (
        <>
          <path d="M9.2 8.2h4.1a2.2 2.2 0 0 1 0 4.3H9.2a2.2 2.2 0 0 0 0 4.3h4.1" />
          <path d="M10.4 6.2v11.6" />
          <path d="M13.7 6.2v11.6" />
          <path d="M7 10.3h10" />
        </>
      );
    case "energy-climate":
      return (
        <>
          <circle cx="12" cy="10" r="4" />
          <path d="M12 2v2" />
          <path d="M12 18v2" />
          <path d="m4.2 4.2 1.4 1.4" />
          <path d="m18.4 18.4 1.4 1.4" />
          <path d="M2 12h2" />
          <path d="M20 12h2" />
          <path d="m4.2 19.8 1.4-1.4" />
          <path d="m18.4 5.6 1.4-1.4" />
          <path d="M12 14v4" />
          <path d="M10 12 8 16h8l-2-4" />
        </>
      );
    case "auto-mobility":
      return (
        <>
          <path d="M5 17h14" />
          <path d="M6 17a2 2 0 0 1-2-2v-4l2-4h8l2 4v4a2 2 0 0 1-2 2" />
          <path d="M8 13h.01" />
          <path d="M16 13h.01" />
          <circle cx="8" cy="17" r="1" />
          <circle cx="16" cy="17" r="1" />
        </>
      );
    case "gaming":
      return (
        <>
          <path d="M6 12h4v4H6z" />
          <path d="M14 6h4v4h-4z" />
          <path d="M14 14h4v4h-4z" />
          <path d="M10 8 8 6l2 2 2-2-2 2z" />
          <path d="M12 10v4" />
        </>
      );
    case "supply-chain":
      return (
        <>
          <path d="M4 12h4l2-4 2 8 2-4h4" />
          <path d="M2 8v8h2V8" />
          <path d="M20 8v8h2V8" />
          <path d="M8 6v2" />
          <path d="M16 6v2" />
        </>
      );
  }
}
