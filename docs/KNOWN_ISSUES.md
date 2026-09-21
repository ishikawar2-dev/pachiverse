# KNOWN_ISSUES — 既知問題・技術的負債

> 管理対象: 未解決バグ / 技術的負債 / 暫定対応 / 外部サービス制約 / 壊れやすい箇所 / 削除してはいけない処理 / 本番環境特有の問題 / 未確認事項。
> 解決した問題はこのファイルから削除する（将来価値がある知見は DECISIONS.md 等へ移してから削除）。

初期化日: 2026-09-01。以下は知識基盤初期化時の調査で判明した事項。
**コードは一切変更していない。**改善候補は実装せず記載のみ。

---

## 未解決

### リポジトリ構成

- ~~**`pvm-art` が Git 管理外。**~~ **2026-09-15 に解消**: `pachiverse01-ai/pvm-art`（private）として Git 化。
  trait マスター・合成実装・アンカー・最終 metadata・IPFS 復旧材料を追跡（約 90MB、LFS 不使用）。
  候補素材・原本画像 10GB・PV 素材は Git 外。**残る課題**: `out/images4096/`（原本 10GB）の別置きバックアップが未実施。
  `out/MANIFEST_images4096.sha256` で照合できる状態にはなっている。

- **親リポジトリの作業ツリー内に独立した Git リポジトリが入れ子になっている。**
  `pachiverse-contracts` / `pachiverse-signer` / `members.pachiverse.com` は submodule ではなく
  単なる入れ子リポジトリ。親から見ると未追跡ディレクトリに過ぎず、
  **親で `git status` を見てもサブプロジェクトの変更は一切見えない**。
  各サブプロジェクトの状態は個別に確認する必要がある。

- **親リポジトリの現在ブランチが `main` ではなく `redesign/unified-design-language`。**
  `main` との差分の扱い（マージ予定か、`main` が旧版か）は**未確認**。

- **`Pachiverse_NFT_mint _backup/` がルートに残っている。**
  ディレクトリ名に半角スペースを含む（`mint _backup`）。旧 NFT mint 作業のバックアップで、
  `abi` / `contracts` / `metadata` / `records` / `NFT制作資料` 等を含む。
  現行の `pachiverse-contracts` と内容が重複・乖離している可能性があり、
  **どちらが正かの判断が必要**。調査対象外としたため中身は未確認。

### 公開サイト

- **`index.html` のカウントダウンが `2026-06-01T00:00:00+09:00`。**
  現在日（2026-09-01）を既に過ぎており、Web3 セクションは常時表示状態のはず。
  意図した状態かどうかは**未確認**。

- **`index.html` が約 150KB、`design-preview.html` が約 128KB の単一ファイル。**
  CSS・JS がインラインで肥大化している。`design-preview.html` は公開ナビゲーションから
  リンクされておらず、公開意図があるかどうか**未確認**。

- **`vercel.json` の `ignoreCommand` は終了コードの意味が直感と逆（exit 1 = ビルドする、exit 0 = スキップ）。**
  2026-09-15 の #43 で条件を逆に書き、main のビルドまで約 1.5 時間スキップした（#46 で修正。手動 Redeploy も
  旧ビルドを再利用するので気づきにくい）。変更時は push 後に Vercel の Deployments で「Build」になっていること、
  `curl -s https://pachiverse.com/api/collection | head -c 300` の応答が新コードのものであることを必ず確認する。
  `ops/OPERATIONS_LOG.md`（members）I-11

- **機体画像（`/api/collection` の `thumb` / `detail`）は Cloudflare R2 依存。**
  2026-09-15 に `assets/machines/{t,d}` 1,000 件をリポジトリから削除し、`api/collection.js` の既定 URL を R2 の
  `r2.dev` 公開 URL にした。R2 側の障害・バケット削除・レート制限（`r2.dev` は本番向けでないと Cloudflare が注記）で
  Collection Explorer の画像が全滅する。第 2 コピーは未作成、カスタムドメイン化（`media.pachiverse.com`）も未実施。
  復旧手順は `docs/R2_MACHINE_ASSETS_MIGRATION.md`「ロールバック」「注意」

### 購読 API（`api/`）

