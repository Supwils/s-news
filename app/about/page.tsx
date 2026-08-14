import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenText, Command, Search, Sparkles } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { NewspaperFooter } from "@/components/newspaper/footer";
import { NewspaperMasthead } from "@/components/newspaper/masthead";
import { getCopy } from "@/data/copy";
import { RuntimeNavLink } from "@/components/runtime-nav-link";
import { localizePath } from "@/lib/locale-routing";
import { getAllNewsPreviews, formatDisplayDate } from "@/lib/news";
import { PipelineRecord } from "@/components/pipeline-record";
import { getPipelineByTopic, getPipelineSummary, getRecentRuns } from "@/lib/pipeline-metrics";
import { TOPICS, getTopicMeta } from "@/lib/news-meta";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `About ${SITE_NAME}, its editorial workflow, archive structure, and runtime generation flow.`,
  alternates: {
    canonical: "/about",
    languages: {
      "zh-CN": "/about",
      "en-US": localizePath("/about", "en"),
    },
  },
};

export default async function AboutPage() {
  const locale = "zh";
  const copy = getCopy(locale);
  const entries = await getAllNewsPreviews(locale);
  const latestDate = entries[0]?.date;
  const latestEntries = latestDate ? entries.filter((entry) => entry.date === latestDate) : [];
  const archiveDays = new Set(entries.map((entry) => entry.date)).size;
  const topicsWithLocale = TOPICS.map((t) => getTopicMeta(t.key, locale)!);
  const [pipelineSummary, pipelineTopics, recentRuns] = await Promise.all([
    getPipelineSummary(),
    getPipelineByTopic(),
    getRecentRuns(90),
  ]);

  return (
    <div className="np-root">
      <NewspaperMasthead active="about" />
      <main className="mx-auto w-full" style={{ maxWidth: 1280, padding: 40 }}>
        {/* Hero */}
        <section style={{ paddingBottom: 40, borderBottom: "1px solid var(--color-border)" }}>
          <SectionBadge icon={<BookOpenText size={12} />} label={copy.about.hero.badge} />
          <h1
            className="np-serif"
            style={{
              fontSize: 64,
              lineHeight: 1.02,
              letterSpacing: "-0.02em",
              fontWeight: 600,
              margin: "14px 0 20px",
              color: "var(--color-text-primary)",
            }}
          >
            {copy.about.hero.titleLine1}
            <br />
            {copy.about.hero.titleLine2}
          </h1>
          <p
            className="np-serif"
            style={{
              fontStyle: "italic",
              fontSize: 20,
              lineHeight: 1.55,
              maxWidth: 720,
              color: "var(--color-text-secondary)",
              margin: 0,
            }}
          >
            {copy.about.hero.intro}
          </p>

          <div
            style={{
              marginTop: 32,
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
            }}
            className="about-metrics"
          >
            <MetricCell
              label={copy.about.metrics.totalLabel}
              value={`${entries.length}`}
              hint={copy.about.metrics.totalHint}
              borderRight
            />
            <MetricCell
              label={copy.about.metrics.todayLabel}
              value={`${latestEntries.length}`}
              hint={latestDate ? formatDisplayDate(latestDate, locale) : copy.about.metrics.todayNoData}
              borderRight
            />
            <MetricCell
              label={copy.about.metrics.topicLabel}
              value={`${TOPICS.length}`}
              hint={copy.about.metrics.topicHint}
              borderRight
            />
            <MetricCell
              label={copy.about.metrics.archiveLabel}
              value={`${archiveDays}`}
              hint={copy.about.metrics.archiveHint}
            />
          </div>
        </section>

        {/* Pipeline record */}
        <section style={sectionStyle}>
          <SectionBadge icon={<Sparkles size={12} />} label={copy.ui.pipelineRecord.badge} />
          <h2 className="np-serif" style={sectionHeading}>
            {copy.ui.pipelineRecord.heading}
          </h2>
          <p className="np-sans" style={sectionBody}>
            {copy.ui.pipelineRecord.body}
          </p>
          <div style={{ marginTop: 24 }}>
            <PipelineRecord
              summary={pipelineSummary}
              topics={pipelineTopics}
              recent={recentRuns}
              locale={locale}
            />
          </div>
        </section>

        {/* Editorial */}
        <section style={sectionStyle}>
          <SectionBadge icon={<Sparkles size={12} />} label={copy.about.editorial.badge} />
          <h2 className="np-serif" style={sectionHeading}>
            {copy.about.editorial.heading}
          </h2>
          <p className="np-sans" style={sectionBody}>
            {copy.about.editorial.body}
          </p>
          <div
            style={{
              marginTop: 24,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
            }}
          >
            {copy.about.editorial.cards.map((card, idx, arr) => (
              <InfoCell
                key={card.title}
                title={card.title}
                description={card.description}
                borderRight={idx < arr.length - 1}
              />
            ))}
          </div>
        </section>

        {/* Signal filter */}
        <section style={sectionStyle}>
          <div
            style={{
              display: "grid",
              gap: 40,
              gridTemplateColumns: "minmax(0, 0.85fr) minmax(0, 1.15fr)",
              alignItems: "start",
            }}
            className="about-split"
          >
            <div>
              <SectionBadge icon={<Search size={12} />} label={copy.about.signalFilter.badge} />
              <h2 className="np-serif" style={sectionHeading}>
                {copy.about.signalFilter.heading}
              </h2>
              <p className="np-sans" style={sectionBody}>
                {copy.about.signalFilter.body}
              </p>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                border: "1px solid var(--color-border)",
                background: "var(--color-surface)",
              }}
            >
              {copy.about.signalFilter.cards.map((card, idx) => (
                <InfoCell
                  key={card.title}
                  title={card.title}
                  description={card.description}
                  borderRight={idx % 2 === 0}
                  borderBottom={idx < copy.about.signalFilter.cards.length - 2}
                />
              ))}
            </div>
          </div>
        </section>

        {/* Runbook */}
        <section style={sectionStyle}>
          <SectionBadge icon={<Command size={12} />} label={copy.about.runbook.badge} />
          <h2 className="np-serif" style={sectionHeading}>
            {copy.about.runbook.heading}
          </h2>
          <p className="np-sans" style={sectionBody}>
            {copy.about.runbook.body}
          </p>

          <div
            style={{
              marginTop: 24,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
            }}
          >
            {copy.about.runbook.flowCards.map((card, idx, arr) => (
              <FlowCell
                key={card.step}
                step={card.step}
                title={card.title}
                description={card.description}
                borderRight={idx < arr.length - 1}
              />
            ))}
          </div>

          <div
            style={{
              marginTop: 28,
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
            }}
          >
            {topicsWithLocale.map((topic, idx) => (
              <div
                key={topic.key}
                style={{
                  display: "grid",
                  gridTemplateColumns: "140px 1fr auto",
                  gap: 20,
                  padding: "18px 22px",
                  borderBottom:
                    idx < topicsWithLocale.length - 1 ? "1px solid var(--color-border-soft)" : "none",
                  alignItems: "start",
                }}
              >
                <div>
                  <span
                    className="np-mono"
                    style={{
                      fontSize: 10,
                      letterSpacing: "0.24em",
                      textTransform: "uppercase",
                      fontWeight: 600,
                      color: topic.accent,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: 999,
                        background: topic.accent,
                        display: "inline-block",
                      }}
                    />
                    {topic.shortLabel}
                  </span>
                </div>
                <div>
                  <h3
                    className="np-serif"
                    style={{
                      fontSize: 18,
                      letterSpacing: "-0.01em",
                      fontWeight: 600,
                      margin: 0,
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {topic.label}
                  </h3>
                  <p
                    className="np-sans"
                    style={{
                      fontSize: 13.5,
                      lineHeight: 1.65,
                      color: "var(--color-text-secondary)",
                      margin: "6px 0 0",
                    }}
                  >
                    {topic.description}
                  </p>
                </div>
                <code
                  className="np-mono"
                  style={{
                    fontSize: 11,
                    padding: "4px 8px",
                    background: "var(--color-surface-muted)",
                    color: "var(--color-text-primary)",
                    border: "1px solid var(--color-border-soft)",
                    alignSelf: "start",
                    whiteSpace: "nowrap",
                  }}
                >
                  {topic.scriptPath ? `./${topic.scriptPath}` : `@${topic.commandPath}`}
                </code>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section
          style={{
            marginTop: 48,
            borderTop: "1px solid var(--color-border)",
            paddingTop: 32,
            display: "flex",
            flexWrap: "wrap",
            justifyContent: "space-between",
            gap: 24,
            alignItems: "flex-start",
          }}
        >
          <div style={{ maxWidth: 620 }}>
            <span
              className="np-mono"
              style={{
                fontSize: 11,
                letterSpacing: "0.24em",
                textTransform: "uppercase",
                color: "var(--color-text-muted)",
              }}
            >
              {copy.about.cta.label}
            </span>
            <h2 className="np-serif" style={{ ...sectionHeading, marginTop: 12 }}>
              {copy.about.cta.heading}
            </h2>
            <p className="np-sans" style={sectionBody}>
              {copy.about.cta.body}
            </p>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link href="/" className="np-btn-primary">
              {copy.about.cta.backHome}
            </Link>
            <RuntimeNavLink className="np-btn-secondary">
              {copy.about.cta.toRuntime}
            </RuntimeNavLink>
          </div>
        </section>

        <NewspaperFooter />
      </main>
    </div>
  );
}

const sectionStyle: CSSProperties = {
  paddingTop: 40,
  paddingBottom: 40,
  borderBottom: "1px solid var(--color-border)",
};

const sectionHeading: CSSProperties = {
  fontSize: 34,
  letterSpacing: "-0.02em",
  fontWeight: 600,
  lineHeight: 1.15,
  margin: "12px 0 14px",
  color: "var(--color-text-primary)",
};

const sectionBody: CSSProperties = {
  fontSize: 15,
  lineHeight: 1.75,
  color: "var(--color-text-secondary)",
  maxWidth: 720,
  margin: 0,
};

function SectionBadge({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <span
      className="np-mono"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontSize: 11,
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: "var(--color-accent-gold)",
        fontWeight: 600,
      }}
    >
      {icon}
      {label}
    </span>
  );
}

function MetricCell({
  label,
  value,
  hint,
  borderRight,
}: {
  label: string;
  value: string;
  hint: string;
  borderRight?: boolean;
}) {
  return (
    <div
      style={{
        padding: 22,
        borderRight: borderRight ? "1px solid var(--color-border-soft)" : "none",
      }}
    >
      <p
        className="np-mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: "var(--color-text-muted)",
          margin: 0,
        }}
      >
        {label}
      </p>
      <p
        className="np-serif"
        style={{
          fontSize: 36,
          lineHeight: 1.02,
          letterSpacing: "-0.03em",
          fontWeight: 600,
          color: "var(--color-text-primary)",
          margin: "10px 0 6px",
        }}
      >
        {value}
      </p>
      <p className="np-sans" style={{ fontSize: 12.5, lineHeight: 1.5, color: "var(--color-text-secondary)", margin: 0 }}>
        {hint}
      </p>
    </div>
  );
}

