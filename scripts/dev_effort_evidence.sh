#!/usr/bin/env bash
# 開発工数の客観的証跡を Git 記録から抽出する（譲渡評価・工数表 v1.2 の付録用）。
# 使い方: scripts/dev_effort_evidence.sh > docs/04_DEV_EFFORT_EVIDENCE.md
#   PV_ROOT=<dir>  6 リポジトリを並べた親の作業ツリー（既定はスクリプトの 1 つ上）。worktree から実行するときに付ける
#   PV_OFFLINE=1   §6 の CI 実行数を取りに行かない（GitHub に接続しない。表の値は「未取得」になる）
# 数えるもの: コミット数・期間・月別分布・追加/削除行・自作コードの行数（言語別）・テスト件数・CI 実行数。
# 数えないもの: vendor / node_modules / lib / .venv / WordPress コア / 生成物。
# 行数・追加/削除行・テスト件数は各リポジトリの HEAD のコミット済みの中身で数える（作業ツリーの未コミットの変更と
# 未追跡のファイルは数えない）。対象パスはシェルで展開せず git のパススペックとして渡す（実行場所で結果が変わらない）。
set -euo pipefail
ROOT="${PV_ROOT:-$(cd "$(dirname "$0")/.." && pwd)}"
if [ ! -d "$ROOT" ]; then
  echo "PV_ROOT のディレクトリが無い: ${ROOT}" >&2
  exit 1
fi
TODAY="$(date +%Y-%m-%d)"
# 数える拡張子（§1 の自作コード行数・追加行・削除行と §4 で共通）
EXT_RE='\.(php|ts|tsx|js|mjs|sol|py|sh|html|yaml|yml|md)$'

# repo名|パス|自作コードの対象パス（git のパススペック。*.md 等はリポジトリ全体で照合する）|除外正規表現
REPOS=(
  "pachiverse.com（公開サイト + Vercel API）|.|api scripts *.html transparency vercel.json|^(assets|files|_archive|members-deploy-main)/"
  "members.pachiverse.com（会員システム）|members.pachiverse.com|wp-content/plugins/uni_memberpage tests scripts ops docs|/vendor/|/node_modules/"
  "pachiverse-contracts（スマートコントラクト）|pachiverse-contracts|src test script ops|^lib/"
  "pachiverse-signer（署名サーバ）|pachiverse-signer|src scripts schemas test|/node_modules/|^dist/"
  "pvm-art（Generative NFT 制作パイプライン）|pvm-art|*.py *.sh *.md prompts art-src/traits.yaml art-src/legends.yaml|^out/|^\\.venv/"
  "pachiverse-world（メタバース、World Foundation）|pachiverse-world|apps packages tools content docs *.md|/node_modules/|^\\.claude/"
)

# grep の 0 件（終了コード 1）は正常として扱う。2 以上（正規表現の誤り等）は失敗のまま返す
grep_ok() { grep "$@" || [ $? -eq 1 ]; }

# entry を分けて name・dir・excl と対象パスの配列 tarr を設定する
split_entry() {
  local path targets excl1 excl2
  IFS='|' read -r name path targets excl1 excl2 <<<"$1"
  dir="$ROOT/$path"
  excl="${excl1}${excl2:+|$excl2}"
  # 対象パスは空白で分けるだけでパス名展開をしない（read -a は展開しない）
  read -r -a tarr <<<"$targets"
}

# 対象ファイルの一覧（パススペック → 除外 → 拡張子）。一覧はインデックスから取る（HEAD と同じことは先に確かめる）
list_targets() {
  git -C "$dir" ls-files -- "${tarr[@]}" | grep_ok -vE "$excl" | grep_ok -E "$EXT_RE"
}

# HEAD のコミット済みの中身の行数
head_lines() { git -C "$dir" cat-file -p "HEAD:$1" | wc -l | tr -d ' '; }

# git grep の一致数（HEAD のコミット済みの中身）。0 件は 0 を返し、git grep の失敗（終了コード 2 以上）は止める
grep_count() {
  local gdir=$1 pat=$2 out rc=0
  shift 2
  out=$(git -C "$gdir" grep -hoE "$pat" HEAD -- "$@") || rc=$?
  if [ "$rc" -gt 1 ]; then
    echo "git grep に失敗: ${gdir}（終了コード ${rc}）" >&2
    exit "$rc"
  fi
  if [ -z "$out" ]; then echo 0; else printf '%s\n' "$out" | wc -l | tr -d ' '; fi
}

