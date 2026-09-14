# DECISIONS — 重要な設計判断の記録

> コードだけでは「なぜこうしたか」が分からない判断を記録する。書式は AGENTS.md §7 を参照。
> 設計変更後も過去判断を削除せず、Status を Superseded / Deprecated に変更して残す。

**本ファイルの初期化について**: 以下は 2026-09-01 の知識基盤初期化時に、既存 README・設計文書・
要件定義書・Git 履歴から**確認できた範囲**で再構成したもの。日付は判断が記録された文書の日付、
または文書内に明記された決裁日を用いている。**判断日が特定できないものは「日付不明」と記載する。**
理由が資料から読み取れないものは創作せず、その旨を明記する。

---

## Decision: 旧 ERC1155 を退役させず、burn 対応版を新規デプロイする（日付不明 / 2026-08 頃）

### Context
Reveal 処理は Mystery Pack を焼却（burn）することを要件としていた。しかし Polygon mainnet で
稼働中の既存 ERC1155 `0x9f3a5b10da36888f31a679f2f401eb9af27e2fe6` に burn があるか不明だった。

### Decision
バイトコードレベルで調査したうえ、**burn 対応版（`PachiverseMysteryPacks` / PVPACK）を新規デプロイする**。
旧コントラクトの退役処理は **V2 の mainnet 稼働確認まで実行しない**。

### Reason
調査の結果、旧コントラクトには burn 機能が存在せず、後から追加もできないことが確定した。

- deployed runtime bytecode が creation bytecode と完全一致
- `burn(address,uint256,uint256)`（セレクタ f5298aca）不在
- `burnBatch(address,uint256[],uint256[])`（セレクタ 6b20c454）不在
- eth_call → execution reverted（対照の `balanceOf` は正常応答）
- EIP-1967 implementation slot = 0x0 → **non-upgradeable。後から追加できない**
- owner は EOA で、mint / setBaseURI / freezeBaseURI / transferOwnership のみ

さらに `safeTransferFrom` は `to = address(0)` を revert するため、
**dead address 送付による burn 代替も不可**だった。

### Alternatives
- 旧コントラクトをそのまま使い、burn 要件を落とす → **不採用**（Reveal の要件を満たせない）
- dead address 送付で burn を代替 → **不採用**（`safeTransferFrom` が revert するため技術的に不可能）
- proxy 経由で burn を追加 → **不採用**（non-upgradeable のため不可能）

### Consequences
- V2 の uri 形式を**旧コントラクトと同形式**（`baseURI + 64桁ゼロ埋め16進 + .json`）に揃えた
- 旧コントラクトの 1101×300 / 1202×200 は単一の会社 EOA に残る。**権利の正本は WordPress DB** のため、
  会員個別ウォレットへのオンチェーン配布はなく、移行の影響は限定的
- 公開サイト `contracts.html` は現在も旧アドレスを掲載しており、V2 稼働時に更新が必要
- 旧コントラクト退役のタイミングという運用判断が残る

### Status
Active

---

## Decision: Ownable ではなく AccessControl でロールを分離し、constructor で確定させる（日付不明）

### Context
コントラクトの管理権限と mint 権限をどう持たせるか。また、admin が Safe Multisig の場合、
post-deploy の `grantRole` は multisig 承認が必要になり運用が重くなる。

### Decision
`Ownable` を使わず `AccessControl` を採用し、**ロール付与は constructor 内で完結させる**。
deployer は `admin` / `initialMinter` に明示指定されない限り、deploy 後にいかなるロールも持たない。

### Reason
- 管理権限と mint 権限を**別 Wallet に置く**ため（`Ownable` では分離できない）
- constructor で確定させることで、**admin が multisig でも post-deploy の追加操作が不要**になる

### Consequences
- デプロイスクリプトは deployer にロールが残っていないことを確認してから終了する
- ロール構成を変えるにはデプロイし直す必要がある（non-upgradeable のため）

### Status
Active

---

## Decision: burn は `from` を引数に取らず custody 固定にする（日付不明）

