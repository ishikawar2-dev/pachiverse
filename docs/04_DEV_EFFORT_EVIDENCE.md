# 実装規模の証跡（Git 記録からの抽出）

生成日: 2026-09-15　生成コマンド: `scripts/dev_effort_evidence.sh`（再実行で同じ表が出る）

工数表 v1.2 の付録。**実装物が存在し、稼働し、保守されていることと、その規模（行数・テスト件数・CI 実行）を示す一次データ。工数（人月）や開発期間の証跡ではない。** 再調達原価の本体は外注見積 2〜3 社であり、本表はその見積対象の規模を第三者が確認するために使う。
Git の履歴は 2026-04 以降に集中している（開発は 2026-01-22 に GitHub を使わずに始め、売買に向けた可視化のため後から段階的に上げたため）。コミット数・稼働日数は履歴の起点を示すだけで、作業量を表さない。

## 1. リポジトリ別サマリ

| リポジトリ | HEAD | 初回コミット | 最終コミット | コミット数 | 追加行 | 削除行 | 自作コード行数（対象パス、文書 md を含む） |
|---|---|---|---|---|---|---|---|
| pachiverse.com（公開サイト + Vercel API） | `a78c7af` | 2026-04-19 | 2026-09-15 | 80 | 38776 | 557 | 13324 |
| members.pachiverse.com（会員システム） | `909d56f` | 2026-05-29 | 2026-09-15 | 240 | 217519 | 7232 | 93760 |
| pachiverse-contracts（スマートコントラクト） | `72c1e4d` | 2026-08-07 | 2026-09-02 | 10 | 11445 | 51 | 2021 |
| pachiverse-signer（署名サーバ） | `7deef51` | 2026-08-07 | 2026-09-07 | 12 | 12053 | 237 | 7072 |
| pvm-art（Generative NFT 制作パイプライン） | `5894397` | 2026-09-15 | 2026-09-15 | 1 | 50082 | 0 | 2674 |
| pachiverse-world（メタバース、World Foundation） | `ad2ed9b` | 2026-09-05 | 2026-09-11 | 30 | 24606 | 279 | 12346 |

## 2. 月別コミット数（全リポジトリ合算。履歴の起点を示すだけで作業量ではない）

| 月 | コミット数 |
|---|---|
| 2026-04 | 9 |
| 2026-05 | 18 |
| 2026-06 | 34 |
| 2026-07 | 3 |
| 2026-08 | 28 |
| 2026-09 | 281 |

## 3. コミットのあった暦日（全リポジトリ合算。作業日数ではない）

コミットのあった日: **26 日**（同日に複数リポジトリへコミットしても 1 日と数える）

## 4. 自作コードの区分別行数（対象パス、vendor 等除外）

コード＝テストと文書以外、テスト＝ `tests/` `test/` 配下、文書＝ `.md`。

| リポジトリ | 区分 | 言語 | ファイル数 | 行数 |
|---|---|---|---|---|
| pachiverse.com（公開サイト + Vercel API） | コード | html | 8 | 12700 |
| pachiverse.com（公開サイト + Vercel API） | コード | js | 4 | 352 |
| pachiverse.com（公開サイト + Vercel API） | コード | mjs | 1 | 145 |
| pachiverse.com（公開サイト + Vercel API） | コード | sh | 1 | 127 |
| members.pachiverse.com（会員システム） | コード | html | 2 | 28 |
| members.pachiverse.com（会員システム） | コード | js | 2 | 369 |
| members.pachiverse.com（会員システム） | コード | php | 119 | 68820 |
| members.pachiverse.com（会員システム） | コード | py | 11 | 4574 |
| members.pachiverse.com（会員システム） | コード | sh | 5 | 491 |
| members.pachiverse.com（会員システム） | コード | ts | 1 | 271 |
| members.pachiverse.com（会員システム） | テスト | php | 49 | 7941 |
| members.pachiverse.com（会員システム） | 文書 | md | 37 | 11266 |
| pachiverse-contracts（スマートコントラクト） | コード | sh | 1 | 151 |
| pachiverse-contracts（スマートコントラクト） | コード | sol | 6 | 611 |
| pachiverse-contracts（スマートコントラクト） | テスト | sol | 6 | 1259 |
| pachiverse-signer（署名サーバ） | コード | mjs | 4 | 360 |
| pachiverse-signer（署名サーバ） | コード | sh | 1 | 78 |
| pachiverse-signer（署名サーバ） | コード | ts | 22 | 4775 |
| pachiverse-signer（署名サーバ） | テスト | ts | 10 | 1859 |
| pvm-art（Generative NFT 制作パイプライン） | コード | py | 14 | 2097 |
| pvm-art（Generative NFT 制作パイプライン） | コード | sh | 1 | 64 |
| pvm-art（Generative NFT 制作パイプライン） | コード | yaml | 2 | 364 |
| pvm-art（Generative NFT 制作パイプライン） | 文書 | md | 2 | 149 |
| pachiverse-world（メタバース、World Foundation） | コード | py | 1 | 888 |
| pachiverse-world（メタバース、World Foundation） | コード | ts | 49 | 4797 |
| pachiverse-world（メタバース、World Foundation） | コード | tsx | 8 | 405 |
| pachiverse-world（メタバース、World Foundation） | テスト | ts | 10 | 1559 |
| pachiverse-world（メタバース、World Foundation） | 文書 | md | 30 | 5102 |

