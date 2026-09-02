# 01_ARCHITECTURE — システム構成

> **現在仕様**のみを書く。履歴は Git、設計判断の理由は DECISIONS.md へ。
> 確認できた事実のみを書き、推測は「未確認」「要確認」と明記する。

## 全体構成

Pachiverse は、役割の異なる 4 つのシステムが疎結合で連携する構成をとる。

```
┌─────────────────────────────────────────────────────────────┐
│ 公開サイト（本リポジトリのルート）                              │
│  index.html / contracts.html / faq.html / litepaper.html      │
│  docs.html / transparency.html / collection.html              │
│  design-preview.html（ナビ非掲載）                             │
│  素の HTML・CSS・JS（ビルド工程なし）                           │
│                                                               │
│  api/subscribe.js    ─┐                                       │
│  api/subscribers.js  ─┴→ Redis（Upstash 互換 REST）            │
│  api/collection.js / api/machine-page.js                      │
└──────────────┬──────────────────────────────────────────────┘
               │ 公開 Collection API / 会員ログインへのリンク
               ↓
┌─────────────────────────────────────────────────────────────┐
│ members.pachiverse.com（別 Git リポジトリ・調査対象外）        │
│  WordPress 6.9.4 + 自作プラグイン uni_memberpage               │
│  **業務状態の正本**: 会員・PV Coin 台帳・NFT 保有・Reveal 判断  │
└──────────────┬──────────────────────────────────────────────┘
               │ signer-v1 契約（HTTP + HMAC-SHA256 認証）
               │ WordPress が request_id を発行し、何を実行するかを決める
               ↓
┌─────────────────────────────────────────────────────────────┐
│ pachiverse-signer（別 Git リポジトリ）                         │
│  **鍵を持つのはここだけ。** 業務判断は持たない                   │
│  TX 構築・署名・broadcast・重複排除・nonce 管理（SQLite）        │
└──────────────┬──────────────────────────────────────────────┘
               │ viem 経由で TX 送信
               ↓
┌─────────────────────────────────────────────────────────────┐
│ Polygon（mainnet / Amoy）                                     │
│  PachiverseMachines (PVM, ERC721)                             │
│  PachiverseMysteryPacks (PVPACK, ERC1155)                     │
│  ※ 旧 PachiverseItems1155 ほか稼働中の旧コントラクトあり        │
└─────────────────────────────────────────────────────────────┘
               ↑ メタデータ・画像（IPFS）
┌─────────────────────────────────────────────────────────────┐
│ pvm-art（Git 管理外のローカル作業ディレクトリ）                 │
│  Machine NFT 500 体の画像・メタデータ生成パイプライン（Python）  │
└─────────────────────────────────────────────────────────────┘
```

**Indexer**（TX receipt を取得し `confirmed` / `failed` を判定する役割）が責任分界表に登場するが、
本リポジトリ配下に実装は見当たらない。実装場所は**未確認**。

## ディレクトリ構造

### 最重要: ここは単一リポジトリではない

`~/Developer/pachiverse` は、親リポジトリの作業ツリーの中に**独立した Git リポジトリが入れ子になっている**構造。
submodule ではないため、親からは単なる未追跡ディレクトリに見える。

| パス | Git 状態 | 役割 |
|---|---|---|
| ルート（`*.html`, `assets/`, `api/`, `README.md`） | **親リポジトリで追跡**（`origin` = `github.com/ishikawar2-dev/pachiverse`） | 公開サイトと購読 API |
| `pachiverse-contracts/` | **独立した入れ子 Git リポジトリ** | スマートコントラクト（Foundry） |
| `pachiverse-signer/` | **独立した入れ子 Git リポジトリ** | 署名基盤（TypeScript） |
| `members.pachiverse.com/` | **独立した入れ子 Git リポジトリ** | 会員システム（WordPress）。**本 docs では調査対象外**。別途、独自の知識基盤が初期化されている |
| `pvm-art/` | **Git 管理外**（`.git` なし） | NFT アート生成パイプライン（Python） |
| `Pachiverse_NFT_mint _backup/` | 親から未追跡 | 旧 NFT mint 作業のバックアップ。**調査対象外** |
| `docs/`, `AGENTS.md`, `CLAUDE.md`, `GEMINI.md`, `.cursor/`, `.github/` | 親から未追跡（テンプレート導入直後） | AI 共通知識基盤 |