### Context
BURNER 鍵は Signer が保持し、日常的に署名に使われる。この鍵が漏洩した場合の被害範囲をどう限定するか。

### Decision
```solidity
function burnBatchFromCustody(uint256[] calldata ids, uint256[] calldata amounts)
    external onlyRole(BURNER_ROLE)
```
のように **`from` を引数に取らず custody 固定**にする。BURNER_ROLE には ERC1155 の一般 transfer 権限
（`setApprovalForAll` 等）を与えない。

### Reason
**BURNER 鍵が漏れても custody 以外の残高には触れられない**ようにするため（blast radius の限定）。

### Consequences
- テストで「第三者へ移った残高が burn の影響を受けないこと」「BURNER が `safeTransferFrom` を呼べないこと」を固定している
- Signer 側では `from_address` は calldata に含まれず、「意図した custody か」の**二重確認**としてのみ照合する
- `PACK_CUSTODY_ADDRESS` は起動時にコントラクトの `custody()` と照合し、ずれていれば起動しない
  （ずれたまま動くと二重確認が意味を失うため）

### Status
Active

---

## Decision: PVM_CUSTODY と PACK_CUSTODY を別 EOA に分離する（日付不明）

### Context
ERC721（Machine NFT）と ERC1155（Mystery Pack）の保管先 Wallet を 1 つにまとめるか分けるか。

### Decision
**必ず別の EOA にする。** さらに PACK_CUSTODY の秘密鍵は Signer に置かない。

### Reason
同じ鍵にすると、その鍵の侵害で **ERC721 と ERC1155 の両方が影響を受ける**（blast radius の分離）。
PACK_CUSTODY は BURNER が `burnBatchFromCustody()` を呼ぶ設計のため、**自身は署名に関与しない**低頻度 Wallet にできる。

### Consequences
- PACK_CUSTODY は日次 burn で TX を送らないため、日常的な POL（ガス）補充も不要
- Wallet が 6 種類（DEPLOYER / ADMIN / MINTER / PVM_CUSTODY / PACK_CUSTODY / BURNER）になり、鍵管理の運用負荷は増える
- Signer 起動時に `PVM_CUSTODY_ADDRESS == 署名鍵のアドレス` / `PACK_CUSTODY_ADDRESS == PVPACK.custody()` を照合し、
  ずれていれば起動しない（fail-closed）

### Status
Active

---

## Decision: nonce を decrement で解放せず、欠番ブロッカー方式を採る（日付不明）

### Context
署名前にプロセスが停止すると「nonce を予約したが署名していない」attempt が残る。
このとき別リクエストが次の nonce を取ると、チェーン上に欠番ができて以降の TX がすべて詰まる。

### Decision
**nonce を後から decrement して解放する方式は採らない。**
代わりに、予約済みで未署名の attempt が残っている間は**その account に新しい nonce を発行しない**
（`409 earlier_attempt_pending`）。応答に `blocking_request_id` を含め、先にその request_id を再開させる。

**署名済み（raw transaction あり）の attempt はブロッカーにしない。**

### Reason
- decrement 方式は競合下で二重発行を招きやすい
- 署名済みの attempt は mempool に存在しうるため、欠番ではなく「送信済み・未採用」として扱うのが正しい

### Consequences
- 停止時は運用者が `blocking_request_id` を再開する必要がある（自動復旧しない）
- 再開すると予約済み nonce で署名・broadcast され、その後の nonce が使えるようになる
- account mutex により「予約直後に停止 → 別リクエストが次の nonce を取る」競合窓は存在しない

### Status
Active

---

## Decision: simulate / estimateGas を nonce 予約の前に置く（日付不明）

### Context
deterministic な revert や RPC 障害で nonce を無駄に消費すると、欠番の原因になる。

### Decision
処理順序を `validation → calldata → simulate/estimateGas → mutex → nonce 予約 → 署名 → 永続化 → broadcast`
に**固定**する。

