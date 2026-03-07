export type TopicKey = "general" | "finance" | "ai-tech";

export type TopicMeta = {
  key: TopicKey;
  label: string;
  shortLabel: string;
  description: string;
  folder: string;
  accent: string;
  commandPath: string;
  scriptPath?: string;
};

export const TOPICS: TopicMeta[] = [
  {
    key: "general",
    label: "日常通用",
    shortLabel: "通用",
    description: "全球政治、经济、地缘与重要要闻。",
    folder: "general",
    accent: "var(--color-accent-gold)",
    commandPath: ".cursor/commands/general-news.md",
  },
  {
    key: "finance",
    label: "金融股市",
    shortLabel: "金融",
    description: "指数、科技股、财报、行业轮动与市场情绪。",
    folder: "finance",
    accent: "var(--color-accent-sky)",
    commandPath: ".cursor/commands/finance-news.md",
  },
  {
    key: "ai-tech",
    label: "AI 与科技",
    shortLabel: "AI/Tech",
    description: "模型、监管、公司动态、产品发布与资本动作。",
    folder: "ai-tech",
    accent: "var(--color-accent-rose)",
    commandPath: ".cursor/commands/aitech-news.md",
    scriptPath: "scripts/run-aitech-news.sh",
  },
];

const TOPIC_MAP = new Map(TOPICS.map((topic) => [topic.key, topic]));

export function getTopicMeta(topic: TopicKey) {
  return TOPIC_MAP.get(topic);
}

export function isTopicKey(value: string): value is TopicKey {
  return TOPIC_MAP.has(value as TopicKey);
}
