# Swil-News

中文 | [English](./README.en.md)

**把 Cursor 生成的日报，变成一份真正值得每天打开的信息界面。**

Swil-News 是一个本地优先的多主题日报阅读器。你用 Cursor 的 Command 生成通用、金融、AI 科技、运动健康营养等日报，以 Markdown 存盘；用本仓库里的 Next.js 应用按日期、主题浏览和检索，让「命令产出」从散落文件夹升级为可读、可查的每日信息中枢。

---

## 为什么重要

- **信息在你这儿**：日报只存在本机 `NEWS/`，不依赖云库，可版本管理、可备份。
- **多主题、可追溯**：每条有摘要、链接和简评；按日期归档，方便回顾与检索。
- **生成可复现**：同一套 Command + 脚本，随时重跑或交给 cron 定时生成。
- **界面跟主题走**：Web 端支持亮/暗色与系统偏好，阅读体验一致。

适合想用 AI 做每日简报、又希望数据与动效都掌握在自己手里的人。

---

## 功能总览

- **每日双语日报**：10 个主题 × 中/英双语，隔离生成、失败隔离（一个主题出错不影响其余发布）。
- **今日简报**：首页跨主题精选，当日各主题 highlights 汇成一屏。
- **周报 `/weekly`**：从每日索引零成本机械合成的按周回顾（无额外模型调用）。
- **跨主题事件 `/events`**：同一事件在不同主题日报中的多视角聚类（同日相似度 + 共享来源链接跨日串联）。
- **全文搜索 `/search`**：Pagefind 静态索引，主题/语言/时间（月、季、年）筛选。
- **链接健康**：每周体检全库约 1.7 万条外链，死链在阅读页自动提供 Wayback 存档兜底。
- **RSS**：全站与每主题 feed（`/feed.xml`、`/news/[topic]/feed.xml`，中英各一套）。

---

## 本地 vs 部署

| 场景 | 行为 |
|------|------|
| **本地运行** | 可访问 **Runtime** 页面，在 Web 内一键触发生成脚本；新闻从本机 `NEWS/` 读取。 |
| **公共部署（如 Vercel）** | **无 Runtime**：不执行脚本，仅展示已提交的 `NEWS/` 日报；导航中不显示「Runtime」入口，访问 `/runtime` 会看到只读说明并引导回首页。 |

数据流：**本地生成 → 写入 `NEWS/` → 提交并推送 → 部署时打包进站点 → 访客只读**。部署环境通过 `VERCEL` 等变量关闭执行权限，安全且简单。

---

## 思路与流程

1. **定义日报**：在 `.cursor/commands/` 里为每个主题写一份「说明书」（步骤、模板、输出路径）。
2. **触发生成**：本地手动或定时执行 `scripts/run-*-news.sh`，或在本机打开应用后从 Runtime 页点击运行；脚本通过 Cursor CLI 调用对应 Command，完成搜索与成文，写入 `NEWS/<topic>/`。
3. **阅读与检索**：本地或部署后的 Next.js 应用从文件系统（或构建包内的 `NEWS/`）读 Markdown，在浏览器里按日期/主题浏览、搜索标题与摘要。

