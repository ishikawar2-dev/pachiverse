# 07_HANDOVER_KIT — 引き継ぎパッケージ（初稿）

作成日: 2026-09-15（初稿・売り手作成）　対象: pachiverse.com / members.pachiverse.com / pachiverse-contracts / pachiverse-signer / pvm-art / pachiverse-world

## 1. 目的・使い方・更新ルール

- **目的**: 運用担当 1 名が不在でも、本書 1 冊から運用を再開できること。あわせて譲渡資料（買い手 DD）と、[05_DEPRECIATION_ITEMS.md](05_DEPRECIATION_ITEMS.md) 開示事項 H「外部アカウントの移管」の所在一覧を兼ねる（[03_TRANSFER_PLAN.md](03_TRANSFER_PLAN.md) §4.1 の策 1）。
- **書かないもの**: 秘密の値（鍵・パスワード・API キー・トークン・シード・HMAC secret）。本書は**所在**だけを書く。会員の個人情報も書かない。
- **読み方**: 止まっている作業を再開するなら §4 → §6 の runbook へ。何かを止めたい・壊れたなら §5 と §7 へ。名義変更や再契約の棚卸しなら §2。
- **正本の優先順位**: 確定値（アドレス・CID）は members `ops/RELEASE_STATE_20260902.md`、手順は各 runbook、実装仕様は各リポジトリ README。本書と食い違えばそれらが優先し、本書を直す。
- **更新ルール**: 週次の稼働記録更新（members `ops/OPERATIONS_LOG.md` §0）と同じタイミングで §2〜§4 の変更を反映する。鍵管理移行（KMS / Safe）の完了時は §2・§3 の該当行を書き換える。名義・所在が確定したら §8 から該当行を消し、§2 に移す。
- **個人名の扱い**: 役職・アカウント名のみ。「オーナー」= 売り手本人（UNI の 100% 株主・運用担当）、「UNI 現代表」= 買い手側の意思決定者。
- 本書は売り手（開発者本人）が作成した自己申告であり、網羅性は保証しない。DD で追加項目が出れば §2 に追記する。
- **第三者（買い手・評価人・監査会社）へ渡す版では、§3（認証情報の所在）と、§2 の管理者アカウント名・ホスト名・IP・GCP アカウントのメール・R2/Pinata の個別 URL・HMAC の key_id は別紙にして本文から外し「所在の種別」だけ残す。** 本書は private リポジトリ内の運用用。
- **前提（2026-09-15 時点）**: §3 の認証情報は全行がオーナー個人の保持で、復旧コードの封緘・GCP プロジェクトオーナーの 2 名化・SSH/FTPS 鍵と Foundry keystore の Mac 外保管はすべて未実施。**03_TRANSFER_PLAN §4.1 策 2（封緘バックアップと復旧テスト）が完了するまで、本書単独では運用を再開できない。** 策 2 を 10 月の最優先に置く。

## 2. 資産目録

名義: 「個人」= オーナー個人名義、「会社」= 株式会社 UNI 名義、「要確認」= 文書から判断できず §8 に集約。

