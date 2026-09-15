# 08_AUDIT_SCOPE — 第三者セキュリティ監査 スコープ書（見積依頼用・初稿）

作成日: 2026-09-16（初稿・売り手作成）　宛先: 監査会社 3 社の営業・技術担当　位置づけ: [03_TRANSFER_PLAN.md](03_TRANSFER_PLAN.md) フェーズ E（監査準備）の成果物

> 本書は見積依頼のためのスコープ定義であり、契約書ではない。数値（行数・ファイル数・テスト件数）は 2026-09-16 時点のリポジトリ実測値または各 README の記載値で、発注時に再計測する。
> 「要確認」と記した箇所はオーナーが埋める（§9 に集約）。本書には秘密の値（鍵・パスワード・API キー・HMAC secret）、個人名、メールアドレス、ホスト名・IP を書かない。第三者へ渡す版では §9 を外す。

---

## 1. 目的と背景

### 1.1 なぜ監査を受けるか

Pachiverse（パチンコ・パチスロ機体をモチーフにした NFT と会員ポータル）は、開発者（本書では「オーナー」）が単独で開発・運用しているシステム一式であり、2026 年内に運営会社（本書では「UNI 社」）へ事業譲渡する計画が進んでいる。

譲渡価格は原価法（再調達原価＋第三者の外注見積＋陳腐化減価）で算定し、会計士・税理士の無形資産評価書で時価の客観性を担保する（03_TRANSFER_PLAN §2.4）。**第三者セキュリティ監査レポートは、その評価書の前提資料の一つ**であり、次の 2 点を第三者の立場で示すために取得する。

| 目的 | 内容 |
|---|---|
| 減価要因の解消証跡 | 「鍵管理・権限集中・監査未了」という既知の減点要因（05_DEPRECIATION_ITEMS A-1 / A-2 / A-5）が解消済み、または残余リスクが特定済みであることを、売り手の自己申告ではなく第三者の所見として残す |
| 買い手の DD 資料 | UNI 社の取得理由書・取締役会決議に添付する。買い手が「引き継いで安全に運用できるか」を判断する材料 |

### 1.2 監査の性格（監査会社への前提共有）

- 対象は**稼働中の本番システム**。コントラクトは Polygon mainnet にデプロイ済み・`finalizeMinting()` / `freezeMetadata()` 実行済みで**変更不可**。コントラクトの指摘は「修正」ではなく「運用・周辺システムでの緩和策」または「開示事項」として扱う
- 会員ポータルは WordPress + 自作プラグイン（PHP）で、共用レンタルサーバー上で稼働する。侵入テストは**本番環境に対しては行わず**、ステージング環境（同一コード・同一ホスティング）を用意する（要確認 Q-1）
- 開発者 1 名体制のため、監査中の質疑応答はオーナーが一括して対応する
- 監査の前に、2026-09-07 の内部全面レビューで判明した優先 10 件は修正済み（§8）。既知の欠陥を有料で再指摘されないための措置であり、監査会社にはレビュー報告書そのものを提供する

### 1.3 監査に含めないもの（先に明示）

- 法務意見（資金決済法・金商法・景表法・個人情報保護法の該当性判断）。別途弁護士に依頼する。ただし技術的事実の記述（例: オンチェーン metadata の文言）は監査レポートに含めてよい
- 事業性・収益性の評価
- Owner's Pass ERC721（旧・外部委託で作成、owner 鍵なし）のコード監査。事実として §3.3 に記載する
- OT カード（`PachiverseOwnerCard`）。実装途中のため**追加監査として別発注**（§3.4）

---

## 2. 対象システムの概要

### 2.1 構成図

```
                       会員（ブラウザ）                     一般訪問者
                            │                                 │
                            ▼                                 ▼
┌──────────────────────────────────────────┐   ┌──────────────────────────────┐
│ members.pachiverse.com（会員ポータル）     │   │ pachiverse.com（公開サイト）   │
│  WordPress + 自作プラグイン uni_memberpage │   │  静的 HTML + Vercel Functions  │
│  お名前.com 共用サーバー / PHP 8.3 / MySQL │◀──│  /api/collection（公開 API 経由）│
│  【業務状態の正本】会員・PV Coin 台帳・      │   │  画像は Cloudflare R2          │
│   NFT 保有 usermeta・Reveal・出庫申請      │   └──────────────────────────────┘
│  監査ログ（SHA256 ハッシュチェーン）        │             ※ 監査対象外
└───────────────┬──────────────────────────┘
                │ HTTPS + HMAC-SHA256（signer-v1 契約）
                │ WP → Signer: POST /v1/commands（request_id 冪等）
                │ Signer → WP: receipt callback（confirmed / failed）
                ▼
┌──────────────────────────────────────────┐   ┌──────────────────────────────┐
│ pachiverse-signer（署名基盤・GCP VM）      │──▶│ Google Cloud KMS（HSM）        │
│  TypeScript / Fastify / SQLite            │   │  MINTER / PVM_CUSTODY / BURNER │
│  【鍵を持つのはここだけ】業務判断は持たない  │   │  の 3 鍵（2026-09-16 移行済）   │
│  nonce 予約・idempotency・Receipt Checker  │   │  VM SA に cryptoKey 単位 IAM   │
└───────────────┬──────────────────────────┘   └──────────────────────────────┘
                │ viem（RPC 経由で TX 送信）
                ▼
┌──────────────────────────────────────────┐
│ Polygon mainnet                           │
│  PachiverseMachines（PVM, ERC721, 500 体） │  ADMIN = 会社ウォレット（Safe 2-of-3 へ移行予定）
│  PachiverseMysteryPacks（PVPACK, ERC1155） │  PACK_CUSTODY = 会社ウォレット（Signer は鍵を持たない）
│  ※ 旧 ERC1155 ×3・Owner's Pass ERC721 は   │
│    稼働中だが監査対象外                    │
└──────────────────────────────────────────┘
```

### 2.2 資産移転の主要フロー（監査の中心）

| # | フロー | 起点 | 経路 | 不変条件 |
|---|---|---|---|---|
| F-1 | Pack Reveal（開封） | 会員が WP で開封 | WP 内で inventory 行の条件付き UPDATE + usermeta CAS → 事前固定割当から Machine を確定 | 同一 Pack の二重開封なし。Pool A 300 / Pool B 200 = 500 体 |
| F-2 | 日次 burn | WP cron がバッチ作成 → 運用者が手動 dispatch | WP → Signer `erc1155_batch_burn`（BURNER 鍵）→ PVPACK `burnBatchFromCustody` | burn 元は custody 固定。request_id 冪等で二重 burn なし |
| F-3 | PVM 出庫 | 会員申請 → 運用者承認 → 手動 dispatch | WP → Signer `erc721_transfer`（PVM_CUSTODY 鍵）→ 会員ウォレット | 承認なしの自動送信なし。保留残高で二重利用を防ぐ |
| F-4 | receipt 反映 | Signer 内蔵 Receipt Checker | Signer → WP `/signer/receipt`（HMAC）→ 業務状態を confirmed / failed に | `submitted` は成功ではない。confirmed は receipt のみで判定 |
| F-5 | PV Coin 増減 | ガチャ・ログインボーナス・管理者付与 | `uni_coin_apply_delta()`（InnoDB `SELECT ... FOR UPDATE` + INSERT のみ台帳） | 残高と台帳の整合。日次スナップショットで突合 |

