# 14_TRANSFER_MATERIALS_INDEX — 譲渡資料インデックス（所在一覧・初稿）

作成日: 2026-09-24（初稿・売り手作成）　位置づけ: [03_TRANSFER_PLAN.md](03_TRANSFER_PLAN.md) フェーズ H「工数表 v1.2＋譲渡資料インデックス」の後半

## 1. 目的と読み方

- **目的**: 譲渡の関係者が「どの資料が・どこにあり・誰向けで・いまどの状態か」を 1 枚で引けるようにする。資料の中身は要約しない（各資料を開く）。
- **重複させないもの**: 資産の名義と引き渡し手続きは [07_HANDOVER_KIT.md](07_HANDOVER_KIT.md) §2（資産目録）、認証情報の所在は同 §3、runbook の目的別索引は同 §6。本書はそれらを資料として 1 行で指すだけで、資産や認証情報の行は写さない。
- **読者**: 「評価人」＝無形資産評価書を作る会計士・税理士。「監査/DD」＝第三者セキュリティ監査の会社と、買い手側のデューデリジェンス。「UNI 運用」＝譲渡後の UNI（見届け役は高橋代表、DECISIONS 2026-09-24 U-8）。
- **用途**: 「時価根拠」（評価書の根拠）／「DD」（事実確認・開示）／「監査」（第三者監査の提供資料・証跡）／「運用引継ぎ」（譲渡後の運用再開）。
- **所在の書き方**: 「親」＝ `~/Developer/pachiverse`（GitHub `ishikawar2-dev/pachiverse`）、「members」＝ `members.pachiverse.com/`（GitHub `pachiverse01-ai/pachiverse-members`）。**Git 外**＝どのリポジトリにも入っておらず、オーナーの Mac 上でだけ存在を確認したもの。
- **状態と日付**: 確定／草案（初稿・骨子・ドラフトを含む）／作成予定。日付は Git の最終コミット日、Git 外はファイルの更新日（いずれも 2026-09-24 に取得）。
- **表現の前提**: IP は石川に帰属し、本件一式は「石川が企画した」と表記する（DECISIONS 2026-09-24 F-4・F-5）。Owner's Pass ERC721 は UNI の資産で譲渡対象外（F-3）。会員 DB は UNI/VB の顧客データで譲渡対象外（U-10）。
- **書かないもの**: 秘密の値（鍵・パスワード・API キー）と会員の個人情報。個人情報を含むローカルファイル（正規データ・質疑応答一覧など）は本書に載せない（07 §2「データ」行）。
- **第三者に渡すとき**: 07 は §3 と §2 のホスト名等を別紙にした版、08 は §9 を外した版を渡す（各書の冒頭の規定）。本書も「所在」列にオーナーの Mac 上のパスを含むため、第三者版では所在列を別紙に分ける（§3 #11 に含める。オーナー未確認）。第三者版はまだ無い。

## 2. 資料一覧

### 2.1 評価・価格

