# 11_INFRA_MIGRATION — インフラの現状と移行案（初稿）

作成日: 2026-09-16（売り手作成・初稿）　読者: UNI 側の技術担当・監査会社　位置づけ: [03_TRANSFER_PLAN.md](03_TRANSFER_PLAN.md) フェーズ G「インフラ現状と移行案の文書化（実施は買い手判断）」、[05_DEPRECIATION_ITEMS.md](05_DEPRECIATION_ITEMS.md) 開示事項 A-6・H の技術側の説明。

- 本書は**所在の種別と制約**を書く。ホスト名・IP・アカウントのメールアドレス・鍵の値・個別 URL は書かない（第三者配布版の方針。[07_HANDOVER_KIT.md](07_HANDOVER_KIT.md) §1）。確定値の正本は members `ops/RELEASE_STATE_20260902.md`
- 金額は書かない。月額の「有無」だけ示し、額は「要確認」（§8）
- 名義: 「個人」= オーナー個人名義、「UNI」= 株式会社 UNI 名義、「要確認」= 文書から判断できず 07 §8 に集約済み

## 1. 現状の構成図

```
                 会員（ブラウザ）                    一般閲覧者
                        │                                │
                        ▼                                ▼
 ┌──────────────────────────────┐    ┌──────────────────────────────┐
 │ members.pachiverse.com (本番) │    │ pachiverse.com（公開サイト）   │
 │ stg.members.pachiverse.com   │    │ Vercel Hobby                  │
 │ お名前.com 共用サーバー        │◄───│  静的 HTML + Serverless Fn    │
 │ WordPress + uni_memberpage   │ 公開│  /api/collection (60 秒 cache) │
 │ MySQL（業務状態の正本）        │ REST│  /api/subscribe → Redis       │
 │ WP-Cron（アクセス駆動）        │    └───────┬───────────┬──────────┘
 │ WP Mail SMTP → ブラストエンジン │            │           │
 │ サポート受信箱 IMAP/SMTP（お名前）│      Cloudflare R2   Vercel Redis
 └──────┬───────────────────────┘      （PV 動画・機体    /Upstash
        │ signer-v1（HTTPS + HMAC）        画像 1,000 件）  （購読者）
        ▼
 ┌──────────────────────────────┐
 │ Signer VM（GCP e2-micro）     │     ┌──────────────────────────┐
 │ Caddy(Let's Encrypt) → Node   │────►│ Cloud KMS（HSM）           │
 │ systemd、SQLite（nonce 正本）  │ 署名 │ keyRing pv-signer          │
 │ single-active（1 台固定）      │     │ minter / pvm-custody /     │
 │ 固定 IP 1 つ、FW 22/80/443    │     │ burner（エクスポート不可）   │
 └──────┬───────────────────────┘     └──────────────────────────┘
        │ RPC（外部事業者）
        ▼
 ┌──────────────────────────────┐     ┌──────────────────────────┐
 │ Polygon mainnet               │     │ IPFS: Filebase（主）        │
 │ PVM ERC721 / Packs V2 ERC1155 │◄────│       Pinata（旧 14 種・予備）│
 │ Owner's Pass ERC721（owner 鍵 │ CID │ 画像・metadata CID は        │
 │ なし）、旧 ERC1155 ×3         │     │ コントラクトに固定（freeze 済）│
 └──────────────────────────────┘     └──────────────────────────┘

 DNS / ドメイン: お名前.com（pachiverse.com、vegasbank-nft.com。UNI 名義）
 コード: GitHub（org と個人アカウント。いずれもオーナー個人所有）
 ウォレット: 会社 MetaMask（ADMIN / PACK_CUSTODY / POL 補充元）、Safe 2-of-3 は未作成
 単一端末: オーナーの Mac（keystore・SSH/FTPS 鍵・DB バックアップ・原本画像 10GB の唯一の置き場）
```

矢印のうち**業務判断を持つのは WordPress だけ**。Signer は鍵を持つが判断を持たず、公開サイトは会員 API の読み取りのみ（[01_ARCHITECTURE.md](01_ARCHITECTURE.md)）。

### 1.1 データの正本と複製の所在（移管で失ってはいけないもの）