### Reason
deterministic revert は simulate 段階で `RejectedError` になり **nonce を消費しない**。
RPC 障害も 503 を返すだけで nonce 未消費で済む。

### Consequences
- `gasgate` テスト（6 件）で「revert で nonce 未予約」「RPC 障害で nonce 未消費」「mutex の直列化」を固定している
- 順序を変えるリファクタは nonce 欠番を招くため禁止

### Status
Active

---

## Decision: broadcast の前に raw transaction と tx_hash を永続化する（日付不明）

### Context
broadcast 直後にプロセスが落ちると、TX を送ったかどうかが分からなくなる。
このとき新しい TX を作ると二重送信になる。

### Decision
**broadcast の前に** raw transaction と tx_hash を SQLite に永続化する。
broadcast の成否が不明な場合は `503 delivery_unknown` を返し、**`rejected` にしない**。

### Reason
送信直後に落ちても「署名済み・送信有無不明」として残るため、
retry で**同一の署名済み TX を再送**でき、二重送信にならない。

### Consequences
- 同一 `request_id` + 同一 payload の再送は、新しい TX を作らず保存済み raw tx を再 broadcast し、
  同じ `tx_hash` で `duplicate` を返す
- 同一 `request_id` + 異なる payload は `409 idempotency_conflict`

### Status
Active

---

## Decision: replacement TX を自動化しない（日付不明）

### Context
gas 条件が低く、TX がネットワークに長時間採用されないケースがある。

### Decision
**自動で別 nonce・新 request_id を発行しない。** `submitted` のまま維持し、
同じ request_id で同じ raw transaction を再 broadcast するだけにする。
replacement TX（同一 nonce で gas を上げ直す）は**別仕様として設計する**。

### Reason
自動化すると**二重送信・nonce ギャップの温床**になるため、現時点では意図的に実装していない。

### Consequences
- 長時間 pending の解消は運用判断になる
- 将来 replacement TX を実装する場合は、別仕様として設計する必要がある

### Status
Active（意図的な未実装）

---

## Decision: Signer v1 を単一インスタンス前提とし、PostgreSQL へ作り直さない（日付不明）

### Context
nonce 予約を SQLite で管理しているため水平スケールできない。将来を見越して最初から
PostgreSQL + 分散ロックで作るべきかどうか。

### Decision
**v1 は single-active instance 前提**とし、SQLite のまま進める。
**現時点で PostgreSQL への作り直しは不要。**
ただし将来の移行に備え、`IdempotencyStore` を interface として分離しておく。

### Reason
移行が必要になった場合でも、対象は `IdempotencyStore` 実装のみで、
`reserveNonce` / `findBlockingReservation` を `SELECT ... FOR UPDATE` か advisory lock に
置き換えれば済むよう設計してあるため。

### Consequences
以下を守らないと nonce が重複または欠番になり、**TX が失われるか wallet が停止する**:
- 複数 Signer インスタンスの同時稼働は禁止
- SQLite は永続ディスクに置く（ephemeral 領域だと再起動で予約と履歴が消える）
- デプロイはローリング更新ではなく、旧停止 → 新起動（`recreate` / `maxSurge: 0` 相当）
- MINTER / CUSTODY EOA から Signer 以外で TX を送らない

### Status
Active

---

## Decision: 本番の鍵参照を raw private key 環境変数に固定しない（日付不明）

### Context
開発では環境変数の raw private key が手軽だが、本番でそのまま使うのは望ましくない。

### Decision
`SignerAccountProvider` interface で鍵参照を抽象化し、
`LocalPrivateKeyAccountProvider`（開発 / Amoy 用）と、本番用の KMS / HSM / MPC 実装を差し替え可能にする。
`UnimplementedAccountProvider` を本番実装の置き場として用意しておく。

### Reason
**本番設計を raw private key 環境変数に固定しないため**（README に明記）。

### Consequences
- 本番運用開始前に KMS / HSM / MPC 実装が必要（**未実装**。KNOWN_ISSUES 参照）
- `PACK_CUSTODY` の秘密鍵は Signer に置かない（日常の署名に使わないため）