| 資料名 | 所在 | 用途 | 主な読者 | 状態・最終更新日 | 備考 |
|---|---|---|---|---|---|
| 開発工数表 v1.2（原価法） | 親直下 `Pachiverse_開発工数表_v1.2_2026-09-15_draft.md`（**Git 外**） | 時価根拠 | 評価人 | 草案・2026-09-24 | 数式の修正点は 03 §2.2。10 月に確定し、12 月に OT カードの工程を追加（03 §3）。確定版は §3 #2 |
| 実装規模の証跡 | 親 `docs/04_DEV_EFFORT_EVIDENCE.md`（生成: `scripts/dev_effort_evidence.sh`） | 時価根拠・DD | 評価人・監査/DD | 確定（再生成可）・2026-09-24 | 工数表 v1.2 の付録。規模の証跡で、工数の証跡ではない。§8 に企画着手（2026-01-22）からの時系列 |
| 陳腐化減価の控除項目メモ | 親 `docs/05_DEPRECIATION_ITEMS.md` | 時価根拠・DD | 評価人・監査/DD | 草案（初稿）・2026-09-24 | 係数は書かず控除項目を積み上げる。§2b に開示事項（K: Owner's Pass の文言など） |
| 利用規模 3 段 | 親 `docs/06_USAGE_SCALE.md`（生成: `scripts/usage_scale.py`） | 時価根拠 | 評価人 | 確定（基準時刻 2026-09-13）・2026-09-15 | 稼働の証拠。売上・顧客基盤の価値には使わない。入力 JSON の所在は未確認 |
| UNI 側の取得理由書 | 親 `docs/13_UNI_ACQUISITION_RATIONALE.md` | 時価根拠・DD | 評価人・UNI 運用 | 草案（初稿）・2026-09-24 | 代表決裁の添付（U-6）。代表が内容確認済み（2026-09-24）。金額は評価書の受領後。§10 に添付資料一覧 |
| 譲渡評価と計画 | 親 `docs/03_TRANSFER_PLAN.md` | 時価根拠 | 評価人 | 草案（随時更新）・2026-09-24 | §2.4 が時価の根拠の構成。本書はフェーズ H の成果物 |
| 設計判断の記録（譲渡関連） | 親 `docs/DECISIONS.md`（2026-09-15 の譲渡枠組み・時価根拠・範囲の各エントリ、2026-09-24 の 3 件） | 時価根拠・DD | 評価人・監査/DD | 確定・2026-09-24 | 評価手法の固定（09-15）、U-1〜U-15・F-1〜F-5・O-1〜O-8（09-24） |

### 2.2 引き渡し・契約

| 資料名 | 所在 | 用途 | 主な読者 | 状態・最終更新日 | 備考 |
|---|---|---|---|---|---|
| 引き継ぎパッケージ | 親 `docs/07_HANDOVER_KIT.md` | 運用引継ぎ・DD | UNI 運用・監査/DD | 草案（初稿）・2026-09-24 | §2 資産目録・§3 認証情報の所在・§4 運用カレンダー・§6 runbook 索引・§8 未確認事項。private 運用版 |
| 保守・引継ぎ期間の条件案 | 親 `docs/09_MAINTENANCE_HANDOVER_TERMS.md` | 運用引継ぎ・DD | UNI 運用・評価人 | 草案（初稿）・2026-09-24 | 契約書ではない。無償 12 ヶ月は譲渡翌月から（U-3）。§8 に IP・成果物の帰属 |
| 権限移転・引き渡し手順書 | 親 `docs/12_TRANSFER_HANDOFF_PROCEDURE.md` | 運用引継ぎ | UNI 運用 | 草案（骨子・オーナー未確認）・2026-09-24 | Safe 2-of-3（Part B）の完了後に §3 の Safe 行を確定（§3 #14） |
| インフラの現状と移行案 | 親 `docs/11_INFRA_MIGRATION.md` | 運用引継ぎ・監査 | UNI 運用・監査/DD | 草案（初稿）・2026-09-24 | 第三者配布版の方針（ホスト名・IP を書かない）で作成済み。移設の実施は買い手判断 |
| 会員データの個人情報保護法上の整理メモ | 親 `docs/10_PII_TRANSFER_MEMO.md` | DD | 監査/DD | 草案（初稿・弁護士確認前）・2026-09-24 | U-10 で会員 DB は譲渡対象外・通知不要に変更。§5 の弁護士確認論点は残る |
| 監査スコープ書（見積依頼用） | 親 `docs/08_AUDIT_SCOPE.md` | 監査 | 監査/DD | 草案（初稿・要確認あり）・2026-09-24 | §5 が監査会社への提供資料一覧。第三者版は §9 を外す |

### 2.3 運用・技術（runbook）

目的別の索引は 07 §6 が正本。ここには譲渡資料として参照される主要なものだけを載せる。

