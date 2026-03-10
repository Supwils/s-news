import type { Metadata } from "next";
import { Cormorant_Garamond, Instrument_Sans } from "next/font/google";
import type { ReactNode } from "react";

import { LocaleProvider } from "@/components/locale-context";
import { LocaleSwitch } from "@/components/locale-switch";
import { ThemeSwitch } from "@/components/theme-switch";
import "./global.css";
import { getLocaleFromCookie } from "@/lib/get-locale";

import { Analytics } from "@vercel/analytics/next"

const displayFont = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-display",
});

const bodyFont = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "S-News",
  description: "Local-first daily news desk.",
  icons: {
    icon: "/snew-logo1.svg",
    apple: "/snew-logo1.svg",
  },
};

const themeScript = `
(function(){
  var t=localStorage.getItem('s-news-theme');
  if(t==='light'||t==='dark')document.documentElement.setAttribute('data-theme',t);
  else document.documentElement.removeAttribute('data-theme');
})();
`;

export default async function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  const locale = await getLocaleFromCookie();
  const lang = locale === "en" ? "en" : "zh-CN";

  return (
    <html lang={lang} suppressHydrationWarning>
      <body className={`${displayFont.variable} ${bodyFont.variable} antialiased`}>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <LocaleProvider initialLocale={locale}>
          <div className="fixed right-3 top-3 z-[9999] flex items-center gap-2 sm:right-6 sm:top-4 md:top-5" style={{ pointerEvents: "auto" }}>
            <LocaleSwitch />
            <ThemeSwitch />
          </div>
          {children}
          <Analytics />
        </LocaleProvider>
      </body>
    </html>
  );
}
