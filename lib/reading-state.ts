import type { TopicKey } from "@/lib/news-meta";

/**
 * Browser-local reading state shared by the article page (writer) and the home
 * page (reader). Both used to name these keys independently, and nothing ever
 * wrote them — the "Continue reading" strip and the READ/UNREAD badges could
 * never activate. Keeping the keys and the shape here is what keeps the two
 * halves of the feature in agreement.
 */

export const READ_SET_KEY = "s-news-read-articles";
export const READING_SESSION_KEY = "s-news-reading-session";
/** Article ids whose continue banner the user dismissed. */
export const CONTINUE_DISMISSED_KEY = "s-news-continue-dismissed-ids";

/** Scroll ratio at which an article counts as finished. */
export const READ_THRESHOLD = 0.9;

export type ReadingSession = {
  articleId: string;
  articleTitle: string;
  topic: TopicKey;
  progress: number;
  lastReadAt: number;
};

export function articleId(entry: { topic: TopicKey; date: string }) {
  return `${entry.topic}:${entry.date}`;
}

function readJson<T>(key: string): T | null {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJson(key: string, value: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Private mode / quota exceeded — reading state is not worth failing over.
  }
}

export function loadReadSet(): Set<string> {
  return new Set(readJson<string[]>(READ_SET_KEY) ?? []);
}

export function loadDismissedIds(): Set<string> {
  return new Set(readJson<string[]>(CONTINUE_DISMISSED_KEY) ?? []);
}

/** Only an unfinished session is worth resuming. */
export function loadReadingSession(): ReadingSession | null {
  const session = readJson<ReadingSession>(READING_SESSION_KEY);
  return session && session.progress < READ_THRESHOLD ? session : null;
}

export function saveDismissedIds(ids: Iterable<string>) {
  writeJson(CONTINUE_DISMISSED_KEY, [...ids]);
}

/**
 * Records how far the reader got. Crossing READ_THRESHOLD marks the article
 * read and clears the session, so a finished article never offers to resume.
 */
export function saveReadingProgress(session: ReadingSession) {
  if (session.progress >= READ_THRESHOLD) {
    const read = loadReadSet();
    read.add(session.articleId);
    writeJson(READ_SET_KEY, [...read]);
    try {
      window.localStorage.removeItem(READING_SESSION_KEY);
    } catch {
      // ignore
    }
    return;
  }

  writeJson(READING_SESSION_KEY, session);
}