## 5. テスト件数

| リポジトリ | 種別 | 件数 | 数え方 |
|---|---|---|---|
| members.pachiverse.com | PHPUnit テストメソッド（Unit + Integration） | 338 | `grep -rhoE 'function test' tests` |
| pachiverse-contracts | forge テスト関数（test/invariant/fuzz） | 80 | `grep -rhoE 'function (test|invariant)' test` |
| pachiverse-signer | テストケース（it/test）／テストファイル数 | 96 / 9 | `grep -rhoE '^\s*(it|test)\(' src scripts test` |

## 6. CI 実行数（GitHub Actions、取得できた範囲）

| リポジトリ | 実行数 | 備考 |
|---|---|---|
| pachiverse.com（公開サイト + Vercel API） | 0 | ishikawar2-dev/pachiverse |
| members.pachiverse.com（会員システム） | 227 | pachiverse01-ai/pachiverse-members |
| pachiverse-contracts（スマートコントラクト） | 0 | pachiverse01-ai/pachiverse-contracts |
| pachiverse-signer（署名サーバ） | 0 | pachiverse01-ai/pachiverse-signer |
| pvm-art（Generative NFT 制作パイプライン） | 0 | pachiverse01-ai/pvm-art |
| pachiverse-world（メタバース、World Foundation） | 22 | pachiverse01-ai/pachiverse-world-foundation |

## 7. この表の限界

- Git の記録は**実装規模の下限**。要件定義・設計・素材制作（Seedream 生成・QC）・運用（デプロイ・サポート・会員データ突合）・法務調整は行数に現れない。
- **開発は 2026-01-22 に GitHub を使わずに始まり、売買に向けた可視化のため 2026-04 以降に段階的に GitHub へ上げた。** したがってコミット数・コミットのあった暦日は履歴の起点を示すだけで、開発期間や作業量の証跡には**ならない**。members.pachiverse.com の初回コミット以前の初期開発、pvm-art の 2026-09-15 以前の履歴（production.log・INVENTORY_2026-09-05.md に日付あり）も含まれない。
- 行数は AI 支援開発を含む実装量であり、人手の行数ではない。工数表の人月は「同等物を外注で再調達した場合」の積算であり、本表から逆算するものではない。再調達原価の本体は外注見積 2〜3 社で、本表はその見積対象の規模を示す。
- 公開サイト / contracts / signer / pachiverse-world の CI 実行数 0 は GitHub Actions を使っていないため（公開サイトは Vercel のデプロイチェック、contracts は forge をローカル実行、signer は npm test をローカル実行）。
- 出力は生成日と各リポジトリの HEAD に依存する。§1 の HEAD ハッシュを添えて提示する。

## 8. 開発の時系列（Git 以前を含む、日付付きの一次資料）

| 日付 | 事実 | 根拠（所在） |
|---|---|---|
| 2026-01-22 02:52 | 会員サイト開発の着手（ChatGPT に「メンバーサイトを作成したい」と相談した記録。GitHub 不使用、ローカルとサーバー直編集で開始） | ChatGPT の会話履歴（オーナー保有。日時付きでエクスポート可能）。同日 06:13 に本番 DB の最初のユーザー登録があり整合する |
| 2026-03-20 | 本番 WordPress コアの配置日 | サーバー上の WP コアファイルの更新日時 |
| 2026-03-31 | 会員 4,620 行の本番取り込み（10 分割ファイル） | 取り込み run 記録・`docs/DECISIONS.md`・調査報告 |
| 2026-04-11〜14 | 取り込み後の付与・除外リスト・サポート FAQ シード作成 | `excluded_import_targets_from_prod_db_20260411.csv`、`Pachiverse_support_faq_seeds_2026-04-14.csv` |
| 2026-04-19 | 公開サイト（pachiverse.com）の初回コミット | Git |
| 2026-05-29 | 会員システムの初回コミット（既存プラグインを取り込み） | Git |
| 2026-07-07 | 要件定義書 v1.0・開発工数表 v1.0 | ルート直下の docx |
| 2026-08-07 | contracts / signer の初回コミット、Generative Art 仕様書 | Git、`Pachiverse_Generative_Art_Specification_2026-08-07.txt` |
| 2026-09-02 | 500 体のアート制作完了、コントラクト mainnet デプロイ | `pvm-art/out/production.log`、`INVENTORY_2026-09-05.md`、contracts の記録 |
| 2026-09-08 | IPFS 固定（CID 確定）、finalizeMinting | `pvm-art/out/IMAGE_CID_20260908.txt`、Polygon tx |
| 2026-09-09 | Reveal（本番公開） | `members.pachiverse.com/ops/DAY_OF_RUNBOOK_20260909.md`、Polygon tx |
| 2026-09-15 | pvm-art を Git 化、稼働記録の開始 | `pachiverse01-ai/pvm-art`、`ops/OPERATIONS_LOG.md` |

2025 年以前に遡る作業（構想・要件検討等）の日付付き資料があれば行を追加する。無ければ着手は 2026-01-22 として説明する。
