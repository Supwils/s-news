import { NewsHome } from "@/components/news-home";
import { getAllNewsPreviews } from "@/lib/news";
import { getLocaleFromCookie } from "@/lib/get-locale";

export default async function HomePage() {
  const locale = await getLocaleFromCookie();
  const entries = await getAllNewsPreviews(locale);

  return <NewsHome entries={entries} />;
}
