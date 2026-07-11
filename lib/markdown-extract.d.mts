export type ExtractLocale = "zh" | "en";

export declare const SUMMARY_HEADING: Record<ExtractLocale, RegExp>;
export declare const FRAMING_MARKER: Record<ExtractLocale, RegExp>;

export function countMatches(content: string, pattern: RegExp): number;
export function extractTitle(content: string, fallback: string): string;
export function extractDescription(content: string, fallback: string): string;
export function extractTakeaway(content: string, locale?: ExtractLocale): string | undefined;
export function extractHighlights(content: string, locale?: ExtractLocale): string[];
export function getReadingMinutes(content: string): number;
export function countArticles(content: string): number;
export function countSections(content: string): number;