| データ | 正本 | 複製・再現手段 | 移管時の扱い |
|---|---|---|---|
| 会員・PV Coin 台帳・監査ログ・Pack Reveal 割当 | 本番 WordPress DB（INSERT のみの台帳設計） | 手動ダンプ 1 回（Mac）。定期化未 | **移管の直前にダンプを取り、UNI 側保管先へ複製してから着手** |
| Signer の request_id・nonce 予約・attempts | Signer VM の SQLite（永続ディスク） | VM スナップショット（方針未決） | VM ごと引き渡す。複製を別 Signer で動かさない（nonce 重複） |
| PVM 500 体の画像・metadata | IPFS（CID はコントラクトに freeze 済み） | Filebase・Pinata の二重ピン、`pvm-art/out/*.car`、原本 10GB は Mac のみ | CID は不変。UNI 側アカウントで同一 CID を再ピンすれば到達性を引き継げる |
| 公開サイトの機体画像・PV 動画 | R2 バケット | 原本 `pvm-art/out/web/`（Git 外、sha256 マニフェスト） | UNI 側バケットへ `rclone sync` → マニフェスト照合 |
| 購読者（ニュースレター） | Redis（Upstash 互換） | なし | `HGETALL` で書き出して移す。PII として扱う |
| 稼働記録・インシデント記録・デプロイ退避 | members リポジトリ `ops/`、本番サーバーの退避ディレクトリ | Git | コードと同梱 |
| 鍵素材 | Cloud KMS（HSM。エクスポート不可）、会社 MetaMask、紙 1 部（PVM_CUSTODY） | 07 §3 | プロジェクトごと移管。紙は再導出確認のうえ引き渡し |

## 2. コンポーネント表