| 資料名 | 所在 | 用途 | 主な読者 | 状態・最終更新日 | 備考 |
|---|---|---|---|---|---|
| 全体像（概要・構成・オンチェーン） | 親 `docs/00_OVERVIEW.md`・`01_ARCHITECTURE.md`・`02_ONCHAIN.md`、members `docs/00_OVERVIEW.md`・`01_ARCHITECTURE.md` | 運用引継ぎ・監査 | UNI 運用・監査/DD | 確定・2026-09-01〜09-21 | 読む順は 07 §6「全体を把握する」 |
| 確定値の正本（アドレス・CID・鍵の所在） | members `ops/RELEASE_STATE_20260902.md` | 運用引継ぎ・監査 | UNI 運用・監査/DD | 確定・2026-09-16 | 07 と食い違えばこちらが優先（07 §1） |
| 日次運用・burn・出庫・緊急停止 | members `ops/DAY_OF_RUNBOOK_20260909.md`、`ops/RELEASE_RUNBOOK_20260909.md` | 運用引継ぎ | UNI 運用 | 確定・2026-09-24 / 2026-09-02 | 日次チェック・§5.5 鍵漏洩時の退避 |
| デプロイ手順とリリース履歴 | members `ops/DEPLOY_CHECKLIST.md`、`ops/rollback/` | 運用引継ぎ・監査 | UNI 運用・監査/DD | 確定・2026-09-22 | 本番デプロイは main ベース必須。§6 がリリース履歴 |
| インシデント対応 | members `ops/INCIDENT_RESPONSE.md` | 運用引継ぎ・監査 | UNI 運用・監査/DD | 確定・2026-09-21 | 外部連絡先は §7 |
| 鍵管理移行（KMS / Safe） | members `ops/KEY_MANAGEMENT_MIGRATION.md` | 運用引継ぎ・監査 | UNI 運用・監査/DD | Part A 完了・Part B 未実施・2026-09-24 | §5.3 に Part A の実行記録。Part B は U-9・U-14 の構成で書き直し済み |
| 封緘バックアップと復旧テスト | members `ops/SEALED_BACKUP_RUNBOOK.md` | 運用引継ぎ | UNI 運用 | 草案（復旧テスト未実施）・2026-09-24 | 秘密の値は書かない。§3.3 が UNI 側 Ledger の初期化手順 |
| Signer 障害復旧 | members `ops/SIGNER_RECOVERY_RUNBOOK.md` | 運用引継ぎ・監査 | UNI 運用・監査/DD | 草案（リハーサル未実施）・2026-09-21 | リハーサル記録欄は §7 |
| 外部死活監視の導入手順 | members `ops/EXTERNAL_UPTIME_MONITORING.md` | 運用引継ぎ | UNI 運用 | 草案（手順のみ・未導入）・2026-09-21 | 導入後の稼働率は OPERATIONS_LOG §3 へ |
| OT カード移行 runbook | members `ops/OT_MIGRATION_RUNBOOK.md` | 運用引継ぎ | UNI 運用 | 草案（値は空欄）・2026-09-22 | 実施日はオーナー判断。設計は §2.5 の 17 |
| 月次メール・サポート回答方針 | members `ops/SC_MAIL_MONTHLY_RUNBOOK.md`、`docs/14_support_reply_policy.md` | 運用引継ぎ | UNI 運用 | 確定・2026-09-01 / 2026-09-15 | 14 がサポート回答の正本 |
| Signer I/F・出庫仕様・突合 | members `docs/12_signer_interface_v1.md`・`docs/schemas/signer-v1/`・`13_pvm_withdrawal.md`・`10_reconciliation_runbook.md` | 運用引継ぎ・監査 | UNI 運用・監査/DD | 確定・2026-09-02〜09-15 | schemas が signer-v1 契約の正本 |
| 既知問題・技術的負債 | 親 `docs/KNOWN_ISSUES.md`、members `docs/KNOWN_ISSUES.md` | DD・監査 | 監査/DD | 随時更新・2026-09-21 / 2026-09-22 | 05 §3.7（残存する既知問題）の出典 |
| 機体画像の R2 移設 runbook | 親 `docs/R2_MACHINE_ASSETS_MIGRATION.md` | 運用引継ぎ | UNI 運用 | 確定（実施済み）・2026-09-15 | UNI の Cloudflare へ移すときの手順の元になる（07 §2） |

### 2.4 稼働・監査の証跡

