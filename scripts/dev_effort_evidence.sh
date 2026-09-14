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
  "pachiverse-world（メタバース、World Foundation）|pachiverse-world|apps packages tools content docs *.md|/node_modules/|^\\.claude/"
)

echo "# 実装規模の証跡（Git 記録からの抽出）"
echo
echo "生成日: ${TODAY}　生成コマンド: \`scripts/dev_effort_evidence.sh\`（再実行で同じ表が出る）"
echo
echo "工数表 v1.2 の付録。**実装物が存在し、稼働し、保守されていることと、その規模（行数・テスト件数・CI 実行）を示す一次データ。工数（人月）や開発期間の証跡ではない。** 再調達原価の本体は外注見積 2〜3 社であり、本表はその見積対象の規模を第三者が確認するために使う。"
echo "Git の履歴は 2026-04 以降に集中している（開発は 2026-01-22 に GitHub を使わずに始め、売買に向けた可視化のため後から段階的に上げたため）。コミット数・稼働日数は履歴の起点を示すだけで、作業量を表さない。"
echo
echo "## 1. リポジトリ別サマリ"
echo
echo "| リポジトリ | HEAD | 初回コミット | 最終コミット | コミット数 | 追加行 | 削除行 | 自作コード行数（対象パス、文書 md を含む） |"
echo "|---|---|---|---|---|---|---|---|"
for entry in "${REPOS[@]}"; do
  IFS='|' read -r name path targets excl1 excl2 <<<"$entry"
  dir="$ROOT/$path"
  first=$(git -C "$dir" log --format=%ad --date=short | tail -1)
  last=$(git -C "$dir" log -1 --format=%ad --date=short)
  n=$(git -C "$dir" rev-list --count HEAD)
  read -r add del <<<"$(git -C "$dir" log --numstat --format= | awk '$1!="-"{a+=$1;d+=$2} END{print a+0, d+0}')"
  # shellcheck disable=SC2086
  loc=$(git -C "$dir" ls-files -- $targets 2>/dev/null | grep -vE "${excl1}${excl2:+|$excl2}" | grep -E '\.(php|ts|js|mjs|sol|py|sh|html|yaml|yml|md)$' | xargs -I{} cat "$dir/{}" 2>/dev/null | wc -l | tr -d ' ')
  head=$(git -C "$dir" rev-parse --short HEAD)
  echo "| $name | \`$head\` | $first | $last | $n | $add | $del | $loc |"
done
echo
echo "## 2. 月別コミット数（全リポジトリ合算。履歴の起点を示すだけで作業量ではない）"
echo
echo "| 月 | コミット数 |"
echo "|---|---|"
for entry in "${REPOS[@]}"; do
  IFS='|' read -r _ path _ _ _ <<<"$entry"
  git -C "$ROOT/$path" log --format=%ad --date=format:%Y-%m
