# 開発工数の客観的証跡（Git 記録からの抽出）

生成日: 2026-09-15　生成コマンド: `scripts/dev_effort_evidence.sh`（再実行で同じ表が出る）

工数表 v1.2 の付録。人月の見積りを「売り手の自己申告」ではなく「記録に基づく積算」として示すための一次データ。
Git に入る前の作業（要件定義・設計・WordPress プラグインの初期開発の一部・pvm-art の 2026-09-15 以前の履歴）は**ここには現れない**。その分は工数表本文で別途説明する。

## 1. リポジトリ別サマリ

| リポジトリ | 初回コミット | 最終コミット | コミット数 | 追加行 | 削除行 | 自作コード行数（対象パス） |
|---|---|---|---|---|---|---|
| pachiverse.com（公開サイト + Vercel API） | 2026-04-19 | 2026-09-15 | 73 | 38557 | 543 | 13197 |
| members.pachiverse.com（会員システム） | 2026-05-29 | 2026-09-14 | 238 | 217280 | 7232 | 93521 |
| pachiverse-contracts（スマートコントラクト） | 2026-08-07 | 2026-09-02 | 10 | 11445 | 51 | 2021 |
| pachiverse-signer（署名サーバ） | 2026-08-07 | 2026-09-07 | 12 | 12053 | 237 | 7072 |
| pvm-art（Generative NFT 制作パイプライン） | 2026-09-15 | 2026-09-15 | 1 | 50082 | 0 | 2674 |

## 2. 月別コミット数（全リポジトリ合算）

| 月 | コミット数 |
|---|---|
| 2026-04 | 9 |
| 2026-05 | 18 |
| 2026-06 | 34 |
| 2026-07 | 3 |
| 2026-08 | 28 |
| 2026-09 | 242 |

## 3. 稼働日数（コミットのあった暦日、全リポジトリ合算）

コミットのあった日: **26 日**（同日に複数リポジトリへコミットしても 1 日と数える）

## 4. 自作コードの言語別行数（対象パス、vendor 等除外）

| リポジトリ | 言語（md は運用文書） | ファイル数 | 行数 |
|---|---|---|---|
| pachiverse.com（公開サイト + Vercel API） | html | 8 | 12700 |
| pachiverse.com（公開サイト + Vercel API） | js | 4 | 352 |
| pachiverse.com（公開サイト + Vercel API） | mjs | 1 | 145 |
| members.pachiverse.com（会員システム） | html | 2 | 28 |
| members.pachiverse.com（会員システム） | js | 2 | 369 |
| members.pachiverse.com（会員システム） | md | 36 | 11027 |
| members.pachiverse.com（会員システム） | php | 168 | 76761 |
| members.pachiverse.com（会員システム） | py | 11 | 4574 |
| members.pachiverse.com（会員システム） | sh | 5 | 491 |
| members.pachiverse.com（会員システム） | ts | 1 | 271 |
| pachiverse-contracts（スマートコントラクト） | sh | 1 | 151 |
| pachiverse-contracts（スマートコントラクト） | sol | 12 | 1870 |
| pachiverse-signer（署名サーバ） | mjs | 4 | 360 |
| pachiverse-signer（署名サーバ） | sh | 1 | 78 |
| pachiverse-signer（署名サーバ） | ts | 32 | 6634 |
| pvm-art（Generative NFT 制作パイプライン） | md | 2 | 149 |
| pvm-art（Generative NFT 制作パイプライン） | py | 14 | 2097 |
| pvm-art（Generative NFT 制作パイプライン） | sh | 1 | 64 |
| pvm-art（Generative NFT 制作パイプライン） | yaml | 2 | 364 |

## 5. テスト件数

| リポジトリ | 種別 | 件数 | 数え方 |
|---|---|---|---|
| members.pachiverse.com | PHPUnit テストメソッド（Unit + Integration） | 338 | `grep -rhoE 'function test' tests` |
| pachiverse-contracts | forge テスト関数（test/invariant/fuzz） | 80 | `grep -rhoE 'function (test|invariant)' test` |
| pachiverse-signer | テストケース（it/test）／テストファイル数 | 96 / 9 | `grep -rhoE '^\s*(it|test)\(' src scripts` |

## 6. CI 実行数（GitHub Actions、取得できた範囲）

| リポジトリ | 実行数 | 備考 |
|---|---|---|
| pachiverse.com（公開サイト + Vercel API） | 0 | ishikawar2-dev/pachiverse |
| members.pachiverse.com（会員システム） | 222 | pachiverse01-ai/pachiverse-members |
| pachiverse-contracts（スマートコントラクト） | 0 | pachiverse01-ai/pachiverse-contracts |
| pachiverse-signer（署名サーバ） | 0 | pachiverse01-ai/pachiverse-signer |
| pvm-art（Generative NFT 制作パイプライン） | 0 | pachiverse01-ai/pvm-art |