| 資料名 | 所在 | 用途 | 主な読者 | 状態・最終更新日 | 備考 |
|---|---|---|---|---|---|
| 稼働・インシデント記録 | members `ops/OPERATIONS_LOG.md` | 監査・時価根拠・DD | 評価人・監査/DD | 週次更新中・2026-09-24 | 9/9 Reveal 以降を記録（遡及記入を含む）。§5.3 に不可逆操作の tx hash。読み取りは `ops/weekly-ops-readout.sh` |
| 内部統制の地図（CPA 向け） | members `ops/CPA_REVIEW_GUIDE.md` | 監査・DD | 監査/DD・評価人 | 確定・2026-09-21 | 本文の「最終更新」表記は 2026-06-02 のまま。§8 に未着手項目 |
| 開発ポリシー | members `ops/DEVELOPMENT_POLICY.md` | 監査・DD | 監査/DD | 確定・2026-09-21 | 本文の「最終更新」表記は 2026-06-01 のまま |
| CI・テストの実行記録 | GitHub Actions（members `test.yml`）、集計は親 `docs/04_DEV_EFFORT_EVIDENCE.md` §5〜§6 | 監査・時価根拠 | 監査/DD・評価人 | 継続・2026-09-24 | 無料枠超過時はローカル同等検証を PR コメントに記録する運用 |
| 監査ログ（SHA256 ハッシュチェーン） | 本番 WordPress DB `wp_uni_audit_log`（リポジトリ外） | 監査 | 監査/DD | 稼働中 | DB は譲渡対象外（U-10）。提供は会員 PII 列をマスクしたエクスポート（08 §5） |
| 公平性の開示と manifest | members `ops/FAIRNESS_DISCLOSURE_20260909.md`、親 `transparency/`（`allocation-manifest.json`・`artwork-manifest.json`）・`transparency.html` | DD・監査 | 監査/DD | 確定・2026-09-15 / 2026-09-21 | レアリティ配分・trait 順の凍結の証跡 |
| OT カードの anvil リハーサル結果 | `pachiverse-contracts/ops/ot-rehearsal-result-2026-09-16.md` | 監査 | 監査/DD | 確定・2026-09-16 | 追加監査（08 §3.4）の前提資料 |

### 2.5 資産（コード・アート・チェーン）

名義・引き渡し手続きは 07 §2 を見る。ここでは資料としての入口だけを示す。