### Status
Active（本番実装は未完）

---

## Decision: アート合成に v3「侵食→膨張マスク」方式を採用する（2026-09-01）

### Context
機体 1 体を trait 8 値のレイヤー合成で作る際、素材画像から領域をどう抜き出すか。
全変種に散発的な再レンダ差があるため、単純な閾値マスクでは偽領域を拾ってしまう。

### Decision
自己マスク M を `|V-A|.max(ch) > 20` の 2 値化 → `MinFilter(7)`（孤立ノイズ除去）→
`MaxFilter(21)`（本体復元 + マージン）→ `GaussianBlur(5)` で導出し、
`out = out*(1-M) + V*M` で置換する。**この方式は検証済みで変更禁止。**

### Reason
プローブ素材での実合成テスト（v1〜v3）で、v3 のみが全 trait の両立を達成したため。
侵食→膨張後の被覆率は BG=0.36 / Body=0.24 / Frame=0.10 / Reel=0.05 で妥当と判断。

### Alternatives
- **v1 純加算** → 不採用。綺麗だが Frame / Light が他 trait の差分に飲まれる
- **v2 閾値マスク置換** → 不採用。偽マスクが前段の置換を巻き戻す
  （Reel 素材の偽領域が金ボディを戻してしまった）

### Consequences
- 発光系（Light / Effect）だけは置換ではなく差分加算方式（`|delta| < 10` でノイズゲート）を使う
- 素材生成側の幾何が動くとこの方式が破綻するため、生成モデルの制約（下記）と一体の判断になる

### Status
Active

---

## Decision: 素材編集は Seedream 5.0 Pro edit @2048 で行い、4096 化は Real-ESRGAN で行う（2026-09-01）

### Context
仕様上の画像サイズは 4096×4096（変更不可）。Seedream 5.0 系は Pro=2048px / Lite=3072px が上限で、
4096 を直接出せない。一方 v4.5 は 4096px を出せて単価も安い（$0.04 vs $0.135）。

### Decision
- **絵面・構図の決定** = 5.0 Pro（2048px）でアンカーを確定
- **素材編集** = 5.0 Pro edit @2048（参照 = `style-anchor-2048.png`）
- **4096 化** = 再生成ではなく**決定論的アップスケーラー（ローカル Real-ESRGAN 2×）**
- **v4.5 での再生成は禁止**

### Reason
リール差し替えテストで、**v4.5 edit はカメラ・プロポーションが崩れ、レイヤー位置合わせが不可能**だった。
5.0 Pro edit は同テストで幾何ロックを確認している
（リール外の輝度差分 平均 4/255、対象領域のみ 21〜23）。
レイヤー合成方式（v3）は幾何が固定されていることが前提のため、幾何の安定性を単価より優先した。

### Consequences
- 費用が当初見積 $16〜28 から **$34〜41**（約 250〜300 枚 × $0.135）へ増加
- 構図は**正面固定**とする（レイヤー合成の位置合わせのため）
- 検品は領域別ピクセル差分で行う（`outer_mean_diff ≦ 6` を合格目安）

### Status
Active

---

## Decision: Pachiverse ワードマークを trait ではなく固定焼き込みレイヤーにする（2026-09-01）

### Context
ロゴを trait として扱うか、全個体共通の固定レイヤーとして扱うか。

### Decision
- **Pachiverse ワードマーク** = 全 500 体固定の焼き込みレイヤー。**実ロゴ素材を合成し、AI に描かせない**
- **Logo trait** = 装飾エンブレム（Standard / Neon / Gold / Holo）として分離
- Logo / Overlay は**オプショナル**（無しあり）

### Reason
AI に描かせるとワードマークが個体ごとに崩れるため（ブランド表記の一貫性）。

### Consequences
- `traits.yaml` の `brand_layer` が `~/Developer/pachiverse/assets/logo-square.png` を絶対パスで参照する
  → 親リポジトリの `assets/` を動かすと合成が壊れる
- 横長高解像度版ロゴの有無は**ユーザー確認中**（未確定）

