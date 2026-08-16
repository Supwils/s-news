import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";

import { LocaleProvider } from "@/components/locale-context";
import "./global.css";
import { absoluteUrl, getSiteUrl, SITE_DESCRIPTION, SITE_NAME } from "@/lib/site";

// Web Analytics stays: it is on the free tier at this traffic and someone reads
// it. Speed Insights is gone — the subscription was cancelled for cost, and the
// component kept shipping 12.5 KB of script to every visitor to beacon vitals at
// a product no longer collecting them.
import { Analytics } from "@vercel/analytics/next";

// The three Latin faces are vendored under app/fonts/ rather than pulled with
// `next/font/google`, because that loader downloads the .woff2 binaries from
// fonts.gstatic.com *during the build*. When one of those fetches fails,
// Turbopack does not report a network error — it emits CSS pointing at an
// unresolvable internal module and the build dies with:
//
//   Module not found: Can't resolve '@vercel/turbopack-next/internal/font/google/font'
//
// That took down three of the last twenty production deploys (2026-08-13 twice,
// 2026-08-15), and it does it after the daily pipeline has already committed and
// pushed the day's digests — so the content is in git, the site never serves it,
// and only a redeploy fixes it. Source Serif 4 was always the one to fail: with
// three weights across two styles it had by far the most files to fetch.
//
// The vendored files are byte-for-byte the `latin` subset the Google loader was
// fetching, and the build emits the same four assets under the same content
// hashes — nothing on the critical path moves. What it does drop is the
// latin-ext / cyrillic / greek / vietnamese subsets, which that loader declared
// (and fetched on demand) regardless of `subsets: ["latin"]`, because
// `next/font/local` has no per-file unicode-range. Measured over the corpus that
// is 920 characters in 28.2M, all of which still render in the system fallback.
// app/fonts/README.md has the numbers, the provenance, and how to refresh.
//
// All three are variable fonts, hence the weight ranges below rather than a list
// of static weights.
//
// Body text is Chinese and renders in system fonts; these Latin faces only
// render the chrome.
const displayFont = localFont({
  src: [
    { path: "./fonts/source-serif-4-latin.woff2", weight: "200 900", style: "normal" },
    { path: "./fonts/source-serif-4-latin-italic.woff2", weight: "200 900", style: "italic" },
  ],
  display: "swap",
  variable: "--font-display",
  // Match the fallback metrics against a serif, not the sans-serif default —
  // this is the one knob `next/font/google` used to infer from the family.
  adjustFontFallback: "Times New Roman",
});

const bodyFont = localFont({
  src: [{ path: "./fonts/inter-latin.woff2", weight: "100 900", style: "normal" }],
  display: "swap",
  variable: "--font-body",
});

const monoFont = localFont({
  src: [{ path: "./fonts/jetbrains-mono-latin.woff2", weight: "400 800", style: "normal" }],
  display: "swap",
  variable: "--font-mono",
});

export const metadata: Metadata = {
  metadataBase: new URL(getSiteUrl()),
  title: {
    default: SITE_NAME,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  alternates: {
    canonical: "/",
    types: {
      "application/rss+xml": absoluteUrl("/feed.xml"),
    },
  },
  keywords: [
    "AI news",
    "daily digest",
    "news archive",
    "local-first",
    "technology news",
    "finance news",
    "science news",
  ],
  icons: {
    icon: "/snew-logo1.svg",
    apple: "/snew-logo1.svg",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE_NAME,
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [
      {
        url: absoluteUrl("/opengraph-image"),
        width: 1200,
        height: 630,
        alt: `${SITE_NAME} open graph image`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_NAME,
    description: SITE_DESCRIPTION,
    images: [absoluteUrl("/twitter-image")],
  },
};

const bootScript = `
(function(){
  var t=localStorage.getItem('s-news-theme');
  if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);
  else document.documentElement.removeAttribute('data-theme');
})();
`;

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable} antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: bootScript }} />
        <LocaleProvider initialLocale="zh">
          {children}
          <Analytics />
        </LocaleProvider>
      </body>
    </html>
  );
}
