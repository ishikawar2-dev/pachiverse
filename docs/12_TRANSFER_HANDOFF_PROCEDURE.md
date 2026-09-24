# 権限移転・譲渡時の引き渡し手順書（骨子）

作成: 2026-09-21　状態: **骨子・オーナー未確認**。Safe 2-of-3（Part B）の完成前に書ける部分だけを書く。
Part B 完了後に §3 の Safe 行を確定値で埋め、譲渡契約の締結時期が決まったら §1 の日付を入れて版を上げる。

- 何の文書か: 譲渡日の前後に **誰が・どの順番で・何を渡し・何で確認するか** を 1 枚にしたもの。
  資産の一覧は `07_HANDOVER_KIT.md`（何があるか）、契約条件は `09_MAINTENANCE_HANDOVER_TERMS.md`（どう続けるか）、
  サーバー移設は `11_INFRA_MIGRATION.md`（どこへ動かすか）に既にあるので、本書はそれらを**順序と不可逆点**で束ねる。
- 前提: 運用担当は 1 名（03 §4.1）。UNI 側に「見届け役」を置く（策 4）。譲渡後もオーナーが保守を受託する（策 5、09）。

---

## 0. 原則

1. **不可逆な操作は 1 日に 1 つ**。前の操作の確認が終わるまで次に進まない（Pack Reveal 公開日・KMS 移行と同じ運び方）
2. **渡す前に、渡す側で「使える」ことを確認し、渡した後に、受け取る側で「使える」ことを確認する**（封緘バックアップの復旧テストと同じ）
3. **権限は「追加 → 動作確認 → 旧権限の削除」の 3 段**。一気に付け替えない
4. 秘密の値（鍵・パスワード・シード・HMAC）は文書に書かない。所在と、誰が持ったかだけを書く
5. すべての引き渡し操作は `ops/OPERATIONS_LOG.md` §5.3（不可逆操作）に日時・実施者・確認者・根拠（tx hash / 設定画面の記録）を残す

## 1. タイムライン（案。日付は契約で確定）

| 時期 | 段階 | 内容 | 不可逆か |
|---|---|---|---|
| T-30 日〜 | 準備 | 07 §8 の未確認事項（名義・所在）を全部解消。UNI 側の受け取りアカウント（GitHub org 管理者・GCP・Vercel・お名前.com・Cloudflare・Filebase・ブラストエンジン）を作成 | — |
| T-14 日 | 見届け役 | UNI 側の見届け役に **閲覧権限** を付与（GitHub read、GCP Viewer、Safe の閲覧、`ops/OPERATIONS_LOG.md`）。週次記録を一緒に 1 回読む | — |
| T-7 日 | リハーサル | §4 の受け取り確認を UNI 側が **stg と drill VM** で一度通す（Signer 復旧リハ `ops/SIGNER_RECOVERY_RUNBOOK.md` §7 と同時にやると 1 回で済む） | — |
| T-1 日 | 凍結 | デプロイ凍結・会員向けお知らせ（必要なら「メンテナンス」ではなく「運営体制変更」の告知）。本番 DB・Signer SQLite・VM のバックアップを取り、ハッシュを記録 | — |
| **T（譲渡日）** | 契約・IP | 契約締結。IP 移転（09 §8）。コードは GitHub org の所有権移転（§3-1） | 契約は不可逆 |
| T | 権限の追加 | §3 の各行の「UNI 側を追加」を実行（削除はまだしない） | — |
| T+1〜T+3 | 受け取り確認 | §4 を UNI 側運用者（または見届け役）が実施。全部 OK になるまで旧権限を消さない | — |
| T+3 | **オンチェーン権限** | Safe の署名者構成は変えない（Ledger A / B は最初から UNI 管理。DECISIONS 2026-09-24 U-9）。**会社 MetaMask のシード封緘物を UNI へ引き渡し**、UNI 側端末で復元してアドレス一致を確認（09 §7）。ADMIN 移転済みが前提（Part B） | 鍵の物理移動 |
| T+7 | 旧権限の削除（第 1 弾） | オーナー個人アカウントの WP 管理者・SSH/FTPS・GCP オーナーを削除し、保守用の別アカウント（限定権限）に切替（09 §7「保守期間中」） | 削除は戻せるが記録する |
| 保守期間中 | 並走 | 09 §2〜§6 のとおり（運用は石川が継続、12 ヶ月無償の後は自動更新）。月次で見届け役と状況共有 | — |
| 契約終了（自動更新が止まったとき。旧「保守満了」） | 旧権限の削除（第 2 弾） | Safe の署名者 1（会社 MetaMask。シードが石川の手を経ている）を UNI が新規生成した鍵へ `swapOwner`（Safe 上の TX、2 署名）し、石川側の MetaMask 拡張・Foundry keystore `deployer` から当該アカウントを削除（**不可逆**）。オーナー保有の紙バックアップ（R-1）を UNI 側に渡し、再導出で一致確認のうえオーナー側の写しは廃棄（廃棄を両者で確認） | **不可逆** |