### 2.3 権限・鍵の配置（2026-09-16 時点）

| 役割 | 保持形態 | 状態 |
|---|---|---|
| DEFAULT_ADMIN_ROLE（PVM / PVPACK） | 会社ウォレット（MetaMask、1 本） | **Safe 2-of-3 への移行は未実施**（Part B、10 月予定。要確認 Q-3） |
| MINTER / PVM_CUSTODY / BURNER | Cloud KMS（HSM、インポート方式） | 2026-09-16 移行完了。VM の `.env` に平文鍵なし。**平文の `.env` バックアップと VM スナップショットの削除は残作業**（KMS runbook §3.12 / R-7） |
| PACK_CUSTODY（Pack 500 枚の保管） | 会社ウォレット（Signer は鍵を持たない） | 変更予定なし |
| WP ↔ Signer の HMAC 鍵 | WP の秘密設定ファイル ⇔ VM の `.env`。key_id で rotation 対応 | 配置済み。ローテーション実績なし |
| WP 管理者・DB 接続情報・salts | WP 設定ファイル（`.htaccess` で直アクセス拒否）、`/wp-admin/` に Basic 認証 | **DB パスワード・salts は未ローテーション**（既知・§8 参照） |

---

## 3. スコープ表

### 3.1 対象（初回監査・11 月開始）

規模の目安はリポジトリ実測（`wc -l` / `find | wc -l`、2026-09-16）。テスト件数は各 README の記載値を優先し、README に無いものは実測値に「(実測)」を付す。

| # | 対象 | 内容 | 規模の目安 | 監査の深さ |
|---|---|---|---|---|
| S-1 | スマートコントラクト（2 本） | `pachiverse-contracts/src/PachiverseMachines.sol`（ERC721）、`src/PachiverseMysteryPacks.sol`（ERC1155）。Solidity 0.8.24 / OpenZeppelin v5 / Foundry。non-upgradeable、`AccessControl`。Polygon mainnet にデプロイ済み・Verified・finalize / freeze 済み | 本体 2 ファイル 437 行（172 + 265）。テスト 6 ファイル 1,259 行（unit / fuzz / invariant の 3 層）。デプロイスクリプト 4 ファイル 174 行 | 全行の手動レビュー + テストの妥当性評価。デプロイ済みバイトコードとソースの一致確認 |
| S-2 | コントラクトのテスト | PVM: unit 30 / fuzz 6 / invariant 5（README）。PVPACK: README に件数記載なし、実測 unit 26 / fuzz 5 / invariant 5。2 本合計 80 件（`DEPLOY_PVM_20260909.md`、2026-09-02 時点で全合格）。`foundry.toml`: fuzz runs 512、invariant runs 256 / depth 64 | 上記に含む | テストの網羅性（不変条件の抜け）を評価。追加テストの提案は歓迎するが実装は求めない |
| S-3 | Signer（署名基盤） | `pachiverse-signer/src/`。TypeScript / viem / Fastify / better-sqlite3。HMAC 認証、request_id 冪等、nonce 予約、chain 三点照合、Receipt Checker、GCP KMS provider | `src/` 実装 15 ファイル 3,119 行（生成物の ABI 3 ファイル 3,533 行・スキーマ型定義 10 ファイルは除外）。テスト 10 ファイル 2,381 行、README 記載 106 件（実測 139 件。README 未記載の kms / receipt / wpClient を含む）。スクリプト 5 ファイル 452 行。JSON Schema 10 ファイル | 全行の手動レビュー。特に `src/service.ts`（556 行）、`src/idempotency/store.ts`（319 行）、`src/auth/hmac.ts`（162 行）、`src/accounts/gcpKms.ts`（363 行）、`src/config/index.ts`（303 行） |
| S-4 | WP プラグイン: 認証・ゲート | `inc/member-status.php`、`gate.php`、`auth.php`、`login-wp.php`、`system.php`、`hardening.php`、`content-protect.php`、`env.php`、`maintenance.php` | 9 ファイル 3,189 行 | 全行 |
| S-5 | WP プラグイン: 資産整合性（PV Coin 台帳・NFT 保有 usermeta） | `inc/coin-ledger.php`、`coin-ledger-admin.php`、`items-def.php`、`mypage.php`（会員間 NFT 送信・交換）、`mypage-items.php`、`login-bonus.php`、`admin-item-grant.php`、`inc/gacha/`（8 ファイル） | 16 ファイル 7,773 行 | 全行。CAS / トランザクション境界を重点 |
| S-6 | WP プラグイン: Pack Reveal | `inc/pack-reveal.php`（単一ファイルとして最大）、`mint-tx.php`、`admin-mint-tx.php` | 3 ファイル 7,200 行 | 開封・割当・burn バッチ・ロック・verify の経路を全行。管理画面の表示部は軽く |
| S-7 | WP プラグイン: 出庫 | `inc/withdraw-request.php`（旧・アイテム出庫）、`pvm-withdrawal.php`（PVM 出庫申請）、`admin-pvm-withdrawals.php` | 3 ファイル 1,431 行 | 全行。状態遷移と保留残高 |
| S-8 | WP プラグイン: Signer 連携 | `inc/chain-signer.php`、`chain-signer-auth.php`。HMAC 検証・attempt 状態機械・callback 冪等・payload_hash | 2 ファイル 1,871 行 | 全行。S-3 との契約整合（`docs/schemas/signer-v1/` が正本） |
| S-9 | WP プラグイン: 監査ログ・レコンサイル | `inc/audit-log*.php`（ハッシュチェーン）、`admin-reconcile*.php`、`reconcile-onchain-fetcher.php`、`polygonscan-client.php` | 12 ファイル 2,888 行 | ハッシュチェーンの改ざん耐性、突合ロジックの正しさ |
| S-10 | WP プラグイン: 管理画面権限 | `inc/admin-notice.php`（一斉メール）、`admin-member-import.php`（CSV 取込）、`admin-user-list.php`、`admin-log-hub.php`、`member-status-admin.php`、`admin-menu-structure.php`、`admin-dup-check.php`、`admin-login-log.php`、`admin-login-failures.php` | 9 ファイル 11,924 行 | 権限チェック（`current_user_can` / nonce / ロール）の網羅確認を主目的とし、UI 描画部は全行精読を求めない |
| S-11 | WP プラグイン: サポート受信箱（PII 取扱） | `inc/support.php`（nopriv AJAX 含む）、`support-ai-classify.php`（外部 AI へのマスク）、`support-gsheets.php`、`support-imap-fetch.php`、`support-reply-send.php`、`support-inbox-store.php`、`support-classify.php`、`member-real-name.php` | 8 ファイル 6,028 行 | PII の外部送信経路（AI API・Google Sheets・メール）と認証なし経路を重点 |
| S-12 | WP プラグイン: 公開 API | `inc/collection-api.php`（認証なし GET。未 Reveal 情報を出さないこと） | 1 ファイル 229 行 | 全行 |
| S-13 | WP プラグイン: 本体・REST・メール経路 | `uni-member-mypage.php`（ロード順、702 行）、`inc/mail*.php`、`sc-mail.php`、`admin-sc-mail.php`、`support-inbound.php`（ロード無効・Webhook 残置） | 8 ファイル 3,984 行 | Webhook トークン認証、配信停止トークン、無効化モジュールの露出 |
| S-14 | WP のテスト・CI | `tests/Unit/`（33 ファイル、実測 253 メソッド）、`tests/Integration/`（15 ファイル、実測 143 メソッド、実 MySQL 8）、PHPStan level 5（baseline 凍結）、GitHub Actions `test.yml` | テスト約 8,000 行 | テストの妥当性評価（設計レビューの補助。テスト追加は求めない） |
| S-15 | インフラ設定: GCP（Signer VM・KMS） | VM（e2-micro / Debian 12 / systemd / Caddy 2 リバースプロキシ・Let's Encrypt）、ファイアウォール（tcp 22/80/443）、KMS keyRing / cryptoKey 3 本の IAM（VM サービスアカウントに cryptoKey 単位で `signerVerifier` のみ）、プロジェクトオーナー 2 名、VM スナップショット、`.env` の残置バックアップ | 設定レビュー（コンソール画面共有または `gcloud` 出力の提供） | KMS IAM の最小権限、VM の露出面、平文鍵の残骸（§3.12 未完了分） |
| S-16 | インフラ設定: 会員サイトホスティング | お名前.com 共用サーバー（固定 IP なし・常駐プロセス不可・WP-Cron はアクセス駆動）、`.htaccess`（設定ファイル・ログ・サービスアカウント JSON の直アクセス拒否）、`/wp-admin/` Basic 認証、SSH / FTPS デプロイ（`scripts/deploy-ssh.sh` / `deploy-files.sh`、G1〜G4 ゲート）、ステージング環境 | 設定レビュー（画面共有・設定ファイル提供） | 本番のみに存在するプラグイン（WP Mail SMTP 等）の棚卸しを含む（要確認 Q-6） |
| S-17 | 運用手順（デスクレビュー） | `ops/DAY_OF_RUNBOOK_20260909.md`（burn / 出庫 / 緊急停止 / 鍵漏洩時の退避）、`INCIDENT_RESPONSE.md`（§3.8 署名鍵漏洩の初動）、`KEY_MANAGEMENT_MIGRATION.md`（KMS / Safe）、`SEALED_BACKUP_RUNBOOK.md`、`DEPLOY_CHECKLIST.md`、`OPERATIONS_LOG.md`、親 `07_HANDOVER_KIT.md` | runbook 群 約 250KB | 手順の実効性（鍵の所在・バックアップ・復旧・インシデント）を評価 |