### Status
Active

---

## Decision: スタイルアンカーを Mystery Pack 筐体画像から生成する（2026-09-01）

### Context
500 体の基準となるスタイルアンカーをどう作るか。

### Decision
Mystery Pack 筐体画像を**参照画像に入れて**生成する。t2i（テキストのみ）での生成は行わない。
最終的に `art-src/anchor-2k.jpg`（5.0 Pro edit で正面化）→ `art-src/style-anchor.png`（4096）を採用。

### Reason
**筐体の血統維持のため。** t2i のみの生成では筐体が変わってしまう。

### Consequences
- 4096 アンカー候補のうち `anchor4k-01` は下部胴体の色が乖離したため不採用、`anchor4k-00` を採用
- 全素材編集の参照は `style-anchor-2048.png`（`style-anchor.png` の 2048 縮小）

### Status
Active

---

## Decision: ニュースレター購読者を Redis のハッシュで管理する（Git 履歴: `eec1ef5`, `5419ebd`）

### Context
公開サイトのニュースレター登録先が必要だった。

### Decision
Redis のハッシュ `subscribers` を 1 本使い、**フィールド = メールアドレス、値 = JSON メタデータ（ts, ref）**とする。
書き込みは `HSETNX`。環境変数は `KV_REST_API_*` を主とし、`UPSTASH_*` をフォールバックとして受け付ける。

### Reason
- **email をハッシュのフィールドにすることで重複が自動的に潰れる**（コード内コメントに明記）
- `HSETNX` により**初回購読時刻のみを記録**し、再登録で上書きしない
- `UPSTASH_*` フォールバックは、Vercel Redis 統合と Upstash 直接利用の両方に対応するため（`5419ebd`）

### Consequences
- 購読者の削除・配信停止フローはコード上に存在しない（KNOWN_ISSUES 参照）
- 一覧取得は `ADMIN_TOKEN` の共有シークレット 1 本で保護される

### Status
Active

---

## Decision: 会員紐付けの正キーを member_code とし、email を正キーに用いない（要件定義書 §1.4 / §3.9 / §4）

### Context
会員データの照合キーをどうするか。

### Decision
**member_code（固定 ID）を正キーとする。メールアドレスは正キーに用いない。**
CSV インポートでも **email 照合は禁止**。WordPress 内部参照は user_id を補助キーとする。

### Reason
**同一メールアドレスで複数会員が存在しうる**問題のため（要件定義書 §1.4 に明記）。

### Consequences
- CSV インポートの照合ロジックは member_code に固定される
- usermeta 配列保存禁止・JSON 1 セル禁止という設計制約も併せて踏襲されている

### Status
Active

---

## Decision: NFT をカストディアル方式で保管する（要件定義書 §3.5）

### Context
会員が保有する NFT の実体をどこに置くか。

### Decision
**NFT の実体は会社ウォレットに集約保管し、会員の「実質保有」は usermeta（`*_qty`）のオフチェーン台帳で表す。**

### Reason
資料からは、この方式を選んだ直接の理由が読み取れなかった（**創作しない**）。
結果として、会員が個別ウォレットを持たずに利用できる構成になっている。

### Consequences
- **法務論点が残る**: 資金決済法上のカストディ該当性、払出時課税、KYC 要否、景表法・賭博該当性。
  要件定義書 §8 で**要確認事項**とされ、弁護士確認が推奨されている
- 台帳（usermeta / coin-ledger）とオンチェーン残高の**突合（reconcile）が運用上必須**になる
- **会社ウォレットの秘密鍵の承継が、譲渡・引き継ぎ時の最重要アイテム**（要件定義書 §6）
- 権利の正本が WordPress DB にあるため、旧 ERC1155 からの移行で会員への影響が限定的だった

### Status
Active

---

## Decision: 記事生成 LLM を OpenAI から Claude へ移行した（要件定義書 §3.11 / §9）

### Context
Web3 ニュースの自動記事化に使う LLM の選定。当初は OpenAI（gpt-4o-mini）を使用していた。