| 区分 | 資産 | 所在 | 名義 | 譲渡時の手続き | 根拠資料 |
|---|---|---|---|---|---|
| コード | 公開サイト + 購読 API | GitHub `ishikawar2-dev/pachiverse`（public/private 要確認） | 個人（アカウント） | UNI の GitHub org へ transfer、Vercel 連携の再設定 | 01_ARCHITECTURE「デプロイ」、メモリ root-repo-gh-account-switch |
| コード | 会員システム（WordPress プラグイン `uni_memberpage`） | GitHub `pachiverse01-ai/pachiverse-members`（private） | 要確認（org `pachiverse01-ai` の所有者） | org の owner 権限付与または transfer | members `docs/00_OVERVIEW.md` |
| コード | スマートコントラクト（Foundry） | `~/Developer/pachiverse/pachiverse-contracts`（remote は要確認） | 要確認 | 同上 | 01_ARCHITECTURE |
| コード | 署名基盤 Signer（TypeScript） | `~/Developer/pachiverse/pachiverse-signer`（KMS 対応 PR #1/#2 は 2026-09-16 マージ済み） | 要確認 | 同上 | 02_ONCHAIN、05 §3.1 A-1 |
| コード | アート生成パイプライン | GitHub `pachiverse01-ai/pvm-art`（private、2026-09-15〜） | 要確認 | 同上 | `pvm-art/README.md`「Git 管理と資産の所在」 |
| コード | メタバース World Foundation v1.3.1 | GitHub `pachiverse01-ai/pachiverse-world-foundation`（ローカル `~/Developer/pachiverse/pachiverse-world`。グレーボックス段階、G1・P1-10 は Hall v2 後の再実施未了） | 要確認 | 同上。未完成部分は控除メモ J | `pachiverse-world/README.md`、05 §2b J |
| コード | Genaverse マケプレ設計書（未実装） | members `docs/00_README_FOR_CLAUDE_CODE.md`〜`07_*` | — | コードと同梱 | members `docs/00_OVERVIEW.md` docs 案内 B |
| インフラ | 会員サイト本番・stg（WordPress、PHP 8.3.31） | お名前.com 共用サーバー `www1036.onamae.ne.jp`、`~/public_html/members.pachiverse.com/` と `stg.members.pachiverse.com/` | 要確認 | サーバー契約の名義変更または UNI 契約サーバーへ移設（移設は買い手判断、05 A-6） | `ops/DAY_OF_RUNBOOK_20260909.md` §0.2、`ops/RELEASE_STATE_20260902.md` §2-b |
| インフラ | Signer VM（GCP e2-micro、Debian 12） | GCP プロジェクト `pachiverse-signer`（組織 `pachiverse01-org`）、VM `pachiverse-signer`（us-central1-a）、固定 IP 35.192.1.24、systemd `pachiverse-signer.service`、`/opt/signer/` | 要確認（アカウント `pachiverse01@gmail.com`、請求リンク済） | GCP プロジェクトのオーナーを UNI 側にも付与（KMS runbook §2.2「2 名以上」）、請求先の変更 | `ops/RELEASE_STATE_20260902.md` §2-a |
| インフラ | Cloud KMS（HSM。3 鍵の保管先、移行後） | 同プロジェクト、keyRing `pv-signer`（本番用。Signer 3 鍵＋OT 2 鍵 `ot-minter` / `ot-custody`、2026-09-16 作成）/ `pv-rehearsal`（捨て鍵 `throwaway`。IAM は取り消し済み、cryptoKey 削除は 2026-10-15 以降） | 同上 | KMS 化完了後は GCP プロジェクトごと引き渡す。月 $7.5 前後の課金 | KEY_MANAGEMENT_MIGRATION §3.1・§6 Q-9 |
| インフラ | 公開サイトホスティング | Vercel プロジェクト `pachiverse`（GitHub `ishikawar2-dev/pachiverse` 連携、main マージで本番。`vercel.json` の `ignoreCommand` で main 以外はビルドしない＝プレビューなし、2026-09-15） | 要確認（Hobby プラン） | Vercel チームへ transfer、環境変数の再設定（`KV_REST_API_*`、`MACHINE_ASSET_BASE`（任意。未設定時はコード既定の R2 URL））、ドメイン割当の付け替え | 01_ARCHITECTURE「デプロイ」、`vercel.json`、`docs/R2_MACHINE_ASSETS_MIGRATION.md` |
| インフラ | 購読者 Redis | Vercel Redis / Upstash（`KV_REST_API_*`） | 要確認 | Vercel と同時に移管 | 00_OVERVIEW「外部サービス」 |
| インフラ | PV 動画・機体画像ホスティング | Cloudflare R2 バケット `pachiverse-media`（公開 URL `pub-4f767ce43f34417aa267bf5a563efdcf.r2.dev`）。PV 動画に加え、2026-09-15 から公開サイトの機体画像 `assets/machines/{t,d}` 1,000 件（sha256 マニフェストは `pvm-art/out/MANIFEST_webp.sha256`、原本は `pvm-art/out/web/`）。リポジトリには置かない | 個人（オーナーの Cloudflare アカウント） | UNI の Cloudflare アカウントへバケット再作成（`rclone sync`、Cache-Control immutable）・`MACHINE_ASSET_BASE` 差し替え。第 2 コピー（別バケット or Filebase）は未作成 | 00_OVERVIEW「外部サービス」、`docs/R2_MACHINE_ASSETS_MIGRATION.md` |
| ドメイン・DNS | `pachiverse.com`（+ `www`、`members`、`stg.members`、`signer` の各サブドメイン） | DNS はお名前.com コントロールパネル（`signer` の A レコードを 9/2 に追加した場所）。SPF `include:spf.besender.jp`、DKIM `default._domainkey`、旧 SendGrid DKIM（s1/s2）は名残 | 要確認 | レジストラの名義変更（お名前.com の「登録者変更」）。DNS を Cloudflare へ移す構想あり（R2 独自ドメイン化） | `ops/RELEASE_STATE_20260902.md` §2-a、メモリ mail-route-blastengine |
| ドメイン・DNS | `vegasbank-nft.com`（サポーターズ倶楽部メールの差出人ドメイン） | DKIM セレクタ `be2026`・SPF・DMARC を 2026-09-01 設定 | 要確認 | 名義変更または差出人ドメインの変更（後者は開発対応） | `ops/SC_MAIL_MONTHLY_RUNBOOK.md` |
| ドメイン・DNS | 旧 IPFS ゲートウェイ `ipfs.pachiverse.com` | DNS 無し・到達不能（主ゲートウェイは Filebase に変更済） | — | 不要。参照を残さない | RELEASE_STATE §3 |
| クラウド | Filebase（IPFS 主配信。PVM 画像・metadata の CAR、既存 14 種の二重ピン） | Filebase アカウント（鍵は `~/.filebase_keys`）。無料 5GB | 要確認 | アカウント譲渡は不可の前提で、UNI 側アカウントに同一 CID を再ピン（`pvm-art/out/*.car` から） | `pvm-art/README.md`、RELEASE_STATE §1 |
| クラウド | Pinata（旧 NFT 14 種のピン・画像の予備保管。FREE 上限超過 542/500） | Pinata「YU's Workspace」（専用 GW `moccasin-glamorous-butterfly-662.mypinata.cloud`） | 要確認（ユーザーのアカウント） | 同上。公開 GW からの到達性が無いため UNI 側で有料プランに再ピンを推奨 | `pvm-art/ipfs-restore/RESTORE_RUNBOOK.md`、メモリ ipfs-existing-nft-outage |
| クラウド | Polygon RPC（Alchemy / Infura / publicnode 等） | Signer VM `.env` の `RPC_URL`、Mac の `POLYGON_RPC_URL`、members `docs/.env` | 要確認 | UNI 側で RPC アカウントを取得し 3 箇所を差し替え | 02_ONCHAIN §6、DAY_OF_RUNBOOK §0.2 |
| 外部サービス | Etherscan API V2（PolygonScan。verify・オンチェーン残量取得） | Mac `~/.polygonscan_key`、WP `UNI_POLYGONSCAN_API_KEY` | 要確認（新規アカウントで取得） | UNI 側でキー再発行・2 箇所差し替え | RELEASE_STATE §2-b、members `docs/00_OVERVIEW.md` |
| 外部サービス | ブラストエンジン（メール配信 SMTP `smtp.engn.jp`、Event Webhook） | WP Mail SMTP プラグイン（本番のみ導入・リポジトリ外）の設定、`UNI_BLASTENGINE_WEBHOOK_TOKEN` | 要確認 | 契約名義変更。残通数・プランはブラストエンジン管理画面 | メモリ mail-route-blastengine、SC_MAIL_MONTHLY_RUNBOOK |
| 外部サービス | お名前.com メール（`support@pachiverse.com` IMAP/SMTP、iCloud 宛分岐） | サーバー契約に付随。WP `UNI_SUPPORT_IMAP_*` / `UNI_SUPPORT_SMTP_*` | 要確認 | サーバー契約と同時 | members `docs/01_ARCHITECTURE.md`「メール」 |
| 外部サービス | Anthropic API（サポート AI 分類・テンプレ改善） | WP `UNI_SUPPORT_ANTHROPIC_API_KEY` | 要確認 | UNI 側でキー発行・差し替え | members `docs/00_OVERVIEW.md` |
| 外部サービス | OpenAI API（ニュース自動生成） | WP `UNI_OPENAI_API_KEY` | 要確認 | 同上 | 同上 |
| 外部サービス | fal.ai（Seedream。アート素材生成。運用では不要） | Mac `~/.fal_key` | 要確認 | 再生成が必要な時のみ UNI 側で取得 | `pvm-art/README.md`「APIキー」 |
| 外部サービス | Google Sheets（サポート受信箱の共有） | スプレッドシート `UNI_SUPPORT_GSHEETS_SPREADSHEET_ID`、サービスアカウント JSON（WP ルート `gsheets-service-account.json`） | 要確認 | シートの所有権移転、サービスアカウントの再発行 | members `docs/00_OVERVIEW.md` |
| 外部サービス | OpenSea（プロフィール `PachiverseFoundation`、PVM / Packs V2 コレクション） | OpenSea アカウント。コレクション編集権は会社 MetaMask で取得 | 要確認 | アカウント譲渡または Safe 移行後の編集権の再取得 | DAY_OF_RUNBOOK §7.3 |
| 外部サービス | GitHub Actions（members の CI。無料枠を 9/11 に超過） | `pachiverse01-ai` org | 要確認 | org 移管と同時。課金しない方針 | `ops/OPERATIONS_LOG.md` I-04 |
| ウォレット | 会社ウォレット = ADMIN = PACK_CUSTODY = デプロイ・premint 署名者 | `0x502cef1173c162a39d8b23fa69579d862c2c728a`（MetaMask。同鍵を Foundry keystore `deployer` に取込済）。Pack 1101 / 1202 の custody 保有者（premint 300 / 200、9/14 の burn 64 枚後は 269 / 167。以後は開封分だけ減る）、POL 補充元（9/6 時点 1,325 POL） | 会社（呼称上）。実際の保管者はオーナー | **譲渡・引き継ぎ時の最重要アイテム**（02_ONCHAIN §11）。Safe 2-of-3 化後に ADMIN は Safe へ、PACK_CUSTODY は MetaMask のまま。鍵の引き渡し手順は Part B 完了後に別紙 | DAY_OF_RUNBOOK §0.3、KEY_MANAGEMENT_MIGRATION §1 |
| ウォレット | PVM_CUSTODY（PVM 500 体の保管・出庫 TX 署名） | `0x3a6cf63047fC81f9B8a3ae3990fE4Af1F091ae49`。鍵は Cloud KMS `pv-signer/pvm-custody` v1（HSM、2026-09-16 移行済み）＋紙 1 部封緘（R-1、2026-09-16 作成・再導出一致） | 会社（用途上） | GCP プロジェクトと紙バックアップの引き渡し。ローテーション（500 体移転）は行わない（オーナー決定 9/15） | 同上、KMS runbook R-1 |
| ウォレット | BURNER（Pack burn 署名）/ MINTER（finalize 済で実質無用） | `0xcE5cd2929e4f99D5493347962F53A81447fBA688` / `0x8CeAbd264ac7700E71eCAdB286DDc0E62Ff2b575`。鍵は Cloud KMS `pv-signer/burner` / `pv-signer/minter` v1（HSM、2026-09-16 移行済み） | 会社（用途上） | GCP プロジェクトごと。BURNER は Safe 経由で付け替え可能 | 同上 |
| ウォレット | Safe 2-of-3（ADMIN の移行先。**未作成**） | 署名者予定: 会社 MetaMask・オーナーの Ledger・新規調達の 2 台目 Ledger（冷蔵鍵） | 会社（予定） | 署名者に UNI 側を入れる案は要オーナー判断（03 §4.1 策 4） | KEY_MANAGEMENT_MIGRATION §4、03_TRANSFER_PLAN §5 |
| コントラクト | PachiverseMachines（PVM, ERC721、finalize・freeze 済） | Polygon `0x55E3A05eaAc41aAeB596227CD4076e91033541b3`（Verified） | オンチェーン（ADMIN が実効的な所有） | ADMIN 権限の Safe 移行で引き渡し | RELEASE_STATE §1、`pachiverse-contracts/DEPLOY_PVM_20260909.md` §3 |
| コントラクト | PachiverseMysteryPacks V2（PVPACK, ERC1155、finalize・freeze 済） | Polygon `0x2B5DaC082f664986e77b4f075617D1908BBd109C`（Verified） | 同上 | 同上 | 同上 |
| コントラクト | **Owner's Pass ERC721**（会員へ送付済み 4,200 枚、1 人 1 枚。マイページの OT 1201 は枚数確認用の記録） | Polygon `0x1c19d0367236127a4d73c4816daee36fc23edd8a` | **owner 鍵なし（外部委託で作成、仕様不明。2026-09-15 確認）** | 2026-09-15 仕様確認: mint・burn・pause・URI 変更の関数なし（実質 immutable、transferOwnership のみ）。transfer 可。metadata JSON はオンチェーン。**画像 CID は取得不能（要再ピン。原本 `Pachiverse_NFT_mint _backup/…/owners_pass_nft.gif` で CID 一致確認済み）**。description に利益分配の文言（変更不可・法務開示）。**同日夕の決定で方針変更: 時期を見て「正本ではない」と宣言し以後参照しない**（オーナーチケット会員カードへ移行）。開示事項 05 K | members `docs/DECISIONS.md` 2026-09-14、メモリ owner-ticket-canonical-owners-pass |
| コントラクト | **Owner's Pass ERC721**（会員へ送付済み 4,200 枚、1 人 1 枚。マイページの OT 1201 は枚数確認用の記録） | Polygon `0x1c19d0367236127a4d73c4816daee36fc23edd8a` | **owner 鍵なし（外部委託で作成、仕様不明。2026-09-15 確認）** | コントラクト管理は不可能。**同日夕の決定で方針変更: 時期を見て「正本ではない」と宣言し以後参照しない**（オーナーチケット会員カードへ移行）。開示事項 05 K | members `docs/DECISIONS.md` 2026-09-14、メモリ owner-ticket-canonical-owners-pass |
| コントラクト | 旧 ERC1155 ×3（Packs 旧 `0x9f3a5b10…`＝退役・dead 転送済 / Participation Units `0x852fbd87…` / Access & Companion `0x22acc4ac…`）、Owner's Pass ERC721 `0x1c19d0367236127a4d73c4816daee36fc23edd8a` | Polygon。旧 3 契約は baseURI freeze 済・owner は EOA | 要確認（owner EOA の所在） | owner 鍵の所在確認と引き渡し | 01_ARCHITECTURE「公開されているコントラクトアドレス」、02_ONCHAIN §8、`ops/OPERATIONS_LOG.md` I-09 |
| インフラ | **オーナーの Mac**（Foundry keystore `deployer`・SSH/FTPS 鍵・ローカル ADC・API キー各種・DB バックアップ・pvm-art 原本 10GB の唯一の置き場） | Mac 1 台（バックアップ方針: 要確認） | 個人 | **単一障害点**。策 2 で鍵・復旧コードを封緘し、原本とバックアップを別置きにするまで、この端末の喪失＝運用不能 | 03 §4.1 策 2、§3 |
| データ | 本番 WordPress DB（会員・PV Coin 台帳・監査ログ・Pack Reveal・50 テーブル） | お名前.com MySQL。バックアップ例 `~/backup/members-db-20260908-1407.sql`（80MB、Mac） | 会員データは UNI/VB の顧客データであり**評価対象外だが、システムと一体で引き渡す**（05 I） | 事業承継に伴う個人データ提供として整理し会員通知（03 §1） | members `docs/01_ARCHITECTURE.md`「データベース」、DAY_OF_RUNBOOK §8 |
| データ | Signer SQLite（request_id・nonce 予約・attempts の正本） | VM `DATABASE_PATH`（永続ディスク） | 会社（用途上） | VM ごと引き渡し。単一インスタンス制約に注意 | 02_ONCHAIN §4 |
| データ | PVM 500 体の原本画像（4096 PNG、約 10GB）・WEBP 500 枚（ディスク上 616MB。README の 576MB は制作時の計測値）・metadata 500 件 | Mac `pvm-art/out/images4096/`・`out/webp/`（Git 外。別置きバックアップ未）、metadata はリポジトリ＋IPFS。CID: 画像 `bafybeiarlh4…`、metadata `bafybeiazx7o…` | 個人（IP はオーナー。03 §1） | 外付け／クラウドに 1 部複製し `out/MANIFEST_*.sha256` で照合したうえで引き渡し | `pvm-art/README.md`、RELEASE_STATE §1 |
| データ | 旧 NFT 14 種の原本と IPFS 復旧材料 | `Pachiverse_NFT_mint _backup/`（削除禁止）、`pvm-art/ipfs-restore/`（`EXPECTED_CIDS.txt`、`metaB-partial.car`） | 個人 | pvm-art リポジトリと同梱 | `RESTORE_RUNBOOK.md` |
| データ | 正規データ・会員取り込み調査・作業リスト（個人情報あり） | members リポジトリ直下の Git 未追跡ファイル（`正規データ/`、`Pachiverse_customer_reply_*` 等）、`~/Downloads` の質疑応答一覧 | UNI/VB の顧客データ | 中身を転記しない。UNI 側の担当者へ媒体で引き渡し | members `docs/KNOWN_ISSUES.md`「個人情報を含むローカルファイル」 |
| 文書 | 要件定義書・開発工数表・全面レビュー報告書 | ルート直下 `Pachiverse_要件定義書_v1.0_2026-07-07.docx`、`Pachiverse_開発工数表_v1.1_2026-09-07.md`（Git 外）、`~/Downloads/members-review-2026-09-07.html` | 個人 | 譲渡資料インデックス（03 フェーズ H）に収録 | 00_OVERVIEW「このリポジトリ外の資料」、03 §6 |
| 文書 | 知識基盤 docs・runbook 群（約 250KB） | 親 `docs/`、members `docs/` + `ops/`、各リポジトリ README | — | コードと同梱 | §6 |

