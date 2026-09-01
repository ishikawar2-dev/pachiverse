# 00_OVERVIEW — プロジェクト概要

> 新しい AI がこのプロジェクトを最初に理解するための入口。詳細は各専門 docs へ誘導する。
> 確認できた事実のみを書き、推測は「未確認」「要確認」と明記する。

## プロジェクト概要

Pachiverse は、パチンコ／スロットを題材とした NFT（商品換価権 NFT）と会員制プラットフォームを組み合わせた Web3 事業。
このリポジトリ（`~/Developer/pachiverse`）は、その **公開サイト（LP・ドキュメントページ）を正本としつつ、周辺のサブプロジェクトを同一ディレクトリ配下に同居させた作業ルート**である。

重要な構造上の事実として、**このディレクトリは単一のリポジトリではない**。Git 管理されているのは静的サイトと `api/` のみで、`pachiverse-contracts` / `pachiverse-signer` / `members.pachiverse.com` はそれぞれ独立した入れ子の Git リポジトリ、`pvm-art` は（2026-09-01 時点で）Git 管理外のローカル作業ディレクトリである。詳細は [01_ARCHITECTURE.md](01_ARCHITECTURE.md)。

## 対象ユーザー

- **一般来訪者** — 公開サイト（`index.html` 他）でプロジェクト概要・コントラクト情報・FAQ を閲覧する。ニュースレター登録が可能。
- **会員** — `members.pachiverse.com` の会員システム利用者。**完全紹介制で、公開の新規登録は存在しない**（運営が CSV で事前登録し、会員は初回ログインで本人確認のうえ有効化する）。出典: 要件定義書 §3.1。
- **運営／管理者** — 会員管理・PV Coin 台帳・出金承認・監査を管理画面から行う。

## 主要機能

このルート配下でカバーされる範囲:

- **公開サイト** — LP（`index.html`）、コントラクト一覧（`contracts.html`）、FAQ、ライトペーパー、透明性ページ、ドキュメント。すべて素の静的 HTML（ビルドツールなし）。
- **ニュースレター登録 API**（`api/`） — Vercel Serverless Function 2本。購読者を Redis に保存し、管理者トークンで一覧・CSV 出力する。
- **スマートコントラクト**（`pachiverse-contracts`） — Polygon 上の ERC721（Machine NFT）と ERC1155（Mystery Pack）。Foundry / Solidity 0.8.24 / OpenZeppelin v5。
- **署名基盤**（`pachiverse-signer`） — 秘密鍵を保持し TX を構築・署名・broadcast する Fastify サービス。業務判断は持たない。
- **NFT アート生成パイプライン**（`pvm-art`） — Machine NFT 500 体の画像・メタデータを生成する Python パイプライン。
- **会員システム**（`members.pachiverse.com`） — WordPress + 自作プラグイン `uni_memberpage`。**別リポジトリのため本 docs では調査対象外**（役割のみ記載）。

## 主要技術

| 領域 | 技術 |
|---|---|
| 公開サイト | 素の HTML / CSS / JS（フレームワーク・ビルド工程なし） |
| 公開 API | Vercel Serverless Function（Node.js、CommonJS）+ Redis（Upstash 互換 REST API） |
| スマートコントラクト | Solidity 0.8.24 / Foundry / OpenZeppelin v5 / Polygon（mainnet + Amoy テストネット） |
| 署名基盤 | TypeScript / Node.js 20+ / Fastify 5 / viem 2 / better-sqlite3 / vitest |
| アート生成 | Python（Pillow / numpy / pyyaml、`.venv` 固定）+ Seedream（fal.ai）+ Real-ESRGAN |
| 会員システム | WordPress 6.9.4 + PHP プラグイン（別リポジトリ・調査対象外） |

## システム構成概要

```
公開サイト（静的HTML）  →  members.pachiverse.com（会員システム・業務状態の正本）
                                    │
                                    ↓ signer-v1 契約（HMAC 認証）
                          pachiverse-signer（鍵を持つのはここだけ）
                                    │
                                    ↓ TX 署名・broadcast
                          Polygon（PVM ERC721 / PVPACK ERC1155）
                                    ↑
                          pvm-art（画像・メタデータを生成し IPFS へ）
```

**責任分界の要点**: 業務状態の正本は WordPress、鍵を持つのは Signer だけ、オンチェーンは不変条件の最終防衛線。詳細は [01_ARCHITECTURE.md](01_ARCHITECTURE.md) と [02_ONCHAIN.md](02_ONCHAIN.md)。

## 主要データ

- **member_code** — 会員紐付けの正キー（固定 ID）。**メールアドレスは正キーに用いない**（同一メール複数会員問題のため）。出典: 要件定義書 §1.4 / §4。
- **PV Coin** — ゲーム内専用クレジット。**金銭的価値を持たない内部通貨**。複式記帳の追記専用台帳で管理。
- **商品換価権 NFT** — 会員が保有・利用する NFT。実体は会社ウォレットに集約保管し（カストディアル）、会員の保有はオフチェーン台帳で表現する。
- **Mystery Pack** — 未開封パック NFT（tokenId 1101 / 1202）。開封（Reveal）で Machine NFT が割り当てられる。
- **Machine NFT（PVM）** — tokenId 1〜500 の ERC721。レアリティ構成は LEGEND 5 / UR 15 / SSSR 30 / SSR 60 / SR 120 / R 270（合計 500、変更不可）。
- **subscribers** — 公開サイトのニュースレター購読者。Redis のハッシュ 1 本（フィールド = メールアドレス）。

