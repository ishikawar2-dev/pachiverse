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
