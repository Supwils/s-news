export type TopicKey =
  | "general"
  | "finance"
  | "ai-tech"
  | "science"
  | "crypto"
  | "energy-climate"
  | "auto-mobility"
  | "gaming"
  | "supply-chain";

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
  {
    key: "science",
    label: "科学与研究",
    shortLabel: "科学",
    description: "科学发现、航天、生物医药、气候与环境研究。",
    folder: "science",
    accent: "var(--color-accent-green)",
    commandPath: ".cursor/commands/science-news.md",
    scriptPath: "scripts/run-science-news.sh",
  },
  {
    key: "crypto",
    label: "加密与 Web3",
    shortLabel: "Crypto",
    description: "加密货币、监管、DeFi、机构与市场要闻。",
    folder: "crypto",
    accent: "var(--color-accent-violet)",
    commandPath: ".cursor/commands/crypto-news.md",
    scriptPath: "scripts/run-crypto-news.sh",
  },
  {
    key: "energy-climate",
    label: "能源与气候",
    shortLabel: "能源/气候",
    description: "能源政策、绿电与储能、碳市场、极端天气与转型。",
    folder: "energy-climate",
    accent: "var(--color-accent-amber)",
    commandPath: ".cursor/commands/energy-climate-news.md",
    scriptPath: "scripts/run-energy-climate-news.sh",
  },
  {
    key: "auto-mobility",
    label: "汽车与出行",
    shortLabel: "汽车/出行",
    description: "电动车、自动驾驶、出行平台、电池与供应链。",
    folder: "auto-mobility",
    accent: "var(--color-accent-blue)",
    commandPath: ".cursor/commands/auto-mobility-news.md",
    scriptPath: "scripts/run-auto-mobility-news.sh",
  },
  {
    key: "gaming",
    label: "游戏与文娱",
    shortLabel: "游戏",
    description: "游戏行业、流媒体、文娱并购与监管。",
    folder: "gaming",
    accent: "var(--color-accent-fuchsia)",
    commandPath: ".cursor/commands/gaming-news.md",
    scriptPath: "scripts/run-gaming-news.sh",
  },
  {
    key: "supply-chain",
    label: "供应链与制造",
    shortLabel: "供应链",
    description: "全球制造、供应链迁移、关键物料与产能。",
    folder: "supply-chain",
    accent: "var(--color-accent-slate)",
    commandPath: ".cursor/commands/supply-chain-news.md",
    scriptPath: "scripts/run-supply-chain-news.sh",
  },
];

const TOPIC_MAP = new Map(TOPICS.map((topic) => [topic.key, topic]));

export function getTopicMeta(topic: TopicKey) {
  return TOPIC_MAP.get(topic);
}

export function isTopicKey(value: string): value is TopicKey {
  return TOPIC_MAP.has(value as TopicKey);
}