規模の合計（コード）: コントラクト 437 行 + Signer 3,119 行 + WP 重点モジュール 約 40,000 行（S-4〜S-13 の合計 40,489 行、本体 702 行を含む）。WP プラグイン全体は `inc/` 115 ファイル 69,831 行（プラグイン全体 71,696 行）で、上記以外の約 31,000 行（ニュース生成 `inc/news/` 1,935 行、ロードマップ、サイトスキン `site-skin.php` 6,017 行、ヘッダ・フッタ、月次レポート等）は**表示・コンテンツ系として対象外**（S-18）。

### 3.2 対象外（初回監査）

| # | 対象外 | 理由 | 規模（参考） |
|---|---|---|---|
| X-1 | 公開サイト `pachiverse.com` の静的部分（HTML / CSS / JS） | 資産・認証に関与しない静的コンテンツ | HTML 8 ファイル約 12,700 行 |
| X-2 | 公開サイトの Vercel Functions（`api/subscribe.js` / `subscribers.js` / `collection.js` / `machine-page.js`） | 購読者メールの PII を扱うが会員資産に関与しない。既知問題（レート制限なし・管理トークンのクエリ受付・非定数時間比較）は親 `KNOWN_ISSUES.md` に記載済みで、内製で是正予定。**オプション見積として提示は歓迎**（要確認 Q-7） | JS 4 ファイル 352 行 + mjs 145 行 |
| X-3 | `pvm-art`（NFT 画像・メタデータ生成パイプライン、Python） | 生成済み・IPFS 固定済み。運用で再実行しない | Python 14 ファイル約 2,100 行 |
| X-4 | `pachiverse-world`（メタバース、World Foundation） | 試作段階・未リリース。資産に接続していない | TS / TSX 約 5,200 行 |
| X-5 | WP プラグインの表示・コンテンツ系モジュール（S-18: `inc/news/`、`site-skin.php`、`header-footer.php`、`home.php`、`roadmap.php`、`admin-monthly-report.php` 等） | 資産・認証に関与しない。ただし S-4 のゲートが全ページに効いているかの確認は S-4 に含む | 約 31,000 行 |
| X-6 | WordPress コア・サードパーティプラグイン（akismet / siteguard / wp-crontrol / cache-clear-onamae / WP Mail SMTP） | 改変していない。バージョン・設定の棚卸しは S-16 に含む | — |
| X-7 | 旧世代コントラクト 3 本（旧 Packs `0x9f3a…`（退役）、Participation Units `0x852f…`、Access & Companion `0x22ac…`）と Owner's Pass ERC721 `0x1c19…` | 外部委託で作成、ソース管理外、owner 鍵の所在が不明または存在しない。**管理不能であることの事実確認**（mint / pause / URI 変更関数の不在）はデスクレビューとして S-1 に含めてよい（要確認 Q-8） | — |
| X-8 | 外部サービスの内部（Polygon RPC 事業者、Etherscan API、ブラストエンジン、Anthropic / OpenAI API、Google Sheets、Filebase / Pinata） | 利用側の鍵管理・送信データの範囲のみ S-11 / S-16 で見る | — |
| X-9 | OT カード（コントラクト・Signer 拡張・WP 側） | **追加監査として別途**（§3.4） | §3.4 参照 |

### 3.3 監査対象の既知の構成上の特徴（先に開示する事項）

監査会社に「発見」させるのではなく、最初から開示する。