2026-09-21 に以下を修正した（`api/subscribe.js` / `api/subscribers.js`。Redis モックのローカル検証で 429・401・CSV 等を確認）:
- レート制限: IP ごとに **5 回/分・30 回/日**（Redis の固定窓カウンタ `subscribe:rl:<窓>:<IP の sha256 先頭 24 桁>:<窓開始>`。
  `EVAL` で INCR と EXPIRE を 1 往復・原子化）。超過は 429 + `Retry-After`（窓の残り秒数）。Redis が落ちていれば 500、想定外の応答は fail-closed（500）。
  IP は Vercel が上書きする `x-vercel-forwarded-for` / `x-forwarded-for` の先頭を使う（前段に別プロキシを置いた構成や `vercel dev` では信頼できない）。
  ハッシュは仮名化であって匿名化ではない（IPv4 空間は逆引き可能。TTL は窓＋5 秒）
- `api/subscribers.js` のトークンは **`Authorization: Bearer <token>` のみ**（`?token=` 経路とスキーム無しの生トークンは廃止。URL のトークンはアクセスログ・履歴・リファラに残るため）。
  比較は sha256 で長さを揃えた `crypto.timingSafeEqual`。`ADMIN_TOKEN` 未設定・16 文字未満は常に 401（fail-closed）、401 には `WWW-Authenticate: Bearer`。
  **`ADMIN_TOKEN` は十分長いランダム値にすること**（401 に遅延・回数制限は無い）
- CSV 出力は全セルをクォートし、`= + - @ タブ CR` で始まるセルには `'` を前置（式インジェクション対策。`+`/`-` 始まりのメールは正規表現上あり得る）。
  `ref` はサーバー側で `^[a-z0-9_-]{1,64}$` に制限（フロントは `index` 固定）
- 両 API に `Cache-Control: no-store`、`subscribers` は GET 以外 405
- エラーは `console.error('[subscribe] …')`（Vercel の Functions ログで確認できる。秘密は出さない）
- `JSON.parse` に失敗した購読メタは行を落とさず `malformed_meta` として件数を返す（一覧の可用性を優先する従来の意図を維持）
- 検証は Redis をモックしたローカルテストのみ（`vercel.json` の `ignoreCommand` で main 以外はビルドされず、プレビューデプロイが無い）。
  マージ後に本番で 401 / 405 / 400 の実挙動を確認する（429 は実購読者を増やさずには再現できないので確認しない）

残っている課題:
- **購読者の削除・配信停止（unsubscribe）フローが存在しない。** 登録と一覧取得のみ。運用・法令（特定電子メール法等）上の要件は**未確認**。
  配信は現状行っていない（購読リストを使ったメール送信の実装は無い）
- レート制限は IP 単位のみ。NAT 配下の複数人が同じ窓で 5 回を超えると 429 になる（購読フォームは「request failed」表示で再試行可）

### Signer

（2026-09-21 整理: 「本番用の鍵参照実装が未実装」は Cloud KMS プロバイダ（`src/accounts/gcpKms.ts`、PR #1/#2、
2026-09-16 本番移行・9/21 Part A 完了）で解消。「Indexer の実装場所が未確認」は Signer 内蔵の Receipt Checker
（README「Receipt Checker（Indexer 内蔵）」）で解消。いずれも削除した）

- **`WAIT_FOR_RECEIPT` が `.env.example` に記載されていない。**
  `src/config/index.ts` は `env.WAIT_FOR_RECEIPT === 'true'` を読むが、
  `.env.example` に項目がない。設定できることが運用者に伝わらない。

- **replacement TX（同一 nonce で gas 上げ直し）が意図的に未実装。**
  gas 条件が低く長時間 pending になった場合、自動復旧しない。運用判断が必要。
  詳細は DECISIONS.md 参照。

### コントラクト

- **`pachiverse-contracts/deployments/` が空。**
  デプロイ記録が 1 件も生成されていない。PVM / PVPACK が Amoy・mainnet のいずれにも
  デプロイされていないのか、デプロイ済みだが記録が残っていないのかは**未確認**。
  公開サイトが掲載している 3 アドレスはいずれも旧世代のコントラクトである点に注意。

### アート生成（pvm-art）— 2026-09-01 夜時点の実態で全面更新（メインがファイルベースで検証）

**完了済み**（初期化時の記載から大幅前進。正本は `pvm-art/README.md` の状態チェックリスト）:

- 生成方式・アンカー・量産方式の確定（5.0 Pro edit @2048 → Real-ESRGAN 4096 化。02_ONCHAIN §10）
- **trait 素材 38 枚確定**（`art-src/layers/`。probe 候補 139 枚から選定。旧課題の
  `FRAME_MATTE_BLACK` は再生成・選定済みで QC PASS を確認）
