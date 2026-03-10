/**
 * Centralized copy for About page, home, and shared UI.
 * Use getCopy(locale) for locale-aware strings; keys stay the same across zh/en.
 */

export type Locale = "zh" | "en";

export type RuntimeCopy = {
  readOnlyHeading: string;
  readOnlyBody: string;
  backToNews: string;
  runHeading: string;
  runBody: string;
  runButton: string;
  runningLabel: string;
  resultSuccess: string;
  resultError: string;
  topicLabel: string;
  navHome: string;
  navAbout: string;
  navRuntime: string;
  siteTitle: string;
  siteSubtitle: string;
  allTopics: string;
  progressStep: (step: number, total: number) => string;
  progressRunning: (label: string) => string;
  progressPercent: (pct: number) => string;
};

const copyZh = {
  about: {
    siteName: "S-News",
    headerSubtitle: "What this thing is, and why it exists",
    nav: {
      home: "首页",
      about: "About",
      runtime: "Runtime",
    },
    hero: {
      badge: "About S-News",
      titleLine1: '它不是一个"会写字的工具页"。',
      titleLine2: "它更像一张每天自动摊开的报桌。",
      intro:
        "S-News 把本地生成的多主题日报整理成可长期打开的阅读界面。你不需要记住脚本名，也不用回忆文件夹埋在哪一层。打开首页，今天的内容就已经站好了队。",
    },
    metrics: {
      totalLabel: "总日报数",
      totalHint: "每一份都留在本地归档里",
      todayLabel: "今天上桌",
      todayNoData: "今天还没开张",
      topicLabel: "主题数",
      topicHint: "通用、金融、科技、科学、加密、能源气候、汽车出行、游戏、供应链",
      archiveLabel: "归档天数",
      archiveHint: "回看历史比翻聊天记录靠谱",
    },
    editorial: {
      badge: "Editorial system",
      heading: "为什么首页现在更克制了",
      body: '因为首页的工作应该是"把新闻递到你眼前"，而不是先给你上产品宣讲会。说明性内容集中放在这里，首页则尽量留给最新日报、搜索和归档。',
      cards: [
        { title: "首页先看内容", description: "打开之后先看到今天有什么，再决定要不要点进细看。重要信息先上桌，介绍文字靠边坐。" },
        { title: "About 负责讲清楚", description: "产品怎么组织、为什么这么排、脚本从哪来，这些解释留在 About，读起来更完整，也不挡路。" },
        { title: "风格更像报桌", description: "少一点空泛技术词，多一点像在翻报纸、挑版面、回看旧闻的感觉。" },
      ],
    },
    signalFilter: {
      badge: "Signal filter",
      heading: "它怎么帮你少走弯路",
      body: '每份日报都按日期和主题归档，同时把标题、摘要、简评和重点线索都放进搜索入口。你不需要记得那篇内容到底叫"市场观察"还是"夜盘小结"，大概记住一个词就够了。',
      cards: [
        { title: "按日期翻", description: "今天、昨天、上周都排得整整齐齐，不靠记忆力硬撑。" },
        { title: "按主题筛", description: "只看自己关心的版面，不用被所有内容一起扑脸。" },
        { title: "按线索搜", description: "搜摘要、搜简评、搜主题词，比翻目录快得多。" },
        { title: "按卡片读", description: "先看概览，再决定要不要展开全文，节奏更轻。" },
      ],
    },
    runbook: {
      badge: "Runbook",
      heading: "日报从哪来",
      body: "简单说，先跑脚本，再写入本地目录，最后由页面读取展示。没有魔法，只有一套比较体面的整理方式。原材料还是 Markdown，只是终于不用长期住在文件夹地下室。",
      flowCards: [
        { step: "01", title: "触发生成", description: "在 Runtime 或 shell 里运行对应脚本，开始拉起某个主题的日报生成流程。" },
        { step: "02", title: "写回本地", description: "内容整理完成后写入 `NEWS/<topic>/`，按日期保存，后续回看不靠运气。" },
        { step: "03", title: "界面读取", description: "Next.js 读取本地 Markdown，整理出卡片、归档、筛选和全文页面。" },
      ],
    },
    cta: {
      label: "Next stop",
      heading: "讲解到这里，差不多该回去看新闻了。",
      body: "首页负责看今天，Runtime 负责开工，这一页负责把事情讲明白。分工清楚，大家都轻松。",
      backHome: "回首页看新闻",
      toRuntime: "去 Runtime",
    },
  },
  runtime: {
    readOnlyHeading: "本站为只读展示",
    readOnlyBody: "日报生成仅在本地或配置的自建环境下可用。请返回首页浏览已归档的日报。",
    backToNews: "返回首页看新闻",
    runHeading: "运行日报生成",
    runBody: "选择主题后点击运行，将调用本机 agent CLI 执行对应脚本并写入 NEWS 目录。仅在本地或配置的自建环境下可用。",
    runButton: "运行",
    runningLabel: "运行中…",
    resultSuccess: "运行完成",
    resultError: "运行结束（有错误或超时）",
    topicLabel: "主题",
    navHome: "首页",
    navAbout: "About",
    navRuntime: "Runtime",
    siteTitle: "S-News",
    siteSubtitle: "Run scripts, refill the news desk",
    allTopics: "全部主题",
    progressStep: (step: number, total: number) => `第 ${step} / ${total} 步`,
    progressRunning: (label: string) => `正在运行：${label}`,
    progressPercent: (pct: number) => `已完成 ${pct}%`,
  } satisfies RuntimeCopy,
  home: {
    siteName: "S-News",
    headerSubtitle: "Daily news desk, minus the folder chaos",
    nav: {
      about: "About",
      runtime: "Runtime",
      localFirst: "本地优先",
      dateArchive: "按日期归档",
    },
    hero: {
      badge: "News desk",
      titleLine1: "别让日报在文件夹里打地铺。",
      titleLine2: "今天的重要事，已经在这里排好队。",
      intro: "这里先看今天，再翻旧账。想知道这套产品怎么运作、为什么这么排版，去 About；想直接开跑生成，去 Runtime。",
      ctaToday: "先看今天的新闻",
      ctaAbout: "看看 About",
      ctaRuntime: "去 Runtime 生成",
    },
    metrics: {
      totalLabel: "已归档日报",
      totalHint: "都在这儿，不用翻文件夹",
      todayLabel: "今天有几份",
      todayNoData: "今天还没上报",
      topicLabel: "主题数量",
      archiveLabel: "归档天数",
      archiveHint: "按日期排队，回看很省心",
    },
    todayStack: {
      badge: "Today's stack",
      headlineSuffix: "的头版",
      body: "先看最新这一批。它们已经替你把今天的重点排好了，不用自己从零开荒。",
      countLabel: "今日已整理",
      countSuffix: "份日报",
    },
    todayPulse: {
      badge: "Today's pulse",
      heading: "今天的头版已经摊开了",
      topicReadySuffix: "已就位",
      fallbackLead: "线索已经摆好，直接挑着看",
      bodySuffix: "。先看这批，再决定深入哪一栏。",
      latestLabel: "最新日报",
    },
    signalFilter: {
      badge: "Signal filter",
      titleLine1: "想精读，就筛。",
      titleLine2: "想摸鱼，也能快速装得很懂。",
      body: "搜索标题、摘要、简评或主题。先把范围缩小，再点进具体日报，眼睛和耐心都会感谢你。",
      cards: [
        { title: "按主题看", description: "只看金融、AI、能源、汽车、游戏、供应链等，或者全都来一遍。" },
        { title: "按关键词找", description: "一个词就能把相关日报从归档里揪出来。" },
        { title: "即时反馈", descriptionPrefix: "现在命中 ", descriptionSuffix: " 份日报，没有神秘加载。" },
      ],
      searchPlaceholder: "搜标题、摘要、简评或主题…",
      searchA11y: "搜索日报",
      filterAllTopics: "全部主题",
      resultSummaryPrefix: "当前命中 ",
      resultSummarySuffix: " 份日报，按日期倒序展示。",
    },
    dateArchive: {
      badge: "Date archive",
      issue: "issue",
      issues: "issues",
    },
    noResults: {
      badge: "No results",
      heading: "没有找到匹配内容",
      body: "换个关键词，或者切回全部主题。日报没有消失，只是暂时没被你逮到。",
      backLink: "回到全部视图",
    },
    newsDesk: {
      topicPlates: "个版面",
      stackLabel: "已摞好",
      stackSuffix: "份归档",
    },
  },
  ui: {
    newsCard: {
      readFull: "阅读完整日报",
      viewEntry: (title: string) => `查看 ${title}`,
      min: "min",
      sections: "sections",
      stories: "stories",
    },
    theme: {
      light: "浅色",
      dark: "深色",
      system: "跟随系统",
      ariaLabel: (label: string) => `主题：${label}，点击切换`,
    },
    topicPage: {
      backHome: "返回首页",
      backToTopic: (label: string) => `返回 ${label}`,
      badge: "Topic archive",
      defaultTitle: "日报",
    },
    detailPage: {
      issueDetails: "期数详情",
      keyHighlights: "要点",
      dailyFraming: "今日定性",
      minRead: (min: number) => `${min} 分钟阅读`,
    },
  },
  news: {
    untitled: "未命名日报",
    noDescription: "本日报暂无摘要说明。",
  },
  notFound: {
    badge: "404 / Missing issue",
    title: "这份日报不存在",
    body: "可能还没有生成对应日期的文件，或链接中的主题与日期不正确。你可以先回到首页继续浏览已有归档。",
    backLink: "返回 S-News 首页",
  },
} as const;