### Decision
**Claude Haiku 4.5（Messages API の tool-use で構造化出力を強制）へ移行**した。

### Reason
**既存の Anthropic 連携（サポート AI 分類・返信）に統合するため**（要件定義書 §9）。

### Consequences
- 記事生成とサポート AI で API キー・連携基盤を共通化できる
- ハルシネーション抑止のため、出典は PHP 側で実ソース URL から生成する（AI に作らせない）

### Status
Active（会員システム側の判断。本リポジトリ対象外だが前提知識として記録）

---

## Decision: Collection Explorer は会員 API を正本とし、未 Reveal は演出として隠す（2026-09-02）

### Context
公式サイトに 500 体の Machine を探索する Collection Explorer を追加するにあたり、
Reveal 状態と公開可能な trait・画像情報の正本をどこに置くかを決める必要があった。

### Decision
会員システムの公開 Collection API を正本とし、公式サイトは Reveal 済み Machine のみを取得する。
未 Reveal の 500 スロットはクライアント側で `UNDISCOVERED` として生成し、rarity・trait・画像 URL・
LEGEND の token_id を HTML・JS・API レスポンスに含めない。派生画像 URL は Vercel Function が
環境変数の HMAC 鍵から実行時に計算して付与する。

### Reason
Reveal 前の情報をクライアントへ送らず、会員システムの Reveal 状態と公式サイト表示を一つの正本で整合させるため。
既存の純静的 HTML + Vercel 構成を維持したまま、未発見の演出に必要な境界をサーバー側に置ける。

### Alternatives
- 500 件の静的 JSON を公式サイトに置く案: 未 Reveal 情報がクライアントに漏れるため不採用
- Next.js へ移行する案: Collection Explorer のためだけに既存サイトの構成を変更する必要がないため不採用

### Consequences
- edge cache により Reveal 後の表示反映に最大 60 秒の遅延がある
- IPFS に公開済みの原本は秘匿不能であり、この方式は公式サイト上の未発見演出を保つためのもの
- Collection Explorer の可用性は会員システム公開 API に依存する

### Status
Active

## Decision: UNI への引き渡しは IP 全部を石川保有・既払いなしを前提に、10 月末までに監査以外の減点要因を解消し 11 月から第三者監査に入る（2026-09-15）

### Context
UNI へプロジェクトページ・会員ポータル・（未決だが）メタバースを引き渡す際の価格を整理した。
合意済みの契約価格はなく、あるのは石川側の評価資料（工数表 v1.1）のみで、譲渡実勢は約 3,500〜5,500 万円、
減点要因を解消すれば約 5,500〜7,000 万円とされている。減点要因の解消には第三者監査（1〜2 ヶ月）が含まれ、
10 月末までにレポートまで受け取るのは非現実的だった。

### Decision
- IP（コード・命名・ロゴ・アート・文書）はすべて石川に帰属し、UNI からの既払い対価はない前提で、全額の譲渡対価として整理する
- 石川は UNI の役員ではなく 100% 株主。会社法上の利益相反取引には当たらず、UNI 側は現代表の承認で進める。評価資料は税務上の時価の根拠として整備する
- 10/31 までに第三者監査以外の減点要因（KMS 化・マルチシグ・事業実績の資料化・運用複数名化・pvm-art の版管理）を解消する
- 第三者監査は 11 月開始とし、10 月中にスコープ確定と発注を済ませる。監査前に 2026-09-07 全面レビュー §0 の 10 件を修正する
- 法務意見書は今回スコープ外
- 時価の独立した根拠として、監査後に会計士・税理士へ無形資産評価書を依頼する（必要に応じて相見積もり）。10 月中に同等システムの外注見積も取る
- 詳細は [03_TRANSFER_PLAN.md](03_TRANSFER_PLAN.md)

### Reason
監査を 10 月末に無理に押し込むより、既知の欠陥を先に潰してから監査に入る方が費用対効果が高い。
IP 帰属と既払いなしが確定したことで、価格は相殺や残余対価の議論を伴わない単純な譲渡対価として扱える。

