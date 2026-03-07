import { NewsHome } from "@/components/news-home";
import { getAllNewsPreviews } from "@/lib/news";

export default async function HomePage() {
  const entries = await getAllNewsPreviews();

  return <NewsHome entries={entries} />;
}