数据流：**人 / cron → 脚本 → Cursor CLI → NEWS/*.md → Next.js 展示**。

---

## 项目结构

```
├── .cursor/commands/     # 各主题日报的 Command 定义
│   ├── general-news.md   # 日常通用
│   ├── finance-news.md   # 金融股市
│   ├── aitech-news.md    # AI 与科技
│   └── …
├── NEWS/                 # 日报产出（主题 × zh/en 双语子目录，可提交 Git）
│   ├── general/{zh,en}/
│   ├── finance/{zh,en}/
│   ├── ai-tech/{zh,en}/
│   └── …（共 10 个主题）
├── scripts/              # 生成、校验、构建索引与运维脚本
│   ├── daily-news-and-commit.sh  # 每日全流程：生成→校验→构建→提交推送→预热缓存
│   ├── run_all_news.sh           # 并发跑全部主题（隔离失败、阈值发布）
│   ├── validate-news-*.mjs       # 布局/内容校验（构建前置闸门）
│   ├── build-{news-index,rollups,events,search-index}.mjs
│   └── check-links.mjs           # 每周链接健康体检
├── app/                   # Next.js App Router（/ 中文树 + /en 英文树）
│   ├── page.tsx           # 首页：今日简报 + 日期索引
│   ├── news/[topic]/[date]/  # 日报正文
│   ├── weekly/ events/ search/ archive/  # 周报、事件、搜索、月归档
│   ├── runtime/           # 本地可用的「运行日报生成」页
│   └── api/               # 读 NEWS 的 API；runtime/generate 仅本地可触发
├── components/  lib/      # UI 组件；索引读取、解析、事件/周报逻辑
└── docs/
    ├── roadmap.md         # 状态板：已交付 / 未完成 / 决策记录（权威）
    └── s-news.md          # 设计与架构说明（扩展与协作用）
```

---

## 如何使用

### 环境要求

- Node 22+（测试经 `--experimental-strip-types` 兼容 22.6+，推荐 22.18+）
- 若需**生成**日报：已安装并登录 [Cursor CLI](https://cursor.com)（`agent` 在 PATH 中）

### 生成日报

在项目根目录执行对应脚本，例如单主题：

```bash
./scripts/run-aitech-news.sh
```

或一次跑完全部主题（耗时较长，建议本机或自建环境执行）：

```bash
./scripts/run_all_news.sh
```

脚本会调用 `agent`，按 `.cursor/commands/*.md` 的流程做多轮搜索并写出 `NEWS/<topic>/{zh,en}/YYYY-MM-DD_*.md`；产出立即经过严格校验，不合格的日报被隔离而不会破坏站点。日常全流程（生成→校验→构建→提交推送→缓存预热）由 `scripts/daily-news-and-commit.sh` 承担，可配合 cron/launchd 定时执行。

### 本地阅读与 Runtime

```bash
pnpm install   # 或 npm install
pnpm dev       # 默认 http://localhost:3011
```

浏览器打开后即可按日期、主题浏览，使用搜索框过滤；若在本机运行，导航中会出现 **Runtime**，可在此页选择主题并点击运行，触发生成脚本并写入 `NEWS/`。

### 本地运行生产构建

构建并启动生产服务器（用于验证部署效果或性能）：

```bash
pnpm build
pnpm start     # 默认端口 3000；若需与 dev 一致可：pnpm start -- -p 3011
```

生产模式下仍从当前目录的 `NEWS/` 读取；在本机时 Runtime 接口可用，行为与 `pnpm dev` 一致。

### 部署（如 Vercel + GitHub）

1. 将仓库连接 Vercel，按需配置构建命令（默认 `next build`）与输出。
2. 日常流程：在**本地**运行上述脚本生成日报 → 将 `NEWS/` 的变更 **commit 并 push** → Vercel 自动重新部署，新站点即包含最新日报。
3. 部署后的站点**不提供 Runtime**：不执行脚本，仅展示已打包的 `NEWS/` 内容；导航中不显示「Runtime」入口，访问 `/runtime` 会看到只读说明。

---

## 技术栈

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS 4**，主题通过 `app/global.css` 的 CSS 变量（亮/暗与 `data-theme`）控制
- 日报解析：读 `NEWS/**/*.md`，frontmatter + 标题/摘要/链接/简评结构，无 CMS

---

## 后续方向

当前状态板与未完成事项见 **docs/roadmap.md**（权威）。摘要：

- **事件跨日串联与叙事**（模型辅助，把机械聚类升级为跨天的事件时间线）。
- **生成任务上云**：摆脱单机 launchd 依赖，笔记本合盖也不断更。
- **移动端性能巡检**：桌面端已优化，移动端 Speed Insights 尚未复查。

设计与规范细节见 **docs/s-news.md**。

## 许可

这个仓库里有两种东西，许可也是两套。

- **代码** —— 应用、生成与校验脚本、索引构建、测试、配置：[MIT](./LICENSE)，© 2026 SUPWILSOFT LLC。随便用、随便改。
- **`NEWS/` 下的日报内容** —— 见 [LICENSE-CONTENT](./LICENSE-CONTENT)。这些是对别处报道的机器摘要，每条都带原文链接。底层的报道属于各自的媒体，不属于这个项目，所以这里不能拿 MIT 一并授出去。读、转链接、带出处引用都没问题；整批转载或者拿去做训练集，先开个 issue 问一声。

摘要由模型生成、机械校验，没有人工编辑。它们会有错，不能替代读原文。

---

*开源友好。数据在你手里，界面随主题走。*