| # | コンポーネント | ホスト・サービス | 名義 | 依存 | 制約・単一障害点 | 月額 | 根拠 |
|---|---|---|---|---|---|---|---|
| 1 | 公開サイト + 購読 API | Vercel（Hobby プラン）。GitHub リポジトリ連携、main マージで本番 | 要確認（プロジェクトはオーナー個人アカウント） | GitHub、Redis、R2、会員 API | Hobby: Deployment Storage 10GB（75% 到達歴、R2 移設で緩和）・24h 5,000 ファイル上限・プレビューデプロイ無効化済み。**法人利用の可否は規約要確認** | 無料枠（要確認） | 01 「デプロイ」、DECISIONS 2026-09-15、07 §2 |
| 2 | 購読者 Redis | Vercel Redis / Upstash（REST） | 要確認 | Vercel | 購読者 PII の防御線は `ADMIN_TOKEN` 1 本 | 要確認 | 00_OVERVIEW「外部サービス」、KNOWN_ISSUES |
| 3 | PV 動画・機体画像 | Cloudflare R2 バケット 1 つ。公開 URL は `r2.dev` サブドメイン | **個人**（オーナーの Cloudflare アカウント） | なし（DNS を Cloudflare へ移せば独自ドメイン化可） | `r2.dev` はレート制限あり・本番向けでないと Cloudflare が注記。**第 2 コピー未作成**。アカウント譲渡は前提にしない | 要確認（無料枠内の見込み） | `R2_MACHINE_ASSETS_MIGRATION.md`、07 §2 |
| 4 | 会員サイト本番・stg | お名前.com 共用サーバー。PHP 8.3.31、WordPress + 自作プラグイン。SSH（非標準ポート）・FTPS デプロイ | 要確認（ドメインは UNI 名義、**サーバー契約の名義は未確認**） | MySQL（同サーバー）、メール、Signer | **固定 IP なし・常駐プロセス不可・WP-Cron はアクセス駆動で時刻保証なし**・リソース上限・FTPS 手動デプロイ（配置順ミスで全面ダウンの前例 I-00） | あり（額は要確認） | KNOWN_ISSUES「運用・インフラ制約」、05 A-6、RELEASE_STATE §2-b |
| 5 | 本番 DB（会員・台帳・監査ログ、約 50 テーブル） | 同サーバーの MySQL | 同上 | — | **バックアップは 9/8 の手動ダンプ 1 回のみ確認**。定期化未（07 §8 #15）。復元先は InnoDB 必須（非 InnoDB は台帳が無ロック経路へ黙ってフォールバック） | 同上 | 07 §2・§7 #11 |
| 6 | メール送信 | WP Mail SMTP プラグイン（本番のみ・リポジトリ外）→ ブラストエンジン SMTP。差出人ドメイン `vegasbank-nft.com` は DKIM/SPF/DMARC 設定済み（2026-09-01） | 要確認（契約名義・プラン・残通数） | DNS（SPF/DKIM）、Webhook トークン | 送信経路が複数層（フック優先度で切替）。本番設定はリポジトリに無い | あり（要確認） | members `docs/01_ARCHITECTURE.md`「メール」、`ops/SC_MAIL_MONTHLY_RUNBOOK.md` |
| 7 | サポート受信箱 | お名前.com メール（IMAP 5 分取り込み・SMTP 返信） | 要確認 | サーバー契約 | サーバー契約と一体 | 同 #4 | 07 §2 |
| 8 | Signer VM | GCP e2-micro（Always Free）、Debian 12、固定 IP 1 つ、Caddy + Let's Encrypt、systemd、SQLite | **個人**（GCP プロジェクトはオーナー個人所有。組織リソース配下） | KMS、RPC、DNS（`signer` サブドメイン） | **single-active（同時 2 台禁止）**。SQLite が nonce 予約の正本。公開インターネット直置き（前段は HMAC のみ。README は VPN / allowlist 等を推奨） | VM は無料枠。固定 IP・ディスクは要確認 | RELEASE_STATE §2-a、signer README「v1 の運用制約」 |
| 9 | Cloud KMS（HSM） | 同 GCP プロジェクト。keyRing 1 つ、cryptoKey 3 つ（`EC_SIGN_SECP256K1_SHA256`）。捨て鍵用 keyRing が別に 1 つ（削除不可） | 同上 | GCP プロジェクト | **鍵はエクスポート不可** → プロジェクト喪失 = 署名手段喪失（PVM_CUSTODY のみ紙 1 部封緘）。オーナー 2 名はいずれもオーナー保有アカウント | あり（HSM 3 鍵で月 $7.5 前後 + 署名回数。実額は 10〜11 月請求で確認） | KEY_MANAGEMENT_MIGRATION §1.4・§5.3・Q-9 |
| 10 | ドメイン・DNS | お名前.com（レジストラ兼 DNS）。`pachiverse.com`（www / members / stg.members / signer）、`vegasbank-nft.com` | **UNI**（2026-09-15 確認。名義変更不要） | — | DNS 管理画面はオーナーのアカウント。`vegasbank-nft.com` の DNS 管理場所は未確認 | あり（要確認） | 07 §8 #2 |
| 11 | IPFS 配信 | Filebase（主。CAR で 500 体 + 旧 14 種を二重ピン、無料 5GB）、Pinata（旧 14 種・予備。FREE 上限超過、専用ゲートウェイ） | 要確認 | — | アカウント譲渡は不可の前提。CID は再ピンで再現可能（`pvm-art/out/*.car`） | Filebase 無料、Pinata 有料化推奨（要確認） | 07 §2、`pvm-art/README.md` |
| 12 | Polygon RPC・Etherscan API | 外部事業者（Signer VM・Mac・WP の 3 箇所で設定） | 要確認 | — | 再契約で足りる | 要確認 | 07 §2 |
| 13 | コード | GitHub: org（members・pvm-art・world）と個人アカウント（公開サイト・contracts・signer は remote 要確認） | **個人**（org・個人アカウントともオーナー所有。2026-09-15 確認） | — | Actions 無料枠を 9/11 に超過（課金しない方針、月初に手動実行） | 無料枠（要確認） | 07 §8 #1、`ops/OPERATIONS_LOG.md` I-04 |
| 14 | 外部 API（Anthropic・OpenAI・Google Sheets・fal.ai） | 各サービス | 要確認 | WP 側設定 | 再契約で足りる。fal.ai は運用では不要 | 従量（要確認） | 07 §2 |
| 15 | OpenSea プロフィール・コレクション編集権 | OpenSea | 要確認 | 会社 MetaMask | 編集権は会社 MetaMask で取得。Safe 移行後の再取得が要る | なし | DAY_OF_RUNBOOK §7.3 |
| 16 | ウォレット | 会社 MetaMask（ADMIN / PACK_CUSTODY / POL 補充元）、Signer 3 鍵（KMS）、Safe 2-of-3（未作成） | 会社（呼称上）。保管者はオーナー | — | **会社 MetaMask のシードの保管場所が不明**（封緘の最優先項目）。Owner's Pass ERC721 は owner 鍵なし（管理操作不能） | ガス代のみ | 07 §8 #7、KEY_MANAGEMENT_MIGRATION §1 |
| 17 | オーナーの Mac | 1 台 | 個人 | — | **単一障害点**: Foundry keystore・SSH/FTPS 鍵・ADC・DB バックアップ・pvm-art 原本 10GB の唯一の置き場。封緘バックアップ未 | — | 07 §2 |