| # | 事項 | 所在 |
|---|---|---|
| K-1 | Signer は**単一インスタンス前提**（nonce 予約が SQLite に閉じる）。水平展開不可はテストで固定した設計判断 | 02_ONCHAIN §4、signer README |
| K-2 | Signer のエンドポイントは**公開 HTTPS（Caddy + Let's Encrypt）で、認証は HMAC のみ**。設計文書は「VPN / IP allowlist / Cloudflare Access のいずれかを前段に置く」と定めるが、会員サイトが固定 IP を持たない共用サーバーのため IP allowlist を適用できていない。**設計と実態の差**として監査で評価を求める | RELEASE_STATE §2-a、02_ONCHAIN §11 |
| K-3 | KMS は**インポート方式**（新鍵生成ではない）。過去に平文鍵が置かれた場所（VM の `.env` バックアップ、VM スナップショット）からの漏洩リスクは、§3.12 の後始末が完了するまで残る。PVM_CUSTODY のみ紙 1 部の封緘バックアップが HSM 外に存在する（R-1） | KEY_MANAGEMENT_MIGRATION §1.4、§5.3 |
| K-4 | DEFAULT_ADMIN_ROLE は会社ウォレット 1 本（Safe 移行前）。監査開始時点で Safe 2-of-3 へ移行済みかは要確認 Q-3 | 同 §4 |
| K-5 | PV Coin 台帳は `wp_usermeta` と台帳テーブルが両方 InnoDB のときだけトランザクション保護され、非 InnoDB では無ロック経路へ**黙ってフォールバック**する（管理画面に警告は出る） | members KNOWN_ISSUES |
| K-6 | サポート担当が WP `editor` ロールで実運用しており、editor が到達できる機能の絞り込み（§8 #3）は**オーナー判断で保留中** | members メモリ、05 §3.4 |
| K-7 | 日次 burn の dispatch は**手動**（Phase 1）。自動化（Phase 2）は稼働実績を見て判断。dispatch 未実施で 5 日滞留した前例あり（放置は安全側） | OPERATIONS_LOG I-05 |
| K-8 | 会員データ（本名・生年月日・電話・メール）を WP DB が保持し、サポート AI 分類に渡す前にマスクする実装が 2026-09-15 に入った | DEPLOY_CHECKLIST 2026-09-15 |
| K-9 | `wp_ajax_nopriv_*`（未ログインで到達可）が 2 件存在する（初回ログイン案内メールの再発行。氏名 + 生年月日 + 電話の完全一致、失敗 5 回 / IP / 1h ロック） | members 01_ARCHITECTURE |
| K-10 | Owner's Pass ERC721 のオンチェーン description に利益分配を示唆する英文があり変更不可。法務論点として別途扱う（技術監査の対象外） | 03_TRANSFER_PLAN §5、05 K |

### 3.4 追加監査（OT カード、12 月予定・別見積）

OT カード（オーナーチケットの ERC721 会員カード方式）は 2026-09-15 に設計が確定し、実装が進行中。**本番デプロイは法務確認の後**で未実施。初回監査の見積とは分けて、次の範囲の追加見積を依頼する。

| 対象 | 内容 | 規模（2026-09-16 時点、実装途中） |
|---|---|---|
| `pachiverse-contracts/src/PachiverseOwnerCard.sol` | 移転不可 ERC721 + カード id 間の value 移転。custody から会員へ 1 回だけ release。`transferFrom` / `approve` は常時 revert | 本体 449 行。テスト 3 ファイル 1,851 行（unit 86 / fuzz 6 / invariant 9、README）。デプロイスクリプト 61 行 |
| Signer の OT operation（4 種） | `ot_mint_batch` / `ot_issue_value` / `ot_release` / `ot_transfer_value`。OT_MINTER / OT_CUSTODY の新規 2 鍵（KMS） | `src/operations/ownerCard.ts` 106 行 + `service.ts` / `config` / `main.ts` の差分。テスト ownerCard 20 + service(OT) 17（README） |
| WP 側 | `inc/ot-cards.php`（4 テーブル、Signer 連携、受取・移管の状態遷移、WP-CLI）。管理画面は未実装 | 1,985 行（Phase 3a まで）。テスト `OtCardsTest` / `OtCardsIntegrationTest` |
| 設計書 | members `docs/17_owner_ticket_card_spec.md` v0.2 | 233 行 |

追加監査の観点: value 総量の保存（Σ valueOf == totalValue ≤ maxTotalValue）、release の 1 回性、custody 鍵の裁量（受取前の全 value を custody が動かせる事実と、WP 側の申請・同意記録との紐付け）、既存 3 operation への影響がないこと。

---

## 4. 監査の観点

### 4.1 スマートコントラクト（S-1 / S-2）

| 観点 | 具体的な確認事項 |
|---|---|
| 権限 | `AccessControl` のロール分離（ADMIN / MINTER / BURNER）が constructor で完結し deployer にロールが残らないこと。デプロイ済みコントラクトの実際のロール保持者の確認（`hasRole` 照会） |
| 不変条件 | PVM: tokenId 1〜500・総供給 500・二重 mint 不可。PVPACK: tokenId 1101（300）/ 1202（200）のみ・mint 先 custody 固定・burn で mint 枠が戻らない。invariant テストがこれらを固定しているか |
| 再入 | `_safeMint`（ERC721Receiver コールバック）と `burnBatchFromCustody` の再入経路。v1 では custody が EOA のため発生しないが、将来 custody をコントラクトにした場合の影響 |
| finalize / freeze | 不可逆操作が実行済みであることのオンチェーン確認と、実行後に MINTER_ROLE を再付与しても mint できないこと |
| burn の blast radius | BURNER 鍵が漏れても custody 以外の残高に触れられないこと（`from` を引数に取らない設計の検証） |
| バイトコード | Verified ソースとデプロイ済みバイトコードの一致、コンパイラ設定（0.8.24、optimizer 200、`bytecode_hash = none`）の妥当性 |
| 依存 | OpenZeppelin v5 の既知脆弱性の有無、`lib/` の固定バージョン |

### 4.2 Signer（S-3 / S-15）

| 観点 | 具体的な確認事項 |
|---|---|
| 鍵管理 | KMS provider が秘密鍵をプロセスに入れないこと（KMS へ送るのは keccak256 ダイジェストのみ）。起動時の公開鍵取得 → アドレス照合。`ACCOUNT_PROVIDER=gcp-kms` 時に `*_PRIVATE_KEY` が残っていれば起動拒否する fail-closed |
| KMS IAM | VM サービスアカウントへの付与が cryptoKey 単位の `signerVerifier` のみであること。プロジェクト / keyRing 単位の過剰付与がないこと。オーナー個人アカウントの権限。捨て鍵（リハーサル用）への残置 IAM |
| HMAC | canonical string（METHOD / PATH / TIMESTAMP / KEY_ID / REQUEST_ID / SHA256(body)）の構成、raw body 検証後に parse する順序、±300 秒の窓、key_id による rotation、定数時間比較 |
| nonce | simulate → mutex → gap 再確認 → 予約（SQLite `BEGIN IMMEDIATE`）→ 署名 → 永続化 → broadcast の順序。欠番ブロッカー（`earlier_attempt_pending`）。再開時の nonce 再利用。10 並列で nonce が一意になるテストの妥当性 |
| 冪等 | request_id + payload_hash による duplicate / conflict 判定。`payload_hash` の PHP 実装との一致（テストで固定）。`delivery_unknown` を rejected にしない扱い |
| chain 固定 | RPC の `eth_chainId` == `CHAIN_ID` == Chain.id の三点照合。署名済み raw tx に埋め込まれた chainId の検証 |
| allowlist | operation / chain_id / contract address の 3 層。`from_address` / `to_address` の束縛（custody 固定）。リクエストで任意の鍵を選ばせないこと |
| Receipt Checker | confirmations 数、poll 間隔、WP への callback の署名、HTTP 障害時の再試行が二重通知にならないこと |
| VM | OS / Node / 依存パッケージのバージョン、systemd の権限（User=signer）、`.env` のパーミッション、ファイアウォール、SSH 鍵の管理、Caddy の TLS 設定、ログに秘密が出ないこと |
| 依存 | `npm audit` 相当。viem / fastify / better-sqlite3 / google-auth-library の固定バージョン |