## 2. 引き渡すものの順序（依存関係）

```
契約・IP（T）
  └ コード（GitHub org 所有権）
      └ 実行基盤の権限（WP / SSH / GCP / Vercel / Cloudflare / Filebase / ブラストエンジン / お名前.com）
          └ 認証情報の所在（07 §3 の各行。値ではなく「誰が持つか」）
              └ オンチェーン権限（Safe 署名者・PACK_CUSTODY の会社 MetaMask）
                  └ 紙バックアップ（PVM_CUSTODY R-1）と復旧コード
```

上から下へ。**下ほど不可逆**なので後にする。オンチェーン権限は「Safe の署名者構成」で移転し、EOA の秘密鍵そのものは渡さない
（KMS 鍵は GCP プロジェクトごと渡す。`KEY_MANAGEMENT_MIGRATION.md` §4）。

## 3. 権限移転表（07 §2・§3 と 09 §7 を「手順」に落としたもの）

| # | 対象 | 追加（T） | 確認（T+1〜3、§4 の #） | 削除（T+7 / 満了） | 不可逆点 |
|---|---|---|---|---|---|
| 1 | GitHub org `pachiverse01-ai`（members・pvm-art・world-foundation）と `ishikawar2-dev/pachiverse` | UNI の GitHub アカウントを org Owner に追加。ルートリポは org へ移管（transfer） | #1 | オーナーを Owner → Member（保守用）。満了で除外 | transfer は戻せる（30 日以内） |
| 2 | 会員サイト WP（本番・stg） | UNI 側運用者に `administrator` を作成（本名メタ・2FA） | #2 | オーナーの管理者を削除。editor（サポート）は継続 | — |
| 3 | お名前.com（サーバー契約・SSH/FTPS・DNS） | 契約名義の変更手続き（UNI 名義。ドメインは UNI 名義済み）。SSH 公開鍵を UNI 側の鍵に追加 | #3 | オーナーの公開鍵を `authorized_keys` から削除、FTPS パスワードを変更 | 契約名義変更は事業者手続き |
| 4 | GCP `pachiverse-signer`（VM・KMS・監査ログ） | UNI のアカウントをプロジェクト Owner に追加、**請求先を UNI へ**。VM の SA・KMS IAM は変更不要 | #4 | オーナー 2 アカウントを Owner から外す（保守用に Viewer + 必要最小の役割） | 請求先変更でサービス停止しないことを先に確認 |
| 5 | Vercel / Upstash Redis / Cloudflare R2 | プロジェクトを UNI のチーム/アカウントへ移管（07 §8 #4 の名義確認が前提） | #5 | オーナーをチームから除外 | Vercel の移管中はデプロイが止まる時間帯を告知 |
| 6 | Filebase / Pinata（IPFS ピン） | UNI 側アカウントで**同じ CID を再ピン**してから、オーナー側の課金停止 | #6 | オーナー側のピンを解除（両方で CID 到達を確認した後） | ピン解除は CID が消える方向なので最後 |
| 7 | ブラストエンジン / WP Mail SMTP 設定 | 契約名義を UNI へ。SMTP 認証情報のローテーション（11 §6） | #7 | 旧認証情報の失効 | 送信停止を避けるため平日昼に |
| 8 | Signer の HMAC 鍵（`wp2026a` / `sg2026a`） | ローテーション: 新旧 2 本を両側に並べる → 新に切替 → 旧を外す（`ops/RELEASE_STATE_20260902.md` §2-a） | #8 | 旧鍵の削除 | 片側だけ更新すると burn / 出庫が止まる |
| 9 | **Safe 2-of-3（ADMIN）** | Part B 完了が前提。署名者: 会社 MetaMask（T+3 にシード封緘物を UNI へ）・Ledger A・Ledger B（いずれも最初から UNI 管理。U-9） | #9 | 満了時に会社 MetaMask を UNI 新規鍵へ `swapOwner`（Safe 上の TX、2 署名） | **swapOwner は不可逆**。Sepolia で先にリハ（KMS runbook §4.0-c） |
| 10 | 会社 MetaMask（PACK_CUSTODY・POL 補充元） | シードの所在確認（07 §8 #7）→ 封緘 → UNI 側へ引き渡し、**別端末で復元して同一アドレスを確認** | #10 | オーナー側の MetaMask から削除 | 復元確認前に削除しない |
| 11 | PVM_CUSTODY の紙（R-1） | 封緘のまま UNI 側へ。`SEALED_BACKUP_RUNBOOK.md` の復旧テスト手順で再導出一致を確認 | #11 | オーナー側の写しは持たない（元から 1 部） | 紛失＝PVM 500 体の最終手段を失う |
| 12 | 各 SaaS（OpenAI / Anthropic / Google Sheets / Etherscan / RPC） | UNI 側で再契約し、`wp-config-secrets.php` と Signer `.env` の値を差し替え（11 §6） | #12 | 旧キーの失効 | 差し替え順は 11 §5 |
| 13 | 個人情報を含むローカル資料（`正規データ/`、Downloads の各 xlsx） | 暗号化媒体で 1 部を UNI へ。`10_PII_TRANSFER_MEMO.md` の整理に従う | #13 | オーナー側は保守に必要な範囲だけ残し、満了時に消去（消去証明） | 消去は不可逆 |