function InfoCell({
  title,
  description,
  borderRight,
  borderBottom,
}: {
  title: string;
  description: string;
  borderRight?: boolean;
  borderBottom?: boolean;
}) {
  return (
    <div
      style={{
        padding: 22,
        borderRight: borderRight ? "1px solid var(--color-border-soft)" : "none",
        borderBottom: borderBottom ? "1px solid var(--color-border-soft)" : "none",
      }}
    >
      <h3
        className="np-serif"
        style={{
          fontSize: 19,
          lineHeight: 1.22,
          letterSpacing: "-0.01em",
          fontWeight: 600,
          color: "var(--color-text-primary)",
          margin: "0 0 10px",
        }}
      >
        {title}
      </h3>
      <p className="np-sans" style={{ fontSize: 13.5, lineHeight: 1.7, color: "var(--color-text-secondary)", margin: 0 }}>
        {description}
      </p>
    </div>
  );
}

function FlowCell({
  step,
  title,
  description,
  borderRight,
}: {
  step: string;
  title: string;
  description: string;
  borderRight?: boolean;
}) {
  return (
    <div
      style={{
        padding: 24,
        borderRight: borderRight ? "1px solid var(--color-border-soft)" : "none",
      }}
    >
      <p
        className="np-mono"
        style={{
          fontSize: 10,
          letterSpacing: "0.24em",
          textTransform: "uppercase",
          color: "var(--color-text-muted)",
          margin: 0,
        }}
      >
        {step}
      </p>
      <h3
        className="np-serif"
        style={{
          fontSize: 22,
          lineHeight: 1.2,
          letterSpacing: "-0.01em",
          fontWeight: 600,
          color: "var(--color-text-primary)",
          margin: "12px 0 10px",
        }}
      >
        {title}
      </h3>
      <p className="np-sans" style={{ fontSize: 13.5, lineHeight: 1.7, color: "var(--color-text-secondary)", margin: 0 }}>
        {description}
      </p>
    </div>
  );
}