- **LEGEND 1/1 ×5 確定**（`art-src/legend/LEGEND_01..05.png`。ワードマーク焼き込み除外を決裁済み）
- **スクリプト一式実装・レビュー済み**（assign / compose / place_legends / qc / upscale /
  metadata_gen / batch_gen + 本番一括の `run_production.sh`。selftest 4 本 PASS）
- **サンプル 24 体の通し試験合格**（品質は本番級と確認）+ **500 体のリハーサル合成済み**
  （`out/rehearsal2048/` に 500 枚。QC レポートの `FAIL rarity distribution` 1 件は
  サンプル 24 体実行に対する 500 体分布チェックの予定調和で、実欠陥ではない）
- **本番 assignment 確定**（`out/machines-prod.csv` 500 行 → `out/assignments-prod.csv` 500 行生成済み）

**残作業**（9/9 公開の起点。RELEASE_RUNBOOK_20260909 §1 に接続）:

- `run_production.sh` の本番一括実行（約 4 時間・ESRGAN 費用数ドル）→ 500 体 QC
- IPFS アップロード → `machines` 投入 → `wp uni-pack-reveal verify-artwork`
  → Artwork Commitment lock → pre-mint → Signer 稼働

**残決裁（軽微・登録作業までに）**:

- LEGEND 5 体の個体名・attributes 表記 / metadata description 文言（3 種不統一の解消）/
  公開文面（trait 5 要素表記）と実装（8 レイヤー）の不一致の扱い

**残る技術メモ**: テストコード 2 ファイルの古い Background 名 `Neon City`（正は `Night City`）は
「後で修正」のまま。

### 事業・法務

- **カストディアル方式に伴う法務論点が未解決。**
  資金決済法上のカストディ該当性、払出時課税、KYC 要否、景表法・賭博該当性の説明。
  要件定義書 §8 で**弁護士確認を推奨**とされている。

- **会社ウォレットアドレス・TOKEN_MAP の確定と、台帳とオンチェーン残高の突合が残課題**（要件定義書 §8）。

- **収益機構（外部マーケットプレイス Genaverse・手数料 10% 分配のスマートコントラクト）は
  設計書段階で実装範囲外**（要件定義書 §8）。実装済みと誤認しないこと。

- **運用が単一担当に集中している**（PO / 実装 / レビュー / デプロイ承認）。
  会社ウォレット鍵・本番設定値は文書外（運用者管理）（要件定義書 §8）。

### 会員システム（members.pachiverse.com）— 資産・認証系の重点監査（2026-09-01、メイン直接レビュー）

> 本 docs の原則（members は調査対象外）の例外として、知識基盤初期化時にエスカレーションされた
> 資産・認証系コードのみをメインセッションが直接精読した結果を記録する。
> 監査対象コード: `feat/pack-reveal-signer-integration` ブランチ（de484f2 時点）の
> `inc/chain-signer-auth.php` / `inc/chain-signer.php` / `inc/pack-reveal.php`、
> および main と同一内容の `inc/coin-ledger.php` / `inc/gate.php` / `inc/support.php` / `inc/withdraw-request.php`。
> **コードは一切変更していない。**

#### 検証済み・問題なし（エスカレーション事項の決着）

- **HMAC 認証（chain-signer-auth.php）は設計どおり堅牢。**
  raw body の SHA256 を canonical string（METHOD/PATH/TIMESTAMP/KEY_ID/REQUEST_ID/SHA256(body)）に含め
  **parse 前に検証**、署名比較は `hash_equals`、タイムスタンプ窓は ±300 秒
  （`UNI_SIGNER_TIMESTAMP_TOLERANCE`）、鍵 rotation は `key_id => secret` マップで
  current + previous を並行検証可能。鍵未設定の環境では REST route 自体を登録しない（fail-closed）。
  ±300 秒窓内のリプレイは可能だが、receipt / premint-audit とも idempotent（no-op 成功）で実害なし。

- **同一 business_ref への並行 dispatch で request_id が二重発行されることはない。**
  `uni_signer_open_attempt` は SELECT→INSERT だが、attempts テーブルの
  `UNIQUE KEY request_id` / `UNIQUE KEY (operation, business_ref, attempt_no)` が backstop になり、
  競合の負け側はエラーで止まる（二重 burn 送信は成立しない）。

