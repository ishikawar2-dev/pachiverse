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

- **コミットのあった暦日は 26 日、月別では 2026-09 に 242 件が集中している。** これは AI 支援開発でまとめてコミットしている作業様式の反映で、稼働日数＝作業日数ではない。工数表の人月（再調達原価）は「同等物を外注で作った場合」の積算であり、この日数から逆算するものではない。ただし評価人・税務署はこの差を必ず問うので、工数表 v1.2 本文で先回りして説明する。
- pachiverse.com / contracts / signer の CI 実行数 0 は GitHub Actions を使っていないため（公開サイトは Vercel のデプロイチェック、contracts は forge をローカル実行、signer は npm test をローカル実行）。

- Git の記録は作業の**下限**。要件定義・設計・素材制作（Seedream 生成・QC）・運用（デプロイ・サポート・会員データ突合）・法務調整は行数に現れない。
- members.pachiverse.com の初回コミット以前の初期開発、pvm-art の 2026-09-15 以前の履歴（production.log・INVENTORY_2026-09-05.md に日付あり）は含まれない。
- 行数は AI 支援開発を含む実装量であり、人手の行数ではない。工数表の人月は「同等物を外注で再調達した場合」の積算として別に示す。