### 4.3 WordPress プラグイン（S-4〜S-14 / S-16）

| 観点 | 具体的な確認事項 |
|---|---|
| 認証 | 会員ステータス判定（`status` / `vb_member` / `uni_member` の 3 メタ）がログイン時・ゲート・AJAX で一貫して効くこと。停止会員の既存セッション遮断（§8 #1 の修正が有効か）。初回パスワード設定・リセットのトークン強度・単回性・TTL。メール変更確認のトークン比較 |
| 権限 | 管理画面 POST が `current_user_can('manage_options')` + `check_admin_referer()` の両方を通ること。editor ロールで到達できる機能の一覧化（K-6）。`wp_ajax_nopriv_*` 2 件の列挙耐性 |
| CAS / トランザクション | PV Coin（`SELECT ... FOR UPDATE` + INSERT のみ台帳）、Pack Reveal（usermeta ロック + inventory 行の条件付き UPDATE + 残高 CAS の三重防御）、ガチャチケット（CAS、2026-09-15 修正）、会員間 NFT 送信・交換（CAS）、出庫申請（−qty / +hold のトランザクション）、attempt の `UNIQUE KEY` による二重 request_id 防止。非 InnoDB フォールバック（K-5）の扱い |
| 状態機械 | attempt: `created → dispatched → submitted → confirmed | failed`。未決着中の新規 request_id 発行禁止。出庫: `requested → approved → dispatched → submitted → confirmed / failed → approved`。burn: `pending_burn → batched → dispatched → submitted → confirmed / failed`。手動 `failed` 化による二重 burn の運用ガード |
| 入力検証 | 出庫先アドレス（20 byte、custody / zero / dead 除外、大小文字無視の再確認）、CSV 取込、AJAX パラメータ、REST の引数 |
| SQL | `$wpdb->prepare()` の一貫使用（規約）。テーブル名の組み立て。`dbDelta` による init 時スキーマ作成 |
| XSS / 出力 | 管理画面の `esc_html` / `esc_attr` / `esc_url`。会員向けページのインライン JS（`&` の変換事故の前例あり） |
| PII | 会員本名・生年月日・電話・メールの保存範囲、外部送信（Anthropic / OpenAI / Google Sheets / メール）前のマスク、ログへの混入、CSV エクスポートの権限、購読者・配信停止トークン |
| Webhook / REST | ブラストエンジン / SendGrid Event Webhook のクエリトークン認証（fail-closed 化済み。本番トークン設定の実確認は要確認 Q-9）、配信停止エンドポイント、公開 Collection API の情報露出（未 Reveal の rarity / trait を出さない）、無効化済み `support-inbound.php` の REST ルート残置 |
| 監査ログ | SHA256 ハッシュチェーン（`prev_hash → row_hash`、`hash_ver`）の改ざん耐性、日次自動検証、記録対象の網羅（特権操作が全て記録されるか） |
| ハードニング | REST ユーザー列挙遮断、XML-RPC 停止、アプリケーションパスワード無効化、セキュリティヘッダ、`DISALLOW_FILE_EDIT`、`.htaccess` の拒否設定、`/wp-admin/` Basic 認証の適用範囲 |
| デプロイ | main ベース必須（G1）、require 照合（G2）、sha256 照合（G3）、死活（G4）。FTPS デプロイでの部分配置リスク。ロールバック手順 |
| 依存 | WordPress 本体・PHP 8.3・サードパーティプラグインのバージョンと既知脆弱性。Composer 依存（開発用） |

### 4.4 運用（S-17）

| 観点 | 具体的な確認事項 |
|---|---|
| 鍵の所在 | 07_HANDOVER_KIT §3 の所在一覧と実態の一致。会社ウォレットのシードの保管状況（封緘バックアップの実施状況は要確認 Q-4） |
| バックアップ | 本番 DB ダンプの頻度と保管先（現状は手動 1 回のみ確認。要確認 Q-5）、Signer SQLite・VM ディスクのスナップショット方針、PVM 原本画像 10GB の別置き |
| インシデント手順 | `INCIDENT_RESPONSE.md` の SEV 判定・初動・鍵漏洩時（IAM 剥奪で即停止）の実効性。緊急停止（`UNI_EMERGENCY_STOP`）と Reveal 停止（`uni_pack_reveal_enabled 0`）の手順 |
| 属人性 | 運用担当 1 名。手順書だけで第三者が再開できるか（07_HANDOVER_KIT の評価） |
| 稼働記録 | `OPERATIONS_LOG.md` の週次記録・インシデント記録（I-00〜I-11）の妥当性 |

---

## 5. 提供できる資料

