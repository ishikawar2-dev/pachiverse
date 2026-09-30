# 実装規模の証跡（Git 記録からの抽出）

生成日: 2026-10-01　生成コマンド: `scripts/dev_effort_evidence.sh`（各リポジトリの HEAD が同じなら §1〜§5 は同じ表が出る。生成日と §6 の CI 実行数は実行時の値）

工数表 v1.2 の付録。**実装物が存在し、稼働し、保守されていることと、その規模（行数・テスト件数・CI 実行）を示す一次データ。工数（人月）や開発期間の証跡ではない。** 再調達原価の本体は外注見積 2〜3 社であり、本表はその見積対象の規模を第三者が確認するために使う。
Git の履歴は 2026-04 以降に集中している（開発は 2026-01-22 に GitHub を使わずに始め、売買に向けた可視化のため後から段階的に上げたため）。コミット数・稼働日数は履歴の起点を示すだけで、作業量を表さない。

## 1. リポジトリ別サマリ

追加行・削除行・自作コード行数は、同じ対象パス・除外・拡張子（§7）に限って数える（第三者のコード・生成物・対象パスの外のファイルは含まない）。

| リポジトリ | HEAD | 初回コミット | 最終コミット | コミット数 | 追加行 | 削除行 | 自作コード行数（対象パス、文書 md を含む） |
|---|---|---|---|---|---|---|---|
| pachiverse.com（公開サイト + Vercel API） | `d28198e` | 2026-04-19 | 2026-10-01 | 212 | 14641 | 665 | 13976 |
| members.pachiverse.com（会員システム） | `42d6803` | 2026-05-29 | 2026-10-01 | 762 | 177732 | 8605 | 168577 |
| pachiverse-contracts（スマートコントラクト） | `d4f8ae9` | 2026-08-07 | 2026-09-22 | 25 | 4752 | 61 | 4691 |
| pachiverse-signer（署名サーバ） | `1a82a32` | 2026-08-07 | 2026-09-17 | 24 | 9939 | 253 | 9686 |
| pvm-art（Generative NFT 制作パイプライン） | `73394cc` | 2026-09-15 | 2026-09-30 | 4 | 2857 | 4 | 2853 |
| pachiverse-world（メタバース、World Foundation） | `ad2ed9b` | 2026-09-05 | 2026-09-11 | 30 | 12919 | 114 | 12805 |

### 1.1 作者別のコミット数（マージを除く）

作者欄の名前ごとの件数（`git log --no-merges --format=%an`。メールアドレスは載せない）。ishikawar2-dev と pachiverse01-ai はいずれもオーナー個人が所有するアカウント（親 `docs/07_HANDOVER_KIT.md` §8 #1）。GitHub 上のマージコミットは除く。

| リポジトリ | 作者 | コミット数 |
|---|---|---|
| pachiverse.com（公開サイト + Vercel API） | ishikawar2-dev | 121 |
| members.pachiverse.com（会員システム） | ishikawar2-dev | 473 |
| members.pachiverse.com（会員システム） | pachiverse01-ai | 6 |
| members.pachiverse.com（会員システム） | Claude Fable 5.1 | 4 |
| pachiverse-contracts（スマートコントラクト） | ishikawar2-dev | 16 |
| pachiverse-signer（署名サーバ） | ishikawar2-dev | 18 |
| pvm-art（Generative NFT 制作パイプライン） | ishikawar2-dev | 3 |
| pachiverse-world（メタバース、World Foundation） | ishikawar2-dev | 29 |

## 2. 月別コミット数（全リポジトリ合算。履歴の起点を示すだけで作業量ではない）

| 月 | コミット数 |
|---|---|
| 2026-04 | 9 |
| 2026-05 | 18 |
| 2026-06 | 34 |
| 2026-07 | 3 |
| 2026-08 | 28 |
| 2026-09 | 957 |
| 2026-10 | 8 |

## 3. コミットのあった暦日（全リポジトリ合算。作業日数ではない）

コミットのあった日: **38 日**（同日に複数リポジトリへコミットしても 1 日と数える）

## 4. 自作コードの区分別行数（対象パス、vendor 等除外）

コード＝テストと文書以外、テスト＝ `tests/` `test/` 配下、文書＝ `.md`。