## 3. 制約と単一障害点（要約）

| 制約 | 影響 | 現状の緩和 | 残るリスク |
|---|---|---|---|
| お名前.com 共用サーバー（固定 IP なし・常駐不可・cron 制約） | Signer 側で IP allowlist が組めない。日次処理の時刻がずれる。burn の Phase 2 自動送信も WP-Cron 依存 | HMAC 認証、ヘルスダッシュボードで次回予定を可視化、5 分以内のズレを許容 | スケール上限。マーケットプレイスは別ホスト必須（要件定義書 §5.4） |
| Signer single-active | 冗長化不可。更新は旧停止 → 新起動（数秒の停止） | 放置しても会員の権利は失われない設計（DAY_OF_RUNBOOK §0.6-a） | VM 障害で burn・出庫が止まる。死活監視は人手（日次） |
| KMS は GCP プロジェクト依存・エクスポート不可 | プロジェクト・アカウント喪失 = 署名手段喪失 | オーナー 2 名化、PVM_CUSTODY の紙 1 部 | 2 名ともオーナー保有アカウント。UNI 側が未参加 |
| R2 は個人アカウント | アカウント停止で PV 動画・機体画像が消える | 原本は Mac と pvm-art（sha256 マニフェスト） | 第 2 コピー未作成、`r2.dev` はレート制限 |
| Vercel Hobby | 商用・法人利用の規約、ストレージ枠 | R2 移設・プレビュー無効化 | 規約違反時の停止（要確認） |
| GitHub org が個人所有 | IP 帰属の証跡と運用が個人アカウントに紐づく | — | アカウント喪失で履歴・CI・Vercel 連携が止まる |
| 手動デプロイ・手動バックアップ | 人為ミスと復元不能 | main ベース必須のゲート、退避ディレクトリ | 定期バックアップ未定着 |
| 会社 MetaMask のシード所在不明 | PACK_CUSTODY（Pack 在庫）と POL 補充元の喪失 | ブラウザ拡張と Foundry keystore の 2 箇所に存在 | 封緘未。Mac 喪失で片方消える |

### 3.1 第三者監査のスコープとの対応（監査会社向け）

03 §4 フェーズ E の監査スコープは contracts / signer / WordPress の 3 つ。本書のコンポーネントとの対応は次のとおり。

| 監査対象 | 本書の該当 | 監査で見てほしい構成上の論点 | 移管で構成が変わるか |
|---|---|---|---|
| コントラクト | §2 #16 のロール構成、Polygon 上の 2 契約（finalize・freeze 済） | ADMIN の Safe 移行（Part B）前後で権限が一致すること。Owner's Pass の管理不能性の開示 | 変わらない（Safe 署名者のみ入れ替え） |
| Signer | §2 #8・#9、§3 の single-active と KMS 依存 | HMAC 認証のみで公開インターネットに置かれている点、IAM の最小権限（cryptoKey 単位）、平文鍵の残置後始末（R-7）の完了 | 変わらない（案 A）。案 B でも同一プロジェクト内で VM 再作成 |
| WordPress | §2 #4〜#7、§3 の共用サーバー制約 | 未ローテーションの DB パスワード・salts、サーバー固有パスのハードコード、手動デプロイの統制（G1〜G4 ゲート） | 案 A では変わらない。案 B では移設後の再確認が要る |
| 対象外（マネージドサービス） | Vercel・R2・Redis・IPFS・メール配信 | 名義・権限の所在（本書 §2）と、購読者 PII の防御（`ADMIN_TOKEN` 1 本） | 名義のみ変わる |

## 4. 移管案の比較