| 区分 | 資料 | 形式 | 備考 |
|---|---|---|---|
| コード | `pachiverse-contracts` / `pachiverse-signer` / `pachiverse-members`（GitHub private リポジトリ） | 監査期間中の read 権限付与、または指定コミットの tarball | HEAD は発注時に固定して通知する |
| 設計・仕様 | 親 `docs/00_OVERVIEW.md` → `01_ARCHITECTURE.md` → `02_ONCHAIN.md`、members `docs/00_OVERVIEW.md` → `01_ARCHITECTURE.md`、`docs/12_signer_interface_v1.md`、`docs/13_pvm_withdrawal.md`、`docs/schemas/signer-v1/*.json`（契約の正本）、`docs/17_owner_ticket_card_spec.md`（追加監査） | Markdown / JSON | 各リポジトリの README も一次資料 |
| 設計判断の記録 | 親 / members の `DECISIONS.md`（採用しなかった案とその理由を含む） | Markdown | |
| 既知問題 | 親 / members の `KNOWN_ISSUES.md`、2026-09-07 内部全面レビュー報告書（CRITICAL 3 / HIGH 19 / MEDIUM 約 40）とその対応記録（§8） | Markdown / HTML | 監査会社が既知の指摘を重複報告しないために提供する |
| テスト | forge テスト（80 件 + OT 101 件）、Signer vitest（139 件）、WP PHPUnit（Unit 253 / Integration 143）、PHPStan level 5、`scripts/local-ci.sh`、Signer `scripts/e2e-anvil.sh`（anvil 通し検証） | 実行手順は各 README / AGENTS.md | CI は GitHub Actions（`test.yml`）。無料枠超過時はローカル同等検証の記録を PR コメントに残す運用 |
| runbook | members `ops/`: `RELEASE_RUNBOOK_20260909.md`、`DAY_OF_RUNBOOK_20260909.md`、`DEPLOY_CHECKLIST.md`（リリース履歴付き）、`INCIDENT_RESPONSE.md`、`KEY_MANAGEMENT_MIGRATION.md`（§5.3 実行記録付き）、`SEALED_BACKUP_RUNBOOK.md`、`OPERATIONS_LOG.md`、`CPA_REVIEW_GUIDE.md`（内部統制マップ・ITGC）、`DEVELOPMENT_POLICY.md` | Markdown | 第三者向け版ではホスト名・IP・アカウント名を別紙に外す |
| 引き継ぎ | 親 `docs/07_HANDOVER_KIT.md`（資産目録・認証情報の所在・運用カレンダー） | Markdown | 同上 |
| 監査ログ | `wp_uni_audit_log` のエクスポート（SHA256 ハッシュチェーン付き）、日次検証結果 | JSON | 会員 PII を含む列はマスクして提供（要確認 Q-10） |
| オンチェーン | コントラクトアドレス（PVM `0x55E3…541b3`、PVPACK `0x2B5D…109C`、Polygonscan Verified）、finalize / freeze / burn の tx hash（`OPERATIONS_LOG.md` §5.3）、ロール保持者一覧 | 公開情報 | |
| 環境 | ステージング環境（会員サイト stg）と Amoy テストネット用の Signer 設定例（`.env.example`） | アクセス手段は発注後に個別調整 | **本番 Signer・本番 WP への侵入テストは行わない**。stg の Signer は用意がない（Signer は 1 台構成）ため、Signer の動的テストはローカル anvil 構成で行う（要確認 Q-1） |
| インフラ | GCP コンソール（KMS / IAM / VM）の画面共有または `gcloud` 出力、お名前.com の `.htaccess` / サーバー設定 | 画面共有 / テキスト | 認証情報は渡さない |
| 窓口 | オーナー（開発・運用担当）が単一窓口。質疑は Slack または メール（要確認 Q-11） | | 回答は原則 2 営業日以内 |

---

## 6. 成果物の要求

| 項目 | 要求 |
|---|---|
| レポート形式 | 日本語。PDF + 編集可能な原稿（Markdown または Word）。**公開版（買い手・評価人へ提示可）と非公開版（詳細な再現手順を含む）の 2 部**。公開版には秘密の値・ホスト名・IP・個人名を含めない |
| 重大度分類 | Critical / High / Medium / Low / Informational の 5 段階。各指摘に CVSS v3.1（または相当）の根拠、影響資産（PVM 500 体 / Pack 残高 / PV Coin 台帳 / 会員 PII / 鍵）、悪用の前提条件、再現手順、推奨対策、**「コントラクトは変更不可」を踏まえた現実的な緩和策** |
| 既知事項の扱い | §3.3 K-1〜K-10 と §8 の既知事項は「既知・開示済み」として区別して記載する（監査の独立性のため所見自体は省略しない） |
| 良い点の記載 | 設計上の強み（fail-closed、鍵の用途分離、冪等設計、監査ログのハッシュチェーン等）も所見として記載する。買い手・評価人向けの資料として「問題がなかった範囲」の明示が必要 |
| 再確認 | 是正後の**再確認 1 回**を見積に含める（Critical / High の全件と、Medium のうち売り手が是正したもの）。再確認の結果を最終レポートに反映し、「是正済み」「受容（理由付き）」「未対応」を明記する |
| 中間報告 | Critical / High は発見時点で即時に個別通知（最終レポートを待たない） |
| 監査の証跡 | 対象コミットハッシュ、監査期間、実施者、使用ツール（静的解析・fuzz・手動）を明記。評価書の添付資料になるため、**監査会社名義の押印またはそれに準ずる真正性の担保**を求める（要確認 Q-12） |
| 秘密保持 | NDA 締結。会員 PII・秘密の値には触れない前提で、触れる必要が生じたら事前合意 |
| 追加監査（OT カード） | 初回レポートの差分として、OT カード分を別冊または追補で提出。見積は別建て（§3.4） |

---

## 7. 期間・体制・スケジュール

### 7.1 スケジュール

| 時期 | 内容 | 担当 |
|---|---|---|
| 2026-09 下旬 | 本スコープ書の確定、3 社へ見積依頼 | オーナー |
| 2026-10 上旬 | 見積受領・比較、質疑、1 社選定、NDA・契約 | オーナー |
| 2026-10 中 | 監査前の前提整備: Safe 2-of-3 移行（Part B）、KMS 後始末（§3.12 / R-7）、ステージング環境の整備、対象コミットの固定 | オーナー |
| **2026-11-01 〜** | **監査開始**（初回スコープ S-1〜S-17）。想定 4〜6 週 | 監査会社 |
| 2026-11 中〜下旬 | Critical / High の即時通知 → 売り手側で是正着手 | 双方 |
| 2026-12 上旬 | 初回レポート（ドラフト）受領 → 是正完了 → 再確認 1 回 | 双方 |
| 2026-12 中〜下旬 | **最終レポート受領（既存範囲）** | 監査会社 |
| 2026-12 | OT カード実装完了（法務確認後）→ **追加監査**（別見積・別発注） | 双方 |
| 2027-01〜02 | 会計士・税理士の無形資産評価書に監査レポートを添付 → UNI 社へ価格提示 | オーナー |

監査開始時点で Safe 移行が完了していない場合は、K-4 を「監査中に是正、再確認で検証」として扱う。

### 7.2 体制

| 役割 | 担当 | 備考 |
|---|---|---|
| 発注者・技術窓口・是正実装 | オーナー | 開発・運用の全権限を持つ。質疑は 2 営業日以内に回答 |
| 買い手側の見届け役 | UNI 社の指名者（要確認 Q-13） | レポートの共有先。監査には直接関与しない |
| 監査実施 | 監査会社（コントラクト担当・アプリケーション担当・インフラ担当の 3 領域を 1 社でカバーできることを希望） | 領域ごとに別会社へ分割発注する案は運用負荷のため避けたい |

### 7.3 見積依頼の依頼文案（3 社共通・定型）