- **Reveal の多重開封防止は三重防御で成立している。**
  usermeta CAS 方式のユーザーロック（TTL 30 秒・再入対応・stale 奪取あり）
  + inventory 行の条件付き UPDATE（unopened→locked→revealed、lock_token 一致必須）
  + pack 残高 usermeta の CAS 減算。ロック TTL が失効して並行実行になっても、
  行レベル CAS により同一 Pack の二重開封・残高の二重減算は成立しない。
  `tests/pack-reveal-concurrency.php` が 10 並列 single / 3 並列 batch20 / mix を実 DB で検証している。

- **claim_inventory_row（machine 割当）の競合制御は健全。**
  `machines.allocated_pack_inventory_id IS NULL` 条件付き UPDATE + UNIQUE KEY により二重割当は不可。
  競合時は `machine_claim_conflict` エラーで全体 rollback（負け側は次の機会に再試行）。

- **gate.php confirm_email がログイン不要である設計は妥当。**
  確認リンクは別ブラウザで開かれる前提の double-opt-in。トークンは
  `wp_generate_password(32)`（高エントロピー）・単回使用（成功/期限切れで削除）・TTL 24h・
  `hash_equals` 比較で、未ログイン許容の前提条件を満たす。pending メールの `email_exists` 再検証もある。

- **support.php の nopriv AJAX 2 件（初回ログインメール再交付）の列挙攻撃耐性は実用上十分。**
  氏名 + 生年月日 8 桁 + 電話 10-11 桁 + 個人/法人種別の完全一致（かつ一意に 1 名）を要求し、
  一致時もマスク済みメールしか返さない。失敗 5 回/IP/1h のロックあり。確認トークンは
  `wp_generate_password(40)` + transient 10 分 + 単回使用。メール送付先は登録済みアドレスのみ。

- burn dispatch の preflight / kill switch（既定 manual）/ auto 移行 Gate / 自動降格は
  fail-closed 設計で妥当。日次バッチは作成のみ自動、送信は既定で運用者の明示操作。

#### 要修正（発見事項、重要度順）

> **2026-09-01 追記: 下記 8 件すべての修正を実装済み（未マージ・未デプロイ）。**
> - main 共通 5 件（tx_hash readonly / sent 時減算 / coin legacy / 緊急停止 path / NFT 送信 CAS）
>   → members リポジトリの worktree ブランチ `claude/magical-poincare-1094bd`（未コミット）
> - signer ブランチ限定 3 件（render sync ロック / callback 冪等再適用 / CLI failed ガード）
>   → `fix/signer-audit-hardening` ブランチ（`feat/pack-reveal-signer-integration` から分岐、
>   worktree: `members.pachiverse.com/.claude/worktrees/fix-signer-audit-hardening`、未コミット）
> - ユニットテストは両側でグリーン（main 側 132 件 / ブランチ側 151 件）。
>   統合テスト（ChainSigner）は docker MySQL 未起動のため未実行。
> - **sent 時の残高自動減算を入れたため、運用で手動減算していた場合は手順を廃止しないと二重減算になる。**
>   デプロイ前に運用手順の確認が必要。

- **【高】withdraw-request.php: sent の readonly 化が tx_hash に及んでいない。**
  `save_post_withdraw_request` は readonly（current=sent）でも
  `update_post_meta(..., 'uni_withdraw_tx_hash', $tx_hash)` を無条件実行するため、
  **送付済みレコードの txHash を後から書き換え・空文字化できる**。status が変わらないため
  監査ログにも履歴にも残らない。qty / to_address は保護済みで tx_hash だけ漏れている。
  → readonly 時は tx_hash 更新もスキップする。

- **【高】withdraw「送付済」時に会員保有数量（usermeta）を減算する処理がコード上存在しない。**
  重複申請チェックは pending 状態（received/review/approved）のみ対象のため、sent 決着後は
  減っていない残高のまま再申請でき、approve/sent 時の over_limit 検証も通ってしまう。
  運用手順で手動減算しているならその手順の文書化が、していないなら **NFT 二重払い出しリスク**への
  対処（sent 遷移時の自動減算）が必要。

