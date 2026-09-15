# 機体画像（assets/machines）の Cloudflare R2 移設 runbook

作成: 2026-09-15　目的: Vercel の Deployment Storage（10 GB 無料枠、75% 到達）を圧迫する `assets/machines/`（t 21MB ＋ d 59MB、500 体 × 2 種の派生 webp）を R2 に移し、デプロイ 1 回あたり 83MB → 約 2MB にする。

## 前提
- R2 バケット `pachiverse-media`（公開 URL `https://pub-4f767ce43f34417aa267bf5a563efdcf.r2.dev`）は PV 動画で使用中。オーナーの Cloudflare アカウント
- 原本は `pvm-art/out/web/{t,d}`（Git 外）。サイトの `assets/machines/{t,d}` と sha256 で同一であることを 2026-09-15 に確認済み
- コード側の切替点: `api/collection.js` の `MACHINE_ASSET_BASE`（未設定＝従来どおり同一オリジンの静的配信）。PR で導入済み

## 手順（オーナー実行。3〜5 は私が確認）

### 1. R2 へアップロード（同じパス階層で）
バケット直下に `assets/machines/t/…` `assets/machines/d/…` として置く。immutable なので長期キャッシュを付ける。

rclone（推奨。`rclone config` で R2 のリモート `r2` を作成済みなら）:
```bash
cd ~/Developer/pachiverse
rclone copy assets/machines/t r2:pachiverse-media/assets/machines/t --header-upload "Cache-Control: public, max-age=31536000, immutable" --progress
rclone copy assets/machines/d r2:pachiverse-media/assets/machines/d --header-upload "Cache-Control: public, max-age=31536000, immutable" --progress
```

wrangler の場合は `wrangler r2 object put pachiverse-media/assets/machines/t/<file> --file assets/machines/t/<file> --cache-control "public, max-age=31536000, immutable"` を 1,000 回回す形になるので rclone を推奨。

### 2. 件数・ハッシュの照合
```bash
rclone check assets/machines/t r2:pachiverse-media/assets/machines/t --one-way
rclone check assets/machines/d r2:pachiverse-media/assets/machines/d --one-way
```
どちらも「0 differences」であること。

### 3. 公開 URL の疎通（私が確認）
```bash
curl -sI "https://pub-4f767ce43f34417aa267bf5a563efdcf.r2.dev/assets/machines/t/$(ls assets/machines/t | head -1)" | head -5
```
`200`、`content-type: image/webp`、`cache-control: public, max-age=31536000, immutable` を確認。

### 4. Vercel の環境変数を設定（オーナー）
Vercel プロジェクト `pachiverse` → Settings → Environment Variables → **Production** に
`MACHINE_ASSET_BASE = https://pub-4f767ce43f34417aa267bf5a563efdcf.r2.dev`
を追加し、**Redeploy**（環境変数は再デプロイで反映）。

### 5. 本番確認（私が確認）
- `https://pachiverse.com/api/collection` の `thumb` / `detail` が `https://pub-….r2.dev/assets/machines/…` になっている
- `https://pachiverse.com/collection` で画像が表示される（Reveal 済み機体）
- `https://pachiverse.com/collection/1` の `og:image` が R2 の絶対 URL

### 6. リポジトリから画像を外す（別 PR）
5 が確認できたら `git rm -r assets/machines/t assets/machines/d`（`undiscovered*` 3 ファイルは残す）。`vercel.json` の `/assets/machines/(.*)` ヘッダは undiscovered 用に残す。原本は `pvm-art/out/web/` に残り、`pvm-art/out/MANIFEST_webp.sha256` とは別に `manifest.csv` で照合できる。

### ロールバック
Vercel の `MACHINE_ASSET_BASE` を削除して Redeploy すれば、6 の前なら静的配信に戻る。6 の後は `git revert` で画像を戻す。

## 注意
- R2 の公開 URL は `r2.dev` サブドメイン（レート制限あり、本番向けではないと Cloudflare が注記）。アクセスが増えるなら R2 のカスタムドメイン（`media.pachiverse.com`、DNS は UNI 名義のお名前.com）に切り替える。`MACHINE_ASSET_BASE` を変えるだけで移行できる
- 画像パスは HMAC ハッシュで推測不能のまま（R2 でも同じ）。バケットの一覧公開は無効のままにする