# 一覧はインデックス、中身は HEAD から読むので、ステージ済みの変更があれば止める（数えた中身と HEAD がずれるため）
for entry in "${REPOS[@]}"; do
  split_entry "$entry"
  rc=0
  git -C "$dir" diff --cached --quiet || rc=$?
  if [ "$rc" -eq 1 ]; then
    echo "インデックスに未コミットの変更がある: ${dir}（コミットするか戻してから再実行する）" >&2
    exit 1
  elif [ "$rc" -ne 0 ]; then
    exit "$rc"
  fi
done

echo "# 実装規模の証跡（Git 記録からの抽出）"
echo
echo "生成日: ${TODAY}　生成コマンド: \`scripts/dev_effort_evidence.sh\`（各リポジトリの HEAD が同じなら §1〜§5 は同じ表が出る。生成日と §6 の CI 実行数は実行時の値）"
echo
echo "工数表 v1.2 の付録。**実装物が存在し、稼働し、保守されていることと、その規模（行数・テスト件数・CI 実行）を示す一次データ。工数（人月）や開発期間の証跡ではない。** 再調達原価の本体は外注見積 2〜3 社であり、本表はその見積対象の規模を第三者が確認するために使う。"
echo "Git の履歴は 2026-04 以降に集中している（開発は 2026-01-22 に GitHub を使わずに始め、売買に向けた可視化のため後から段階的に上げたため）。コミット数・稼働日数は履歴の起点を示すだけで、作業量を表さない。"
echo
echo "## 1. リポジトリ別サマリ"
echo
echo "追加行・削除行・自作コード行数は、同じ対象パス・除外・拡張子（§7）に限って数える（第三者のコード・生成物・対象パスの外のファイルは含まない）。"
echo
echo "| リポジトリ | HEAD | 初回コミット | 最終コミット | コミット数 | 追加行 | 削除行 | 自作コード行数（対象パス、文書 md を含む） |"
echo "|---|---|---|---|---|---|---|---|"
for entry in "${REPOS[@]}"; do
  split_entry "$entry"
  first=$(git -C "$dir" log --format=%ad --date=short | tail -1)
  last=$(git -C "$dir" log -1 --format=%ad --date=short)
  n=$(git -C "$dir" rev-list --count HEAD)
  # 追加行・削除行: 全履歴の numstat を対象パスに限り、除外と拡張子は変更後のパスで判定する（名前の変更 {a => b} は b）
  adddel=$(git -C "$dir" log --numstat --format= -M -- "${tarr[@]}" | EXCL="$excl" EXT="$EXT_RE" awk -F'\t' '
    function newpath(p,   i, j, k, mid) {
      i = index(p, "{"); j = index(p, "}")
      if (i > 0 && j > i) {
        mid = substr(p, i + 1, j - i - 1); k = index(mid, " => ")
        if (k > 0) {
          p = substr(p, 1, i - 1) substr(mid, k + 4) substr(p, j + 1)
          gsub(/\/\/+/, "/", p); sub(/^\//, "", p)
          return p
        }
      }
      k = index(p, " => ")
      if (k > 0) return substr(p, k + 4)
      return p
    }
    NF >= 3 && $1 != "-" { p = newpath($3); if (p !~ ENVIRON["EXCL"] && p ~ ENVIRON["EXT"]) { a += $1; d += $2 } }
    END { print a + 0, d + 0 }')
  read -r add del <<<"$adddel"
  files=$(list_targets)
  loc=0
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    nl=$(head_lines "$f")
    loc=$((loc + nl))
  done <<<"$files"
  head=$(git -C "$dir" rev-parse --short HEAD)
  echo "| $name | \`$head\` | $first | $last | $n | $add | $del | $loc |"
done
echo
echo "### 1.1 作者別のコミット数（マージを除く）"
echo
echo "作者欄の名前ごとの件数（\`git log --no-merges --format=%an\`。メールアドレスは載せない）。ishikawar2-dev と pachiverse01-ai はいずれもオーナー個人が所有するアカウント（親 \`docs/07_HANDOVER_KIT.md\` §8 #1）。GitHub 上のマージコミットは除く。"
echo
echo "| リポジトリ | 作者 | コミット数 |"
echo "|---|---|---|"
for entry in "${REPOS[@]}"; do
  IFS='|' read -r name path _ _ _ <<<"$entry"
  git -C "$ROOT/$path" log --no-merges --format=%an | sort | uniq -c | sort -rn | while read -r cnt author; do
    echo "| $name | $author | $cnt |"
  done
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
  split_entry "$entry"
  files=$(list_targets)
  while IFS= read -r f; do
    [ -n "$f" ] || continue
    ext="${f##*.}"
    nl=$(head_lines "$f")
    case "$f" in *.md) kind="文書";; tests/*|test/*|*/tests/*|*/test/*) kind="テスト";; *) kind="コード";; esac
    echo "$kind $ext $nl"
  done <<<"$files" | awk -v repo="$name" '{k=$1"|"$2; c[k]++; l[k]+=$3} END{for(e in c){split(e,p,"|"); printf "| %s | %s | %s | %d | %d |\n", repo, p[1], p[2], c[e], l[e]}}' | sort
done
echo
echo "## 5. テスト件数"
echo
echo "| リポジトリ | 種別 | 件数 | 数え方 |"
echo "|---|---|---|---|"
m="$ROOT/members.pachiverse.com"
php_unit=$(grep_count "$m" 'function test[A-Za-z0-9_]*' tests)
echo "| members.pachiverse.com | PHPUnit テストメソッド（Unit + Integration） | $php_unit | \`git grep -hoE 'function test' HEAD -- tests\` |"
c="$ROOT/pachiverse-contracts"
sol_t=$(grep_count "$c" 'function (test|invariant)[A-Za-z0-9_]*' test)
echo "| pachiverse-contracts | forge テスト関数（test/invariant/fuzz） | $sol_t | \`git grep -hoE 'function (test\\|invariant)' HEAD -- test\` |"
s="$ROOT/pachiverse-signer"
ts_t=$(grep_count "$s" '^[[:space:]]*(it|test)\(' src scripts test)
ts_files=$(git -C "$s" ls-files | grep_ok -cE '\.(test|spec)\.(ts|mjs|js)$')
echo "| pachiverse-signer | テストケース（it/test）／テストファイル数 | $ts_t / $ts_files | \`git grep -hoE '^[[:space:]]*(it\\|test)\\(' HEAD -- src scripts test\` |"
echo
echo "## 6. CI 実行数（GitHub Actions、取得できた範囲）"
echo
echo "| リポジトリ | 実行数 | 備考 |"
echo "|---|---|---|"
for entry in "${REPOS[@]}"; do
  IFS='|' read -r name path _ _ _ <<<"$entry"
  dir="$ROOT/$path"
  url=$(git -C "$dir" remote get-url origin 2>/dev/null | sed -E 's#(\.git)?$##; s#.*github.com[:/]##')
  if [ "${PV_OFFLINE:-0}" = "1" ]; then
    runs="未取得"
  else
    runs=$(gh run list -R "$url" --limit 1000 --json databaseId -q 'length' 2>/dev/null || echo "取得不可")
  fi
  echo "| $name | $runs | $url |"
done
if [ "${PV_OFFLINE:-0}" = "1" ]; then
  echo
  echo "この生成では GitHub に接続していない（\`PV_OFFLINE=1\`）。実行数は GitHub に接続できる環境で再生成して埋める。"
fi
echo
echo "## 7. この表の限界"
echo
echo "- Git の記録は**実装規模の下限**。要件定義・設計・素材制作（Seedream 生成・QC）・運用（デプロイ・サポート・会員データ突合）・法務調整は行数に現れない。"
echo "- **開発は 2026-01-22 に GitHub を使わずに始まり、売買に向けた可視化のため 2026-04 以降に段階的に GitHub へ上げた。** したがってコミット数・コミットのあった暦日は履歴の起点を示すだけで、開発期間や作業量の証跡には**ならない**。members.pachiverse.com の初回コミット以前の初期開発、pvm-art の 2026-09-15 以前の履歴（production.log・INVENTORY_2026-09-05.md に日付あり）も含まれない。"
echo "- 行数は AI 支援開発を含む実装量であり、人手の行数ではない。工数表の人月は「同等物を外注で再調達した場合」の積算であり、本表から逆算するものではない。再調達原価の本体は外注見積 2〜3 社で、本表はその見積対象の規模を示す。"
echo "- 公開サイト / contracts / signer / pvm-art の CI 実行数 0 は GitHub Actions を使っていないため（公開サイトは Vercel のデプロイチェック、contracts は forge をローカル実行、signer は npm test をローカル実行）。pachiverse-world は GitHub Actions を使う。members.pachiverse.com は 2026-09-27 から無料枠の有無にかかわらずローカルの同等検証を優先し、結果を PR コメントに記録している（\`scripts/local-ci.sh --comment\`）ため、以後の実行数は検証回数を表さない。"
echo "- 行数・追加行・削除行・テスト件数は、各リポジトリの HEAD のコミット済みの中身で数える（作業ツリーの未コミットの変更と未追跡のファイルは数えない）。§1 の追加行・削除行は、全履歴の差分を自作コード行数と同じ対象パス・除外・拡張子に限って合計し、名前の変更は変更後のパスで判定する。"
exts=$(printf '%s' "$EXT_RE" | sed -E 's/^\\\.\(//; s/\)\$$//; s/\|/・/g')
echo "- 数える拡張子は §1・§4 で共通: ${exts}。"
echo "- 対象パス（git のパススペックとして渡す。\`*.md\` などはリポジトリ全体で照合する）と除外（正規表現）は次のとおりで、リポジトリ間で揃えていない（例: 公開サイトは \`docs/\` を数えず、会員システムは \`docs/\` を数える。会員システムは同じリポジトリの \`wp-content/plugins/uni-login-analytics\` と \`wp-content/maintenance.php\` を含めていない）。"
for entry in "${REPOS[@]}"; do
  split_entry "$entry"
  echo "  - ${name}: 対象 \`${tarr[*]}\`、除外 \`${excl}\`"
done
echo "- 出力は生成日と各リポジトリの HEAD に依存する。§1 の HEAD ハッシュを添えて提示する。"
echo
echo "## 8. 開発の時系列（Git 以前を含む、日付付きの一次資料）"
echo
echo "| 日付 | 事実 | 根拠（所在） |"
echo "|---|---|---|"
echo "| 2026-01-22 02:52 | 会員サイトの企画に着手（本件の開発着手日として記録。ChatGPT に「メンバーサイトを作成したい」と相談した記録。GitHub 不使用、ローカルとサーバー直編集で開始） | ChatGPT の会話履歴（オーナー保有。日時付きでエクスポート可能）。同日 06:13 に本番 DB の最初のユーザー登録があり整合する |"
echo "| 2026-03-20 | 本番 WordPress コアの配置日 | サーバー上の WP コアファイルの更新日時 |"
echo "| 2026-03-31 | 会員 4,620 行の本番取り込み（10 分割ファイル） | 取り込み run 記録・\`docs/DECISIONS.md\`・調査報告 |"
echo "| 2026-04-11〜14 | 取り込み後の付与・除外リスト・サポート FAQ シード作成 | \`excluded_import_targets_from_prod_db_20260411.csv\`、\`Pachiverse_support_faq_seeds_2026-04-14.csv\` |"
echo "| 2026-04-19 | 公開サイト（pachiverse.com）の初回コミット | Git |"
echo "| 2026-05-29 | 会員システムの初回コミット（既存プラグインを取り込み） | Git |"
echo "| 2026-07-07 | 要件定義書 v1.0・開発工数表 v1.0 | ルート直下の docx |"
echo "| 2026-08-07 | contracts / signer の初回コミット、Generative Art 仕様書 | Git、\`Pachiverse_Generative_Art_Specification_2026-08-07.txt\` |"
echo "| 2026-09-02 | 500 体のアート制作完了（9/2 版）、コントラクト mainnet デプロイ | \`pvm-art/out/production.log\`（9/2 版の量産ログ）、\`INVENTORY_2026-09-05.md\`、contracts の記録 |"
echo "| 2026-09-05 | デザイン刷新版の 500 体を制作（9/8 に差し替え。公開中の画像はこちら） | \`pvm-art/README.md\`「2026-09-05 デザイン刷新版」、\`pvm-art/out/qc-judgment-20260905.txt\`、\`pvm-art/art-src/selections-20260905.csv\` |"
echo "| 2026-09-08 | IPFS 固定（CID 確定）、finalizeMinting | \`pvm-art/out/IMAGE_CID_20260908.txt\`、Polygon tx |"
echo "| 2026-09-09 | Reveal（本番公開） | \`members.pachiverse.com/ops/DAY_OF_RUNBOOK_20260909.md\`、Polygon tx |"
echo "| 2026-09-15 | pvm-art を Git 化、稼働記録の開始 | \`pachiverse01-ai/pvm-art\`、\`ops/OPERATIONS_LOG.md\` |"
echo
echo "2025 年以前に遡る作業（構想・要件検討等）の日付付き資料があれば行を追加する。無ければ着手は 2026-01-22 として説明する。"
