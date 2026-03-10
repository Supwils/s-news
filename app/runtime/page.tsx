"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, CheckCircle2, Loader2, Play, XCircle } from "lucide-react";

import { useLocale } from "@/components/locale-context";
import { getCopy } from "@/data/copy";
import { TOPICS, getTopicMeta } from "@/lib/news-meta";
import type { TopicKey } from "@/lib/news-meta";

type RunState = "idle" | "running" | "success" | "error";

type RunResult = {
  ok: boolean;
  topic?: string;
  error?: string;
  stdout?: string;
  stderr?: string;
  code?: number;
};

type RunProgress = {
  done: number;
  total: number;
  current: string | null;
};

export default function RuntimePage() {
  const locale = useLocale();
  const copy = getCopy(locale);
  const runtimeOptions = useMemo(
    () => [
      ...TOPICS.map((t) => ({ value: t.key as TopicKey, label: getTopicMeta(t.key, locale)!.label })),
      { value: "all" as const, label: copy.runtime.allTopics },
    ],
    [locale, copy.runtime.allTopics],
  );
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const [runningTopic, setRunningTopic] = useState<string | null>(null);
  const [result, setResult] = useState<RunResult | null>(null);
  const [state, setState] = useState<RunState>("idle");
  const [runProgress, setRunProgress] = useState<RunProgress | null>(null);

  const checkAllowed = useCallback(async () => {
    try {
      const res = await fetch("/api/runtime/generate");
      const data = await res.json();
      setAllowed(data.allowed === true);
    } catch {
      setAllowed(false);
    }
  }, []);

  useEffect(() => {
    checkAllowed();
  }, [checkAllowed]);

  const run = async (topic: TopicKey | "all") => {
    setResult(null);
    setState("running");
    setRunningTopic(topic);
    setRunProgress(topic === "all" ? { done: 0, total: 9, current: null } : null);
    try {
      const res = await fetch("/api/runtime/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic }),
      });
      const contentType = res.headers.get("content-type") ?? "";
      if (topic === "all" && contentType.includes("ndjson")) {
        const reader = res.body?.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        if (!reader) throw new Error("No response body");
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            if (!line.trim()) continue;
            try {
              const event = JSON.parse(line) as { type: string; done?: number; total?: number; current?: string | null; ok?: boolean; error?: string; stdout?: string; stderr?: string; code?: number };
              if (event.type === "progress" && event.done != null && event.total != null) {
                setRunProgress({ done: event.done, total: event.total, current: event.current ?? null });
              } else if (event.type === "done") {
                setResult({
                  ok: event.ok ?? false,
                  topic: "all",
                  error: event.error,
                  stdout: event.stdout,
                  stderr: event.stderr,
                  code: event.code,
                });
                setState(event.ok ? "success" : "error");
              }
            } catch {
              // skip malformed line
            }
          }
        }
      } else {
        const data = await res.json();
        setResult(data);
        setState(data.ok ? "success" : "error");
      }
    } catch (err) {
      setResult({ ok: false, error: (err as Error).message });
      setState("error");
    } finally {
      setRunningTopic(null);
      setRunProgress(null);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-(--color-bg-primary) text-(--color-text-primary)">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(193,166,111,0.22),_transparent_30%),radial-gradient(circle_at_right,_rgba(96,161,255,0.18),_transparent_28%),radial-gradient(circle_at_bottom,_rgba(236,72,153,0.14),_transparent_25%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,_rgba(255,255,255,0.04),_transparent_18%),linear-gradient(to_right,_rgba(255,255,255,0.02)_1px,_transparent_1px),linear-gradient(to_bottom,_rgba(255,255,255,0.02)_1px,_transparent_1px)] bg-[size:auto,24px_24px,24px_24px] opacity-40" />

      <div className="relative mx-auto flex w-full max-w-[1400px] flex-col px-4 py-4 sm:px-6 lg:px-8">
        <header className="sticky top-0 z-20 mb-6 rounded-full border border-(--color-border) bg-[color-mix(in_srgb,var(--color-bg-primary)_75%,transparent)] px-4 py-3 backdrop-blur-xl sm:px-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-display text-xl tracking-[0.18em] uppercase text-(--color-text-primary)">
                {copy.runtime.siteTitle}
              </p>
              <p className="text-xs uppercase tracking-[0.25em] text-(--color-text-muted)">
                {copy.runtime.siteSubtitle}
              </p>
            </div>
            <nav className="flex flex-wrap items-center gap-2 text-xs text-(--color-text-secondary)">
              <Link
                href="/"
                className="rounded-full border border-(--color-border) px-3 py-1.5 transition hover:border-(--color-border-strong) hover:text-(--color-text-primary)"
              >
                {copy.runtime.navHome}
              </Link>
              <Link
                href="/about"
                className="rounded-full border border-(--color-border) px-3 py-1.5 transition hover:border-(--color-border-strong) hover:text-(--color-text-primary)"
              >
                {copy.runtime.navAbout}
              </Link>
              <span className="rounded-full border border-(--color-border-strong) bg-(--color-surface-muted) px-3 py-1.5">
                {copy.runtime.navRuntime}
              </span>
            </nav>
          </div>
        </header>

        <main className="space-y-8 pb-12">
          {allowed !== true ? (
            <section className="rounded-[32px] border border-(--color-border) bg-(--color-surface) p-6 shadow-(--shadow-hero) sm:p-8 lg:p-10">
              <h1 className="font-display text-3xl leading-tight tracking-[-0.03em] text-(--color-text-primary) sm:text-4xl">
                {copy.runtime.readOnlyHeading}
              </h1>
              <p className="mt-3 max-w-2xl text-(--color-text-secondary) sm:text-base">
                {copy.runtime.readOnlyBody}
              </p>
              <Link
                href="/"
                className="mt-6 inline-flex items-center gap-2 rounded-full border border-(--color-border-strong) bg-(--color-text-primary) px-5 py-3 text-sm font-medium !text-(--color-bg-primary) transition hover:opacity-90"
              >
                <ArrowLeft size={18} />
                {copy.runtime.backToNews}
              </Link>
            </section>
          ) : (
            <>
              <section className="rounded-[32px] border border-(--color-border) bg-(--color-surface) p-6 shadow-(--shadow-hero) sm:p-8 lg:p-10">
                <h1 className="font-display text-3xl leading-tight tracking-[-0.03em] text-(--color-text-primary) sm:text-4xl">
                  {copy.runtime.runHeading}
                </h1>
                <p className="mt-3 max-w-2xl text-(--color-text-secondary) sm:text-base">
                  {copy.runtime.runBody}
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  {runtimeOptions.map((opt) => {
                    const isRunning = runningTopic === opt.value;
                    const disabled = state === "running";
                    return (
                      <div
                        key={opt.value}
                        className="rounded-[28px] border border-(--color-border) bg-(--color-surface-muted) p-5 shadow-(--shadow-card) transition hover:border-(--color-border-strong)"
                      >
                        <p className="font-medium text-(--color-text-primary)">{opt.label}</p>
                        <p className="mt-1 text-xs text-(--color-text-muted)">
                          {opt.value === "all" ? "scripts/run_all_news.sh" : `scripts/run-${opt.value === "ai-tech" ? "aitech" : opt.value}-news.sh`}
                        </p>
                        <button
                          type="button"
                          onClick={() => run(opt.value)}
                          disabled={disabled}
                          className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-(--color-border) bg-(--color-surface) px-4 py-3 text-sm font-medium text-(--color-text-primary) transition hover:border-(--color-border-strong) hover:bg-(--color-surface-muted) disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          {isRunning ? (
                            <>
                              <Loader2 size={18} className="animate-spin" />
                              {copy.runtime.runningLabel}
                            </>
                          ) : (
                            <>
                              <Play size={18} />
                              {copy.runtime.runButton}
                            </>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>

                {state === "running" && runProgress && (
                  <div className="mt-6 rounded-[28px] border border-(--color-border) bg-(--color-surface-muted) p-5 shadow-(--shadow-card)">
                    <p className="text-sm font-medium text-(--color-text-primary)">
                      {copy.runtime.progressStep(runProgress.done + (runProgress.current ? 1 : 0), runProgress.total)}
                      {runProgress.current && (
                        <span className="ml-2 text-(--color-text-secondary)">
                          {copy.runtime.progressRunning(getTopicMeta(runProgress.current as TopicKey, locale)?.label ?? runProgress.current)}
                        </span>
                      )}
                    </p>
                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-(--color-border-soft)">
                      <div
                        className="h-full rounded-full bg-(--color-accent-sky) transition-all duration-300"
                        style={{
                          width: `${runProgress.total ? Math.round((runProgress.done / runProgress.total) * 100) : 0}%`,
                        }}
                      />
                    </div>
                    <p className="mt-2 text-xs text-(--color-text-muted)">
                      {copy.runtime.progressPercent(runProgress.total ? Math.round((runProgress.done / runProgress.total) * 100) : 0)}
                    </p>
                  </div>
                )}

              </section>

              {result && (
            <section className="rounded-[32px] border border-(--color-border) bg-(--color-surface) p-6 shadow-(--shadow-card) sm:p-8">
              <div className="flex items-center gap-3">
                {result.ok ? (
                  <CheckCircle2 size={24} className="text-(--color-accent-sky)" />
                ) : (
                  <XCircle size={24} className="text-(--color-accent-rose)" />
                )}
                <h2 className="font-display text-xl tracking-[-0.02em] text-(--color-text-primary)">
                  {result.ok ? copy.runtime.resultSuccess : copy.runtime.resultError}
                </h2>
              </div>
              {result.topic && (
                <p className="mt-2 text-sm text-(--color-text-muted)">{copy.runtime.topicLabel}: {result.topic}</p>
              )}
              {result.error && (
                <p className="mt-2 text-sm text-(--color-accent-rose)">{result.error}</p>
              )}
              {(result.stdout || result.stderr) && (
                <pre className="mt-4 max-h-[320px] overflow-auto rounded-2xl border border-(--color-border) bg-(--color-bg-secondary) p-4 text-xs leading-6 text-(--color-text-secondary) whitespace-pre-wrap">
                  {result.stdout}
                  {result.stderr}
                </pre>
              )}
            </section>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
