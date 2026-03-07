# S-News · 设计架构与开发文档

> 多源日报生成与阅读系统：Cursor Command 驱动生成 → Markdown 存储 → Next.js 本地/开源 Web 应用展示。本文档为**设计与架构说明**，不包含具体代码实现，供后续开发与开源协作使用。

---

## 一、项目定位与目标

### 1.1 产品愿景

- **S-News**（或最终产品名）：面向个人与小团队的**每日多主题新闻/资讯日报**系统。
- 用户通过 **Cursor 的 AI + 实时搜索** 生成结构化日报（通用、金融、AI 科技等），以 **Markdown** 落盘；通过 **本地运行的 Next.js Web App** 按日期/主题浏览、检索与阅读。
- 设计目标：**本地优先、开源友好、可定时生成、界面简洁响应式**，适合作为「个人信息中枢」或开源模板二次扩展。

### 1.2 核心价值

- **一键/定时生成**：通过 Cursor CLI + 脚本（bash 或 Python）触发 command，消耗 Cursor 额度完成搜索与成文。
- **多主题日报**：通用要闻、金融股市、AI 与科技等，各主题独立 command、独立目录、统一 Markdown 结构。
- **可追溯与可复现**：每条新闻含摘要、链接、简评；日报按日期归档，便于回顾与检索。
- **本地运行、数据自主**：日报文件存于用户本机 `NEWS/`，Web App 读本地目录或同步后的目录，无需必选云数据库。

---

## 二、当前系统架构（已实现）

### 2.1 组成部分

| 层级 | 路径 / 形态 | 说明 |
|------|----------------|------|
| **Command 定义** | `.cursor/commands/*.md` | 各日报的「说明书」：步骤（日期、多轮搜索、筛选、模板）、单条要素（标题、摘要、链接、简评）、输出路径与文件名规则。 |
| **日报数据** | `NEWS/<topic>/YYYY-MM-DD_<主题名>日报.md` | 按主题分子目录，按日期单文件；纯 Markdown，可版本管理。 |
| **触发脚本** | `scripts/run-aitech-news.sh` | Bash 调用 Cursor CLI：`agent -p --force [--model auto] "@.cursor/commands/aitech-news.md" "<执行指令>"`，工作目录为项目根。 |

### 2.2 已有 Command 与输出路径

| Command 文件 | 输出目录 | 日报文件名示例 |
|--------------|----------|----------------|
| `general-news.md` | `NEWS/general/` | `YYYY-MM-DD_日常通用新闻日报.md` |
| `finance-news.md` | `NEWS/finance/` | `YYYY-MM-DD_金融与股市新闻日报.md` |
| `aitech-news.md` | `NEWS/ai-tech/` | `YYYY-MM-DD_AI与科技新闻日报.md` |

### 2.3 数据流（当前）

```
用户 / cron
    → 执行 scripts/run-xxx-news.sh（或未来 Python 脚本）
    → Cursor CLI (agent) 读取 .cursor/commands/xxx-news.md + 执行指令
    → AI 多轮 Web Search + 整理
    → 写入 NEWS/<topic>/YYYY-MM-DD_xxx.md
```

---

## 三、目标架构（含 Next.js Web App）

### 3.1 整体框图

```
┌─────────────────────────────────────────────────────────────────────────┐
│  触发层                                                                  │
│  · 手动：用户运行 scripts/run-*-news.sh 或 Python 脚本                   │
│  · 定时：cron / launchd 调用上述脚本（需本机已安装并登录 Cursor CLI）     │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  生成层                                                                  │
│  · Cursor CLI: agent -p --force "@.cursor/commands/<command>.md" "…"     │
│  · 输出：NEWS/<topic>/YYYY-MM-DD_<主题>日报.md                            │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  数据层                                                                  │
│  · 仅文件系统：NEWS/ 目录树                                               │
│  · 无强制数据库；可选：索引/缓存由 Next.js API 或构建时生成                │
└─────────────────────────────────────────────────────────────────────────┘
                                    │
                                    ▼
┌─────────────────────────────────────────────────────────────────────────┐
│  展示层 · Next.js Web App（本地运行或自托管）                             │
│  · 读取 NEWS/：API Routes 读 .md 或依赖构建时/运行时扫描                  │
│  · 功能：按日期索引、按主题筛选、日报正文渲染、简单全文检索（可选）        │
│  · 可选：展示「如何运行 command」或一键触发（调用本机脚本/子进程）         │
└─────────────────────────────────────────────────────────────────────────┘
```

### 3.2 目录结构（目标）

