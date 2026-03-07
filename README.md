# S-News

**把 Cursor 生成的日报，变成一份真正值得每天打开的信息界面。**

S-News 是一个本地优先的多主题日报阅读器。你用 Cursor 的 Command 生成通用、金融、AI 科技等日报，以 Markdown 存盘；用本仓库里的 Next.js 应用按日期、主题浏览和检索，让「命令产出」从散落文件夹升级为可读、可查的每日信息中枢。

---

## 为什么重要

- **信息在你这儿**：日报只存在本机 `NEWS/`，不依赖云库，可版本管理、可备份。
- **多主题、可追溯**：每条有摘要、链接和简评；按日期归档，方便回顾与检索。
- **生成可复现**：同一套 Command + 脚本，随时重跑或交给 cron 定时生成。
- **界面跟主题走**：Web 端支持亮/暗色与系统偏好，阅读体验一致。

适合想用 AI 做每日简报、又希望数据与动效都掌握在自己手里的人。

---

## 思路与流程

1. **定义日报**：在 `.cursor/commands/` 里为每个主题写一份「说明书」（步骤、模板、输出路径）。
2. **触发生成**：手动或定时执行 `scripts/run-*-news.sh`，通过 Cursor CLI 调用对应 Command，完成搜索与成文，写入 `NEWS/<topic>/`。
3. **阅读与检索**：本地跑 Next.js 应用，从文件系统读 Markdown，在浏览器里按日期/主题浏览、搜索标题与摘要。

数据流：**人 / cron → 脚本 → Cursor CLI → NEWS/*.md → Next.js 展示**。

---

## 项目结构

```
├── .cursor/commands/     # 各主题日报的 Command 定义
│   ├── general-news.md   # 日常通用
│   ├── finance-news.md   # 金融股市
│   └── aitech-news.md    # AI 与科技
├── NEWS/                 # 日报产出（按主题分子目录）
│   ├── general/
│   ├── finance/
│   └── ai-tech/
├── scripts/              # 调用 Cursor CLI 的 Shell 脚本
│   └── run-aitech-news.sh
├── app/                   # Next.js App Router
│   ├── page.tsx           # 首页：日期索引 + 今日摘要
│   ├── news/[topic]/[date]/  # 日报正文
│   └── api/news/          # 读 NEWS 的 API
├── components/            # 首页、卡片、主题切换等
├── lib/                   # 读 md、解析、索引（news-client, news-meta）
└── docs/
    └── s-news.md          # 设计与架构说明（扩展与协作用）
```

---

## 如何使用

### 环境要求

- Node 18+
- 若需**生成**日报：已安装并登录 [Cursor CLI](https://cursor.com)（`agent` 在 PATH 中）

### 生成日报

在项目根目录执行对应脚本，例如：

```bash
./scripts/run-aitech-news.sh
```

脚本会调用 `agent`，按 `.cursor/commands/aitech-news.md` 的流程做多轮搜索并写出 `NEWS/ai-tech/YYYY-MM-DD_*.md`。可仿照该脚本为 `general-news`、`finance-news` 写 `run-general-news.sh`、`run-finance-news.sh`，或用 cron 定时执行。

### 本地阅读

```bash
pnpm install   # 或 npm install
pnpm dev       # 默认 http://localhost:3011
```

浏览器打开后即可按日期、主题浏览，使用搜索框过滤标题/摘要/简评。

---

## 技术栈

- **Next.js** (App Router) + **TypeScript**
- **Tailwind CSS 4**，主题通过 `app/global.css` 的 CSS 变量（亮/暗与 `data-theme`）控制
- 日报解析：读 `NEWS/**/*.md`，frontmatter + 标题/摘要/链接/简评结构，无 CMS

---

## 后续可做

- **全文检索**：在现有关键词搜索上加强，或加轻量索引。
- **Runbook 与一键触发**：在 Web 内展示/复制运行命令，或（在受控环境）通过 API 触发本机脚本。
- **多脚本与定时**：补全 `run-general-news.sh`、`run-finance-news.sh` 及 `run_all_news.sh`，并写 cron/launchd 示例。
- **周报/月报**：若新增对应 Command 与产出格式，在应用中加列表与正文路由。

设计与规范细节见 **docs/s-news.md**。

---

*本地优先、开源友好。数据在你手里，界面随主题走。*