## 3. 認証情報の所在一覧（値は書かない）

| 認証情報 | 保管場所 | 保持者（役職） | ローテーション状況 |
|---|---|---|---|
| Signer 3 鍵（MINTER / PVM_CUSTODY / BURNER） | **Cloud KMS `pv-signer/{minter,pvm-custody,burner}` v1（HSM、2026-09-16 インポート済み）。VM の `.env` に平文鍵は無い。** 平文の `.bak` は 2026-09-21 に shred 済み、移行前スナップショット等は 0 件（R-7 クローズ）。平文鍵は R-1 の紙 1 部（PVM_CUSTODY）のみ | GCP プロジェクトオーナー 2 名（`pachiverse01@gmail.com`、`ishikawar2@gmail.com`）。VM SA に cryptoKey 単位 signerVerifier | ローテーションなし（インポート方式）。Part A は 2026-09-21 完了（members `ops/KEY_MANAGEMENT_MIGRATION.md` §5.3）。KMS のデータアクセス監査ログは 2026-09-21 15:4x JST から有効 |
| PVM_CUSTODY の紙バックアップ 1 部 | **作成済み（2026-09-16）。石川の個人手帳に封緘して保管**（Safe 冷蔵鍵とは別の場所にすること。紙からアドレスを再導出して一致確認済み） | オーナー | 譲渡時は紙ごと引き渡し、UNI 側で再導出確認 |
| 会社 MetaMask（ADMIN / PACK_CUSTODY）のシード | オーナー管理（保管場所は**要確認**、別紙） | オーナー | 未ローテーション。ADMIN は Safe へ移行予定、PACK_CUSTODY はこのまま |
| Foundry keystore `deployer`（会社 MetaMask の鍵の取込） | Mac `~/.foundry/keystores/deployer`（パスワードはオーナーのみ） | オーナー | Safe 移行後は `revokeRole` 等の用途が Safe に置き換わる |
| オーナーの Ledger（Safe 署名者 2）/ 2 台目 Ledger（冷蔵鍵、署名者 3） | オーナー保有 / 新品を公式直販で調達予定 | オーナー | Part B で使用。冷蔵鍵の保管場所は KMS runbook §5 に「場所の説明」のみ記録 |
| WP → Signer HMAC（key_id `wp2026a`） | WP 本番 `wp-config-secrets.php`（`PV_SIGNER_OUTBOUND_KEYS`）⇔ VM `.env`（`SIGNER_INBOUND_KEYS`）。stg には未設定 | 運用担当 | 2026-09-02 配置。ローテーション時は両側に新旧 2 本を並べる |
| Signer → WP HMAC（key_id `sg2026a`） | VM `.env`（`WP_OUTBOUND_KEY_ID/SECRET`）⇔ WP `PV_INDEXER_CALLBACK_KEYS` / `PV_SIGNER_CALLBACK_KEYS` | 運用担当 | 同上 |
| WordPress DB 接続情報・salts | 本番 `wp-config.php` / `wp-config-secrets.php`（WP ルート直下、`.htaccess` で直アクセス拒否）。追記前バックアップ `wp-config-secrets.php.bak-<stamp>` あり | 運用担当 | **未ローテーション**（CPA_REVIEW_GUIDE §8 の未着手項目、05 §3.7） |
| WP 管理者アカウント（`manage_options`）、wp-admin Basic 認証 | WP DB / `wp-admin/.htaccess` + `.htpasswd`（本番ユーザー `PV_Admin` と `ishikawar2`、stg `ishikawar2`） | 運用担当・サポート担当（editor ロール） | Basic 認証は 3/24 設定・stg は 9/2 再設定 |
| サポート受信箱 IMAP / SMTP、iCloud 分岐用お名前 SMTP | `wp-config-secrets.php`（`UNI_SUPPORT_IMAP_*` / `UNI_SUPPORT_SMTP_*`、`UNI_SAKURA_SMTP_*` は予備） | 運用担当 | 要確認 |
| Anthropic / OpenAI / PolygonScan の API キー（WP 側） | `wp-config-secrets.php`（`UNI_SUPPORT_ANTHROPIC_API_KEY` / `UNI_OPENAI_API_KEY` / `UNI_POLYGONSCAN_API_KEY`） | 運用担当 | 要確認 |
| ブラストエンジン・SendGrid Webhook トークン、サポート inbound トークン | `wp-config-secrets.php`（`UNI_BLASTENGINE_WEBHOOK_TOKEN` 等）。本番設定の実確認は未（members KNOWN_ISSUES 未確認 14） | 運用担当 | 要確認 |
| Google Sheets サービスアカウント JSON | WP ルート `gsheets-service-account.json`（`.htaccess` で拒否） | 運用担当 | 要確認 |
| ブラストエンジン管理画面ログイン、WP Mail SMTP の SMTP 認証 | ブラストエンジン側アカウント／本番 WP のプラグイン設定（リポジトリ外） | 運用担当 | 要確認 |
| お名前.com コントロールパネル（サーバー NAVI・DNS・SSH 登録・phpMyAdmin） | お名前.com アカウント（別紙） | オーナー | 要確認 |
| お名前.com SSH 鍵（RSA 4096）、FTPS デプロイアカウント | Mac `~/.pachiverse-deploy/onamae_rsa`（コンパネ登録名 `pachiverse-deploy`、国外アクセス制限 ON）、`~/.netrc-deploy-members`（FTP アカウント `deploy@members.pachiverse.com`、スコープ限定） | 運用担当 | 2026-09-01〜02 作成 |
| GCP アカウント・VM SSH 鍵 | Google アカウント `pachiverse01@gmail.com`（プロジェクトオーナー。`ishikawar2@gmail.com` もオーナーで 2 名体制）、Mac `~/.pachiverse-deploy/gce_ed25519`、ローカル ADC（オーナー個人 Google アカウント） | オーナー | 捨て鍵 `throwaway` の IAM は取り消し済み（2026-09-21）。cryptoKey 削除は 2026-10-15 以降 |
| Vercel 環境変数（`KV_REST_API_*`、`ADMIN_TOKEN`、`MACHINE_ASSET_KEY`、`MEMBERS_API_BASE`） | Vercel プロジェクト `pachiverse` の Production / Preview / Development | オーナー | `ADMIN_TOKEN` は購読者 PII の唯一の防御線（親 KNOWN_ISSUES） |
| GitHub アカウント（`ishikawar2-dev` / `pachiverse01-ai`）、Vercel、Cloudflare、OpenSea、Filebase、Pinata、fal.ai、Etherscan、RPC 事業者の各ログイン | 各サービスのアカウント（別紙。復旧コードの封緘は 03 §4.1 策 2 で予定・未実施） | オーナー | 要確認 |
| IPFS / 生成系のファイル渡しキー | Mac `~/.fal_key` / `~/.pinata_key` / `~/.filebase_keys` / `~/.polygonscan_key` | オーナー | 要確認 |
| reconcile.ts 用 DB read-only・RPC | members `docs/.env`（Git 管理外、未読） | オーナー | 要確認 |
| Signer VM の Caddy / Let's Encrypt 証明書 | VM `/etc/caddy/Caddyfile`（自動更新） | — | 自動 |