```
<project-root>/
├── .cursor/
│   └── commands/           # 现有 + 可扩展
│       ├── general-news.md
│       ├── finance-news.md
│       └── aitech-news.md
├── NEWS/                   # 日报产出目录
│   ├── general/
│   ├── finance/
│   └── ai-tech/
├── scripts/                # 触发 Cursor CLI 的脚本
│   ├── run-aitech-news.sh
│   ├── run-general-news.sh # 可选
│   ├── run-finance-news.sh  # 可选
│   └── run_all_news.sh      # 可选：依次跑全部
├── app/                    # Next.js App（待初始化）
│   ├── app/                # App Router
│   │   ├── layout.tsx
│   │   ├── page.tsx        # 首页：日期索引 / 今日摘要
│   │   ├── news/           # 日报列表与正文
│   │   └── api/            # 读 NEWS 的 API
│   ├── components/
│   ├── lib/                # 读 md、解析、索引
│   └── styles/
│       └── global.css      # 主题变量 + Tailwind
├── docs/
│   └── s-news.md           # 本文档
├── public/
└── package.json
```

---

## 四、技术栈与规范

### 4.1 技术选型

| 类别 | 选型 | 说明 |
|------|------|------|
| 框架 | Next.js (App Router) | 服务端读文件、API Routes、SSR/静态按需；生态成熟，适合开源与本地部署。 |
| 样式 | Tailwind CSS 4 | 实用类优先；与 global.css 配合做主题。 |
| 主题控制 | `global.css` 中的 CSS 变量 | 颜色、间距、圆角等统一用变量，便于暗色/亮色与品牌一致。 |
| 语言 | TypeScript | 类型安全，便于维护与协作。 |
| 日报解析 | 读取 `NEWS/**/*.md`，按 frontmatter + 标题/摘要/链接/简评结构解析 | 不引入 CMS，保持「文件即数据」。 |

### 4.2 样式与主题规范

- **主题**：所有与主题相关的颜色、背景、边框等均通过 `global.css` 的 CSS 变量定义（如 `--color-background`, `--color-text`, `--color-primary` 等）；组件与页面只引用变量或 Tailwind 的 theme 扩展（若需）。
- **Tailwind 4**：使用 Tailwind 4 的配置与语法；布局与响应式优先用 Tailwind 类，不写内联关键样式。
- **响应式**：必须同时适配四种视口：
  - Desktop（大屏）
  - Laptop（笔记本）
  - Tablet（iPad 等）
  - Phone（手机）
  布局、字号、导航、列表/卡片均需在不同断点下有合理表现；避免横向滚动与过小点击区域。

### 4.3 代码与质量要求

- 代码**简洁、可维护**，遵循常见工业实践（组件化、单一职责、可测试性考虑）。
- **仅实现需求与文档中明确的功能**，不修改与需求无关的既有逻辑与文件。
- **不自动生成额外 .md 文件**（除本文档及项目明确要求的 README/CHANGELOG 等），除非用户明确要求。
- 产品风格：与「当前网站/产品风格」一致——若当前无既有站点，则采用**中性、清晰、可读**的默认风格（白/浅灰底、深色字、适度留白）。

---

## 五、功能规格（Web App）

### 5.1 必须功能

1. **首页**
   - 按**日期**列出已有日报：某日有哪些主题（general / finance / ai-tech）可用，点击进入对应日报正文。
   - 支持「今日」「昨日」或日期选择器；无数据的日期可显示「未生成」或隐藏。

2. **日报正文页**
   - 路由形态：如 `/news/[topic]/[date]` 或 `/news/[date]?topic=general`。
   - 将对应 `NEWS/<topic>/YYYY-MM-DD_xxx.md` 转为 HTML 渲染；保留标题、摘要、链接、简评等结构，链接可点击。

3. **按主题筛选**
   - 侧栏或 Tab：仅看「通用」「金融」「AI 科技」等；列表按日期倒序。

### 5.2 推荐功能

4. **简单全文检索**  
   对标题、摘要、简评做关键词搜索（可先基于读入内存的 md 内容，后期可上轻量索引）。

5. **「如何生成日报」说明**  
   在 Web 内展示或复制「运行脚本」说明（如 `./scripts/run-aitech-news.sh`）或 Cursor Command 名称，便于用户自行或配合 cron 使用。

### 5.3 可选功能

6. **一键触发生成**  
   后端 API 调用本机脚本（如 `scripts/run-*-news.sh`）或子进程执行 `agent ...`；仅限 localhost 或受控环境，需在文档中明确安全与依赖（本机需已安装并登录 Cursor CLI）。

7. **今日简报**  
   从当日多份日报中自动抽取 Top N 条，单独一页或导出。

8. **周报/月报**  
   若后续增加周报/月报的 Command 与产出，则增加对应列表与正文路由。

---

## 六、数据与 Markdown 约定

### 6.1 目录与命名

