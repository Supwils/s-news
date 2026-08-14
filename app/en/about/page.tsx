import type { Metadata } from "next";
import Link from "next/link";
import { BookOpenText, Command, Languages, Search } from "lucide-react";
import type { CSSProperties, ReactNode } from "react";

import { NewspaperFooter } from "@/components/newspaper/footer";
import { NewspaperMasthead } from "@/components/newspaper/masthead";
import { RuntimeNavLink } from "@/components/runtime-nav-link";
import { getCopy } from "@/data/copy";
import { localizePath } from "@/lib/locale-routing";
import { getAllNewsPreviews, formatDisplayDate } from "@/lib/news";
import { PipelineRecord } from "@/components/pipeline-record";
import { getPipelineByTopic, getPipelineSummary, getRecentRuns } from "@/lib/pipeline-metrics";
import { TOPICS, getTopicMeta } from "@/lib/news-meta";
import { SITE_NAME } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description: `About ${SITE_NAME}, its editorial workflow, archive structure, and English demo routes.`,
  alternates: {
    canonical: localizePath("/about", "en"),
    languages: {
      "zh-CN": "/about",
      "en-US": localizePath("/about", "en"),
    },
  },
};

export default async function EnglishAboutPage() {
  const locale = "en";
  const copy = getCopy(locale);
  const entries = await getAllNewsPreviews("en");
  const latestDate = entries[0]?.date;
  const latestEntries = latestDate ? entries.filter((entry) => entry.date === latestDate) : [];
  const archiveDays = new Set(entries.map((entry) => entry.date)).size;
  const topics = TOPICS.map((topic) => getTopicMeta(topic.key, locale)!).filter(Boolean);
  const [pipelineSummary, pipelineTopics, recentRuns] = await Promise.all([
    getPipelineSummary(),
    getPipelineByTopic(),
    getRecentRuns(90),
  ]);

  return (
    <div className="np-root">
      <NewspaperMasthead active="about" />
      <main className="mx-auto w-full" style={{ maxWidth: 1120, padding: 40 }}>
        <section style={{ paddingBottom: 36, borderBottom: "1px solid var(--color-border)" }}>
          <SectionLabel icon={<BookOpenText size={12} />} label="English demo" />
          <h1
            className="np-serif"
            style={{
              fontSize: 56,
              lineHeight: 1.02,
              letterSpacing: "-0.02em",
              fontWeight: 600,
              margin: "16px 0 18px",
              color: "var(--color-text-primary)",
            }}
          >
            Chinese-first by design.
            <br />
            English-readable by public route.
          </h1>
          <p
            className="np-serif"
            style={{
              fontStyle: "italic",
              fontSize: 19,
              lineHeight: 1.6,
              maxWidth: 760,
              color: "var(--color-text-secondary)",
              margin: 0,
            }}
          >
            Swil-News is primarily authored and reviewed in Chinese. The `/en` routes exist so public
            beta viewers can browse translated digests, topic archives, and RSS feeds without making
            English the product&apos;s primary editorial language.
          </p>

          <div
            style={{
              marginTop: 28,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              border: "1px solid var(--color-border)",
              background: "var(--color-surface)",
            }}
          >
            <Metric label="English digests" value={`${entries.length}`} hint="Currently published translations" />
            <Metric
              label="Latest English date"
              value={latestDate ? formatDisplayDate(latestDate, "en") : "Not yet available"}
              hint={`${latestEntries.length} translated issues on the latest day`}
              borderLeft
            />
            <Metric label="Topics" value={`${topics.length}`} hint="Same topic taxonomy as the Chinese archive" borderLeft />
            <Metric label="Archive days" value={`${archiveDays}`} hint="Days with at least one English digest" borderLeft />
          </div>
        </section>

        <section style={sectionStyle}>
          <SectionLabel icon={<Command size={12} />} label={copy.ui.pipelineRecord.badge} />
          <h2 className="np-serif" style={headingStyle}>{copy.ui.pipelineRecord.heading}</h2>
          <p
            className="np-sans"
            style={{ marginTop: 14, maxWidth: 720, fontSize: 15, lineHeight: 1.75, color: "var(--color-text-secondary)" }}
          >
            {copy.ui.pipelineRecord.body}
          </p>
          <div style={{ marginTop: 24 }}>
            <PipelineRecord summary={pipelineSummary} topics={pipelineTopics} recent={recentRuns} locale={locale} />
          </div>
        </section>

        <section style={sectionStyle}>
          <SectionLabel icon={<Command size={12} />} label="Workflow" />
          <h2 className="np-serif" style={headingStyle}>How this public beta is meant to run</h2>
          <div className="grid gap-4 md:grid-cols-3" style={{ marginTop: 22 }}>
            <InfoCard
              title="1. Generate locally"
              body="Runtime stays on your own machine. Topic scripts call Cursor CLI, write markdown into NEWS, and refresh the local index."
            />
            <InfoCard
              title="2. Commit the output"
              body="Once the daily run looks right, commit the NEWS updates. The repository remains the public content snapshot."
            />
            <InfoCard
              title="3. Redeploy read-only"
              body="Your deployment picks up committed markdown and republishes the archive. Visitors read; they do not trigger runtime execution."
            />
          </div>
        </section>

        <section style={sectionStyle}>
          <SectionLabel icon={<Languages size={12} />} label="Language model" />
          <h2 className="np-serif" style={headingStyle}>What “English support” means here</h2>
          <div className="grid gap-4 md:grid-cols-2" style={{ marginTop: 22 }}>
            <InfoCard
              title="Publicly shareable routes"
              body="English readers can now open `/en`, `/en/news/...`, `/en/archive/...`, and `/en/feed.xml` directly with matching metadata and structured data."
            />
            <InfoCard
              title="Not first-class editorial ownership"
              body="Chinese remains the canonical editorial path. English works as a translated viewing layer, which is the right level for a public beta."
            />
          </div>
        </section>

        <section style={sectionStyle}>
          <SectionLabel icon={<Search size={12} />} label="Topics" />
          <h2 className="np-serif" style={headingStyle}>Current topic surface</h2>
          <div
            style={{
              marginTop: 22,
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: 12,
            }}
          >
            {topics.map((topic) => (
              <Link
                key={topic.key}
                href={localizePath(`/news/${topic.key}`, "en")}
                style={{
                  border: "1px solid var(--color-border)",
                  background: "var(--color-surface)",
                  padding: "16px 18px",
                  color: "var(--color-text-primary)",
                  textDecoration: "none",
                }}
              >
                <div
                  className="np-mono"
                  style={{
                    fontSize: 10,
                    letterSpacing: "0.22em",
                    textTransform: "uppercase",
                    color: topic.accent,
                    fontWeight: 600,
                    marginBottom: 10,
                  }}
                >
                  {topic.shortLabel}
                </div>
                <div className="np-serif" style={{ fontSize: 22, lineHeight: 1.15, fontWeight: 600 }}>
                  {topic.label}
                </div>
                <div className="np-sans" style={{ marginTop: 10, fontSize: 14, lineHeight: 1.65, color: "var(--color-text-secondary)" }}>
                  {topic.description}
                </div>
              </Link>
            ))}
          </div>
        </section>

        <section style={sectionStyle}>
          <h2 className="np-serif" style={headingStyle}>Next stop</h2>
          <p className="np-sans" style={{ fontSize: 15, lineHeight: 1.8, color: "var(--color-text-secondary)", maxWidth: 720 }}>
            The product remains local-first, Chinese-first, and beta-stage. That is fine. For your current
            goal, the right standard is: readable in public, safe in deployment, and easy for English viewers
            to understand without pretending the product is fully internationalized.
          </p>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 22 }}>
            <Link href={localizePath("/", "en")} className="np-btn-primary">
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

