#!/usr/bin/env bash
# 開発工数の客観的証跡を Git 記録から抽出する（譲渡評価・工数表 v1.2 の付録用）。
# 使い方: scripts/dev_effort_evidence.sh > docs/04_DEV_EFFORT_EVIDENCE.md
# 数えるもの: コミット数・期間・月別分布・追加/削除行・自作コードの行数（言語別）・テスト件数・CI 実行数。
# 数えないもの: vendor / node_modules / lib / .venv / WordPress コア / 生成物。
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
TODAY="$(date +%Y-%m-%d)"

# repo名|パス|自作コードの対象パス（git ls-files に渡す）|除外正規表現
REPOS=(
  "pachiverse.com（公開サイト + Vercel API）|.|api scripts *.html transparency vercel.json|^(assets|files|_archive|members-deploy-main)/"
  "members.pachiverse.com（会員システム）|members.pachiverse.com|wp-content/plugins/uni_memberpage tests scripts ops docs|/vendor/|/node_modules/"
  "pachiverse-contracts（スマートコントラクト）|pachiverse-contracts|src test script ops|^lib/"
  "pachiverse-signer（署名サーバ）|pachiverse-signer|src scripts schemas test|/node_modules/|^dist/"
  "pvm-art（Generative NFT 制作パイプライン）|pvm-art|*.py *.sh *.md prompts art-src/traits.yaml art-src/legends.yaml|^out/|^\\.venv/"
)

echo "# 開発工数の客観的証跡（Git 記録からの抽出）"
echo
echo "生成日: ${TODAY}　生成コマンド: \`scripts/dev_effort_evidence.sh\`（再実行で同じ表が出る）"
echo
echo "工数表 v1.2 の付録。人月の見積りを「売り手の自己申告」ではなく「記録に基づく積算」として示すための一次データ。"
echo "Git に入る前の作業（要件定義・設計・WordPress プラグインの初期開発の一部・pvm-art の 2026-09-15 以前の履歴）は**ここには現れない**。その分は工数表本文で別途説明する。"
echo
echo "## 1. リポジトリ別サマリ"
echo
echo "| リポジトリ | 初回コミット | 最終コミット | コミット数 | 追加行 | 削除行 | 自作コード行数（対象パス） |"
echo "|---|---|---|---|---|---|---|"
for entry in "${REPOS[@]}"; do
  IFS='|' read -r name path targets excl1 excl2 <<<"$entry"
  dir="$ROOT/$path"
  first=$(git -C "$dir" log --format=%ad --date=short | tail -1)
  last=$(git -C "$dir" log -1 --format=%ad --date=short)
  n=$(git -C "$dir" rev-list --count HEAD)
  read -r add del <<<"$(git -C "$dir" log --numstat --format= | awk '$1!="-"{a+=$1;d+=$2} END{print a+0, d+0}')"
  # shellcheck disable=SC2086
  loc=$(git -C "$dir" ls-files -- $targets 2>/dev/null | grep -vE "${excl1}${excl2:+|$excl2}" | grep -E '\.(php|ts|js|mjs|sol|py|sh|html|yaml|yml|md)$' | xargs -I{} cat "$dir/{}" 2>/dev/null | wc -l | tr -d ' ')
  echo "| $name | $first | $last | $n | $add | $del | $loc |"
done
echo
echo "## 2. 月別コミット数（全リポジトリ合算）"
echo
echo "| 月 | コミット数 |"
echo "|---|---|"
for entry in "${REPOS[@]}"; do
  IFS='|' read -r _ path _ _ _ <<<"$entry"
  git -C "$ROOT/$path" log --format=%ad --date=format:%Y-%m