**この構造の帰結（重要）**:
- 親リポジトリで `git add -A` しても、入れ子リポジトリの中身はコミットされない。
- ルートで `git status` を見ても、サブプロジェクトの変更は一切見えない。**各サブプロジェクトの状態は、そのディレクトリに入って個別に確認する必要がある**。
- `pvm-art` は Git 管理外のため、**バージョン管理による保護がない**（KNOWN_ISSUES 参照）。

### ルート直下の主要ファイル

| ファイル | 内容 |
|---|---|
| `index.html` | LP。約 150KB の単一ファイル。カウントダウン（`2026-06-01T00:00:00+09:00`）到達後に Web3 セクションを表示する |
| `contracts.html` | 公開中のコントラクトアドレス一覧 |
| `collection.html` | Reveal 済み Machine を探索する Collection Explorer |
| `faq.html` / `litepaper.html` / `transparency.html` / `docs.html` | 各説明ページ |
| `design-preview.html` | デザインプレビュー（約 128KB）。公開ナビゲーションからリンクされていない |
| `api/subscribe.js` | 購読登録（POST）。honeypot + メール形式検証 + `HSETNX` |
| `api/subscribers.js` | 購読者一覧・CSV 出力（GET）。`ADMIN_TOKEN` による共有シークレット認証 |
| `api/collection.js` / `api/machine-page.js` | Collection 公開 API のプロキシと Machine 詳細ページの OGP 注入 |

### pachiverse-contracts

```
src/       PachiverseMachines.sol / PachiverseMysteryPacks.sol
script/    Deploy* / Premint* / Mint* の Foundry スクリプト
test/      unit / fuzz / invariant の 3 層（各コントラクトに対して）
deployments/  ※ 空。デプロイ記録は未生成
lib/       OpenZeppelin / forge-std（git submodule）
```

### pachiverse-signer

```
src/main.ts            エントリポイント
src/service.ts         コマンド処理の中核
src/config/            設定読み込み・チェーン定義
src/auth/hmac.ts       HMAC 認証
src/idempotency/store.ts  request_id 永続化・nonce 予約（SQLite）
src/operations/        erc721 / erc1155 の calldata 組み立て・payloadHash
src/accounts/provider.ts  鍵参照の抽象化（ローカル鍵 / 将来の KMS）
src/abi/               コントラクト ABI（contracts から同期）
schemas/signer-v1/     API 契約の JSON Schema（正本は members リポジトリ）
test/                  service / http / nonce / erc1155 / chain / gasgate
```

### pvm-art

```
gen.py           画像生成 API クライアント
batch_gen.py     バッチ生成
assign.py        rarity + seed から trait 組合せを決定論的に割当
compose.py       レイヤー合成（PIPELINE.md の v3 アルゴリズム）
metadata_gen.py  OpenSea 形式メタデータ生成
qc.py            検品
art-src/         素材・アンカー画像・traits.yaml
prompts/         生成プロンプト
```

## データフロー

### 1. ニュースレター登録（公開サイト）

```
訪問者がフォーム送信
  → POST /api/subscribe
  → honeypot（body.website が埋まっていれば bot とみなし 200 を返して無視）
  → メール正規化（trim + 小文字化）・長さ 254 以下・正規表現で検証
  → Redis HSETNX subscribers <email> {ts, ref}
     ※ email をハッシュのフィールドにすることで重複が自動的に潰れる
     ※ HSETNX なので初回登録時刻のみ記録し、再登録では上書きしない
  → 200 {ok:true}

管理者が一覧取得
  → GET /api/subscribers?token=... （または Authorization: Bearer）
  → ADMIN_TOKEN と一致しなければ 401
  → Redis HGETALL → JSON または CSV
```

### 2. Collection Explorer

公開サイトの Collection Explorer は、Reveal 済み Machine のみを会員システムの公開 API から取得する。
500 件の静的データは公開サイト側に保持しない。

```
ブラウザ
  → /collection（collection.html。静的 HTML）
  → /api/collection（Vercel Function。edge cache 60 秒）
  → members.pachiverse.com/wp-json/pachiverse/v1/collection（公開 API）
```

Reveal 済み Machine の一覧には、Vercel Function が実行時に派生画像 URL を付与する。
派生画像は `assets/machines/t/`（512px）と `assets/machines/d/`（1024px）に置き、
ファイル名は `HMAC-SHA256(MACHINE_ASSET_KEY, "pvm:" + token_id)` の hex 先頭 40 文字とする。
token_id とファイル名の対応表はリポジトリに置かない。未 Reveal の 500 スロット生成はブラウザ側で行い、
未 Reveal Machine の rarity・trait・画像 URL は API と HTML のいずれにも含めない。