done | sort | uniq -c | awk '{printf "| %s | %s |\n", $2, $1}'
echo
echo "## 3. コミットのあった暦日（全リポジトリ合算。作業日数ではない）"
echo
days=$(for entry in "${REPOS[@]}"; do IFS='|' read -r _ path _ _ _ <<<"$entry"; git -C "$ROOT/$path" log --format=%ad --date=short; done | sort -u | wc -l | tr -d ' ')
echo "コミットのあった日: **${days} 日**（同日に複数リポジトリへコミットしても 1 日と数える）"
echo
echo "## 4. 自作コードの区分別行数（対象パス、vendor 等除外）"
echo
echo "コード＝テストと文書以外、テスト＝ \`tests/\` \`test/\` 配下、文書＝ \`.md\`。"
echo
echo "| リポジトリ | 区分 | 言語 | ファイル数 | 行数 |"
echo "|---|---|---|---|---|"
for entry in "${REPOS[@]}"; do
  IFS='|' read -r name path targets excl1 excl2 <<<"$entry"
  dir="$ROOT/$path"
  # shellcheck disable=SC2086
  git -C "$dir" ls-files -- $targets 2>/dev/null | grep -vE "${excl1}${excl2:+|$excl2}" | grep -E '\.(php|ts|tsx|js|mjs|sol|py|sh|html|yaml|yml|md)$' | while read -r f; do
    ext="${f##*.}"; lines=$(wc -l < "$dir/$f" | tr -d ' ')
    case "$f" in *.md) kind="文書";; tests/*|test/*|*/tests/*|*/test/*) kind="テスト";; *) kind="コード";; esac
    echo "$kind $ext $lines"
  done | awk -v repo="$name" '{k=$1"|"$2; c[k]++; l[k]+=$3} END{for(e in c){split(e,p,"|"); printf "| %s | %s | %s | %d | %d |\n", repo, p[1], p[2], c[e], l[e]}}' | sort
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
echo "| pachiverse-signer | テストケース（it/test）／テストファイル数 | $ts_t / $ts_files | \`grep -rhoE '^\\s*(it|test)\\(' src scripts test\` |"
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
echo "- Git の記録は**実装規模の下限**。要件定義・設計・素材制作（Seedream 生成・QC）・運用（デプロイ・サポート・会員データ突合）・法務調整は行数に現れない。"
echo "- **開発は 2026-01-22 に GitHub を使わずに始まり、売買に向けた可視化のため 2026-04 以降に段階的に GitHub へ上げた。** したがってコミット数・コミットのあった暦日は履歴の起点を示すだけで、開発期間や作業量の証跡には**ならない**。members.pachiverse.com の初回コミット以前の初期開発、pvm-art の 2026-09-15 以前の履歴（production.log・INVENTORY_2026-09-05.md に日付あり）も含まれない。"
echo "- 行数は AI 支援開発を含む実装量であり、人手の行数ではない。工数表の人月は「同等物を外注で再調達した場合」の積算であり、本表から逆算するものではない。再調達原価の本体は外注見積 2〜3 社で、本表はその見積対象の規模を示す。"
echo "- 公開サイト / contracts / signer / pachiverse-world の CI 実行数 0 は GitHub Actions を使っていないため（公開サイトは Vercel のデプロイチェック、contracts は forge をローカル実行、signer は npm test をローカル実行）。"
echo "- 出力は生成日と各リポジトリの HEAD に依存する。§1 の HEAD ハッシュを添えて提示する。"
echo
echo "## 8. 開発の時系列（Git 以前を含む、日付付きの一次資料）"
echo
echo "| 日付 | 事実 | 根拠（所在） |"
echo "|---|---|---|"
echo "| 2026-01-22 02:52 | 会員サイト開発の着手（ChatGPT に「メンバーサイトを作成したい」と相談した記録。GitHub 不使用、ローカルとサーバー直編集で開始） | ChatGPT の会話履歴（オーナー保有。日時付きでエクスポート可能）。同日 06:13 に本番 DB の最初のユーザー登録があり整合する |"
echo "| 2026-03-20 | 本番 WordPress コアの配置日 | サーバー上の WP コアファイルの更新日時 |"
echo "| 2026-03-31 | 会員 4,620 行の本番取り込み（10 分割ファイル） | 取り込み run 記録・\`docs/DECISIONS.md\`・調査報告 |"
echo "| 2026-04-11〜14 | 取り込み後の付与・除外リスト・サポート FAQ シード作成 | \`excluded_import_targets_from_prod_db_20260411.csv\`、\`Pachiverse_support_faq_seeds_2026-04-14.csv\` |"
echo "| 2026-04-19 | 公開サイト（pachiverse.com）の初回コミット | Git |"
echo "| 2026-05-29 | 会員システムの初回コミット（既存プラグインを取り込み） | Git |"
echo "| 2026-07-07 | 要件定義書 v1.0・開発工数表 v1.0 | ルート直下の docx |"
echo "| 2026-08-07 | contracts / signer の初回コミット、Generative Art 仕様書 | Git、\`Pachiverse_Generative_Art_Specification_2026-08-07.txt\` |"
echo "| 2026-09-02 | 500 体のアート制作完了、コントラクト mainnet デプロイ | \`pvm-art/out/production.log\`、\`INVENTORY_2026-09-05.md\`、contracts の記録 |"
echo "| 2026-09-08 | IPFS 固定（CID 確定）、finalizeMinting | \`pvm-art/out/IMAGE_CID_20260908.txt\`、Polygon tx |"
echo "| 2026-09-09 | Reveal（本番公開） | \`members.pachiverse.com/ops/DAY_OF_RUNBOOK_20260909.md\`、Polygon tx |"
echo "| 2026-09-15 | pvm-art を Git 化、稼働記録の開始 | \`pachiverse01-ai/pvm-art\`、\`ops/OPERATIONS_LOG.md\` |"
echo
echo "2025 年以前に遡る作業（構想・要件検討等）の日付付き資料があれば行を追加する。無ければ着手は 2026-01-22 として説明する。"