## 7. この表の限界

- **コミットのあった暦日は 26 日、月別では 2026-09 に 242 件が集中している。** 理由は作業様式ではなく履歴の起点にある: **開発は 2025 年から GitHub を使わずに行われ、売買に向けて作業工数を可視化する目的で 2026 年 4 月以降に段階的に GitHub へ上げ始めた**（オーナー説明 2026-09-15）。したがって Git の履歴は「実装物が存在し・稼働し・保守されている」ことと規模を示す資料であり、開発期間や稼働日数の証跡には**ならない**。工数表の人月（再調達原価）は「同等物を外注で作った場合」の積算であり、この日数から逆算するものではない。ただし評価人・税務署はこの差を必ず問うので、工数表 v1.2 本文で先回りして説明する。
- pachiverse.com / contracts / signer の CI 実行数 0 は GitHub Actions を使っていないため（公開サイトは Vercel のデプロイチェック、contracts は forge をローカル実行、signer は npm test をローカル実行）。

- Git の記録は作業の**下限**。要件定義・設計・素材制作（Seedream 生成・QC）・運用（デプロイ・サポート・会員データ突合）・法務調整は行数に現れない。
- members.pachiverse.com の初回コミット以前の初期開発、pvm-art の 2026-09-15 以前の履歴（production.log・INVENTORY_2026-09-05.md に日付あり）は含まれない。
- 行数は AI 支援開発を含む実装量であり、人手の行数ではない。工数表の人月は「同等物を外注で再調達した場合」の積算として別に示す。

## 8. Git 以前の開発の証跡（日付付きの一次資料）

Git 履歴に現れない期間を裏付けるために、日付が客観的に残っている資料を時系列で並べる。工数表 v1.2 ではこの表を「開発の時系列」として本文に載せ、Git 履歴の集中を先回りで説明する。

| 日付 | 事実 | 根拠（所在） |
|---|---|---|
| 2026-01-22 02:52 | 会員サイト開発の着手（ChatGPT に「メンバーサイトを作成したい」と相談した記録。GitHub 不使用、ローカルとサーバー直編集で開始） | ChatGPT の会話履歴（オーナー保有。日時付きでエクスポート可能）。同日 06:13 に本番 DB の最初のユーザー登録があり整合する |
| 2026-01-22 | 会員サイトの最初のユーザー登録（本番 DB） | `prod_db_export_2026-09-13c.json` の `user_registered` 最小値 |
| 2026-03-20 | 本番 WordPress コアの配置日 | サーバー上の WP コアファイルの更新日時 |
| 2026-03-31 | 会員 4,620 行の本番取り込み（10 分割ファイル） | 取り込み run 記録・`docs/DECISIONS.md`・調査報告 |
| 2026-04-11〜14 | 取り込み後の付与・除外リスト・サポート FAQ シード作成 | `excluded_import_targets_from_prod_db_20260411.csv`、`Pachiverse_support_faq_seeds_2026-04-14.csv` |
| 2026-04-19 | 公開サイト（pachiverse.com）の初回コミット | Git |
| 2026-05-29 | 会員システムの初回コミット（既存プラグインを取り込み） | Git |
| 2026-07-07 | 要件定義書 v1.0・開発工数表 v1.0 | ルート直下の docx |
| 2026-08-07 | contracts / signer の初回コミット、Generative Art 仕様書 | Git、`Pachiverse_Generative_Art_Specification_2026-08-07.txt` |
| 2026-09-02 | 500 体のアート制作完了 | `pvm-art/out/production.log`、`INVENTORY_2026-09-05.md` |
| 2026-09-08 | IPFS 固定（CID 確定） | `pvm-art/out/IMAGE_CID_20260908.txt` |
| 2026-09-09 | Reveal（本番公開） | `members.pachiverse.com/ops/DAY_OF_RUNBOOK_20260909.md`、Polygon tx |

**補足**: オーナーは当初「2025 年から開発」と説明したが、日付付きの最古の記録は上記 2026-01-22 の ChatGPT 相談であり、会員サイトの開発着手はこの日とする。2025 年に遡る作業（構想・要件の検討等）があれば、日付付き資料を得た時点で行を追加する。

**収集すべきもの（オーナー）**: 2025 年分があればその日付付き資料。候補: レンタルサーバー・ドメインの契約/請求、デザイン・設計資料の作成日、外部 API（fal.ai / Pinata / GCP / Vercel）の請求履歴、ChatGPT・Codex・Claude の会話履歴のエクスポート（開始日）、UNI スタッフとのやり取り（サポート運用開始日）、Time Machine 等のバックアップに残る旧作業ディレクトリ（`~/Documents/Point-Pocket/poiverse-member` 等、現在は移動済みで不在）。