| リポジトリ | 区分 | 言語 | ファイル数 | 行数 |
|---|---|---|---|---|
| pachiverse.com（公開サイト + Vercel API） | コード | html | 8 | 12846 |
| pachiverse.com（公開サイト + Vercel API） | コード | js | 5 | 494 |
| pachiverse.com（公開サイト + Vercel API） | コード | mjs | 2 | 333 |
| pachiverse.com（公開サイト + Vercel API） | コード | py | 1 | 162 |
| pachiverse.com（公開サイト + Vercel API） | コード | sh | 1 | 141 |
| members.pachiverse.com（会員システム） | コード | html | 2 | 28 |
| members.pachiverse.com（会員システム） | コード | js | 3 | 810 |
| members.pachiverse.com（会員システム） | コード | php | 141 | 102079 |
| members.pachiverse.com（会員システム） | コード | py | 12 | 5008 |
| members.pachiverse.com（会員システム） | コード | sh | 9 | 2463 |
| members.pachiverse.com（会員システム） | コード | ts | 1 | 271 |
| members.pachiverse.com（会員システム） | テスト | php | 112 | 39266 |
| members.pachiverse.com（会員システム） | テスト | sh | 1 | 190 |
| members.pachiverse.com（会員システム） | 文書 | md | 47 | 18462 |
| pachiverse-contracts（スマートコントラクト） | コード | sh | 2 | 416 |
| pachiverse-contracts（スマートコントラクト） | コード | sol | 8 | 1121 |
| pachiverse-contracts（スマートコントラクト） | テスト | sol | 9 | 3110 |
| pachiverse-contracts（スマートコントラクト） | 文書 | md | 1 | 44 |
| pachiverse-signer（署名サーバ） | コード | mjs | 4 | 459 |
| pachiverse-signer（署名サーバ） | コード | sh | 1 | 194 |
| pachiverse-signer（署名サーバ） | コード | ts | 28 | 6652 |
| pachiverse-signer（署名サーバ） | テスト | ts | 11 | 2381 |
| pvm-art（Generative NFT 制作パイプライン） | コード | py | 14 | 2097 |
| pvm-art（Generative NFT 制作パイプライン） | コード | sh | 1 | 64 |
| pvm-art（Generative NFT 制作パイプライン） | コード | yaml | 2 | 364 |
| pvm-art（Generative NFT 制作パイプライン） | 文書 | md | 5 | 328 |
| pachiverse-world（メタバース、World Foundation） | コード | py | 1 | 888 |
| pachiverse-world（メタバース、World Foundation） | コード | ts | 49 | 4797 |
| pachiverse-world（メタバース、World Foundation） | コード | tsx | 8 | 405 |
| pachiverse-world（メタバース、World Foundation） | テスト | ts | 10 | 1559 |
| pachiverse-world（メタバース、World Foundation） | 文書 | md | 31 | 5156 |

## 5. テスト件数

| リポジトリ | 種別 | 件数 | 数え方 |
|---|---|---|---|
| members.pachiverse.com | PHPUnit テストメソッド（Unit + Integration） | 1282 | `git grep -hoE 'function test' HEAD -- tests` |
| pachiverse-contracts | forge テスト関数（test/invariant/fuzz） | 181 | `git grep -hoE 'function (test\|invariant)' HEAD -- test` |
| pachiverse-signer | テストケース（it/test）／テストファイル数 | 139 / 10 | `git grep -hoE '^[[:space:]]*(it\|test)\(' HEAD -- src scripts test` |

## 6. CI 実行数（GitHub Actions、取得できた範囲）

| リポジトリ | 実行数 | 備考 |
|---|---|---|
| pachiverse.com（公開サイト + Vercel API） | 0 | ishikawar2-dev/pachiverse |
| members.pachiverse.com（会員システム） | 515 | pachiverse01-ai/pachiverse-members |
| pachiverse-contracts（スマートコントラクト） | 0 | pachiverse01-ai/pachiverse-contracts |
| pachiverse-signer（署名サーバ） | 0 | pachiverse01-ai/pachiverse-signer |
| pvm-art（Generative NFT 制作パイプライン） | 0 | pachiverse01-ai/pvm-art |
| pachiverse-world（メタバース、World Foundation） | 22 | pachiverse01-ai/pachiverse-world-foundation |

## 7. この表の限界