## 4. 運用カレンダー

| 頻度 | 作業 | 手順書の所在 | 止まったときの影響 |
|---|---|---|---|
| 日次（10:00 前後、15 分） | 日次チェック表 18 項目（サイト・readiness・開封件数・burn 待ち・Signer healthz・POL 残高・IPFS 到達・出庫申請・受信箱） | DAY_OF_RUNBOOK §7.1 | 異常の検知が遅れる。会員の権利（WP DB）は失われない |
| 日次（03:00 頃 cron がバッチ作成 → 自動 dispatch） | **burn dispatch（Phase 2: 自動、2026-09-21〜）**。人の作業は「auto → manual 降格メールが届いたら status → 原因解消 → 手動 dispatch → `enable-auto`」のみ。週次に `burn-mode status` で `mode=auto` を確認 | DAY_OF_RUNBOOK §3.10・§5.2、members `ops/OPERATIONS_LOG.md` §5.1 | TX は 1 件も出ず滞留するだけ（9/9〜14 に 5 日滞留した前例 = I-05、S2）。オンチェーンと正本の不整合が続く。**放置は安全、手動 failed 化は二重 burn の危険** |
| 日次（09:30 cron） | `uni_pack_reveal_daily_verify`（割当整合性 19 項目）。失敗時は通知先へメール | DAY_OF_RUNBOOK §7.1、members KNOWN_ISSUES「Allocation commit 後」 | 不整合の検知が止まる。手動は `wp uni-pack-reveal verify-daily` |
| 日次（02:30 cron ほか） | 資産レコンサイル（コイン / NFT スナップショット、PolygonScan 取得）、監査ログハッシュ検証、ニュース生成 09:00/21:00、IMAP 5 分取り込み | members `docs/01_ARCHITECTURE.md`「Cron」、`ops/CPA_REVIEW_GUIDE.md` §6 | WP-Cron はアクセス駆動で時刻保証なし。ヘルスダッシュボードで次回予定を確認 |
| 日次（要確認: 現状は 9/8 の手動 1 回のみ） | **本番 DB のダンプ取得と Mac 外への保管**（`wp db export` または phpMyAdmin。監査ログ・台帳の INSERT-only 設計のため日次で足りる）。Signer SQLite と VM ディスクのスナップショットも週 1 で取る方針を決める | DAY_OF_RUNBOOK §1.11（9/8 の手順）。**定期化は未**（§8 #15） | DB 喪失時に会員の権利（台帳・保有）を復元できない |
| 週次（火曜締め → 水曜 12:00） | 稼働・インシデント記録の更新（デプロイ回数・burn・開封・出庫・verify・監査ログ件数） | `ops/OPERATIONS_LOG.md` §0（8 手順） | 譲渡評価・監査向けの稼働証跡に空白が出る |
| 週次 | サポート受信箱の未対応確認、Reveal 関連問い合わせ。回答は方針正本に従う | members `docs/14_support_reply_policy.md`、DAY_OF_RUNBOOK §2.3 | 会員対応の遅延 |
| 週次（火曜締め） | オンチェーン残高の突合（Packs custody 残 = 500 − 焼却数、PVM_CUSTODY 残 = 500 − 出庫数）。読み取りは `ops/weekly-ops-readout.sh <週初> <週末>` に集約（burn バッチ・開封・出庫・監査ログ・メール・PHP 版・監査ログ v2 の確認まで 1 回で出る） | DAY_OF_RUNBOOK §7.2、members `ops/OPERATIONS_LOG.md` §0 | 不整合の見逃し |
| 月次 | サポーターズ倶楽部 月次メール（文面更新 → テスト送信 → 送信 → 履歴確認、約 30 分） | `ops/SC_MAIL_MONTHLY_RUNBOOK.md` | 会員への利益還元報告が止まる（差出人は VEGAS BANK 事務局） |
| 月次 | 請求確認: GCP（VM は Always Free、KMS 月 $7.5 前後）、お名前.com、Vercel、ブラストエンジン残通数、Filebase 容量、Ledger 等 | KMS runbook Q-9、§2 の各行 | 支払い停止でサービス停止（Signer VM・DNS・メール） |
| 月次 | 管理画面ヘルスチェック（UNI: 運用 → Healthcheck）を開き NG / WARN を確認。「app log dir writable」が WARN/NG ならログ出力先の設定を直す。`admin-actions.log` が 50 MB 超なら `mv` → `gzip` | members `inc/healthcheck.php`、`ops/DEPLOY_CHECKLIST.md` §5「UNI_LOG_DIR」 | 管理操作のファイルログが黙って失われる（監査ログ DB は別） |
| 月初 | GitHub Actions 枠リセット後に `gh workflow run test.yml --ref main` を実行し結果を記録 | `ops/OPERATIONS_LOG.md` I-04 | CI 未実行のままマージが続く |
| 随時 | 本番デプロイ（main ベース必須、G1〜G4 ゲート、退避 `ops/rollback/`） | `ops/DEPLOY_CHECKLIST.md` §2〜§4、`scripts/deploy-ssh.sh` / `deploy-files.sh` | 誤ったブランチのプラグイン本体で全面ダウン（I-00、9/1） |
| 随時 | 出庫申請の承認・送信（機能フラグ `uni_pack_reveal_withdrawal_enabled`、現在 OFF）。承認・dispatch は人間のみ | DAY_OF_RUNBOOK §4、members `docs/13_pvm_withdrawal.md` | 会員を待たせるが自動送信は無い。**送付先アドレスは 1 文字ずつ照合** |
| 随時 | パック付与（company_reserve から）。usermeta 直接加算は禁止。Pool A/B の取り違え注意 | members KNOWN_ISSUES「Allocation commit 後」、DAY_OF_RUNBOOK §2.1-b | 誤付与（I-02 / I-06 の前例） |
| 随時 | POL 補充: BURNER / PVM_CUSTODY が 1 POL 未満で 5 POL を会社 MetaMask から送金（人間が MetaMask で） | DAY_OF_RUNBOOK §1.8 | burn / 出庫が失敗し `pending_burn` へ戻る（会員影響なし） |
| 随時 | Signer の更新: 旧停止 → 新起動（同時 2 インスタンス禁止） | 02_ONCHAIN §4「v1 の運用制約」 | nonce 重複でウォレット停止 |
| 随時（障害時）／半年に 1 回（リハ） | Signer 障害復旧: L1 サービス再起動 〜 L4 VM 再構築。SQLite を失ったら未決着 attempt をチェーンで決着させてから再開（二重 burn 防止）。復旧リハは drill VM で年 2 回、§7 に記録 | members `ops/SIGNER_RECOVERY_RUNBOOK.md` | burn・出庫が止まる（会員の権利は WP DB に残る）。リハ未実施だと手順書が「使えない紙」になる |
| 随時（Part A は 2026-09-21 完了） | ~~KMS 化 Part A~~ → **Safe 2-of-3 Part B**（2 台目 Ledger 到着後。事前準備は KMS runbook §4.0-b、Sepolia リハ §4.0-c）→ 第三者監査（11 月〜） | KEY_MANAGEMENT_MIGRATION §4、03_TRANSFER_PLAN §3〜§4 | 控除項目 A-2 / A-5 が残る |

