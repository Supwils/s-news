import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[var(--color-bg-primary)] px-4 text-[var(--color-text-primary)] sm:px-6">
      <div className="w-full max-w-2xl rounded-[36px] border border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center shadow-[var(--shadow-card)] sm:p-12">
        <p className="text-sm uppercase tracking-[0.28em] text-[var(--color-text-muted)]">404 / Missing issue</p>
        <h1 className="font-display mt-4 text-4xl leading-none tracking-[-0.04em] sm:text-5xl">
          这份日报不存在
        </h1>
        <p className="mx-auto mt-5 max-w-xl text-sm leading-7 text-[var(--color-text-secondary)] sm:text-base">
          可能还没有生成对应日期的文件，或链接中的主题与日期不正确。你可以先回到首页继续浏览已有归档。
        </p>
        <Link
          href="/"
          className="mt-8 inline-flex items-center rounded-full border border-[var(--color-border-strong)] px-5 py-2.5 text-sm font-medium transition hover:bg-[var(--color-surface-muted)]"
        >
          返回 S-News 首页
        </Link>
      </div>
    </main>
  );
}
