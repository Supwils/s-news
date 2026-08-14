export declare const MAX_RUNS: number;

export type TopicRun = {
  topic: string;
  status: "ok" | "failed";
  attempts: number;
  durationSec: number;
};

export type PipelineRun = {
  date: string;
  published: boolean;
  total: number;
  succeeded: string[];
  failed: string[];
  durationSec: number | null;
  topics: TopicRun[];
  source?: "measured" | "backfilled";
};

export type PipelineSummary = {
  runs: number;
  measuredRuns: number;
  firstDate: string;
  lastDate: string;
  published: number;
  publishRate: number;
  topicAttempts: number;
  topicFailures: number;
  topicFailureRate: number;
  medianDurationSec: number | null;
  slowestDurationSec: number | null;
};

export type TopicSummary = {
  topic: string;
  runs: number;
  failures: number;
  retries: number;
  failureRate: number;
  medianDurationSec: number | null;
};

export declare function appendRun(runs: PipelineRun[], run: PipelineRun, cap?: number): PipelineRun[];
export declare function summarize(runs: PipelineRun[] | undefined): PipelineSummary | null;
export declare function byTopic(runs: PipelineRun[] | undefined): TopicSummary[];