- Git の記録は**実装規模の下限**。要件定義・設計・素材制作（Seedream 生成・QC）・運用（デプロイ・サポート・会員データ突合）・法務調整は行数に現れない。
- **開発は 2026-01-22 に GitHub を使わずに始まり、売買に向けた可視化のため 2026-04 以降に段階的に GitHub へ上げた。** したがってコミット数・コミットのあった暦日は履歴の起点を示すだけで、開発期間や作業量の証跡には**ならない**。members.pachiverse.com の初回コミット以前の初期開発、pvm-art の 2026-09-15 以前の履歴（production.log・INVENTORY_2026-09-05.md に日付あり）も含まれない。
- 行数は AI 支援開発を含む実装量であり、人手の行数ではない。工数表の人月は「同等物を外注で再調達した場合」の積算であり、本表から逆算するものではない。再調達原価の本体は外注見積 2〜3 社で、本表はその見積対象の規模を示す。
- 公開サイト / contracts / signer / pvm-art の CI 実行数 0 は GitHub Actions を使っていないため（公開サイトは Vercel のデプロイチェック、contracts は forge をローカル実行、signer は npm test をローカル実行）。pachiverse-world は GitHub Actions を使う。members.pachiverse.com は 2026-09-27 から無料枠の有無にかかわらずローカルの同等検証を優先し、結果を PR コメントに記録している（`scripts/local-ci.sh --comment`）ため、以後の実行数は検証回数を表さない。
- 行数・追加行・削除行・テスト件数は、各リポジトリの HEAD のコミット済みの中身で数える（作業ツリーの未コミットの変更と未追跡のファイルは数えない）。§1 の追加行・削除行は、全履歴の差分を自作コード行数と同じ対象パス・除外・拡張子に限って合計し、名前の変更は変更後のパスで判定する。
- 数える拡張子は §1・§4 で共通: php・ts・tsx・js・mjs・sol・py・sh・html・yaml・yml・md。
- 対象パス（git のパススペックとして渡す。`*.md` などはリポジトリ全体で照合する）と除外（正規表現）は次のとおりで、リポジトリ間で揃えていない（例: 公開サイトは `docs/` を数えず、会員システムは `docs/` を数える。会員システムは同じリポジトリの `wp-content/plugins/uni-login-analytics` と `wp-content/maintenance.php` を含めていない）。
  - pachiverse.com（公開サイト + Vercel API）: 対象 `api scripts *.html transparency vercel.json`、除外 `^(assets|files|_archive|members-deploy-main)/`
  - members.pachiverse.com（会員システム）: 対象 `wp-content/plugins/uni_memberpage tests scripts ops docs`、除外 `/vendor/|/node_modules/`
  - pachiverse-contracts（スマートコントラクト）: 対象 `src test script ops`、除外 `^lib/`
  - pachiverse-signer（署名サーバ）: 対象 `src scripts schemas test`、除外 `/node_modules/|^dist/`
  - pvm-art（Generative NFT 制作パイプライン）: 対象 `*.py *.sh *.md prompts art-src/traits.yaml art-src/legends.yaml`、除外 `^out/|^\.venv/`
  - pachiverse-world（メタバース、World Foundation）: 対象 `apps packages tools content docs *.md`、除外 `/node_modules/|^\.claude/`
- 出力は生成日と各リポジトリの HEAD に依存する。§1 の HEAD ハッシュを添えて提示する。

## 8. 開発の時系列（Git 以前を含む、日付付きの一次資料）

| 日付 | 事実 | 根拠（所在） |
|---|---|---|
| 2026-01-22 02:52 | 会員サイトの企画に着手（本件の開発着手日として記録。ChatGPT に「メンバーサイトを作成したい」と相談した記録。GitHub 不使用、ローカルとサーバー直編集で開始） | ChatGPT の会話履歴（オーナー保有。日時付きでエクスポート可能）。同日 06:13 に本番 DB の最初のユーザー登録があり整合する |
| 2026-03-20 | 本番 WordPress コアの配置日 | サーバー上の WP コアファイルの更新日時 |
| 2026-03-31 | 会員 4,620 行の本番取り込み（10 分割ファイル） | 取り込み run 記録・`docs/DECISIONS.md`・調査報告 |
| 2026-04-11〜14 | 取り込み後の付与・除外リスト・サポート FAQ シード作成 | `excluded_import_targets_from_prod_db_20260411.csv`、`Pachiverse_support_faq_seeds_2026-04-14.csv` |
| 2026-04-19 | 公開サイト（pachiverse.com）の初回コミット | Git |
| 2026-05-29 | 会員システムの初回コミット（既存プラグインを取り込み） | Git |
| 2026-07-07 | 要件定義書 v1.0・開発工数表 v1.0 | ルート直下の docx |
| 2026-08-07 | contracts / signer の初回コミット、Generative Art 仕様書 | Git、`Pachiverse_Generative_Art_Specification_2026-08-07.txt` |
| 2026-09-02 | 500 体のアート制作完了（9/2 版）、コントラクト mainnet デプロイ | `pvm-art/out/production.log`（9/2 版の量産ログ）、`INVENTORY_2026-09-05.md`、contracts の記録 |
| 2026-09-05 | デザイン刷新版の 500 体を制作（9/8 に差し替え。公開中の画像はこちら） | `pvm-art/README.md`「2026-09-05 デザイン刷新版」、`pvm-art/out/qc-judgment-20260905.txt`、`pvm-art/art-src/selections-20260905.csv` |
| 2026-09-08 | IPFS 固定（CID 確定）、finalizeMinting | `pvm-art/out/IMAGE_CID_20260908.txt`、Polygon tx |
| 2026-09-09 | Reveal（本番公開） | `members.pachiverse.com/ops/DAY_OF_RUNBOOK_20260909.md`、Polygon tx |
| 2026-09-15 | pvm-art を Git 化、稼働記録の開始 | `pachiverse01-ai/pvm-art`、`ops/OPERATIONS_LOG.md` |

2025 年以前に遡る作業（構想・要件検討等）の日付付き資料があれば行を追加する。無ければ着手は 2026-01-22 として説明する。