done | sort | uniq -c | awk '{printf "| %s | %s |\n", $2, $1}'
echo
echo "## 3. 稼働日数（コミットのあった暦日、全リポジトリ合算）"
echo
days=$(for entry in "${REPOS[@]}"; do IFS='|' read -r _ path _ _ _ <<<"$entry"; git -C "$ROOT/$path" log --format=%ad --date=short; done | sort -u | wc -l | tr -d ' ')
echo "コミットのあった日: **${days} 日**（同日に複数リポジトリへコミットしても 1 日と数える）"
echo
echo "## 4. 自作コードの言語別行数（対象パス、vendor 等除外）"
echo
echo "| リポジトリ | 言語（md は運用文書） | ファイル数 | 行数 |"
echo "|---|---|---|---|"
for entry in "${REPOS[@]}"; do
  IFS='|' read -r name path targets excl1 excl2 <<<"$entry"
  dir="$ROOT/$path"
  # shellcheck disable=SC2086
  git -C "$dir" ls-files -- $targets 2>/dev/null | grep -vE "${excl1}${excl2:+|$excl2}" | grep -E '\.(php|ts|js|mjs|sol|py|sh|html|yaml|yml|md)$' | while read -r f; do
    ext="${f##*.}"; lines=$(wc -l < "$dir/$f" | tr -d ' '); echo "$ext $lines"
  done | awk -v repo="$name" '{c[$1]++; l[$1]+=$2} END{for(e in c) printf "| %s | %s | %d | %d |\n", repo, e, c[e], l[e]}' | sort
done
echo
echo "## 5. テスト件数"
echo
echo "| リポジトリ | 種別 | 件数 | 数え方 |"
echo "|---|---|---|---|"
m="$ROOT/members.pachiverse.com"
php_unit=$(grep -rhoE 'function test[A-Za-z0-9_]*' "$m/tests" 2>/dev/null | wc -l | tr -d ' ')
echo "| members.pachiverse.com | PHPUnit テストメソッド（Unit + Integration） | $php_unit | \`grep -rhoE 'function test' tests\` |"
c="$ROOT/pachiverse-contracts"
sol_t=$(grep -rhoE 'function (test|invariant)[A-Za-z0-9_]*' "$c/test" 2>/dev/null | wc -l | tr -d ' ')
echo "| pachiverse-contracts | forge テスト関数（test/invariant/fuzz） | $sol_t | \`grep -rhoE 'function (test|invariant)' test\` |"
s="$ROOT/pachiverse-signer"
ts_t=$(grep -rhoE '^\s*(it|test)\(' "$s/src" "$s/scripts" "$s/test" 2>/dev/null | wc -l | tr -d ' ' || true)
ts_files=$(git -C "$s" ls-files | grep -cE '\.(test|spec)\.(ts|mjs|js)$' || true)
echo "| pachiverse-signer | テストケース（it/test）／テストファイル数 | $ts_t / $ts_files | \`grep -rhoE '^\\s*(it|test)\\(' src scripts\` |"
echo
echo "## 6. CI 実行数（GitHub Actions、取得できた範囲）"
echo
echo "| リポジトリ | 実行数 | 備考 |"
echo "|---|---|---|"
for entry in "${REPOS[@]}"; do
  IFS='|' read -r name path _ _ _ <<<"$entry"
  dir="$ROOT/$path"
  url=$(git -C "$dir" remote get-url origin 2>/dev/null | sed -E 's#(\.git)?$##; s#.*github.com[:/]##')
  runs=$(gh run list -R "$url" --limit 1000 --json databaseId -q 'length' 2>/dev/null || echo "取得不可")
  echo "| $name | $runs | $url |"
done
echo
echo "## 7. この表の限界"
echo
echo "- Git の記録は作業の**下限**。要件定義・設計・素材制作（Seedream 生成・QC）・運用（デプロイ・サポート・会員データ突合）・法務調整は行数に現れない。"
echo "- members.pachiverse.com の初回コミット以前の初期開発、pvm-art の 2026-09-15 以前の履歴（production.log・INVENTORY_2026-09-05.md に日付あり）は含まれない。"
echo "- 行数は AI 支援開発を含む実装量であり、人手の行数ではない。工数表の人月は「同等物を外注で再調達した場合」の積算として別に示す。"