| 資料名 | 所在 | 用途 | 主な読者 | 状態・最終更新日 | 備考 |
|---|---|---|---|---|---|
| 公開サイト＋購読 API | 親リポジトリ（GitHub `ishikawar2-dev/pachiverse`） | DD・運用引継ぎ | 監査/DD・UNI 運用 | 稼働中・2026-09-24 | 公開・非公開の別は要確認（07 §8 #1） |
| 会員システム（WordPress＋`uni_memberpage`） | members（GitHub `pachiverse01-ai/pachiverse-members`、private） | DD・監査・運用引継ぎ | 全読者 | 稼働中・2026-09-24 | 入口は members `docs/00_OVERVIEW.md` |
| スマートコントラクト | `pachiverse-contracts`（GitHub `pachiverse01-ai/pachiverse-contracts`）、`DEPLOY_PVM_20260909.md`、`DEPLOY_OT_PREP.md` | DD・監査 | 監査/DD | 稼働中・2026-09-22 | README 冒頭「Foundry / Solidity 0.8.24 / OpenZeppelin v5」。OT カードは mainnet 未デプロイ |
| 署名基盤 Signer | `pachiverse-signer`（GitHub `pachiverse01-ai/pachiverse-signer`） | DD・監査・運用引継ぎ | 監査/DD・UNI 運用 | 稼働中・2026-09-17 | README 冒頭「鍵を持つのはここだけ」。鍵は Cloud KMS（07 §3） |
| NFT アート生成パイプライン | `pvm-art`（GitHub `pachiverse01-ai/pvm-art`）、`PIPELINE.md`・`INVENTORY_2026-09-05.md`・`ipfs-restore/RESTORE_RUNBOOK.md` | DD・運用引継ぎ | 監査/DD・UNI 運用 | 確定・2026-09-15 | sha256 マニフェスト `out/MANIFEST_*.sha256` と CID 記録は Git 管理 |
| PVM 500 体の原本画像（4096 PNG 約 10GB）・WEBP | `pvm-art/out/images4096/`・`out/webp/`（**Git 外**） | DD・運用引継ぎ | UNI 運用 | 確定（別置きバックアップ未） | 引き渡し前にマニフェストで照合（07 §2、§8 #12） |
| メタバース World Foundation v1.3.1 | `pachiverse-world`（GitHub `pachiverse01-ai/pachiverse-world-foundation`）、`VALIDATION_STATUS_v1.3.1.md`、`docs/world/DOCUMENTATION_MAP.md` | DD・時価根拠 | 評価人・監査/DD | 草案（グレーボックス段階）・2026-09-11 | G1・P1-10 未了（05 J）。2027 年 2 月リリース予定（O-4） |
| OT カード設計書 v0.3 | members `docs/17_owner_ticket_card_spec.md` | DD・監査 | 監査/DD・評価人 | 草案（実装は 3d-2c まで）・2026-09-22 | 取得対象に含める（O-3）。評価基準日までに未完成の部分は評価外 |
| Owner's Pass「正本ではない」宣言の準備書 | members `docs/18_owners_pass_declaration_prep.md` | DD | 監査/DD | 草案（オーナー・法務未確認）・2026-09-22 | Owner's Pass は UNI の資産で譲渡対象外（F-3）。利益分配の文言は 05 K の開示事項 |
| オンチェーン資産（PVM・PVPACK ほか） | Polygon（アドレスの正本は members `ops/RELEASE_STATE_20260902.md` §1、一覧は 07 §2） | DD・監査 | 監査/DD | finalize・freeze 済み | 公開情報。Polygonscan Verified |
| Genaverse マーケットプレイス設計書（未実装） | members `docs/00_README_FOR_CLAUDE_CODE.md`〜`07_open_questions.md` | DD | 監査/DD | 草案（設計のみ）・2026-05-29 ほか | 実装範囲外（親 00 重要な制約 9） |

### 2.6 Git 管理外の原資料

| 資料名 | 所在 | 用途 | 主な読者 | 状態・最終更新日 | 備考 |
|---|---|---|---|---|---|
| 要件定義書 v1.0 | 親直下 `Pachiverse_要件定義書_v1.0_2026-07-07.docx`（**Git 外**。`.gitignore` の `*.docx`） | DD | 監査/DD・評価人 | 確定・2026-07-07 | 会員システムの as-built 要件（親 00「このリポジトリ外の資料」） |
| 開発工数表 v1.0 | 親直下 `Pachiverse_開発工数表_v1.0_2026-07-07.docx`（**Git 外**） | 時価根拠 | 評価人 | 確定（旧版）・2026-07-07 | 工程別工数・実装規模の計測値 |
| 開発工数表 v1.1 | 親直下 `Pachiverse_開発工数表_v1.1_2026-09-07.md`・同 `.docx`（**Git 外**） | 時価根拠 | 評価人 | 確定（旧版）・2026-09-07 | 05 の金額の出典（第 7 章・付録 B）。メタバースは対象外の版 |
| 2026-09-07 内部全面レビュー報告書 | `~/Downloads/members-review-2026-09-07.html`（**Git 外**） | 監査・DD | 監査/DD | 確定（本文 2026-09-07、末尾 §11 に対応状況を付記 2026-09-24） | §0 の 10 件は 9 件解消・#3（editor ロール）保留。正本は members `docs/KNOWN_ISSUES.md` の対応表。重複指摘を避けるため監査会社へ提供 |
| ヒアリング項目メモ | `~/Downloads/ヒアリング項目_会計士税理士_UNI現代表_2026-09-15.txt`（**Git 外**） | 時価根拠・DD | 評価人 | (1) 会計士・税理士分は質問票（未実施）、(2) UNI 現代表分は回答済み・2026-09-24 | 決定内容の正本は DECISIONS 2026-09-24 |
| 旧 NFT 14 種の原本 | 親直下 `Pachiverse_NFT_mint _backup/`（**Git 外**。削除禁止） | 運用引継ぎ・DD | UNI 運用 | 確定 | IPFS 復旧材料。Owner's Pass の画像原本も含むが、Owner's Pass 自体は UNI の資産（F-3） |

