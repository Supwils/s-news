#!/usr/bin/env bash
#
# 依次执行全部主题的日报生成脚本（通用、金融、AI 科技、科学、加密、能源气候、汽车出行、游戏、供应链）
# 依赖：已安装并登录 Cursor CLI (agent)
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

cd "$PROJECT_ROOT"

if ! command -v agent &> /dev/null; then
  echo "错误: 未找到 Cursor CLI (agent)。请先安装: curl https://cursor.com/install -fsS | bash" >&2
  exit 1
fi

echo "=== 开始依次生成全部主题日报 ==="

for script in run-general-news.sh run-finance-news.sh run-aitech-news.sh run-science-news.sh run-crypto-news.sh run-energy-climate-news.sh run-auto-mobility-news.sh run-gaming-news.sh run-supply-chain-news.sh; do
  path="$SCRIPT_DIR/$script"
  if [[ -x "$path" ]]; then
    echo ""
    echo ">>> 执行 $script"
    "$path" || { echo ">>> $script 执行失败，退出码 $?" >&2; exit 1; }
  else
    echo ">>> 跳过 $script (不存在或不可执行)" >&2
  fi
done

echo ""
echo "=== 全部主题日报生成完成 ==="
