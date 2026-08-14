export declare function extractUrls(markdown: string): string[];

export declare function classifyStatus(status: number | string): "ok" | "dead" | "unknown";

export declare function archiveUrl(date: string, url: string): string;

export declare function interleaveByHost(urls: string[]): string[];

export declare function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<R[]>;

export declare function chunk<T>(items: T[], size: number): T[][];