## 5. 緊急連絡先と意思決定者（連絡先の値は別紙）

| 役割 | 誰 | 担当 |
|---|---|---|
| 運用担当（PO・実装・レビュー・デプロイ承認・鍵操作・サポート判断） | オーナー（UNI 100% 株主、役員ではない） | 本書のすべての「人間が実行」操作。S1 は即時（深夜含む） |
| 買い手側の意思決定者 | UNI 現代表（別人） | 取得理由書の決裁、承認手続き、見届け役の指名（03 §4.1 策 4） |
| サポート担当 | UNI 側スタッフ（WP `editor` ロールで実運用） | 受信箱対応、初回ログイン案内、会員確認シート |
| 会員データの照会先 | VB / UNI の事務局（サポーターズ倶楽部の差出人 = VEGAS BANK 事務局） | 正規データ・入金状況の確認 |
| 外部: お名前.com サーバー管理、Polygonscan、個人情報保護委員会、GCP サポート | `ops/INCIDENT_RESPONSE.md` §7 | 障害・流出時の窓口 |
| 未定: 税理士（時価確認）、監査会社、会計士（評価書）、弁護士（法務論点、スコープ外） | 03_TRANSFER_PLAN §2.4・§5 | 10〜11 月に選定 |

## 6. runbook 索引（目的別）