## 3. 未作成・作成予定の資料

| # | 資料名 | 用途 | 主な読者 | 作成者 | 予定時期 | 根拠・備考 |
|---|---|---|---|---|---|---|
| 1 | 同等システムの外注見積（2〜3 社、依頼書と回答） | 時価根拠 | 評価人 | 外注業者（依頼は石川） | 10 月 | 03 §2.4、13 §10 #2。再調達原価の第三者裏付け |
| 2 | 開発工数表 v1.2 確定版 | 時価根拠 | 評価人 | 石川 | 10 月（OT カード工程の追加は 12 月） | 03 §2.2・§3。確定後に §2.1 の行を差し替える |
| 3 | 会計士・税理士の事前ヒアリング記録 | 時価根拠 | 評価人 | 石川 | 10 月 | 03 §2.4 の確認事項、U-2・O-2 の税務論点（13 未確定事項 #3） |
| 4 | UNI 会計の入金明細（2025/11〜） | 時価根拠 | 評価人 | UNI 会計 | 評価人の求めに応じて | U-7 で提供に同意。売上時系列表は作らない（03 §2.4.1） |
| 5 | 第三者セキュリティ監査レポート（既存範囲）と是正記録 | 監査・時価根拠 | 評価人・監査/DD | 監査会社 | 11 月開始、12 月〜受領 | 08。受領次第評価人へ追送（03 §2.4） |
| 6 | OT カードの追加監査レポート | 監査 | 監査/DD | 監査会社 | 12 月 | 08 §3.4（別見積） |
| 7 | 会計士・税理士による無形資産評価書 | 時価根拠 | 評価人・UNI 運用 | 会計士・税理士 | 12 月中に受領（U-13） | 原価法＋陳腐化減価。取得価額は評価額と同額（O-2） |
| 8 | 知的財産権譲渡契約書・相殺合意書・貸付残高確認書 | DD | UNI 運用 | 未定 | 評価書の受領前 | 13 §10 #9、U-2・U-5・O-6 |
| 9 | IP 帰属の証跡（委託分の権利帰属を示す資料を含む） | DD | 評価人・監査/DD | 石川 | 未定 | 03 §1、フェーズ A、F-5。時系列は 04 §8 に一部あり |
| 10 | OSS ライセンス一覧・月額ランニングコスト | DD | 監査/DD・UNI 運用 | 石川 | 未定 | 07 §8 #16 |
| 11 | 第三者配布版（07 の §3 等を別紙化、08 の §9 を除外） | DD・監査 | 監査/DD・評価人 | 石川 | 監査発注前 | 07 §1、08 冒頭 |
| 12 | 封緘バックアップの復旧テスト記録 | 運用引継ぎ・DD | UNI 運用・評価人 | 石川（Ledger 分は UNI） | Part B と同時 | 03 §4.1 策 2、SEALED_BACKUP_RUNBOOK |
| 13 | Signer 復旧リハーサル記録・外部死活監視の稼働率 | 運用引継ぎ・監査 | UNI 運用・監査/DD | 石川 | 未定 | SIGNER_RECOVERY_RUNBOOK §7、EXTERNAL_UPTIME_MONITORING |
| 14 | 引き渡し手順書の確定版 | 運用引継ぎ | UNI 運用 | 石川 | Part B 完了後・契約日確定後 | 12 冒頭 |
| 15 | 法務意見書 | DD | UNI 運用 | UNI が取得 | 譲渡後 | U-11。本件の譲渡資料には含めない（03 §1 でスコープ外） |

## 4. 本書の更新ルール

- 07 §1 と同じく、週次の稼働記録更新（members `ops/OPERATIONS_LOG.md` §0、毎週水曜 12:00 まで）のタイミングで §2 の状態と最終更新日を見直す。
- 資料を追加したら該当する節の表に 1 行追加する。§3 の資料ができたら §3 から消し、§2 に行を移す。
- 所在が変わったら（Git 化・別置きバックアップ・第三者版の作成など）同じ日に本書を直す。