```
件名: セキュリティ監査の見積依頼（NFT 会員システム・スマートコントラクト・署名基盤）

〇〇株式会社
セキュリティ監査ご担当者様

お世話になっております。Pachiverse プロジェクトの開発・運用を担当しております〔オーナー氏名〕と申します。

弊プロジェクトは、Polygon 上の NFT（ERC721 × 500 体、ERC1155 パック）と、
その保有・開封・出庫を管理する会員ポータル（WordPress + 自作 PHP プラグイン）、
および取引署名を専用に行う署名基盤（TypeScript、Google Cloud KMS）で構成される
稼働中のシステムです。2026 年内の事業譲渡に先立ち、第三者によるセキュリティ監査を
受けたく、貴社にお見積りをお願いしたくご連絡いたしました。

■ 対象と規模（詳細は添付スコープ書 §3）
  - スマートコントラクト 2 本（Solidity 0.8.24 / OpenZeppelin v5、本体 437 行、
    テスト 1,259 行、Polygon mainnet デプロイ済み・変更不可）
  - 署名基盤（TypeScript 約 3,100 行、テスト約 2,400 行、GCP VM + Cloud KMS）
  - 会員ポータルの重点モジュール（PHP 約 40,000 行: 認証・台帳・Reveal・出庫・
    Signer 連携・監査ログ・管理画面権限・サポート受信箱・公開 API）
  - インフラ設定（GCP KMS IAM / VM、共用レンタルサーバー、デプロイ手順）
  - 運用手順書のデスクレビュー

■ 希望する条件
  - 開始: 2026 年 11 月 1 日以降、なるべく早期
  - 期間: 4〜6 週間を想定。是正後の再確認 1 回を含む
  - 最終レポート: 2026 年 12 月中（公開版・非公開版の 2 部、日本語）
  - 本番環境への侵入テストは行わず、ステージング／ローカル構成で実施
  - 別途、実装中の追加コントラクト 1 本（ERC721、449 行）とその連携部分について、
    12 月に追加監査の別見積をお願いする予定です

■ お願いしたい事項
  1. 上記スコープに対するお見積り（領域別の内訳と、再確認 1 回分を明示）
  2. 想定スケジュール（着手可能時期、所要週数）
  3. 実施体制（コントラクト／Web アプリケーション／クラウドインフラの各担当）
  4. 過去の類似案件（NFT・カストディ型サービス・WordPress）の実績概要
  5. 成果物のサンプル（可能であれば）
  6. NDA の雛形（貴社所定のものがあれば）

添付のスコープ書に、対象・対象外・監査の観点・提供資料・成果物の要求を
まとめております。不明点がございましたら、リポジトリの閲覧権限（read only）の
一時付与や、オンラインでの事前説明（30 分程度）にも対応いたします。

お手数ですが、〔回答期限〕までにご回答いただけますと幸いです。
何卒よろしくお願いいたします。

〔オーナー署名・連絡先〕
添付: 08_AUDIT_SCOPE（第三者向け版）
```

---

## 8. 既知の指摘と対応状況（2026-09-07 内部全面レビュー §0 の 10 件）

2026-09-07 に実施した内部全面レビュー（対象 main@9fda2ff、CRITICAL 3 / HIGH 19 / MEDIUM 約 40）のうち、「9/9 の Reveal 公開までに判断が要る 10 件」（§0）の 2026-09-16 時点の状態。監査会社には報告書全文を提供する。

| §0 # | 内容（レビュー報告書の節） | 状態 | 対応 | 根拠 |
|---|---|---|---|---|
| 1 | 停止会員が既存セッションで全機能を使える（§1-1） | **対応済み** | ゲート・AJAX で会員ステータスを毎回判定し即時遮断 | members PR #53（9/8）、DECISIONS 2026-09-07 |
| 2 | 毎リクエスト 500 回の SELECT（§2-5） | **対応済み** | クエリ集約 | PR #53 |
| 3 | editor ロールが公開 URL から一斉メール・会員更新・PII CSV に到達できる（§1-2） | **未対応・保留** | サポート担当が editor で実運用中。「閲覧は維持し変更操作を締める」案で再検討中（オーナー判断 9/8）。**監査開始までに方針を決める（要確認 Q-14）** | 05_DEPRECIATION_ITEMS §3.4 |
| 4 | Signer 応答タイムアウト後に confirmed receipt を拒否する（§3-1） | **対応済み** | `dispatched` 状態でも receipt を受理 | PR #53、DECISIONS 2026-09-07 |
| 5 | Webhook トークン未設定時に無認証で通す（§5-1） | **対応済み（コード）** | fail-closed 化。**本番でトークンが設定済みかの実確認は未**（要確認 Q-9） | PR #53、members KNOWN_ISSUES 未確認 14 |
| 6 | 初回パスワードに記号を含めた会員がログイン不能（§1-3） | **対応済み** | `check_password` フィルタで旧形式を救済・再ハッシュ | PR #54、DECISIONS 2026-09-08 |
| 7 | ガチャチケットが CAS でなく 1 枚から 2 回引ける（§2-3） | **対応済み** | `uni_member_item_qty_apply_delta()` の CAS に統一。競合は 503 `ticket_conflict`。統合テスト `GachaTicketCasIntegrationTest` | PR #102（9/15 本番反映） |
| 8 | 旧「移管申請」経路でパックが出庫対象（§2-5）／承認後も残高拘束なし（§2-10） | **対応済み** | 前半: パック・OT を出庫対象外に固定（PR #90、9/14）。後半: 申請時に −qty / +hold をトランザクション化、却下で戻す（PR #103、9/15）。統合テスト `WithdrawHoldBalanceIntegrationTest` | DEPLOY_CHECKLIST 2026-09-14 / 09-15 |
| 9 | 差出人の無検証上書き（§4-2）＋ PII を AI プロンプトに生で渡す（§4-3） | **対応済み** | 前半: 自ドメイン限定（PR #63、9/9）。後半: 電話・生年月日・メール・氏名をマスクしてから AI へ（PR #104 / #105、9/15）。ユニットテスト `SupportAiPiiMaskTest` | 同上 |
| 10 | Reveal All に確認ダイアログがない（§7-3） | **対応済み** | ダイアログ追加 | PR #53 |

集計: 対応済み 9 件（うち #5 は本番設定の実確認が残る）、保留 1 件（#3）。
注: 親 `05_DEPRECIATION_ITEMS.md` §3.4 の表は 2026-09-15 午前時点（#7 / #8 後半 / #9 後半が未修正）の記述で、同日午後の PR #102〜#105 の本番反映を反映していない。評価書提出前に 05 を更新する。

### 8.1 §0 以外で監査会社に先に開示する既知問題