| 目的 | 文書 |
|---|---|
| 全体を把握する | 親 `docs/00_OVERVIEW.md` → `01_ARCHITECTURE.md` → `02_ONCHAIN.md`、members `docs/00_OVERVIEW.md` → `01_ARCHITECTURE.md` |
| 現在の確定値（アドレス・CID・BASE_URI・鍵の所在） | members `ops/RELEASE_STATE_20260902.md`、DAY_OF_RUNBOOK §0.3 |
| 日次運用・burn・出庫・緊急停止・不可逆操作 | `ops/DAY_OF_RUNBOOK_20260909.md`（§3 burn、§4 出庫、§5 停止、§5.5 鍵漏洩時の退避（平文版 / KMS 版）、§6 finalize/freeze、§7 日次、§8 記録） |
| リリース全体の不変条件・Phase 2 移行・障害判断 | `ops/RELEASE_RUNBOOK_20260909.md` §0・§7・§9 |
| デプロイ・ロールバック・履歴 | `ops/DEPLOY_CHECKLIST.md`、`scripts/deploy-ssh.sh`、`scripts/deploy-files.sh`、`scripts/local-ci.sh` |
| インシデント初動・カテゴリ別対応・事後手順 | `ops/INCIDENT_RESPONSE.md`（連絡先は §7） |
| 稼働・インシデント記録（週次） | `ops/OPERATIONS_LOG.md` |
| 鍵管理移行（KMS / Safe） | `ops/KEY_MANAGEMENT_MIGRATION.md`（Part A 完了記録 §5.3、Part B 準備 §4.0-b/c、`ops/safe-tx-hash.sh`）、signer `src/accounts/gcpKms.ts` |
| Signer の障害復旧（VM 再構築・SQLite 消失時の整合回復・復旧リハ） | members `ops/SIGNER_RECOVERY_RUNBOOK.md` |
| 封緘バックアップ・復旧テスト | members `ops/SEALED_BACKUP_RUNBOOK.md` |
| サポーターズ倶楽部メール | `ops/SC_MAIL_MONTHLY_RUNBOOK.md`、members `docs/14_support_reply_policy.md`（サポート回答の正本） |
| 出庫仕様・Signer I/F 契約 | members `docs/13_pvm_withdrawal.md`、`docs/12_signer_interface_v1.md`、`docs/schemas/signer-v1/`（正本） |
| 台帳 ⇔ オンチェーン突合（別ホストで実行） | members `docs/10_reconciliation_runbook.md`、`docs/README.md`、`docs/reconcile.ts` |
| 内部統制・監査証跡（CPA 向け） | `ops/CPA_REVIEW_GUIDE.md`、`ops/DEVELOPMENT_POLICY.md` |
| Signer 実装（nonce・idempotency・KMS provider・Receipt Checker） | `pachiverse-signer/README.md` |
| コントラクト仕様・デプロイ記録 | `pachiverse-contracts/README.md`、`DEPLOY_PVM_20260909.md`（§3 実行記録）、`ops/chain-deploy.sh`、`ops/broadcast-polygon/`、`ops/state.polygon.env` |
| アート再生成・IPFS 復旧 | `pvm-art/README.md`、`PIPELINE.md`、`ipfs-restore/RESTORE_RUNBOOK.md`、members `ops/GENERATIVE_ART_GUIDE.md` |
| 公平性の開示・お知らせ原稿 | `ops/FAIRNESS_DISCLOSURE_20260909.md`、`ops/ANNOUNCEMENT_*`、`ops/notices/` |
| メタバース | `pachiverse-world/README.md` → `docs/world/DOCUMENTATION_MAP.md` |
| 譲渡関連 | 親 `docs/03_TRANSFER_PLAN.md`、`04_DEV_EFFORT_EVIDENCE.md`、`05_DEPRECIATION_ITEMS.md`、`06_USAGE_SCALE.md` |
| 譲渡日前後の引き渡し手順（順序・不可逆点・受け取り確認） | 親 `docs/12_TRANSFER_HANDOFF_PROCEDURE.md`（骨子。Part B 後に Safe 行を確定） |
| 既知問題・設計判断 | 親 / members の `KNOWN_ISSUES.md`・`DECISIONS.md` |