使用する環境変数:

- `MACHINE_ASSET_KEY` — 派生画像ファイル名を計算する HMAC 鍵
- `MEMBERS_API_BASE` — 会員システム公開 API のベース URL

### 3. NFT 発行から Reveal まで（設計上のフロー）

```
[事前準備]
pvm-art で 500 体の画像・メタデータを生成
  → 検品（sha256 ユニーク性・trait 分布が rarity_quota と一致）
  → IPFS へアップロード → CID 確定
  → contracts の BASE_URI に設定

[pre-mint] ※ Signer 起動前に完了させる
forge script で PVM 500 体を PVM_CUSTODY へ mint（100 体 × 5 回の分割可）
forge script で PVPACK 1101×300 / 1202×200 を PACK_CUSTODY へ mint
  → 500 体 confirmed を WordPress の chain_tx_attempts で監査記録
  → 全数確認できるまで Reveal を開かない
  → finalizeMinting() で mint を永久停止 → 最終 QA 後 freezeMetadata()

[運用] Signer 起動後
会員が Reveal 実行（WordPress）
  → WordPress が業務判断し request_id を発行
  → POST /v1/commands（HMAC 署名付き）
  → Signer が erc1155_batch_burn（BURNER 鍵）で Pack を焼却
  → Signer が erc721_transfer（PVM_CUSTODY 鍵）で Machine NFT を送付
  → submitted を返す（※ broadcast しただけで成功ではない）
  → Indexer が receipt で confirmed / failed を判定
```

**注**: 上記のうち pre-mint 以降が実際に本番実行されたかは、`deployments/` が空であることから**未確認**。

### 3. Signer のコマンド処理順序（変更禁止）

```
validation（allowlist / アドレス束縛）
  ↓
calldata 組み立て
  ↓
simulate / estimateGas / fee estimate   ← ここで revert すれば nonce を消費しない
  ↓
account mutex 取得
  ├ gap 再確認
  ├ nonce 予約（SQLite BEGIN IMMEDIATE）
  ├ 署名
  └ raw tx / tx_hash 永続化    ← broadcast の**前**に永続化する
  ↓ mutex 解放
broadcast
```

この順序には理由がある。詳細は [02_ONCHAIN.md](02_ONCHAIN.md) と [DECISIONS.md](DECISIONS.md)。

## 機能間の依存関係

**非自明なものを優先して記載する。**

### 跨リポジトリの依存

1. **contracts → signer（ABI）**
   `pachiverse-signer/scripts/sync-abi.mjs`（`npm run sync:abi`）が
   `../pachiverse-contracts/out/PachiverseMachines.sol/PachiverseMachines.json` を**相対パスで直接読む**。
   → **contracts と signer は隣接ディレクトリに置かれている前提**。片方だけ別の場所に clone すると ABI 同期が壊れる。
   → コントラクトを再ビルド／再デプロイしたら、**ABI とアドレスを Signer 側へ渡す必要がある**。

2. **members（WordPress）→ signer（API 契約）**
   `signer-v1` スキーマの**正本は members リポジトリの `docs/schemas/signer-v1/`** で、
   `pachiverse-signer/schemas/signer-v1/` は**同期コピー**。
   → スキーマを signer 側だけで変更すると正本と乖離する。

3. **members（PHP）↔ signer（TS）の `payload_hash` 実装一致**
   WordPress の `uni_signer_payload_hash()` と Signer の `payloadHash` は**同一の規則**
   （`request_id` と `created_at` を除外 → トップレベルキーをソート → SHA256）で実装されている。
   → **どちらか片方だけ変更すると、正常な再送が `409 idempotency_conflict` になる。**
   → Signer 側のテストが PHP 実装の既知出力との一致を固定している。

4. **signer 起動時の contracts 実体照合**
   Signer は起動時に `PACK_CUSTODY_ADDRESS == PVPACK.custody()` を照合し、**ずれていれば起動しない**（fail-closed）。
   → コントラクト側で `setCustody()` を実行したら、**Signer の設定も同時に更新しないと Signer が起動しなくなる**。
   → 同様に `PVM_CUSTODY_ADDRESS == 設定された署名鍵のアドレス` も照合する。

5. **チェーン ID の三点照合**
   起動時に `RPC の eth_chainId == CHAIN_ID == viem Chain.id` を照合し、不一致なら起動しない。
   → Amoy と mainnet の設定を混在させると起動段階で止まる（意図的な設計）。