const copyEn = {
  about: {
    siteName: "S-News",
    headerSubtitle: "What this thing is, and why it exists",
    nav: {
      home: "Home",
      about: "About",
      runtime: "Runtime",
    },
    hero: {
      badge: "About S-News",
      titleLine1: 'It\'s not a "tool page that types."',
      titleLine2: "It\'s more like a daily news desk that opens by itself.",
      intro:
        "S-News turns locally generated multi-topic digests into a reading interface you can keep open. No need to remember script names or folder paths. Open the home page and today\'s content is already lined up.",
    },
    metrics: {
      totalLabel: "Total digests",
      totalHint: "All archived locally",
      todayLabel: "Today\'s stack",
      todayNoData: "Nothing yet today",
      topicLabel: "Topics",
      topicHint: "General, finance, tech, science, crypto, energy & climate, auto, gaming, supply chain",
      archiveLabel: "Archive days",
      archiveHint: "Look back without digging through chat logs",
    },
    editorial: {
      badge: "Editorial system",
      heading: "Why the home page stays minimal",
      body: "The home page should hand you the news, not a product pitch. Explanatory content lives here on About; the home page stays for today\'s digests, search, and archive.",
      cards: [
        { title: "Content first on home", description: "You see what\'s there today, then decide what to open. Important info first; intro copy stays out of the way." },
        { title: "About explains the rest", description: "How the product is organized, why it\'s laid out this way, where scripts live—all explained here, in one place." },
        { title: "Newspaper-desk feel", description: "Less jargon, more of a “flip the paper, pick a section, look back” experience." },
      ],
    },
    signalFilter: {
      badge: "Signal filter",
      heading: "How it helps you cut through the noise",
      body: "Each digest is archived by date and topic; titles, summaries, and highlights are all searchable. You don\'t need to remember whether it was “market watch” or “night session”—one word is enough.",
      cards: [
        { title: "By date", description: "Today, yesterday, last week—all in order, no memory required." },
        { title: "By topic", description: "Only the sections you care about, without everything at once." },
        { title: "By search", description: "Search summaries, highlights, or topic terms—faster than scrolling a table of contents." },
        { title: "By card", description: "Scan the overview, then expand if you want the full read." },
      ],
    },
    runbook: {
      badge: "Runbook",
      heading: "Where digests come from",
      body: "Run scripts, write to a local directory, then the app reads and displays. No magic—just a tidy pipeline. Still Markdown; it just doesn\'t live in a folder basement anymore.",
      flowCards: [
        { step: "01", title: "Trigger", description: "Run the script for a topic from Runtime or the shell to start the digest pipeline." },
        { step: "02", title: "Write locally", description: "Output goes to `NEWS/<topic>/` by date so you can revisit anytime." },
        { step: "03", title: "App reads", description: "Next.js reads the Markdown and turns it into cards, archive, filters, and full-page views." },
      ],
    },
    cta: {
      label: "Next stop",
      heading: "Enough said—time to get back to the news.",
      body: "Home for today, Runtime to run, this page to explain. Clear roles, less friction.",
      backHome: "Back to news",
      toRuntime: "To Runtime",
    },
  },
  runtime: {
    readOnlyHeading: "Read-only site",
    readOnlyBody: "Digest generation runs only locally or in your own environment. Please use the home page to browse archived digests.",
    backToNews: "Back to news",
    runHeading: "Run digest generation",
    runBody: "Pick a topic and click Run to invoke the local agent CLI and write to the NEWS directory. Only available locally or in your configured environment.",
    runButton: "Run",
    runningLabel: "Running…",
    resultSuccess: "Run complete",
    resultError: "Run finished (error or timeout)",
    topicLabel: "Topic",
    navHome: "Home",
    navAbout: "About",
    navRuntime: "Runtime",
    siteTitle: "S-News",
    siteSubtitle: "Run scripts, refill the news desk",
    allTopics: "All topics",
    progressStep: (step: number, total: number) => `Step ${step} of ${total}`,
    progressRunning: (label: string) => `Running: ${label}`,
    progressPercent: (pct: number) => `${pct}% complete`,
  } satisfies RuntimeCopy,
  home: {
    siteName: "S-News",
    headerSubtitle: "Daily news desk, minus the folder chaos",
    nav: {
      about: "About",
      runtime: "Runtime",
      localFirst: "Local-first",
      dateArchive: "By date",
    },
    hero: {
      badge: "News desk",
      titleLine1: "Don\'t let digests sleep in folders.",
      titleLine2: "Today\'s important stuff is already lined up here.",
      intro: "See today first, then dig into the archive. For how this works and why it\'s laid out this way, go to About; to run generation, go to Runtime.",
      ctaToday: "See today\'s news",
      ctaAbout: "About",
      ctaRuntime: "Run from Runtime",
    },
    metrics: {
      totalLabel: "Archived digests",
      totalHint: "All here, no folder hunting",
      todayLabel: "Today\'s count",
      todayNoData: "Nothing yet",
      topicLabel: "Topics",
      archiveLabel: "Archive days",
      archiveHint: "By date, easy to look back",
    },
    todayStack: {
      badge: "Today\'s stack",
      headlineSuffix: " front",
      body: "Start with the latest batch. It\'s already ordered so you can skim before diving in.",
      countLabel: "Today\'s digests",
      countSuffix: " digests",
    },
    todayPulse: {
      badge: "Today\'s pulse",
      heading: "Today\'s front is open",
      topicReadySuffix: " ready",
      fallbackLead: "Leads are set; pick what to read",
      bodySuffix: ". Start with this batch, then go deeper.",
      latestLabel: "Latest digest",
    },
    signalFilter: {
      badge: "Signal filter",
      titleLine1: "Want to dig in? Filter.",
      titleLine2: "Want to skim? Still look sharp.",
      body: "Search by title, summary, highlights, or topic. Narrow the set, then open a digest. Your eyes and patience will thank you.",
      cards: [
        { title: "By topic", description: "Finance, AI, energy, auto, gaming, supply chain—or all of them." },
        { title: "By keyword", description: "One word can pull the right digest from the archive." },
        { title: "Live results", descriptionPrefix: "Showing ", descriptionSuffix: " digests, no mystery loading." },
      ],
      searchPlaceholder: "Search title, summary, highlights, or topic…",
      searchA11y: "Search digests",
      filterAllTopics: "All topics",
      resultSummaryPrefix: "Showing ",
      resultSummarySuffix: " digests, newest first.",
    },
    dateArchive: {
      badge: "Date archive",
      issue: "issue",
      issues: "issues",
    },
    noResults: {
      badge: "No results",
      heading: "No matches",
      body: "Try another keyword or switch back to all topics. The digests are still there—just not hit by this search.",
      backLink: "Back to full view",
    },
    newsDesk: {
      topicPlates: " plates",
      stackLabel: "Stacked",
      stackSuffix: " archived",
    },
  },
  ui: {
    newsCard: {
      readFull: "Read full digest",
      viewEntry: (title: string) => `View ${title}`,
      min: "min",
      sections: "sections",
      stories: "stories",
    },
    theme: {
      light: "Light",
      dark: "Dark",
      system: "System",
      ariaLabel: (label: string) => `Theme: ${label}, click to switch`,
    },
    topicPage: {
      backHome: "Back to home",
      backToTopic: (label: string) => `Back to ${label}`,
      badge: "Topic archive",
      defaultTitle: "Digest",
    },
    detailPage: {
      issueDetails: "Issue details",
      keyHighlights: "Key highlights",
      dailyFraming: "Daily framing",
      minRead: (min: number) => `${min} min read`,
    },
  },
  news: {
    untitled: "Untitled digest",
    noDescription: "No summary for this digest.",
  },
  notFound: {
    badge: "404 / Missing issue",
    title: "This digest doesn\'t exist",
    body: "The file for this date may not exist yet, or the topic/date in the URL may be wrong. You can go back to the home page to browse the archive.",
    backLink: "Back to S-News home",
  },
} as const;

const COPIES: Record<Locale, typeof copyZh> = {
  zh: copyZh,
  en: copyEn as unknown as typeof copyZh,
};

export function getCopy(locale: Locale = "zh") {
  return COPIES[locale] ?? copyZh;
}

/** @deprecated Use getCopy(locale) for i18n. Default export kept for backward compatibility during migration. */
export const copy = copyZh;