- **【高】coin-ledger.php: 非 InnoDB フォールバック経路に lost update と台帳欠落の窓がある。**
  `uni_coin_apply_delta_legacy` は無ロックの read-modify-write（並行時に残高の lost update）で、
  台帳書き込み `uni_coin_ledger_insert` は **insert の戻り値を確認しない**ため、
  残高だけ変わって台帳行が残らない不整合が黙って起きうる。admin_notices の警告は出るが処理は続行される。
  InnoDB 経路（SELECT ... FOR UPDATE + 台帳 insert 失敗で ROLLBACK）は健全。
  → 資産系はフォールバックせず fail-closed（エラー返却）にするのが望ましい。最低限、
  legacy 経路の台帳 insert 失敗を検知してエラー化すること。

- **【中】pack-reveal.php: render 経路の inventory 同期がユーザーロックなしで走る。**
  `uni_pack_reveal_render_section` → `sync_user_inventory` は並行ページロードで
  「missing = owned - open_count」の算出が交錯すると inventory 行を過剰作成し、
  共有プールの machine を余分に確保しうる（allocation commit 前の `verify_allocation` の
  `user_packs_match_balances` で検知はされるが、発生すると手動クリーンアップが必要）。
  execute_batch 側はロック下なので、render 側の sync もロック取得（取得失敗時はスキップ）にする。

- **【中】chain-signer.php: callback 再送による自己修復が効かないケースがある。**
  `record_response` / `record_receipt` の no-op 判定が attempt.status のみを見るため、
  attempt 更新成功後に業務側反映（mark_burn_batch_* / withdrawal 更新）が失敗すると、
  以後の同一 callback 再送はすべて no-op になり業務側が永久に取り残される。
  → attempt が既に目標 status でも業務側の状態を冪等に再適用する。

- **【中】CLI `burn-batch failed` はオンチェーン確認なしで二重 burn を招きうる。**
  dispatched / submitted の batch を手動で failed にすると対象 Pack が pending_burn に戻り
  再バッチされるが、元の TX が実際には生きていて後から confirm した場合、
  custody は全会員分の残高を持つため **二重 burn がオンチェーンで成立する**
  （2 回目も残高不足にならない）。receipt（status=0）起点以外の手動 fail には
  「tx_hash の on-chain 確認済み」を要求する運用ガードまたはコード側ガードが必要。

- **【低】gate.php 緊急停止の wp-login.php 例外が REQUEST_URI 部分一致。**
  任意 URL に `?x=/wp-login.php` を付けると緊急停止（503）を迂回できる
  （ログイン必須ゲートは別途効くため影響は限定的）。`parse_url` の path のみで比較する。

- **【低】mypage.php の会員間 NFT 送信が無ロックの read-modify-write。**
  残高確認 → `update_user_meta` の間に競合すると lost update / 二重送信が起きうる。
  coin-ledger の InnoDB 経路と同様の FOR UPDATE ないし CAS 化が望ましい。

---

## 壊れやすい箇所・触る際の注意

### 絶対に壊してはいけないもの

- **Signer の複数インスタンス同時稼働。**
  nonce が重複または欠番になり、**TX が失われるか wallet が停止する**。
  デプロイはローリング更新ではなく旧停止 → 新起動。SQLite は永続ディスクへ。

- **MINTER / PVM_CUSTODY / BURNER の EOA から Signer 以外で TX を送ること。**
  `cast` や別スクリプトを使うと chain nonce が進み、Signer の予約と衝突する。
  pre-mint（forge から MINTER を使う処理）は**Signer 起動前に完了させる**。

- **`finalizeMinting()` / `freezeMetadata()` の実行。**
  **不可逆**。前者は以降どの MINTER_ROLE 保有者からも永久に mint 不可、
  後者は baseURI を永久に変更不可。500 体の mint 確認・最終 QA 完了を経てから実行する。

- **PVM_CUSTODY と PACK_CUSTODY を同じ EOA にすること。**
  1 つの鍵の侵害で ERC721 と ERC1155 の両方が影響を受ける。

### 変更すると別の場所が壊れるもの

- **`payload_hash` の実装。**
  WordPress の `uni_signer_payload_hash()`（PHP）と Signer の `payloadHash`（TS）は同一規則で実装されている。
  **片方だけ変更すると、正常な再送が `409 idempotency_conflict` になる。**
  Signer 側のテストが PHP 実装の既知出力との一致を固定しているので、テストが落ちたら片側変更を疑うこと。

- **`signer-v1` の JSON Schema。**
  正本は **members リポジトリの `docs/schemas/signer-v1/`** で、
  `pachiverse-signer/schemas/signer-v1/` は同期コピー。signer 側だけ変更すると正本と乖離する。