| 観点 | 案 A: 名義変更・権限移譲のみ（最小） | 案 B: UNI 側インフラへ再構築 |
|---|---|---|
| 内容 | 各サービスの名義・オーナー権限・請求先を UNI へ移す。構成は変えない。譲渡不可のサービス（Filebase・Pinata・R2・Redis）は UNI 側で再作成し同一データを複製 | 会員サイトを固定 IP・cron・常駐可能なホスト（VPS またはマネージド WP）へ移設。Signer は同一 GCP プロジェクト内で VM を再作成（KMS 鍵は移せないため**プロジェクトごと移管が前提**）。R2・Redis・IPFS は UNI アカウントで再作成 |
| 作業量 | 数日〜2 週間（各サービスの手続き待ちが主） | 数週間〜。会員サイト移設（DB 移行・パス依存の修正・メール経路再構築・stg 再作成）が本体 |
| 停止時間 | ほぼ無し。Signer 再起動の数秒、DNS 伝播 | 会員サイト移設時に数時間（メンテモード）。Signer は数秒 |
| 費用感 | ランニングは現状と同等（額は要確認）。作業費は 07 §2 の手続きの積み上げ | 移設費 + ホスト費の増分。工数表 §7-6 は A-6 を 70〜100 万円と置くが**算定根拠は売り手の自己評価。要確認** |
| 得られるもの | 個人依存の解消（名義・権限）。譲渡の前提条件を満たす | 案 A に加え: 固定 IP による Signer の allowlist、cron の時刻保証、常駐プロセス（監視・自動 dispatch）、CI からの自動デプロイ、定期バックアップの仕組み化 |
| リスク | 構造上の制約（§3）はそのまま残る。Vercel Hobby の規約問題は未解決 | 移行そのものの障害（9/1 の全面ダウン I-00 と同種）、非 InnoDB 環境への誤移設、サーバー固有パスのハードコード（05 F）、メール到達性の再検証、監査スコープが動く |
| 監査との関係 | 監査（11 月〜）の対象構成が変わらない | 監査中または監査後に実施しないと、監査結果が移設後の構成を保証しない |

**推奨**: 譲渡日までは**案 A**を完了させ（05 A-6 の「買い手判断」はここで担保）、**案 B は監査レポート受領後に UNI 側が判断**する。案 A の中で先行できる案 B 要素: 定期バックアップの仕組み化、Signer healthz の外形監視と通知、R2 の第 2 コピー、Pinata の有料化。

## 5. 移管手順の順序（案 A。案 B でも同じ順序で始める）

各ステップは「前のステップが完了して初めて次が安全に行える」順に並べる。実施は 07 §4 の運用カレンダーに空きがある平日日中、burn の pending が 0 のときに行う（KEY_MANAGEMENT_MIGRATION §2 前提 #3/#4 と同じ考え方）。

### 5.0 着手前チェックリスト（全ステップ共通）

| # | 条件 | 確認方法 |
|---|---|---|
| 1 | pending の burn バッチが 0 件（`created` / `dispatched` / `submitted` なし） | DAY_OF_RUNBOOK §7.1 #5〜#7・#10 |
| 2 | pending の出庫申請が 0 件 | 同 #17 |
| 3 | 本番 DB のダンプを取得し、Mac 以外（UNI 側保管先）へ複製済み | DAY_OF_RUNBOOK §1.11 の手順 |
| 4 | Signer VM のディスクスナップショットを取得済み（移管後に不要なら削除。平文鍵の残置スナップショットは R-7 の対象） | KEY_MANAGEMENT_MIGRATION §3.12 |
| 5 | DNS レコード一覧を移管前に控えてある（A・CNAME・MX・SPF・DKIM・DMARC） | `dig` の出力を稼働記録に貼る |
| 6 | 各サービスの現行設定（Vercel 環境変数名、WP Mail SMTP 設定、Webhook トークンの設定有無）を控えてある | 値は書かず「設定済み／未設定」だけ記録 |
| 7 | 見届け役が立ち会う日程が決まっている（不可逆操作は 2 人で確認） | 07 §5 |
| 8 | 各ステップのロールバック手順（§5.1）を読んでいる | — |

