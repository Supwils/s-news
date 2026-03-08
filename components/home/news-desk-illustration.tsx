import { copy } from "@/data/copy";

type NewsDeskIllustrationProps = {
  entryCount: number;
  topicCount: number;
  className?: string;
};

export function NewsDeskIllustration({
  entryCount,
  topicCount,
  className,
}: NewsDeskIllustrationProps) {
  return (
    <div className={["flex w-full max-w-[620px] flex-col items-center", className ?? ""].join(" ")}>
      <div className="relative aspect-[4/3] w-full">
        <div
          className="news-desk-shadow absolute inset-x-[8%] bottom-[8%] h-[20%] rounded-full blur-3xl"
          aria-hidden="true"
        />

        <svg
          viewBox="0 0 560 420"
          className="relative z-10 h-full w-full overflow-visible"
          aria-hidden="true"
        >
          <g className="news-desk-float-a" transform="translate(56 72) rotate(-8 86 118)">
            <rect
              x="0"
              y="0"
              width="172"
              height="236"
              rx="24"
              fill="color-mix(in srgb, var(--color-surface) 94%, transparent)"
              stroke="var(--color-border)"
            />
            <rect x="22" y="26" width="86" height="12" rx="6" fill="var(--color-accent-gold)" opacity="0.22" />
            <rect x="22" y="54" width="128" height="8" rx="4" fill="var(--color-text-muted)" opacity="0.28" />
            <rect x="22" y="72" width="112" height="8" rx="4" fill="var(--color-text-muted)" opacity="0.22" />
            <rect x="22" y="106" width="128" height="72" rx="16" fill="var(--color-surface-muted)" />
            <rect x="34" y="122" width="92" height="8" rx="4" fill="var(--color-text-muted)" opacity="0.24" />
            <rect x="34" y="140" width="100" height="8" rx="4" fill="var(--color-text-muted)" opacity="0.18" />
            <rect x="34" y="158" width="78" height="8" rx="4" fill="var(--color-text-muted)" opacity="0.14" />
            <circle cx="130" cy="198" r="16" fill="var(--color-surface)" stroke="var(--color-border)" />
            <circle cx="130" cy="198" r="6" fill="var(--color-accent-sky)" opacity="0.6" />
          </g>

          <g className="news-desk-float-b" transform="translate(188 36) rotate(4 132 160)">
            <rect
              x="0"
              y="0"
              width="264"
              height="318"
              rx="30"
              fill="color-mix(in srgb, var(--color-surface) 96%, transparent)"
              stroke="var(--color-border-strong)"
            />
            <rect x="26" y="26" width="112" height="14" rx="7" fill="var(--color-accent-sky)" opacity="0.22" />
            <rect x="26" y="54" width="188" height="14" rx="7" fill="var(--color-text-primary)" opacity="0.08" />
            <rect x="26" y="76" width="176" height="10" rx="5" fill="var(--color-text-muted)" opacity="0.2" />
            <rect x="26" y="116" width="212" height="102" rx="20" fill="var(--color-surface-muted)" />
            <rect x="44" y="138" width="166" height="10" rx="5" fill="var(--color-text-muted)" opacity="0.24" />
            <rect x="44" y="160" width="152" height="10" rx="5" fill="var(--color-text-muted)" opacity="0.18" />
            <rect x="44" y="182" width="132" height="10" rx="5" fill="var(--color-text-muted)" opacity="0.14" />
            <rect x="26" y="238" width="98" height="44" rx="16" fill="var(--color-surface)" stroke="var(--color-border)" />
            <rect x="138" y="238" width="100" height="44" rx="16" fill="var(--color-surface)" stroke="var(--color-border)" />
            <circle cx="224" cy="54" r="18" fill="var(--color-surface)" stroke="var(--color-border)" />
            <circle cx="224" cy="54" r="7" fill="var(--color-accent-rose)" opacity="0.56" />
          </g>

          <g className="news-desk-float-c" transform="translate(412 156) rotate(11 66 88)">
            <rect
              x="0"
              y="0"
              width="132"
              height="176"
              rx="22"
              fill="color-mix(in srgb, var(--color-surface) 92%, transparent)"
              stroke="var(--color-border)"
            />
            <rect x="18" y="24" width="72" height="10" rx="5" fill="var(--color-accent-green)" opacity="0.24" />
            <rect x="18" y="50" width="90" height="8" rx="4" fill="var(--color-text-muted)" opacity="0.2" />
            <rect x="18" y="66" width="82" height="8" rx="4" fill="var(--color-text-muted)" opacity="0.16" />
            <rect x="18" y="92" width="96" height="52" rx="14" fill="var(--color-surface-muted)" />
            <circle cx="102" cy="32" r="12" fill="var(--color-surface)" stroke="var(--color-border)" />
            <circle cx="102" cy="32" r="4.5" fill="var(--color-accent-violet)" opacity="0.58" />
          </g>

          <g className="news-desk-float-b">
            <rect
              x="164"
              y="308"
              width="220"
              height="28"
              rx="14"
              fill="color-mix(in srgb, var(--color-surface) 88%, transparent)"
              stroke="var(--color-border)"
            />
            <rect x="184" y="318" width="62" height="8" rx="4" fill="var(--color-text-muted)" opacity="0.22" />
            <rect x="258" y="318" width="96" height="8" rx="4" fill="var(--color-text-muted)" opacity="0.16" />
          </g>
        </svg>

        <div className="news-desk-float-c absolute left-3 top-4 rounded-full border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] px-3 py-2 text-xs text-[var(--color-text-secondary)] shadow-[var(--shadow-card)]">
          {topicCount} {copy.home.newsDesk.topicPlates}
        </div>
      </div>

      <div className="news-desk-float-a mt-3 rounded-full border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_92%,transparent)] px-4 py-2 text-xs text-[var(--color-text-secondary)] shadow-[var(--shadow-card)]">
        {copy.home.newsDesk.stackLabel} {entryCount} {copy.home.newsDesk.stackSuffix}
      </div>
    </div>
  );
}