- **Signer の処理順序（simulate → mutex → nonce 予約 → 署名 → 永続化 → broadcast）。**
  順序を変えるリファクタは nonce 欠番・二重送信を招く。`gasgate` テストが固定している。

- **コントラクトの `setCustody()` 実行。**
  Signer は起動時に `PACK_CUSTODY_ADDRESS == PVPACK.custody()` を照合し、
  **ずれていれば起動しない**（fail-closed）。コントラクト側を変えたら Signer の設定も同時に更新すること。

- **contracts と signer のディレクトリ配置。**
  `pachiverse-signer/scripts/sync-abi.mjs` が
  `../pachiverse-contracts/out/PachiverseMachines.sol/PachiverseMachines.json` を
  **相対パスで直接読む**。片方だけ別の場所に clone すると `npm run sync:abi` が壊れる。

- **親リポジトリの `assets/` の移動。**
  `pvm-art/art-src/traits.yaml` の `brand_layer` が
  `~/Developer/pachiverse/assets/logo-square.png` を**絶対パスで参照**している。

- **レアリティ配分。**
  要件定義書 §3.6 の Reveal プール配分と `traits.yaml` の `rarity_quota` は一致している
  （R 270 / SR 120 / SSR 60 / SSSR 30 / UR 15 / LEGEND 5 = 500）。
  **どちらか一方を変えるともう一方と破綻する。**両方とも「変更不可」と明記されている。

- **`pvm-art` の合成アルゴリズム（PIPELINE.md v3）と生成モデルの組み合わせ。**
  レイヤー合成は幾何が固定されていることが前提。
  **Seedream v4.5 edit は幾何が崩れるため使用禁止**（5.0 Pro edit のみ）。
  4096 化は再生成ではなく決定論的アップスケーラー（Real-ESRGAN 2×）で行う。

### 削除・変更してはいけない処理

- **`api/subscribe.js` の honeypot（`body.website` が埋まっていたら 200 を返して無視）。**
  一見無意味な「成功を返して何もしない」処理だが、bot に検知させないための意図的な実装。

- **`HSETNX` の使用。** `HSET` に変えると再登録で初回購読時刻が上書きされる。

- **Signer のチェーン三点照合（`RPC の eth_chainId == CHAIN_ID == Chain.id`）と
  起動時の custody 照合。** fail-closed の設計で、外すと Amoy / mainnet の取り違えが検知できなくなる。

- **`chain: null` を使わないこと。** viem の Chain object を明示する。

### 運用・インフラ制約

- **Signer を公開インターネットに直接置かない。**
  VPN / private network / IP allowlist / Cloudflare Access のいずれかを前段に置く。
  mTLS はインフラ層で追加し、HMAC はアプリケーション層の認証として残す。

- **会員システムのホスティングはお名前.com 共用サーバー。**
  固定 IP なし・常駐プロセス不可・cron 制約あり。スケール上限があり、
  将来のマーケットプレイスは別ホスト必須（要件定義書 §5.4）。

- **`pvm-art` の Python は必ず `.venv/bin/python`。** `pip install` は禁止。
  テストは pytest ではなく各スクリプトの `--selftest` フラグ。

- **fal.ai の API キーは `~/.fal_key`。** コード・ログ・チャットに値を出さない。

---

### トップページの描画は iPhone のメモリ上限に近い — 全画面の合成レイヤーを増やさない（2026-09-16）

