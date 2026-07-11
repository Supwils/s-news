#!/usr/bin/env bash
#
# 使用 Cursor CLI 执行加密与 Web3 新闻日报 command
# 将 .cursor/commands/crypto-news.md 作为 context，按其中流程生成日报并写入 NEWS/crypto/
#
# 依赖：已安装并登录 Cursor CLI (agent)
# 安装：curl https://cursor.com/install -fsS | bash
# 登录：agent login（或配置 CURSOR_API_KEY）
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"


TODAY=$(date +%Y-%m-%d)
TODAY_CN=$(date +%Y年%m月%d日)

COMMAND_FILE=".cursor/commands/crypto-news.md"
INSTRUCTION="今日日期必须使用：${TODAY}（${TODAY_CN}），文件名与标题中的日期一律为此日，不得使用 2025 年或其他年份。严格按照 @${COMMAND_FILE} 的完整流程执行：按优先级做多轮实时搜索（Web Search），筛选排序后按该文件中的 Markdown 模板整理，最后将中文版与英文版日报分别写入 NEWS/crypto/zh/ 和 NEWS/crypto/en/ 对应日期的 md 文件。不要省略任何步骤。只允许创建或覆盖本主题当天对应的中文和英文日报文件；不要修改其他日期、其他主题、脚本、配置或索引文件。若信息不足，宁可减少条目，也不要编造链接、日期或数字。"

echo "项目目录: $PROJECT_ROOT"
echo "执行 command: $COMMAND_FILE"
echo "---"
bash "$SCRIPT_DIR/news-agent.sh" "${COMMAND_FILE}" "${INSTRUCTION}"

# Verify what the agent actually wrote. cursor-agent exits 0 having written
# nothing when a search fails or the context is truncated, and a digest that
# drifts from the template would fail `pnpm build` in the daily job — costing
# every other topic its publication. A bad digest is quarantined out of NEWS/.
bash "$SCRIPT_DIR/assert-digest.sh" "crypto" "加密与Web3新闻日报" "crypto-digest" "$TODAY"
if [[ "${SKIP_NEWS_INDEX_REFRESH:-0}" != "1" ]]; then
  bash "$SCRIPT_DIR/refresh-news-index.sh"
fi
echo "执行完成"
