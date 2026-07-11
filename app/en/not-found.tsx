import { NotFoundView } from "@/components/not-found-view";

/** 404 for anything under `/en` — always English, never cookie-dependent. */
export default function EnglishNotFound() {
  return <NotFoundView locale="en" />;
}