## 外部サービス

実値は記載しない。変数名と用途のみ。

| サービス | 用途 | 関連環境変数 |
|---|---|---|
| Redis（Vercel Redis / Upstash） | 購読者保存 | `KV_REST_API_URL` / `KV_REST_API_TOKEN`（フォールバック: `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`） |
| 購読者一覧の管理者認証 | `/api/subscribers` の共有シークレット | `ADMIN_TOKEN` |
| Polygon RPC | コントラクト操作・TX broadcast | `POLYGON_RPC_URL` / `POLYGON_AMOY_RPC_URL`（contracts）、`RPC_URL` / `CHAIN_ID`（signer） |
| PolygonScan | コントラクト verify・オンチェーン残高取得 | `POLYGONSCAN_API_KEY` |
| fal.ai（Seedream） | NFT アート素材生成 | API キーは `~/.fal_key`（**コード・ログ・チャットに出さない**） |
| IPFS | NFT メタデータ・画像のホスティング | `BASE_URI` / `PACK_BASE_URI`（`ipfs://<CID>/` 形式） |
| Anthropic API / Google Sheets / ブラストエンジン / IMAP | 会員システム側の外部連携（サポート AI・記事生成・メール） | 会員システム側で管理（本リポジトリ対象外） |

Signer の環境変数一覧は [02_ONCHAIN.md](02_ONCHAIN.md) を参照。

## 重要な制約

**破ってはいけない制約。変更前に必ず確認すること。**

1. **PV Coin は金銭的価値を持たない内部通貨**として設計・説明されている。この位置づけを変える表現・機能を勝手に加えない（要件定義書 §1.4）。
2. **member_code が会員紐付けの正キー。email 照合は禁止**（要件定義書 §3.9 / §4）。
3. **Signer は single-active instance でのみ運用する。** 複数インスタンスの同時稼働は nonce の重複・欠番を生み、TX が失われるか wallet が停止する（`pachiverse-signer/README.md`）。
4. **PVM_CUSTODY と PACK_CUSTODY は必ず別の EOA にする。** 同一鍵にすると 1 つの侵害で ERC721 と ERC1155 の両方が影響を受ける。
5. **MINTER / PVM_CUSTODY / BURNER の EOA から Signer 以外で TX を送らない。** `cast` や別スクリプトからの送信は Signer の nonce 管理と競合する。
6. **`finalizeMinting()` / `freezeMetadata()` は不可逆。** 実行後は永久に mint / baseURI 変更ができない。
7. **秘密鍵・API キー・HMAC 鍵をコミットしない。** 平文 `PRIVATE_KEY` を `.env` に置く運用は開発 / Amoy 限定で、本番は keystore / ハードウェアウォレット / KMS を使う。
8. **`pvm-art` のレアリティ配分（rarity_quota）とレイヤー順は変更不可**（NFT 制作資料 2026-03-12 由来）。画像仕様 4096×4096 / webp も変更不可。
9. **収益機構（外部マーケットプレイス Genaverse・手数料 10% 分配のスマートコントラクト）は設計書段階で実装範囲外**（要件定義書 §8）。
10. **カストディアル方式に伴う法務論点**（資金決済法上のカストディ該当性、払出時課税、KYC 要否、景表法・賭博該当性）は **要確認事項**。弁護士確認が推奨されている（要件定義書 §8）。

## docs 案内

- [01_ARCHITECTURE.md](01_ARCHITECTURE.md) — リポジトリ構成・データフロー・非自明な依存関係
- [02_ONCHAIN.md](02_ONCHAIN.md) — コントラクト仕様・Wallet/鍵の分離・Signer の nonce 設計・アート生成パイプライン
- [DECISIONS.md](DECISIONS.md) — 重要な設計判断と理由
- [KNOWN_ISSUES.md](KNOWN_ISSUES.md) — 既知問題・技術的負債・壊れやすい箇所・未確認事項

### このリポジトリ外の資料

- ルート直下の `Pachiverse_要件定義書_v1.0_2026-07-07.docx` — 会員システムの as-built 要件定義（本 docs のビジネス知識の主要ソース）
- ルート直下の `Pachiverse_開発工数表_v1.0_2026-07-07.docx` — 工程別工数・実装規模の計測値
- `pachiverse-contracts/README.md` / `pachiverse-signer/README.md` — 各サブプロジェクトの詳細仕様（内容の濃い一次資料。オンチェーン作業時は必読）
- `pvm-art/PIPELINE.md` / `pvm-art/art-src/traits.yaml` — アート合成アルゴリズムと trait マスター