- 2026-09-16 に iPhone Safari で「問題が繰り返し起きました」（描画プロセスの連続強制終了）が報告され、星空 3 層を canvas 1 枚に置換するなどの対策を入れた（経緯・計測値・代替案は `DECISIONS.md` 2026-09-16）。シミュレータ計測で GPU 側 IOSurface はヒーロー 191 → 111〜124 MB（3 回計測）、下部 277 → 150 MB。実機の jetsam 上限は再現できないため、再発の有無は本番反映後に確認する
- 触る際の注意（`index.html`）:
  - 星空は `<canvas class="starfield-canvas">`（body 末尾の script「Starfield」）。星の追加・速度変更は JS の `LAYERS` を編集する。CSS の擬似要素やレイヤー（`will-change` / `transform` アニメ）で星を描く方式に戻さない。2026-09-02 の CSS 版（PR #15）は 1 層 ≈ 1650×974 CSS px の合成レイヤー ×3 で約 110 MB を消費した。さらに古い `background-position` アニメ版は静止 9fps まで落ちる（2026-09-02 実測）
  - `position: fixed` の全画面要素に `backdrop-filter`、`filter` のアニメ、`background-position` のアニメを付けない。閉じたオーバーレイ（`.mobile-menu` `.pv-lightbox`）は `visibility: hidden` にして `backdrop-filter` を外す（`opacity: 0` だけでは iOS でぼかしが毎フレーム走る）
  - ヒーロー背景動画は JS が `data-src` / `data-src-mobile` から選ぶ（767px 以下は `assets/hero/hero-bg-960.mp4`）。`<video src>` を直書きしない。差し替え時はファイル名を変える（`vercel.json` で immutable キャッシュ）
  - 残りの負荷: 視差エンジン（`[data-pfx]` ×80 の `will-change: opacity, translate, filter` と毎フレームの `getBoundingClientRect`）、`pfx-noise-jitter` ×17（見えている間だけ動く）、無限アニメーション約 80 本。シミュレータ計測ではメモリへの寄与は小さい
- 数値の調整は Tweaks Studio で行う: `node scripts/tweaks-dev-server.mjs`（既定 8790 番）で配信し、Studio の接続先に `http://localhost:8790` を入れる。同一 LAN の iPhone は `http://<Mac の IP>:8790/`。台帳は `index.html` の `window.PV_TWEAKS`（星空の倍率・fps・DPR 上限、ヒーロー/セクションの視差、ノイズ、走査線/ビネット/色収差）、スライダー定義は dev サーバーの `SCHEMA`。確定値は台帳に焼き込む。本番 HTML にはランタイムも API も含まれない
- `design-preview.html` は旧方式（2026-09-02 以前）の星空 CSS を複製したまま（社内プレビュー用のため未修正）
- 他ページ（collection / faq / docs / litepaper / contracts / transparency）は 2026-09-21 に横展開済み: 閉じたモバイルメニューの `backdrop-filter` を開いている間だけに、走査線を `transform` ドリフトに、星 1 層の `background-position-x` アニメ（240 秒周期）は停止して静止画に（1.75 px/s は知覚できず、canvas 化するほどの負荷ではない）。`design-preview.html`（公開ナビから未リンク）は旧 CSS のまま

## 未確認事項

**推測で埋めないこと。** 以下は調査時点で確認できなかった。

1. **PVM / PVPACK のデプロイ状況。** `deployments/` が空。Amoy / mainnet のどちらにも
   デプロイされていないのか、記録が残っていないだけかが不明。

2. **Indexer の実装場所と実装有無。**（上記「未解決」参照）

3. **公開サイト掲載の 2 つの既存 ERC-1155 コントラクトの現在の役割。**
   `Pachiverse Access & Companion Items`（`0x22acc4ac...`）と
   `Pachiverse Participation Units`（`0x852fbd87...`）が現在どう使われているかは、
   本リポジトリのコードからは判断できない。要件定義書は「Polygon Live 3 種」と記載するのみ。

4. **`main` ブランチと `redesign/unified-design-language` の関係。**（マージ予定か、`main` が旧版か）

5. **`Pachiverse_NFT_mint _backup/` の内容と現行資産との関係。**（調査対象外としたため未確認）

6. **要件定義書 §4 のテーブル名と実装の一致。**
   要件定義書自身が「テーブル名は既存 SPEC に基づく。実装で名称・構成が一部異なる場合があり」
   と注記している（§4 脚注 / §9）。members リポジトリ側で確認が必要。

7. **members.pachiverse.com の実装詳細。**
   本 docs では調査対象外（別リポジトリで独自に知識基盤が初期化されている）。
   本 docs の会員システムに関する記述は、すべてルート直下の要件定義書 `.docx`（2026-07-07 版）に基づく
   **as-built 記述であり、その後の変更は反映されていない可能性がある**。

8. **`api/subscribers.js` の JSON.parse 握り潰しが意図的かどうか。**（上記「未解決」参照）

9. **`index.html` のカウントダウン日（2026-06-01）を過ぎた現在の表示が意図どおりか。**

10. **ROY Slot TMA との関係。**
    ユーザーの過去セッションから「ROY Slot TMA の譲渡先は AKG 主体、ITO-japan は譲渡元」という
    前提知識があるが、**本リポジトリ内に ROY Slot TMA に関連するコード・記述は見つからなかった**。
    Pachiverse との関係は未確認。