## 7. 既知の制約と壊してはいけないもの（要約）

1. **Signer は single-active instance。** 同時 2 インスタンスは nonce 重複・欠番で TX 喪失かウォレット停止。更新は旧停止 → 新起動、SQLite は永続ディスク。
2. **MINTER / PVM_CUSTODY / BURNER の EOA から Signer 以外で TX を送らない**（`cast send` 禁止）。例外は Signer を止めたうえでの鍵漏洩時の退避（DAY_OF_RUNBOOK §5.5）のみ。
3. **PVM_CUSTODY と PACK_CUSTODY は別 EOA のまま。** PACK_CUSTODY（会社 MetaMask）は Safe へ移さない（Signer 起動時の `custody()` 照合が巻き込まれる）。
4. **`finalizeMinting()` / `freezeMetadata()` は実行済み・不可逆。** 以後 mint も baseURI 変更も永久に不可。MINTER_ROLE を付け直しても mint はできない。
5. **`submitted` は成功ではない。** 応答が返らないときは新しい request_id を発行せず同じコマンドを再実行する。`dispatched` / `submitted` のバッチを手動で `failed` にしない（二重 burn）。
6. **stg（stg.members.pachiverse.com）から burn / 出庫を実行しない。** 本番 Signer と本番コントラクトを指しており mainnet の実 TX になる。
7. **`payload_hash` の実装（PHP / TS）と `signer-v1` スキーマ（正本は members）を片側だけ変えない。** 再送が 409 になる。
8. **Reveal は fail-closed。** `release_readiness` が ready でなければ開かない。止める手段は `uni_pack_reveal_enabled 0` のみで、強行する override は作らない。
9. **commit-allocation 後に pack usermeta を直接増やさない。** 付与は company_reserve 経由のみ。reserve へ手作業で戻す行は `pack_assignment_key` も reserve 形式に。
10. **本番デプロイ物は必ず main ベース。** `uni-member-mypage.php` を別ブランチ版で上げると本番に無い `inc/*.php` を require して全面ダウン（9/1 の前例）。
11. **コイン台帳・監査ログは INSERT のみ。** DB 移行・復元後は InnoDB であることを確認（非 InnoDB は無ロック経路へ黙ってフォールバック）。
12. **レアリティ配分（R270/SR120/SSR60/SSSR30/UR15/LEGEND5）・trait 順・4096/webp は変更不可。** Artwork Commitment で sha256 凍結済み。
13. **秘密鍵・API キー・HMAC 鍵をコミット・チャット・ログに出さない。** 本番の平文 `PRIVATE_KEY` は KMS 化までの暫定。
14. **PV Coin は金銭的価値を持たない内部通貨。member_code が正キーで email 照合禁止。** 「投資」「配当」等の表現をコード・UI・サポート回答に使わない。
15. `pachiverse-contracts` と `pachiverse-signer` は隣接配置が前提（ABI 同期が相対パス）。`traits.yaml` は親 `assets/logo-square.png` を絶対パス参照。

