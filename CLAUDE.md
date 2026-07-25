# CLAUDE.md — swil-news

Guidance for AI coding agents in this repo. Instructions here override default behavior.

swil-news is a Next.js news/reading site (pnpm; `swil-news` on GitHub) deployed to Vercel. Content lives under `NEWS/`, validated + indexed at build time (`prebuild` runs `validate:news` + the index/rollup/event/search builders).

开发状态、未完成事项与历史决策以 `docs/roadmap.md` 为准（权威状态板）；其他 docs 与它冲突时以它为准。

## 语言规则
- **对用户始终用中文回复**；代码、标识符、注释一律英文。

## Git 纪律
- **不要自动 commit / push**。只有用户明确说"commit / push / 提交 / 推送"时才执行。

## Push 前置校验（`.githooks/pre-push`）
每次 `git push` 前自动跑 `pnpm prepush`（= `validate:news`(layout+content) + `lint` + `test`），把最常见的破坏（新闻内容 schema/布局错、单测挂）挡在推送前。经 `git config core.hooksPath .githooks` 激活（`prepare` 脚本在 `pnpm install` 时自动设）。**刻意不含** `check-links`（慢/走网络）与完整 `next build`——留给手动/CI。紧急绕过：`git push --no-verify`。
> ⚠️ 首次装上后请本地 `pnpm prepush` 自验一次确认绿。
