import type { Locale } from "@/data/copy";

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

type TopicMetaRaw = TopicMeta & {
  labelEn: string;
  shortLabelEn: string;
  descriptionEn: string;
};

const TOPICS_RAW: TopicMetaRaw[] = [
  {
    key: "general",
    label: "日常通用",
    shortLabel: "通用",
    description: "全球政治、经济、地缘与重要要闻。",
    labelEn: "General",
    shortLabelEn: "General",
    descriptionEn: "Global politics, economy, geopolitics and major news.",
    folder: "general",
    accent: "var(--color-accent-gold)",
    commandPath: ".cursor/commands/general-news.md",
  },
  {
    key: "finance",
    label: "金融股市",
    shortLabel: "金融",
    description: "指数、科技股、财报、行业轮动与市场情绪。",
    labelEn: "Finance & markets",
    shortLabelEn: "Finance",
    descriptionEn: "Indices, tech stocks, earnings, sector rotation and sentiment.",
    folder: "finance",
    accent: "var(--color-accent-sky)",
    commandPath: ".cursor/commands/finance-news.md",
  },
  {
    key: "ai-tech",
    label: "AI 与科技",
    shortLabel: "AI/Tech",
    description: "模型、监管、公司动态、产品发布与资本动作。",
    labelEn: "AI & tech",
    shortLabelEn: "AI/Tech",
    descriptionEn: "Models, regulation, company news, product launches and funding.",
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
    labelEn: "Science & research",
    shortLabelEn: "Science",
    descriptionEn: "Discoveries, space, biotech, climate and environment.",
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
    labelEn: "Crypto & Web3",
    shortLabelEn: "Crypto",
    descriptionEn: "Crypto, regulation, DeFi, institutions and market news.",
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
    labelEn: "Energy & climate",
    shortLabelEn: "Energy/Climate",
    descriptionEn: "Energy policy, renewables, carbon markets, extreme weather and transition.",
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
    labelEn: "Auto & mobility",
    shortLabelEn: "Auto/Mobility",
    descriptionEn: "EVs, autonomous driving, mobility platforms, batteries and supply chain.",
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
    labelEn: "Gaming & entertainment",
    shortLabelEn: "Gaming",
    descriptionEn: "Gaming, streaming, entertainment M&A and regulation.",
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
    labelEn: "Supply chain & manufacturing",
    shortLabelEn: "Supply chain",
    descriptionEn: "Global manufacturing, supply chain shifts, critical materials and capacity.",
    folder: "supply-chain",
    accent: "var(--color-accent-slate)",
    commandPath: ".cursor/commands/supply-chain-news.md",
    scriptPath: "scripts/run-supply-chain-news.sh",
  },
];

export const TOPICS: TopicMeta[] = TOPICS_RAW.map((t) => ({
  key: t.key,
  label: t.label,
  shortLabel: t.shortLabel,
  description: t.description,
  folder: t.folder,
  accent: t.accent,
  commandPath: t.commandPath,
  scriptPath: t.scriptPath,
}));

const TOPIC_MAP = new Map(TOPICS_RAW.map((topic) => [topic.key, topic]));

export function getTopicMeta(topic: TopicKey, locale: Locale = "zh"): TopicMeta | undefined {
  const raw = TOPIC_MAP.get(topic);
  if (!raw) return undefined;
  if (locale === "en") {
    return {
      key: raw.key,
      label: raw.labelEn,
      shortLabel: raw.shortLabelEn,
      description: raw.descriptionEn,
      folder: raw.folder,
      accent: raw.accent,
      commandPath: raw.commandPath,
      scriptPath: raw.scriptPath,
    };
  }
  return {
    key: raw.key,
    label: raw.label,
    shortLabel: raw.shortLabel,
    description: raw.description,
    folder: raw.folder,
    accent: raw.accent,
    commandPath: raw.commandPath,
    scriptPath: raw.scriptPath,
  };
}

export function isTopicKey(value: string): value is TopicKey {
  return TOPIC_MAP.has(value as TopicKey);
}