6. **pvm-art → members（設計の正本）**
   `pvm-art/README.md` は「設計の正本は `members.pachiverse.com/ops/GENERATIVE_ART_GUIDE.md`」と明記する。
   → アート仕様の判断材料は members リポジトリ側にある（本 docs では未調査）。

7. **pvm-art → members（machines テーブル）**
   `assign.py` は `token_id` / `rarity_code` / `assignment_seed` を持つ CSV を入力とする。
   この rarity_code の確定済み 500 行は **WordPress の machines テーブル由来**（`PIPELINE.md`）。
   → アート割当は会員システムのデータに依存する。

8. **pvm-art → assets/（ブランドレイヤー）**
   `traits.yaml` の `brand_layer` が `~/Developer/pachiverse/assets/logo-square.png` を**絶対パスで参照**する。
   → 親リポジトリの `assets/` を動かすとアート合成が壊れる。

### レアリティ配分の跨リポジトリ整合（確認済み）

要件定義書 §3.6 の Reveal プール配分と、`pvm-art/art-src/traits.yaml` の `rarity_quota` は**一致している**。

| | Pool A(300) | Pool B(200) | 合計 | traits.yaml |
|---|---|---|---|---|
| R | 229 | 41 | 270 | 270 |
| SR | 40 | 80 | 120 | 120 |
| SSR | 20 | 40 | 60 | 60 |
| SSSR | 10 | 20 | 30 | 30 |
| UR | 1 | 14 | 15 | 15 |
| LEGEND | 0 | 5 | 5 | 5 |
| 計 | 300 | 200 | **500** | **500** |

→ **どちらか一方の配分を変えると、もう一方と破綻する。**両方とも「変更不可」と明記されている。

### 公開サイト内の依存

- 会員ログインは `https://members.pachiverse.com/login/` へのリンク。Collection Explorer は会員システムの公開 Collection API を参照する。
- `contracts.html` は**公開中のコントラクトアドレスをハードコード**している（後述）。

## 公開されているコントラクトアドレス

`contracts.html` に記載されている Polygon 上のアドレス（**公開情報**）:

| 表示名 | 規格 | アドレス |
|---|---|---|
| Pachiverse Mystery Packs (V2) | ERC-1155 | `0x2B5DaC082f664986e77b4f075617D1908BBd109C` |
| Pachiverse Access & Companion Items | ERC-1155 | `0x22acc4ac862dcdf152b77984da254eb851daa3dd` |
| Pachiverse Participation Units | ERC-1155 | `0x852fbd87cd43002ac95084f027051c6fbcb48405` |
| Pachiverse Machine Collection | ERC-721 | `0x55E3A05eaAc41aAeB596227CD4076e91033541b3` |

## デプロイ

- **公開サイト + api/** — ホスティングは Vercel（2026-09-02 実測で確定）。静的 HTML と
  `module.exports = async (req, res)` 形式の Vercel Serverless Function を同じプロジェクトで配信する。
  `vercel.json` が Collection Explorer の rewrite・派生画像 cache header・Function includeFiles を定義する。
  Vercel プロジェクト `pachiverse` は Git 連携ではなく **CLI（`vercel --prod`）からの手動デプロイ**で運用されており、
  本番の内容は `redesign/unified-design-language` ブランチ由来（2026-09-02 時点で `origin/main` はそれより古い）。
  環境変数 `MACHINE_ASSET_KEY` は Production / Development に設定済み（Preview は未設定）。
- **contracts** — Foundry スクリプトで Amoy → mainnet の順にデプロイする手順が README に明記されている。
  秘密鍵は `.env` に置かず keystore / ハードウェアウォレットを使う運用。
- **signer** — **ローリング更新禁止**。旧インスタンスを停止してから新インスタンスを起動する（`recreate` / `maxSurge: 0` 相当）。
  SQLite は永続ディスクに置く。公開インターネットに直接置かず、VPN / private network / IP allowlist / Cloudflare Access のいずれかを前段に置く。
- **members** — お名前.com 共用サーバー（固定 IP なし・常駐プロセス不可・cron 制約あり）。本 docs では対象外。

## Git ブランチ状況（親リポジトリ、2026-09-01 時点）

- 現在のブランチ: `redesign/unified-design-language`（`main` ではない）
- `main` と `redesign/unified-design-language` の両方が `origin` に存在する
- 直近のコミットはニュースレター機能（Redis 永続化・`UPSTASH_*` フォールバック）と iOS レイアウト修正