### Alternatives
- 監査も 10 月末までに終える案: 9 月中に発注してもレポートは 11 月中旬以降になるため不採用
- 中間水準（KMS・マルチシグ・監査解消で 4,500〜6,000 万円）を目標にする案: ②③と重なり意思決定に使えないため撤回

### Consequences
- UNI への価格提示は監査レポート受領後（12 月〜2027 年 1 月）が現実的
- 工数表は v1.2 で数式の緩さ（掛け率と上限値の不整合）と前提条件（IP・既払い）を直す必要がある
- メタバースの含否・人選（Safe 署名者・2 人目運用担当）はオーナー判断として残る
- 100% 株主との取引のため、価格の客観性は税務上も必要になる（現代表の承認手続きは未実施）
- セキュリティ監査だけでは価格の独立性を示せないため、評価書の取得まで含めて価格提示は 2027 年 1 月頃になる

### Status
Active

## Decision: Signer 鍵は Cloud KMS（HSM）へインポート、ADMIN は Safe 2-of-3 へ移行し、未決事項 8 件をオーナー判断で確定（2026-09-07 方針・2026-09-15 確定）

### Context
Signer の 3 鍵（MINTER / PVM_CUSTODY / BURNER）はクラウド VM 上に平文で置かれ、コントラクトの
DEFAULT_ADMIN_ROLE は会社 MetaMask 1 本に集中している。譲渡評価の最大の減点要因であり
（[03_TRANSFER_PLAN.md](03_TRANSFER_PLAN.md)）、移行 runbook は
`members.pachiverse.com/ops/KEY_MANAGEMENT_MIGRATION.md`（PR #51）にある。
2026-09-14 の捨て鍵リハーサルでインポート方式が成立し、残った未決事項をオーナーが 2026-09-15 に確定した。

### Decision
方針（2026-09-07）:
- 既存 3 鍵を Google Cloud KMS（HSM、EC_SIGN_SECP256K1_SHA256）へ**インポート**する。新鍵への切替はしない（on-chain ロールと PVM 500 体の移転を避ける）
- Safe は 2-of-3。署名者は 会社 MetaMask ＋ オーナー所有の Ledger ＋ 紙保管の冷蔵鍵。Safe に移すのは DEFAULT_ADMIN_ROLE のみ

確定（2026-09-15、runbook §6 に反映）:
| # | 確定内容 |
|---|---|
| Q-4 | VM では PKCS#8 変換とラップまでを行い、ラップ済み blob を Mac に持ち出してオーナー ID から import する（同日改訂。VM にオーナー認証を置かない。SA への importer 一時付与も採らない） |
| Q-9 | KMS 課金を受け入れる。secp256k1 は HSM 保護レベル限定で無償枠なし。HSM の EC 鍵は約 $2.5/月/版で 3 鍵で月 $7.5 前後（破棄予約中の捨て鍵も 10/14 まで課金）、実額は 10〜11 月請求で確認 |
| Q-10 | Safe{Wallet} は Polygon 対応済み。署名者 (2) は所有済みの Ledger 1 台。Ledger は Safe 署名で blind signing が常に必要なため、署名前に safeTxHash を UI 外で独立計算して端末表示と照合し operation=0 を確認する手順を必須化 |
| R-1 | raw 鍵の封緘バックアップは PVM_CUSTODY のみ紙 1 部。Safe 冷蔵鍵とは別の場所に保管。紙からの再導出検証を R-7 の前に行い、DD では鍵素材が HSM 外に存在することを開示。譲渡後の CUSTODY ローテーションは行わない |
| R-3 | 冷蔵鍵は 2 台目の Ledger を公式直販で新品調達し、オフラインで初期化 |
| R-4 | 冷蔵鍵は §4.4 の検証で 1 回だけ署名者として使う |
| R-6 | 旧 ADMIN の除去は Safe 経由の `revokeRole`（fail-safe） |
| R-5 | PVM_CUSTODY 漏洩時の退避手段を `cast send --gcp` に書き換えてから Part A に入る（Part A の前提条件） |
| R-7 | 移行前の VM スナップショットは「3 鍵の sign→recover 一致＋BURNER 実 TX 成功」を条件に、紙検証→VM 平文 shred→他スナップショット確認の順で削除 |

