"use client";

import { useEffect, useRef, useState } from "react";

import type { TopicKey } from "@/lib/news-meta";
import { articleId, saveReadingProgress } from "@/lib/reading-state";

type ReadingProgressProps = {
  /**
   * The article being read. When provided, progress is persisted so the home
   * page can offer to resume it and can mark it READ once finished.
   */
  article?: { topic: TopicKey; date: string; title: string };
};

/**
 * Thin scroll-progress bar fixed to the top of the viewport.
 * Tracks document scroll position, computes a 0..1 ratio, and renders a
 * single bar. No external state, no library, no rAF dependency beyond what
 * the browser already coalesces from `scroll` events.
 */
export function ReadingProgress({ article }: ReadingProgressProps) {
  const [ratio, setRatio] = useState(0);
  const ratioRef = useRef(0);

  useEffect(() => {
    let ticking = false;
    const update = () => {
      const doc = document.documentElement;
      const scrollable = Math.max(doc.scrollHeight - window.innerHeight, 1);
      const next = Math.min(1, Math.max(0, window.scrollY / scrollable));
      ratioRef.current = next;
      setRatio(next);
      ticking = false;
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(update);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  // Persist on an interval rather than on every scroll frame, plus once when
  // the page is hidden — `pagehide` is the event that reliably fires on mobile
  // Safari when the reader leaves. Keyed on the article's identity, not on the
  // prop object, so a parent re-render doesn't restart the timer.
  const topic = article?.topic;
  const date = article?.date;
  const title = article?.title;

  useEffect(() => {
    if (!topic || !date || !title) return;

    const persist = () => {
      saveReadingProgress({
        articleId: articleId({ topic, date }),
        articleTitle: title,
        topic,
        progress: ratioRef.current,
        lastReadAt: Date.now(),
      });
    };

    const timer = window.setInterval(persist, 2000);
    window.addEventListener("pagehide", persist);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("pagehide", persist);
      persist();
    };
  }, [topic, date, title]);

  return (
    <div className="np-progress" aria-hidden>
      <div className="np-progress-fill" style={{ width: `${ratio * 100}%` }} />
    </div>
  );
}