- `NEWS/<topic>/`：topic 与 Command 输出路径一致（general / finance / ai-tech 等）。
- 文件名：`YYYY-MM-DD_<主题名>日报.md`，例如 `2026-03-06_AI与科技新闻日报.md`。

### 6.2 日报结构（与现有 Command 一致）

- 一级标题：日报标题（含日期）。
- 引用块：简要说明。
- 二级标题：分类（如「一、全球要闻」）。
- 每条：三级标题 + **摘要：** + **链接：** + **简评：**。
- 文末：今日小结 / 日期与免责。

解析时可按 `##` / `###` 与 **摘要** / **链接** / **简评** 的正则或简单 AST 抽取结构化数据，用于列表与检索。

---

## 七、脚本策略（Bash / Python）

### 7.1 当前：Bash

- `scripts/run-aitech-news.sh`：cd 项目根 → 检查 `agent` → `agent -p --force [--model auto] "@.cursor/commands/aitech-news.md" "<指令>"`。
- 可复刻为 `run-general-news.sh`、`run-finance-news.sh`；可选 `run_all_news.sh` 依次调用三者。

### 7.2 可选：Python

- **目的**：跨平台（含 Windows）、便于扩展（重试、日志、配置路径、多 command 队列）。
- **行为**：与 Bash 等价——`subprocess.run(["agent", "-p", "--force", ...], cwd=project_root)`；不实现「替代 Cursor 的搜索与成文」，仅负责调用 Cursor CLI。
- **位置**：若实现，放在 `scripts/` 下，如 `run_aitech_news.py`；文档中说明依赖 `agent` 在 PATH 且已登录。

### 7.3 定时任务

- 由用户本机 cron / launchd / 任务计划程序调用上述脚本；文档中提供示例 crontab 与「需先安装并登录 Cursor CLI」的说明。
- Web App 不负责「定时」，只负责展示与可选「手动触发脚本」。

---

## 八、设计系统（主题与响应式）

### 8.1 主题变量（global.css）

- 定义语义化变量，例如：
  - 背景：`--color-bg-primary`, `--color-bg-secondary`
  - 文字：`--color-text-primary`, `--color-text-secondary`
  - 强调/链接：`--color-primary`, `--color-primary-hover`
  - 边框/分割：`--color-border`
  - 卡片/表面：`--color-surface`
- 亮色/暗色通过同一套变量在不同 `prefers-color-scheme` 或 class 下覆写实现。

### 8.2 响应式断点（与 Tailwind 对齐）

- 设计时考虑：`sm`（手机横/大手机）、`md`（平板）、`lg`（笔记本）、`xl`（桌面）。
- 导航：桌面为水平栏，平板/手机为折叠菜单或底部 Tab。
- 列表与卡片：桌面多列，平板 2 列，手机单列；字号与触控区域在手机端足够大。

### 8.3 与现有产品风格一致

- 若本项目已有参考站点或设计稿，组件与配色应与其一致。
- 若无：采用**中性、专业、可读**的默认风格（浅底、深字、清晰层级、适度圆角与阴影），避免花哨动效。

---

## 九、开发阶段建议

| 阶段 | 内容 | 产出 |
|------|------|------|
| **Phase 0** | 文档与规范 | 本文档（s-news.md）定稿；可选：README 中项目介绍与本地运行说明。 |
| **Phase 1** | Next.js 初始化与数据读取 | 初始化 Next.js（App Router, TypeScript, Tailwind 4）；实现 `lib` 读 `NEWS/**/*.md` 并解析；API 返回日期列表与单篇正文。 |
| **Phase 2** | 首页与列表 | 首页按日期展示日报入口；按主题筛选；响应式布局。 |
| **Phase 3** | 日报正文与样式 | 正文页路由；Markdown → HTML；global.css 主题变量与 Tailwind 应用；桌面/平板/手机适配。 |
| **Phase 4** | 检索与「运行说明」 | 简单全文检索；「如何生成」说明页或复制脚本。 |
| **Phase 5** | 脚本完善与开源打包 | 补齐 run-general / run-finance / run-all；可选 Python 版；README、cron 示例、开源协议与贡献指南。 |

---

## 十、开源与交付物

- **仓库**：单仓包含 `.cursor/commands`、`NEWS/`（可为空或示例）、`scripts/`、Next.js 应用、本文档。
- **运行方式**：用户 clone → 安装依赖 → 配置 Cursor CLI（若需生成）→ `npm run dev` 本地打开 Web；生成日报通过脚本或 Cursor 内手动执行 Command。
- **文档**：本文档（s-news.md）为设计与架构主文档；README 负责快速开始、环境要求、脚本与 cron 说明；不自动生成其他 .md 除非明确需要。

---

*文档版本：1.0 | 目标：指导 Next.js 初始化与后续迭代，保持架构与风格一致。*