| 順 | 対象 | 作業 | 停止 | 切り替わるもの（§6） | 確認方法 |
|---|---|---|---|---|---|
| 1 | DNS・ドメイン | ドメインは UNI 名義で確認済み。**お名前.com のアカウント（DNS 管理画面）を UNI 側の管理者に移す**か、UNI 側アカウントで再登録。`vegasbank-nft.com` の DNS 管理場所を確認 | 無し | — | 全レコード（A・SPF・DKIM・DMARC・`signer` の A）を移管前後で `dig` 比較 |
| 2 | GitHub | org を UNI の GitHub アカウントへ transfer（または UNI 側を owner に追加）。個人アカウント配下のリポジトリ（公開サイト・contracts・signer）は org へ移す。Vercel の Git 連携を再設定。Actions の課金方針を決める | 無し（Vercel 連携再設定の間は本番デプロイ不可） | Vercel 連携、CI シークレット | main マージで Production がデプロイされることを 1 回実測 |
| 3 | GCP プロジェクト | UNI 側アカウントをプロジェクトオーナーに追加 → 請求先を UNI の請求アカウントへ → 組織リソースからの移動要否を確認（**KMS 鍵はプロジェクトに紐づくためプロジェクトごと移す。鍵の再作成・エクスポートは不可**）→ 最終的にオーナー保有アカウントを剥奪 | 無し（VM は動き続ける） | KMS IAM（オーナー権限のみ。VM のサービスアカウントは不変） | `healthz` 200、Signer 起動ログの `accountProvider: gcp-kms`、翌日の burn が confirmed |
| 4 | Cloudflare R2 | UNI の Cloudflare アカウントでバケット再作成 → `rclone sync`（Cache-Control immutable）→ 件数・sha256 照合（`pvm-art/out/MANIFEST_webp.sha256`）→ Vercel の `MACHINE_ASSET_BASE` を新 URL に変更して Redeploy → 旧バケットは一定期間並行 | 無し | `MACHINE_ASSET_BASE`（HMAC 鍵 `MACHINE_ASSET_KEY` は**変えない**。変えるとファイル名が全件変わり再アップロードになる） | `/api/collection` の画像 URL と og:image が新 URL、全件 HEAD 200 |
| 5 | Vercel | プロジェクトを UNI のチーム（Pro 等）へ transfer。環境変数（`KV_REST_API_*`、`ADMIN_TOKEN`、`MACHINE_ASSET_KEY`、`MACHINE_ASSET_BASE`、`MEMBERS_API_BASE`）の再設定。ドメイン割当の付け替え。Redis を UNI 側へ再作成する場合は購読者データを HGETALL で移す | DNS 切替時に数分 | `ADMIN_TOKEN`（ローテーション） | 公開サイト表示、購読登録 → 一覧取得 |
| 6 | お名前.com（会員サイト・メール） | サーバー契約の名義変更（または UNI 名義の再契約と移設 = 案 B）。SSH 鍵・FTPS デプロイアカウント・wp-admin Basic 認証・WP 管理者を UNI 側運用者のものに追加し、オーナー分を削除。ブラストエンジンの契約名義変更 | 名義変更のみなら無し | WP DB パスワード・salts（未ローテーション。この機会に実施）、SMTP 認証、Webhook トークン、HMAC 鍵 | `/login/` 200、テストメール SPF/DKIM/DMARC PASS、WP → Signer 疎通（TX を出さない §1.17） |
| 7 | ウォレット・Safe | 会社 MetaMask のシード封緘と復旧テスト → UNI 側へ引き渡し。Safe 2-of-3（Part B 後）の署名者 2・3 は最初から UNI 管理の Ledger（DECISIONS 2026-09-24 U-9）。保守満了時に会社 MetaMask を UNI 新規鍵へ `swapOwner`。OpenSea 編集権の再取得 | Signer 停止なし（PACK_CUSTODY は変えない） | Safe 署名者 | Safe UI で署名者 3 名・threshold 2、`hasRole(DEFAULT_ADMIN_ROLE, Safe)` true |
| 8 | 個人端末の解消 | Mac にしか無いもの（keystore・SSH/FTPS 鍵・原本画像 10GB・DB ダンプ）を UNI 側の保管先へ複製し、sha256 で照合。封緘バックアップ runbook §4 の完了条件を満たす | 無し | — | `SEALED_BACKUP_RUNBOOK.md` §5 の記録が全項目埋まる |

### 5.1 ステップ別ロールバック