## 4. 受け取り確認（UNI 側が自分の権限だけで実施できること）

| # | 確認 | 合格条件 |
|---|---|---|
| 1 | GitHub: 自分のアカウントで members の main に PR を作りマージできる（docs 1 行でよい） | マージ後に `scripts/deploy-ssh.sh --check-only` の G1 が通る |
| 2 | WP: 管理画面にログインし、ヘルスチェック（UNI: 運用 → Healthcheck）を開いて NG が無い。`wp uni-pack-reveal readiness` を SSH から実行 | readiness `ready`、healthcheck の NG 0 |
| 3 | SSH/FTPS: `scripts/deploy-ssh.sh --target stg --check-only` が自分の鍵で動く | G1〜G3 OK |
| 4 | GCP: `gcloud compute ssh pachiverse-signer` に入れる。`gcloud kms keys list --keyring pv-signer` が見える。請求先が UNI | healthz 200・KMS 5 鍵が見える |
| 5 | Vercel: 自分のアカウントで Deployments が見え、`/api/collection` が 200 | 手動 Redeploy をせずに確認 |
| 6 | IPFS: UNI 側の Filebase から `bafybeiarlh4…`（PVM 画像 CID、`ops/RELEASE_STATE_20260902.md`）が取得できる | ゲートウェイ 2 系統で 200 |
| 7 | メール: 初回ログイン通知のテスト送信が届く（`ops/DEPLOY_CHECKLIST.md` のメール検証手順） | 受信箱到達・DKIM pass |
| 8 | Signer 疎通: `wp uni-pack-reveal burn-batch preflight` が通る（送信はしない） | 全項目 OK |
| 9 | Safe: Safe{Wallet} で ADMIN の Safe を開き、署名者 3 名としきい値 2 を確認。`ops/safe-tx-hash.sh` で任意の TX のハッシュ照合ができる | 一致 |
| 10 | 会社 MetaMask: 復元した端末のアドレスが `0x502cef…`（07 §8 #7）と一致 | 一致（TX は出さない） |
| 11 | 紙 R-1: 封緘を開けずに保管場所を記録。開封テストは `SEALED_BACKUP_RUNBOOK.md` の頻度で | 記録あり |
| 12 | 監視・記録: 外部死活監視の通知先に UNI 側が入っている（`ops/EXTERNAL_UPTIME_MONITORING.md`）。`ops/weekly-ops-readout.sh` を自分の鍵で実行できる | 通知受信・出力取得 |
| 13 | 復旧: `ops/SIGNER_RECOVERY_RUNBOOK.md` §7 の drill を UNI 側が 1 回通す | 起動ログに `accountProvider gcp-kms`、healthz 200 |