### Reason
インポート方式は運用への影響が最小で、リハーサルで成立を確認済み。KMS の課金は無料化できないが月数百円の桁で、
減点要因の解消に対して無視できる。冷蔵鍵に Ledger を使えばツールの真正性検証が不要になり、監査でも説明しやすい。

### Alternatives
- 新鍵へのローテーション: 過去の鍵素材の残存リスクを断ち切れるが、ロール移譲と 500 体の移転を伴うため今回は対象外（将来課題）
- KMS を使わず VM 上の暗号化保管: 鍵が VM から出せる構造が変わらないため不採用

### Consequences
- 実行順: signer PR #1 → #2 → members PR #51 マージ → Part A（KMS）→ 翌日の日次 burn で実 TX 検証 → 72 時間後に後始末 → Part B（Safe）
- 2 台目 Ledger の調達（オーナー）が Part B の前提
- インポート方式のため、過去に raw 鍵が置かれた場所（.env バックアップ・スナップショット）の後始末を必ず実施する

### Status
Active

## Decision: 譲渡価格の時価根拠は原価法＋外注見積＋陳腐化減価に固定し、売上に依存する手法は使わない（2026-09-15）

### Context
事業実績の速報値で、売上が 2024 年 7.9 億円 → 2025 年 1.8 億円と縮小し、2025/11 以降は基盤上の販売経路がないことが分かった。
収益還元法では原価法（約 7,500 万円）を大きく下回る。UNI 側から販売計画を出してもらうのは難しく、ロイヤルティ免除法も分子が立たない。
100% 株主と会社の取引であり、税務上の時価の否認耐性が最優先。

### Decision
- 評価手法は原価法（工数表 v1.2 に Git 等の客観的証跡を添付）＋同等システムの外注見積 2〜3 社＋陳腐化減価（自ら評価書に載せる）
- 減価は係数で渡さず控除項目の積み上げで示し、係数は評価人が決める（「代表値の 5〜7 割に置く」という逆算は同日撤回）
- 月次売上の 3 点セットには工数を割かないが、評価人に求められれば UNI 会計から売上を提供する。会員数・保有者数を顧客基盤の資産として計上しない。利用規模 3 段は稼働の証拠としてのみ使う
- UNI 側の取得理由書（事業継続に不可欠・代替費用＝外注見積）を取締役会決議用に用意する
- 評価書の依頼前に会計士・税理士へ 30 分の事前ヒアリングを行い、原価法単独の可否・収益法併記の要否・係数の決め方・個人側の所得区分と消費税・費用感を確認する

### Reason
売上に依らず、かつ否認されにくい唯一の構成。原価法は自社開発ソフトの時価根拠として税務実務で最も一般的で、陳腐化を自ら織り込めば「不都合な数字を隠した」形にならない。

### Alternatives
- ロイヤルティ免除法＋利用実績: 評価対象の切り分けは正しいが UNI の販売計画が必要で、入手困難
- 三手法すべて提示: 税務上は最も強いが、縮小局面の売上が評価を原価法の半分以下に押し下げるリスク
- 原価法のみで実績を出さない: 評価人が帳簿で売上減を知った時に隠した形になる

### Consequences
- 評価額は収益系の手法より低め（控除後 4,000〜5,500 万円程度の見込み）。手取りより否認耐性を優先する
- UNI 側は取得価額＝支払額でソフトウェア 5 年償却となり、収益がなければ減損の論点が残る
- 10 月末までの準備は 2〜3 人日に軽くなる（売上 3 点セットの 10〜15 人日が不要）
- 詳細は [03_TRANSFER_PLAN.md](03_TRANSFER_PLAN.md) §2.4

### Status
Active