function SectionLabel({ icon, label }: { icon: ReactNode; label: string }) {
  return (
    <div
      className="np-mono"
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 8,
        fontSize: 11,
        letterSpacing: "0.24em",
        textTransform: "uppercase",
        color: "var(--np-ink-red)",
        fontWeight: 600,
      }}
    >
      {icon}
      <span>{label}</span>
    </div>
  );
}

function Metric({
  label,
  value,
  hint,
  borderLeft = false,
}: {
  label: string;
  value: string;
  hint: string;
  borderLeft?: boolean;
}) {
  return (
    <div
      style={{
        padding: "18px 20px",
        borderLeft: borderLeft ? "1px solid var(--color-border-soft)" : "none",
      }}
    >
      <div className="np-mono" style={{ fontSize: 10, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--color-text-muted)" }}>
        {label}
      </div>
      <div className="np-serif" style={{ fontSize: 26, lineHeight: 1.1, fontWeight: 600, color: "var(--color-text-primary)", marginTop: 10 }}>
        {value}
      </div>
      <div className="np-sans" style={{ fontSize: 13.5, lineHeight: 1.65, color: "var(--color-text-secondary)", marginTop: 8 }}>
        {hint}
      </div>
    </div>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div
      style={{
        border: "1px solid var(--color-border)",
        background: "var(--color-surface)",
        padding: 20,
      }}
    >
      <div className="np-serif" style={{ fontSize: 24, lineHeight: 1.15, fontWeight: 600, color: "var(--color-text-primary)" }}>
        {title}
      </div>
      <div className="np-sans" style={{ marginTop: 12, fontSize: 14, lineHeight: 1.75, color: "var(--color-text-secondary)" }}>
        {body}
      </div>
    </div>
  );
}

const sectionStyle = {
  paddingTop: 36,
  borderTop: "1px solid var(--color-border)",
  marginTop: 36,
} satisfies CSSProperties;

const headingStyle = {
  fontSize: 38,
  letterSpacing: "-0.02em",
  lineHeight: 1.06,
  fontWeight: 600,
  margin: "14px 0 0",
  color: "var(--color-text-primary)",
} satisfies CSSProperties;