| 順 | 戻せるか | 戻し方 | 戻せない点 |
|---|---|---|---|
| 1 DNS | 可 | 控えたレコードを再登録。TTL の分だけ伝播に時間 | レジストラのアカウント移管は手続き次第（要確認） |
| 2 GitHub | 可 | org の transfer は再 transfer で戻る。Vercel 連携は再設定 | transfer 中の CI 実行は失われない（履歴は Git） |
| 3 GCP | 部分的に可 | オーナー追加・請求先変更は戻せる。**オーナー剥奪は最後に行い、UNI 側で `healthz` と翌日 burn を確認してから** | 組織間移動は片道になり得る（要確認 §8 #4）。KMS 鍵は移動もエクスポートも不可 |
| 4 R2 | 可 | `MACHINE_ASSET_BASE` を旧 URL に戻して Redeploy（`R2_MACHINE_ASSETS_MIGRATION.md`「ロールバック」） | 旧バケットを削除した後は原本からの再アップロード |
| 5 Vercel | 可 | プロジェクト transfer の逆操作、ドメイン割当の戻し | Redis を再作成して旧を消した後は購読者データの書き戻し |
| 6 お名前.com | 名義変更のみなら可 | 追加したアカウントを削除。salts 変更は戻さない（再ログインが再度発生するだけ） | 案 B の移設は DB 差分が生じるため、切替後の書き込みを旧環境へ戻せない。移設はメンテモード中に完結させる |
| 7 Safe | 可（Safe 経由） | 署名者の追加・削除は Safe の通常 TX。旧 ADMIN の `revokeRole` は Part B の手順（不可逆側は KEY_MANAGEMENT_MIGRATION §4.5） | 会社 MetaMask のシードは引き渡した時点で「知っている人が増える」ため、戻すならローテーション（PACK_CUSTODY の変更は Signer 起動時検証を巻き込むので慎重に） |
| 8 端末 | 可 | 複製を削除 | — |

## 6. 移管時に必ず切り替わるもの（ローテーション一覧）

「値を知っていた人が変わる」ため、名義変更だけでも次は必ず更新する。手順は各 runbook。

| 項目 | 理由 | 手順の所在 | 注意 |
|---|---|---|---|
| WP ⇔ Signer の HMAC 鍵 2 本（`wp2026a` / `sg2026a` 系） | 両サーバーに平文で存在し、旧運用者が値を知っている | RELEASE_STATE §2-a「ローテーション時は両側に新旧 2 本を並べる」 | 片側だけ変えると 401 / 409。`payload_hash` 実装は触らない |
| KMS IAM | プロジェクトオーナーがオーナー保有アカウントから UNI 側アカウントへ | KEY_MANAGEMENT_MIGRATION §2.2・§3.9 | VM のサービスアカウントの `signerVerifier`（cryptoKey 単位）は不変。鍵バージョンは destroy しない |
| Safe 署名者 | Ledger 2 台は最初から UNI 管理（U-9）。満了時に会社 MetaMask を UNI 新規鍵へ `swapOwner` | KEY_MANAGEMENT_MIGRATION §4（Part B） | 署名前に safeTxHash を Safe UI の外で独立計算（Q-10） |
| SMTP 認証・ブラストエンジン Webhook トークン | 契約名義・アカウントの変更に伴う | `ops/SC_MAIL_MONTHLY_RUNBOOK.md`、WP Mail SMTP 設定（本番のみ） | 本番設定はリポジトリに無い。変更前に現設定を控える |
| DKIM（`vegasbank-nft.com` セレクタ `be2026`、`pachiverse.com` の `default`） | ブラストエンジンを再契約すると DKIM 鍵が変わり DNS 更新が要る | SC_MAIL_MONTHLY_RUNBOOK §「送信ドメイン認証」 | 旧 SendGrid の DKIM（s1/s2）は名残。移管時に整理 |
| WP DB パスワード・WordPress salts | 未ローテーション（CPA_REVIEW_GUIDE §8 未着手、05 §3.7） | `wp-config-secrets.php`（値は書かない） | salts 変更で全会員が再ログイン。告知して実施 |
| SSH 鍵・FTPS デプロイアカウント・wp-admin Basic 認証・GCP VM SSH 鍵 | 個人端末の鍵を UNI 側運用者の鍵に | 07 §3 | お名前.com の国外アクセス制限 ON を維持 |
| `ADMIN_TOKEN`（購読者一覧）、`MACHINE_ASSET_KEY` | 前者はローテーション。**後者は変えない**（§5 #4） | Vercel 環境変数 | — |
| 外部 API キー（Anthropic・OpenAI・Etherscan・RPC・Google Sheets サービスアカウント） | UNI 側で再発行 | 07 §2 の各行 | Google Sheets はシートの所有権移転も |
| 主要アカウントの 2 段階認証・復旧コード | 保持者が変わる | `ops/SEALED_BACKUP_RUNBOOK.md` §3 | 復旧テスト後に封緘 |

