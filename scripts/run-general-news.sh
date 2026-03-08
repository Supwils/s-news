#!/usr/bin/env bash
#
# 使用 Cursor CLI 执行日常通用新闻日报 command
# 将 .cursor/commands/general-news.md 作为 context，按其中流程生成日报并写入 NEWS/general/
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

COMMAND_FILE=".cursor/commands/general-news.md"
INSTRUCTION="今日日期必须使用：${TODAY}（${TODAY_CN}），文件名与标题中的日期一律为此日，不得使用 2025 年或其他年份。严格按照 @${COMMAND_FILE} 的完整流程执行：按优先级做多轮实时搜索（Web Search），筛选排序后按该文件中的 Markdown 模板整理，最后将日报写入 NEWS/general/ 对应日期的 md 文件。不要省略任何步骤。"

if ! command -v agent &> /dev/null; then
  echo "错误: 未找到 Cursor CLI (agent)。请先安装: curl https://cursor.com/install -fsS | bash" >&2
  exit 1
fi

echo "项目目录: $PROJECT_ROOT"
echo "执行 command: $COMMAND_FILE"
echo "---"
agent -p --force --model auto "@${COMMAND_FILE}" "${INSTRUCTION}"
echo "执行完成"