## 8. 未確認事項（名義・所在が分からなかったもの）

**譲渡ブロッカー（先に解消する順）**: (1) #7 会社 MetaMask のシードの保管場所と、Owner's Pass ERC721・旧 ERC1155 の owner EOA の所在 → (2) #3 GCP プロジェクト（KMS 鍵の置き場所）と #1 GitHub org（IP 帰属の証跡）の所有者 → (3) #2 ドメイン登録者名義 → (4) #10 復旧コードの所在。**再契約で足りるもの**: #4〜#6・#9・#11（各サービスは UNI 側で新規契約し差し替え可能）。

1. ~~GitHub org の所有者~~ **確認済み（2026-09-15）: `pachiverse01-ai` org と `ishikawar2-dev` はいずれもオーナー個人の所有。** 譲渡時に org を UNI の GitHub アカウントへ transfer する（残: `ishikawar2-dev/pachiverse` の可視性）。
2. ~~ドメインの登録者名義~~ **確認済み（2026-09-15）: `pachiverse.com` / `vegasbank-nft.com` は UNI 名義で登録済み。名義変更は不要。** 残: サーバー契約（お名前.com 共用サーバー）の名義と `vegasbank-nft.com` の DNS 管理場所。
3. ~~GCP の所有者~~ **確認済み（2026-09-15）: GCP プロジェクト `pachiverse-signer` はオーナー個人の所有。** 譲渡時に UNI の請求先アカウントへプロジェクトを移す（KMS 鍵はプロジェクトに紐づくため、移管で鍵ごと引き渡せる）。残: 組織 `pachiverse01-org` の扱いと、プロジェクトオーナーの 2 名化。
4. Vercel（Hobby）、Vercel Redis / Upstash、Cloudflare（R2）の契約名義。R2 はオーナー個人アカウントだが会社化の要否。
5. Filebase・Pinata（「YU's Workspace」の所有者）・fal.ai・Etherscan・RPC 事業者・OpenAI・Anthropic・Google Sheets の各アカウント名義と、譲渡可能か再契約か。
6. ブラストエンジンの契約名義・プラン・残通数、WP Mail SMTP の設定内容（本番のみに存在しリポジトリに無い）。本番のメール送信経路の正確な構成（members KNOWN_ISSUES 未確認 2）。
7. **会社 MetaMask（`0x502cef…`）のシード: 保管場所は不明（オーナー回答 2026-09-15）。オーナーは MetaMask にログインできる。** 鍵はブラウザの MetaMask 拡張と Mac の Foundry keystore `deployer` の 2 箇所にしか存在しないため、**封緘バックアップの最優先項目**（members `ops/SEALED_BACKUP_RUNBOOK.md` §2-1）。
   **Owner's Pass ERC721 の owner 鍵: 存在しない（外部に作成を委託し、仕様も不明。オーナー回答 2026-09-15）。** コントラクトの管理操作は今後も不可能。**2026-09-15 決定: Owner's Pass は会員証 NFT として維持（失効宣言はしない）。OT の枚数はオンチェーン発行せず台帳の権利単位とし、名称から NFT を外す**（[DECISIONS.md](DECISIONS.md)、PR #39）。仕様確認済み（2026-09-15、05 K）。残: Polygonscan の検証状態（API キー要）、画像 CID の再ピン（オーナー実行、`pvm-art/ipfs-restore/RESTORE_RUNBOOK.md` の手順で Filebase へ）。旧 ERC1155 3 契約の owner も同様に要確認。
8. `wp-config-secrets.php` に本番で実際に定義されている定数の一覧（`UNI_BLASTENGINE_WEBHOOK_TOKEN` の設定有無を含む）。
9. Support 用メールボックス（`support@pachiverse.com`、`customer@vegasbank-nft.com`）のホスティング先と名義。
10. 主要アカウント（GitHub / Vercel / GCP / Cloudflare / OpenSea / お名前.com）の復旧コードの所在（封緘は未実施）。
11. OpenSea プロフィール `PachiverseFoundation` のアカウント名義と、コレクション編集権の取得状況。
12. PVM 原本 10GB・WEBP 約 600MB の別置きバックアップの有無（未実施の見込み）、旧 NFT バックアップ `Pachiverse_NFT_mint _backup/` の保全先。
13. Indexer の位置づけ（Signer 内蔵 Receipt Checker で代替済みだが、親 KNOWN_ISSUES の記述は未更新）。
14. 契約関連: 譲渡後の保守委託契約（03 §4.1 策 5）、見届け役（策 4）の指名、税理士・監査会社・会計士の選定。
15. 本番 DB・Signer SQLite・VM ディスクの定期バックアップの有無と保管先（現状は 9/8 の手動ダンプ 1 回のみ確認）。
16. OSS ライセンス一覧（WordPress GPL 派生の扱い、Three.js / Rapier / OpenZeppelin 等）と、月額ランニングコストの金額（DD 資料として要追加）。