## 7. 将来課題（譲渡後・UNI 側判断）

- **WP 共用サーバーからの移行**（案 B）: 固定 IP・cron 保証・常駐プロセスが手に入り、Signer の IP allowlist、burn の Phase 2 自動送信の安定化、healthz 外形監視、CI 自動デプロイが可能になる。移設時は InnoDB 確認・サーバー固有パスの修正・メール経路の再構築が必須
- **マーケットプレイス**: 要件定義書 §5.4 で別ホスト必須。設計書は members `docs/00_README_FOR_CLAUDE_CODE.md`〜`07_*`（未実装）
- **Signer の冗長化**: v1 は single-active。水平展開する場合は `IdempotencyStore` を共有 DB（PostgreSQL 等）＋分散ロックへ置き換える設計余地がある（signer README「将来 horizontal scaling する場合」）。現時点で必要なし
- **OT カード**（members `docs/17`）: 実装時に OT_MINTER / OT_CUSTODY の 2 鍵を KMS に追加し、Signer の起動時検証が増える。KMS 課金は 5 鍵分になる
- **R2 の独自ドメイン化**: `r2.dev` のレート制限回避。pachiverse.com の DNS を Cloudflare へ移す必要がある（`MACHINE_ASSET_BASE` の変更だけで切替可）
- **IPFS の二重化の維持**: Filebase 無料枠 5GB、Pinata は有料化推奨。旧 NFT 14 種の画像は提供者消失で復旧した経緯があり、再ピン材料を `pvm-art/ipfs-restore/` に保持し続ける
- **定期バックアップ**: 本番 DB 日次ダンプ、Signer SQLite と VM ディスクの週次スナップショットの方針決定と自動化（07 §8 #15）
- **旧コントラクトの整理**: Owner's Pass ERC721 は owner 鍵なしで管理不能。時期を見て「正本ではない」と宣言する方針（DECISIONS 2026-09-15）。旧 ERC1155 3 契約の owner EOA の所在確認

## 8. 要確認

| # | 項目 | 誰が | 関連 |
|---|---|---|---|
| 1 | お名前.com **サーバー契約**の名義（ドメインは UNI 名義で確認済み） | オーナー | §2 #4、07 §8 #2 |
| 2 | Vercel Hobby プランの法人・商用利用の規約上の可否と、Pro 移行の要否 | UNI 技術担当 | §2 #1 |
| 3 | 各サービスの月額の実額（お名前.com・ブラストエンジン・KMS・Vercel・Cloudflare・Filebase/Pinata・RPC・外部 API）。KMS は 10〜11 月請求で確認 | オーナー | §2 全行、07 §8 #16 |
| 4 | GCP プロジェクトを組織リソースから UNI 側へ移す手順（組織間移動の可否・請求先変更のみで足りるか） | UNI 技術担当・オーナー | §5 #3 |
| 5 | Vercel Redis / Upstash・Cloudflare の契約名義と、UNI 側での再作成方針 | オーナー | 07 §8 #4 |
| 6 | Filebase・Pinata・fal.ai・Etherscan・RPC・OpenAI・Anthropic・Google Sheets の名義と譲渡可否（原則は再契約） | オーナー | 07 §8 #5 |
| 7 | ブラストエンジンの契約名義・プラン・残通数、WP Mail SMTP の本番設定内容 | オーナー | 07 §8 #6 |
| 8 | 会社 MetaMask のシードの保管場所（封緘の最優先） | オーナー | 07 §8 #7 |
| 9 | contracts・signer リポジトリの remote の所在（org か個人か） | オーナー | §2 #13 |
| 10 | 案 B の費用感（工数表 §7-6 の 70〜100 万円は売り手自己評価）。UNI 側の希望ホストと見積 | UNI 技術担当 | §4 |
| 11 | Signer 固定 IP・永続ディスクの課金の有無（VM は Always Free） | オーナー | §2 #8 |
| 12 | `vegasbank-nft.com` の DNS 管理場所とサポート用メールボックスのホスティング先 | オーナー | 07 §8 #9 |
| 13 | 監査スコープに案 A の移管作業（IAM・HMAC ローテーション）を含めるか | オーナー・監査会社 | §4 |
| 14 | 案 B を行う場合の実施時期（監査後）と、移設中の会員告知方法 | UNI 現代表 | §4・§7 |