| # | 内容 | 状態 | 所在 |
|---|---|---|---|
| E-1 | 非 InnoDB 環境でコイン台帳が無ロック経路へフォールバック（K-5） | 未対応（設計上の既知事項。本番は InnoDB） | members KNOWN_ISSUES |
| E-2 | DB パスワード・WordPress salts の未ローテーション | 未対応 | CPA_REVIEW_GUIDE §8、07 §3 |
| E-3 | サーバー固有パスのハードコード（ログ出力先） | 未対応 | members KNOWN_ISSUES |
| E-4 | KMS 移行の後始末（平文 `.env` バックアップの shred、VM スナップショット削除、捨て鍵の IAM 取消） | 未完了（10 月） | KEY_MANAGEMENT_MIGRATION §3.12 / R-7 |
| E-5 | Safe 2-of-3 への ADMIN 移行（K-4） | 未実施（10 月） | 同 §4 |
| E-6 | Signer エンドポイントの前段防御なし（K-2） | 設計と実態の差。監査で評価を求める | RELEASE_STATE §2-a |
| E-7 | 本番のみに存在するプラグイン（WP Mail SMTP 等）がリポジトリにない | 棚卸し未 | members KNOWN_ISSUES 未確認 4 |
| E-8 | 2026-09-01 資産・認証系レビューの 8 件（tx_hash readonly / sent 時減算 / 台帳 legacy / 緊急停止 path / NFT 送信 CAS / render sync ロック / callback 冪等 / CLI failed ガード） | 9/1 マージ・9/2 本番反映済み | 親 KNOWN_ISSUES「要修正」追記、05 §4 |
| E-9 | 公開サイト購読 API（レート制限なし・管理トークンのクエリ受付・非定数時間比較・配信停止なし） | 未対応。初回スコープ外（X-2） | 親 KNOWN_ISSUES |
| E-10 | 2026-09-07 全面レビューの §0 以外の HIGH / MEDIUM 約 50 件 | 個別の対応状況は報告書と PR 履歴で提示（要確認 Q-15） | `~/Downloads` の報告書 |

---

## 9. 要確認リスト（オーナーが埋める。第三者向け版では本節を外す）

| # | 項目 | 選択肢・補足 | 期限 |
|---|---|---|---|
| Q-1 | 動的テスト（侵入テスト）の環境 | (a) 会員サイト stg のみ、Signer はローカル anvil 構成 ／ (b) Signer の stg インスタンスを一時的に立てる（single-active 制約のため本番と別 VM・別 DB・Amoy 接続） ／ (c) 静的レビューのみで動的テストなし | 見積依頼前 |
| Q-2 | 監査費用の予算上限 | 03_TRANSFER_PLAN §5 の目安 100〜170 万円（是正費・追加監査は別）。3 社の見積で確定 | 見積比較時 |
| Q-3 | Safe 2-of-3 移行（Part B）を監査開始前に完了させるか | 完了させる（推奨。K-4 が「解消済み」で監査に入れる）／ 監査中に実施し再確認で検証 | 10 月中 |
| Q-4 | 会社ウォレットのシード・復旧コードの封緘バックアップ（SEALED_BACKUP_RUNBOOK）の実施状況 | 監査の運用観点（§4.4）で問われる。未実施なら「未実施」と開示 | 10 月中 |
| Q-5 | 本番 DB・Signer SQLite・VM ディスクの定期バックアップ方針 | 現状は 9/8 の手動ダンプ 1 回のみ確認。頻度と保管先を決めて記録 | 10 月中 |
| Q-6 | 本番のみに存在するプラグイン・ファイルの棚卸し（WP Mail SMTP ほか） | `wp plugin list` の結果を S-16 の資料に添える | 見積依頼前 |
| Q-7 | 公開サイトの Vercel Functions（X-2）をオプション見積に含めるか | 含める（購読者 PII の防御線が `ADMIN_TOKEN` のみのため）／ 内製是正で済ませる | 見積依頼前 |
| Q-8 | 旧コントラクト 3 本と Owner's Pass の「管理不能の事実確認」をデスクレビューとして S-1 に含めるか | 含める（DD 開示事項 05 K の第三者確認になる）／ 含めない | 見積依頼前 |
| Q-9 | 本番で `UNI_BLASTENGINE_WEBHOOK_TOKEN` 等の Webhook トークンが設定済みか | 本番設定ファイルで確認（値は転記しない）。§8 #5 の完了条件 | 見積依頼前 |
| Q-10 | 監査ログのエクスポートに含める列とマスク方法 | 会員 PII（本名・メール）を含む `note` 列等の扱い。監査会社と NDA 後に決めてもよい | 契約時 |
| Q-11 | 質疑の連絡手段 | Slack（共有チャンネル）／ メール／ 監査会社のポータル | 契約時 |
| Q-12 | レポートの真正性担保の形式 | 押印 PDF ／ 電子署名 ／ 監査会社の Web 上での公開証明。評価書の添付資料として会計士・税理士が求める形式を事前ヒアリング（03 §2.4）で確認 | 会計士ヒアリング後 |
| Q-13 | UNI 社側の見届け役（レポート共有先）の指名 | 03_TRANSFER_PLAN §4.1 策 4 と同一人物でよいか | 10 月中 |
| Q-14 | §0 #3（editor ロールの権限）の方針 | (a) 閲覧維持・変更操作を manage_options に限定（案 2）／ (b) サポート専用ロールを新設 ／ (c) 現状維持を「受容」として開示 | 監査開始前 |
| Q-15 | 全面レビューの §0 以外（HIGH / MEDIUM 約 50 件）の対応状況一覧を作るか | 作る（監査会社への重複防止と、評価書での「既知・対応済み」の証跡になる）／ 報告書と PR 履歴の提示で足りるとする | 見積依頼前 |
| Q-16 | 3 社の候補 | コントラクト・Web アプリ・クラウドの 3 領域を 1 社で受けられる会社を優先。国内の Web3 監査会社／ 国内の Web アプリ診断会社（コントラクトは提携先）／ 海外のコントラクト専業（日本語レポート不可の場合は除外） | 9 月下旬 |
| Q-17 | 対象コミットの固定時期 | 監査開始日の前営業日に各リポジトリの main を固定し、監査中のデプロイは是正分のみに限定する運用でよいか | 契約時 |
| Q-18 | 本書の第三者向け版の作成 | §9 を外し、§3.3 / §8 の内部資料参照（`~/Downloads` 等）を「別途提供」に置換する | 見積依頼前 |

要確認: 18 件。

---

## 10. 関連資料

- [03_TRANSFER_PLAN.md](03_TRANSFER_PLAN.md) §3（スケジュール）・§4 フェーズ E / I・§5（監査費用の目安）
- [05_DEPRECIATION_ITEMS.md](05_DEPRECIATION_ITEMS.md) A-1 / A-2 / A-5 / D / F（監査が解消する控除項目）
- [07_HANDOVER_KIT.md](07_HANDOVER_KIT.md) §3（認証情報の所在）・§6（runbook 索引）
- [02_ONCHAIN.md](02_ONCHAIN.md)、[01_ARCHITECTURE.md](01_ARCHITECTURE.md)、[KNOWN_ISSUES.md](KNOWN_ISSUES.md)
- members `docs/01_ARCHITECTURE.md`、`docs/12_signer_interface_v1.md`、`docs/13_pvm_withdrawal.md`、`docs/17_owner_ticket_card_spec.md`、`docs/KNOWN_ISSUES.md`、`ops/KEY_MANAGEMENT_MIGRATION.md`、`ops/CPA_REVIEW_GUIDE.md`
- `pachiverse-contracts/README.md`、`DEPLOY_PVM_20260909.md`、`pachiverse-signer/README.md`
- 2026-09-07 内部全面レビュー報告書（リポジトリ外、`~/Downloads/members-review-2026-09-07.html`）