全部 OK になるまで §3 の「削除」列に進まない。1 つでも NG なら、その行の「追加」からやり直す（09 §6 の終了条件と同じ考え方）。

## 5. 譲渡日に止めるもの・止めないもの

| 止めない | 理由 |
|---|---|
| 日次 burn（Phase 2 自動）・日次 verify・OT 突合・IMAP 取り込み | 権限追加では影響しない。止めると滞留や検知遅れになる |
| 会員のログイン・Reveal・サポート受信箱 | 会員影響を出さない |

| 止める（T-1 〜 T+3） | 理由 |
|---|---|
| 本番デプロイ | 権限の追加・削除と同時に配置事故が起きると切り分けられない |
| 出庫申請の承認・dispatch | Signer HMAC ローテーション（#8）と重ねない |
| Safe 経由の権限操作（#9 以外） | 不可逆操作は 1 日 1 つ |

## 6. ロールバック（T+7 の削除より前なら全部戻せる）

- 権限の追加で問題が出た → 追加分を外すだけ（旧権限は残っている）
- HMAC ローテーションで burn / 出庫が止まった → 両側に旧鍵を戻す（新旧 2 本を並べる設計なので、外した旧を戻せば復旧）
- Safe の署名者操作は **T+7 より後にしか行わない**ので、ここまでのロールバックにオンチェーン操作は含まれない
- 契約・IP 移転は法務の領分（本書の範囲外）

## 7. 要確認（オーナー・UNI で決めること）

> 2026-09-24 の UNI ヒアリングで Q-1・Q-3・Q-6 に回答あり（[DECISIONS.md](DECISIONS.md) 2026-09-24）。§1 の T+3・保守満了行の Safe 記述は Part B の構成確定後に書き直す。

| # | 内容 | 判断者 |
|---|---|---|
| Q-1 | T+3 の冷蔵鍵引き渡しを譲渡日にするか、保守満了時まで遅らせるか（09 §7 の 2 案） → **2026-09-24: 冷蔵鍵は置かず Ledger 2 台とも UNI 管理（U-9）。T+3 の冷蔵鍵引き渡し工程は不要** | — |
| Q-2 | 保守期間中のオーナー権限を「別アカウント・限定権限」にするか「現行アカウントのまま」にするか（09 §7） | オーナー |
| Q-3 | 見届け役に Safe の閲覧だけでなく **署名者** を任せるか（策 4 の強い形。冷蔵鍵の保管者＝署名者になる） → **2026-09-24: 見届け役は高橋代表。UNI 管理の Ledger 2 台が署名者になるため署名者を兼ねる（U-8・U-9）** | — |
| Q-4 | R-1 の紙を UNI 側に渡す時期（T+3 か満了時か）と、渡した後にオーナー側の写しを持たないことの確認方法 | オーナー・UNI |
| Q-5 | 07 §8 の未確認事項（Vercel / Cloudflare / Filebase / Pinata / SaaS の名義、会社 MetaMask のシード所在）の解消期限 | オーナー |
| Q-6 | 会員向けの告知文（運営主体の表記が変わるか。特商法表記・プライバシーポリシーの改訂要否） → **2026-09-24: UNI 現代表の判断で会員通知は不要（U-10）**。特商法表記・プライバシーポリシーの改訂要否は未確認 | UNI・法務 |

## 8. 関連

- `03_TRANSFER_PLAN.md` §4.1（単独運用の補完策）／`07_HANDOVER_KIT.md`（資産目録・認証情報の所在・runbook 索引）／
  `09_MAINTENANCE_HANDOVER_TERMS.md`（保守条件・権限の移行表）／`10_PII_TRANSFER_MEMO.md`／`11_INFRA_MIGRATION.md`（移設順序・ローテーション一覧）
- members: `ops/KEY_MANAGEMENT_MIGRATION.md` §4（Safe）、`ops/SEALED_BACKUP_RUNBOOK.md`、`ops/SIGNER_RECOVERY_RUNBOOK.md`、
  `ops/EXTERNAL_UPTIME_MONITORING.md`、`ops/OPERATIONS_LOG.md` §5.3
