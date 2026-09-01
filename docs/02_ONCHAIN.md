# 02_ONCHAIN — コントラクト・署名基盤・アート生成

> オンチェーン資産に触れる作業の前に必ず読むこと。ここに書かれた制約を破ると、**資産の喪失・wallet の停止・不可逆な設定確定**が起きうる。
> 一次資料は `pachiverse-contracts/README.md` / `pachiverse-signer/README.md` / `pvm-art/PIPELINE.md`。本 docs はその要点と跨システムの制約を集約したもの。

## 1. スマートコントラクト

Foundry / Solidity 0.8.24 / OpenZeppelin v5 / Polygon。**どちらも non-upgradeable**（デプロイ後にロジックを変更できない）。

### PachiverseMachines (PVM) — ERC721

| 項目 | 値 |
|---|---|
| Name / Symbol | Pachiverse Machines / PVM |
| tokenId | 1〜500 |
| Max supply | 500 |
| 初期保管先 | `PVM_CUSTODY`（Signer が鍵を持つ専用 EOA） |
| Metadata | `ipfs://<METADATA_CID>/{tokenId}.json` |

**コントラクトレベルで強制している不変条件**:
- tokenId は 1〜500 のみ（範囲外は `TokenIdOutOfRange`）
- 総供給は 500 を超えない（`MaxSupplyExceeded`）
- 同一 tokenId の二重 mint 不可（`TokenAlreadyMinted`。**同一 batch 内の重複も検出**）
- `finalizeMinting()` 後は **どの MINTER_ROLE 保有者からも永久に mint できない**
- `freezeMetadata()` 後は **baseURI を永久に変更できない**

`finalizeMinting()` と `freezeMetadata()` は独立した操作で、**どちらも不可逆**。

### PachiverseMysteryPacks (PVPACK) — ERC1155

| 項目 | 値 |
|---|---|
| Name / Symbol | Pachiverse Mystery Packs / PVPACK |
| tokenId | 1101（最大 300）/ 1202（最大 200）のみ |
| 総供給 | 500 |
| custody | `PACK_CUSTODY`。mint 先かつ burn 元。admin が `setCustody()` で差し替え可能 |
| uri | `baseURI + 64桁ゼロ埋め16進 + .json`（**旧コントラクトと同形式**） |

**不変条件**:
- 1101 / 1202 以外の tokenId は mint できない（`UnsupportedTokenId`）
- 各 tokenId の mint 累計は上限を超えない
- mint 先は custody 固定（`RecipientNotCustody`）
- **burn しても mint 枠は戻らない**（`mintedOf` は累計で減らない）
- `finalizeMinting()` は 1101=300 / 1202=200 到達時のみ実行可、以後永久に mint 不可
- `freezeMetadata()` 後は baseURI 変更不可

### ロール設計

`Ownable` を使わず `AccessControl` で権限を分離している（管理権限と mint 権限を別 Wallet に置くため）。

| ロール | 保有者 | 権限 |
|---|---|---|
| `DEFAULT_ADMIN_ROLE` | Safe Multisig | ロール付与・剥奪 / setBaseURI / freezeMetadata / finalizeMinting /（PVPACK のみ）custody 差し替え |
| `MINTER_ROLE` | Signer / Deployment 用 EOA | batchMint / mintBatch |
| `BURNER_ROLE`（PVPACK のみ） | Signer 用 EOA | burnBatchFromCustody |

**ロール付与は constructor 内で完結する。** deployer は `admin` / `initialMinter` に明示指定されない限り、
**deploy 後にいかなるロールも持たない**。post-deploy の `grantRole` に依存しないため、
admin が multisig でも追加操作が不要。デプロイスクリプトは deployer にロールが残っていないことを確認してから終了する。

### burn の権限設計（重要）

```solidity
function burnBatchFromCustody(uint256[] calldata ids, uint256[] calldata amounts)
    external onlyRole(BURNER_ROLE)
```

**`from` を引数に取らず custody 固定**にしている。BURNER_ROLE には ERC1155 の一般 transfer 権限
（`setApprovalForAll` 等）を与えないため、**BURNER 鍵が漏れても custody 以外の残高には触れられない**。
テストで、第三者へ移った残高が burn の影響を受けないことと、BURNER が `safeTransferFrom` を
呼べないことを固定している。

### batchMint の設計

500 体を 1 TX に固定せず、100 体 × 5 回のような分割を許容する（欠番の補填にも同じ経路を使う）。
Signer v1 の `erc721_batch_mint.token_ids`（10 進文字列配列）をそのまま渡せる形にしている。

`_safeMint` を使うため `to` がコントラクトの場合は ERC721Receiver の実装が必要。
v1 では `PVM_CUSTODY` は EOA のためこの問題は発生しない。

### テスト構成

```
PVM      unit 30 / fuzz 6 / invariant 5
PVPACK   unit・fuzz・invariant の 3 層（test/ に対応ファイルあり）
```

## 2. Wallet と鍵の分離

**資産ごとに blast radius を分離する。custody を 1 つにまとめない。**

```
DEPLOYER      contract deploy 専用。コントラクト上のロールは持たない
ADMIN         Safe Multisig。DEFAULT_ADMIN_ROLE
MINTER        Signer 専用 EOA。PVM / PVPACK の MINTER_ROLE
PVM_CUSTODY   Signer 専用 EOA。ERC721 保管と withdrawal（Signer が鍵を持つ）
PACK_CUSTODY  ERC1155 Pack 保管専用。低頻度 Wallet（**Signer は鍵を持たない**）
BURNER        Signer 専用 EOA。PVPACK の BURNER_ROLE
```

### 絶対に守る規則

1. **PVM_CUSTODY と PACK_CUSTODY は必ず別の EOA にする。**
   同じ鍵にすると、その鍵の侵害で ERC721 と ERC1155 の両方が影響を受ける。

2. **MINTER / PVM_CUSTODY / BURNER の EOA からは Signer 以外で TX を送らない。**
   `cast` や別スクリプトから同じ EOA を使うと、Signer の nonce 管理と競合して nonce が飛ぶ。

3. **pre-mint は Signer 起動前に完了させる。**
   forge / deployment tooling から MINTER を使う処理（PVM 500 体・PVPACK 500 枚の初回 mint）は
   Signer 稼働開始前に終わらせる。稼働開始後は MINTER から Signer 以外で TX を送信しない。

4. **PACK_CUSTODY は日次 burn では TX を送らない。**
   BURNER が `burnBatchFromCustody()` を呼ぶ設計のため、この Wallet 自身は署名に関与しない。
   日常的な POL（ガス）補充も不要。

5. **operation ごとに使用する鍵を固定する。リクエストの `from_address` で任意の鍵を選ばせない。**

| operation | 署名鍵 | アドレス制約 |
|---|---|---|
| `erc721_batch_mint` | MINTER | `to_address` は `PVM_CUSTODY_ADDRESS` 固定 |
| `erc721_transfer` | PVM_CUSTODY | `from_address` は `PVM_CUSTODY_ADDRESS` 固定。`to_address` は会員の出庫先 |
| `erc1155_batch_burn` | BURNER | `from_address` は `PACK_CUSTODY_ADDRESS` 固定 |

allowlist は **operation / chain_id / contract address の 3 層**。Amoy と mainnet は `CHAIN_ID` と contract address で分離する。

`erc721_batch_mint` が minter 鍵だけ、`erc721_transfer` が custody 鍵だけで署名することはテストで固定されている
（リファクタで取り違えても検知できる）。

### 鍵参照の抽象化

```ts
interface SignerAccountProvider {
  getAccount(role: AccountRole): Promise<Account>;
  getAddress(role: AccountRole): Promise<Address>;
  availableRoles(): AccountRole[];
}
```

- `LocalPrivateKeyAccountProvider` — 開発 / Amoy 用。環境変数の raw private key
- 本番は KMS / HSM / MPC 実装へ差し替える（`UnimplementedAccountProvider` が置き場）

**本番設計を raw private key 環境変数に固定しない。**

## 3. Signer の API と認証

```
POST /v1/commands
GET  /healthz
```

### HMAC 認証

ヘッダ: `X-PV-Key-Id` / `X-PV-Timestamp` / `X-PV-Request-Id` / `X-PV-Signature`

署名対象の canonical string:

```
HTTP_METHOD \n REQUEST_PATH \n TIMESTAMP \n KEY_ID \n REQUEST_ID \n SHA256(RAW_BODY)
→ HMAC-SHA256(secret, canonical_string)
```

**RAW body を検証してから parse する。** 処理順序は
`Content-Type → Timestamp → Key ID → RAW body HMAC → request_id` に固定され、
**署名検証を通るまで永続化も業務処理も行わない**。

- replay 抑止は timestamp の許容窓（既定 ±300 秒）
- `request_id` は idempotency key なので、**重複を理由に拒否しない**
- `key_id` により rotation 中は current / previous の両方を検証できる

### idempotency

`request_id` を idempotency key とし、SQLite に永続化する。

| 状況 | 応答 |
|---|---|
| 初回 | 署名 → broadcast → `submitted` |
| 同一 `request_id` + 同一 payload | **新しい TX を作らず**保存済み raw tx を再 broadcast → `duplicate`（同じ `tx_hash`） |
| 同一 `request_id` + 異なる payload | `409 idempotency_conflict` |
| 署名前に落ちた | 同じ `request_id` のまま署名から再開 |
| broadcast の成否不明 | `503 delivery_unknown`。**rejected にしない**。同じ `request_id` で再送する |

**`submitted` は broadcast しただけで成功ではない。** 成否は Indexer が receipt で判定する。

**broadcast の前に raw transaction と tx_hash を永続化する。**
送信直後にプロセスが落ちても「署名済み・送信有無不明」として残るため、
retry で同一の署名済み TX を再送でき、二重送信にならない。

## 4. nonce 管理（最も壊れやすい箇所）

### 処理順序（変更禁止）

**simulate / estimateGas は nonce 予約の前**に置く。deterministic revert はここで `RejectedError` になり
nonce を消費しない。RPC 障害も 503 を返すだけで nonce 未消費。

```
validation → calldata → simulate/estimateGas
  ↓
account mutex 取得
  ├ gap 再確認
  ├ nonce 予約（SQLite BEGIN IMMEDIATE）
  ├ 署名（chainId を Chain object で明示）
  └ raw tx / tx_hash 永続化
  ↓ mutex 解放
broadcast
```

**account mutex** により gap 再確認 → 予約 → 署名 → 永続化 が account 単位で直列化されるため、
「A が予約直後に停止し、B が次の nonce を送って欠番を作る」競合窓は存在しない。

**nonce を後から decrement して解放する方式は採らない。**

- 予約は `account_nonces` テーブルで管理し、chain 側の pending nonce が進んでいればそちらに追従する
- **再開時（同じ request_id）は予約済み nonce を再利用**し、新しい nonce を消費しない
- MINTER / PVM_CUSTODY / BURNER はそれぞれ**独立した nonce 系列**を持つ

### nonce 欠番のブロッカー

「nonce を予約したが署名まで到達していない」attempt が残っている間は、
**その account に新しい nonce を発行しない**（`409 earlier_attempt_pending`）。

```
nonce 10 予約 → 署名前に停止
  ↓
別リクエストが nonce 11 を取ると、チェーン上に nonce 10 が存在しないため
nonce 11 以降がすべて処理待ちで詰まる
```

応答には `blocking_request_id` が含まれる。**先にその request_id を再開する**こと。
再開すると予約済みの nonce 10 で署名・broadcast され、その後 11 が使えるようになる。

**署名済み（raw transaction あり）の attempt はブロッカーにしない。**
mempool に存在しうるため、欠番ではなく「送信済み・未採用」として扱う。

### 長時間 pending の扱い

gas 条件が低くネットワークに採用されない場合でも、**自動で別 nonce・新 request_id を発行しない**。
`submitted` のまま維持し、同じ request_id で同じ raw transaction を再 broadcast するだけ。

replacement TX（同一 nonce で gas を上げ直す）は**意図的に未実装**。
自動化すると二重送信・nonce ギャップの温床になるため、別仕様として設計する。

### v1 の運用制約（違反すると TX が失われる）

nonce 予約を SQLite で管理しているため、**v1 は単一インスタンス前提**。

| 制約 | 理由 |
|---|---|
| **Signer は single-active instance で運用する** | nonce 予約が単一の SQLite ファイルに閉じている |
| **複数 Signer インスタンスの同時稼働は禁止** | 別ファイルを見ると同じ nonce を二重に発行する |
| **SQLite は永続ディスクに置く** | コンテナの ephemeral 領域だと再起動で予約と attempt 履歴が消える |
| **MINTER / CUSTODY EOA から Signer 以外で TX を送らない** | 外部送信で chain nonce が進み、予約と衝突する |
| **ローリング更新をしない** | 旧を停止してから新を起動（`recreate` / `maxSurge: 0` 相当）。同時に 2 つ動く瞬間を作らない |

**将来 horizontal scaling する場合**: 共有 DB（PostgreSQL 等）と分散ロックへ移行する。
移行対象は `IdempotencyStore` 実装のみで、`reserveNonce` / `findBlockingReservation` を
`SELECT ... FOR UPDATE` か advisory lock に置き換えれば済むよう interface を分離してある。
**現時点で PostgreSQL への作り直しは不要。**

## 5. チェーンの固定（fail-closed）

`CHAIN_ID` から viem の Chain object（137 → polygon / 80002 → polygonAmoy）を決定し、
Public / Wallet Client と `signTransaction` に同じ Chain を使う。**`chain: null` は使わない。**

起動時に三点照合し、不一致なら**起動しない**:

```
RPC の eth_chainId == CHAIN_ID == Chain.id
```

さらに viem の `signTransaction` は署名のたびに RPC の chainId を検証するため、
起動後に RPC が別チェーンへ差し替わっても署名は失敗する。

テストでは**署名済み raw transaction をデコードし、埋め込まれた chainId が config と一致すること**を
80002 / 137 の両方で固定している。

### 起動時のその他の検証

```
PVM_CUSTODY_ADDRESS  == 設定された署名鍵のアドレス
PACK_CUSTODY_ADDRESS == PVPACK.custody()
```

いずれかがずれていれば起動しない。宣言値と実体がずれたまま動くと `from_address` の検証が意味を失うため。

## 6. Signer の環境変数

**変数名と用途のみ。実値は書かない。**

| 変数 | 用途 |
|---|---|
| `CHAIN_ID` | 137（mainnet）/ 80002（Amoy）。起動時に RPC と三点照合 |
| `RPC_URL` | Polygon RPC エンドポイント |
| `PVM_CONTRACT_ADDRESS` | PVM（ERC721）の allowlist 対象アドレス |
| `ERC1155_CONTRACT_ADDRESS` | PVPACK（V2）の allowlist 対象。**未設定なら burn は `contract_not_configured` で拒否** |
| `PVM_CUSTODY_ADDRESS` | ERC721 保管先。署名鍵のアドレスと起動時照合 |
| `PACK_CUSTODY_ADDRESS` | ERC1155 Pack 保管先。コントラクトの `custody()` と起動時照合 |
| `SIGNER_INBOUND_KEYS` | 受信 HMAC 鍵。`key_id => secret` の JSON。rotation 中は 2 本並べる |
| `TIMESTAMP_TOLERANCE_SEC` | replay 抑止の許容窓（既定 300） |
| `MINTER_PRIVATE_KEY` | **開発 / Amoy のみ。**本番では使わない |
| `PVM_CUSTODY_PRIVATE_KEY` | **開発 / Amoy のみ。**本番では使わない |
| `BURNER_PRIVATE_KEY` | **開発 / Amoy のみ。**本番では使わない |
| `HOST` / `PORT` | 待ち受け（既定 `127.0.0.1:8787`） |
| `DATABASE_PATH` | SQLite ファイルパス。**永続ディスク必須** |
| `WAIT_FOR_RECEIPT` | `'true'` のとき receipt を待つ。**`.env.example` に未記載**（KNOWN_ISSUES 参照） |

`PACK_CUSTODY` の秘密鍵は Signer に置かない（日常の署名に使わないため）。

### contracts 側の環境変数

`POLYGON_RPC_URL` / `POLYGON_AMOY_RPC_URL` / `POLYGONSCAN_API_KEY` /
`ADMIN_ADDRESS` / `MINTER_ADDRESS` / `PVM_CUSTODY_ADDRESS` / `BURNER_ADDRESS` / `PACK_CUSTODY_ADDRESS` /
`BASE_URI` / `PACK_BASE_URI` / `PACHIVERSE_MACHINES_ADDRESS` / `PACK_CONTRACT_ADDRESS` /
`PREMINT_START` / `PREMINT_END` / `PACK_MINT_TOKEN_ID` / `PACK_MINT_AMOUNT`

## 7. ERC1155 Burn の詳細

Mystery Packs V2（PVPACK）の `burnBatchFromCustody(uint256[],uint256[])` を呼ぶ。

```
allowlist: ERC1155_CONTRACT_ADDRESS（V2 のみ）
tokenId  : 1101 / 1202 のみ。それ以外は token_id_not_allowed
署名鍵    : BURNER
```

V2 は `from` を引数に取らず custody 固定で焼くため、**`from_address` は calldata に含めない**。
リクエストの `from_address` は「意図した custody か」の二重確認としてのみ照合する
（`PACK_CUSTODY_ADDRESS` と一致しなければ `from_address_not_allowed`）。

**Signer は PACK_CUSTODY の鍵を持たない。** burn は BURNER 鍵で実行される。

## 8. 旧コントラクトからの移行

Polygon mainnet の既存 ERC1155 `0x9f3a5b10da36888f31a679f2f401eb9af27e2fe6` を調査した結果、
**burn / burnBatch が存在しない**ことが確定した。

```
deployed runtime bytecode = compData の creation bytecode と完全一致
burn(address,uint256,uint256)          セレクタ f5298aca 不在
burnBatch(address,uint256[],uint256[]) セレクタ 6b20c454 不在
eth_call → execution reverted（対照の balanceOf は正常応答）
EIP-1967 implementation slot = 0x0     → non-upgradeable。後から追加できない
owner = EOA。mint / setBaseURI / freezeBaseURI / transferOwnership のみ
```

`safeTransferFrom` は `to = address(0)` を revert するため、**dead address 送付による burn 代替も不可**。
そのため Reveal の burn 要件は変更せず、**burn 対応版を新規デプロイする**方針とした。

旧コントラクトの 1101 × 300 / 1202 × 200 は単一の会社 EOA にあり、会員個別ウォレットへの
オンチェーン配布はない（**権利の正本は WordPress DB**）。
**旧コントラクトの退役処理は V2 の mainnet 稼働確認まで実行しない。**

## 9. デプロイ手順（contracts）

秘密鍵は `.env` に平文で置かず、**Foundry の keystore かハードウェアウォレット**を使う。

```
1. deploy         forge script Deploy*.s.sol --account deployer --broadcast --verify
                  ロールは constructor で確定。デプロイ後の追加操作は不要
2. pre-mint       PVM: PREMINT_START/END を変えて 1-100, 101-200, ... 401-500
                  PVPACK: 1101×300 / 1202×200
3. finalizeMinting()   500 体すべての mint を確認してから。**以降 mint 不可**
4. freezeMetadata()    最終 QA 完了後。**以降 baseURI 変更不可**
```

**mainnet デプロイ前に Amoy で pre-mint 500 体を通しで確認する。**
デプロイ後は contract address と ABI（`out/PachiverseMachines.sol/PachiverseMachines.json`）を Signer 側へ渡す。

WordPress 側は pre-mint の監査記録を `chain_tx_attempts` に保持し、
**500 体 confirmed になるまで Reveal を開かない。**

## 10. NFT アート生成パイプライン（pvm-art）

**設計の正本は `members.pachiverse.com/ops/GENERATIVE_ART_GUIDE.md`**（本 docs では未調査）。

### 生成方式（2026-09-01 のテストで確定）

- **絵面・構図の決定** = Seedream 5.0 Pro（2048px、$0.135/枚）
- **素材編集** = 5.0 Pro edit @2048、参照 = `art-src/style-anchor-2048.png`（幾何ロック実証済み）
- **4096 化** = ローカル Real-ESRGAN 2 倍（**決定論的**）
- **v4.5 edit は使用禁止** — リール差し替えテストでカメラ・プロポーションが崩れ、レイヤー位置合わせが不可能になった
- 構図は**正面固定**（レイヤー合成の位置合わせのため）

### 合成アルゴリズム（PIPELINE.md v3・検証済み・変更禁止）

基準 = `art-src/style-anchor-2048.png`（float32 RGB、以後 A）

1. **領域系 trait（置換方式）** — 適用順 Background → Body → Frame → Reel → Logo（後勝ち）
   自己マスク M を導出して `out = out*(1-M) + V*M`。
   M の導出: `|V-A|.max(ch) > 20` を 2 値化 → `MinFilter(7)` → `MaxFilter(21)` → `GaussianBlur(5)`
2. **発光系 trait（差分加算方式）** — Light → Effect。`delta = V-A` を `|delta| < 10` でノイズゲートして加算
3. **Overlay（スクリーンテクスチャ方式）** — `ImageChops.screen` で最前面合成。`OVERLAY_SCANLINES` のみ手続き生成（multiply）
4. **ブランドレイヤー（全500体固定）** — Pachiverse ワードマークを実素材で合成（AI に描かせない）
5. **仕上げ** — clip(0,255) → Real-ESRGAN 2x で 4096×4096 → WEBP 出力（`{tokenId}.webp`）

**採用しなかった方式**: v1 純加算（Frame/Light が他 trait の差分に飲まれる）、
v2 閾値マスク置換（偽マスクが前段の置換を巻き戻す）。DECISIONS.md 参照。

### 変更不可の仕様

- `rarity_quota`: LEGEND 5 / UR 15 / SSSR 30 / SSR 60 / SR 120 / R 270（合計 500）
- `trait_order`（重ね順＝正準順）: Background, Body, Frame, Reel, Light, Effect, Logo, Overlay
- 画像: 4096 / webp
- `name_format`: `Pachiverse Machine #{serial:03d}`（**画像ファイル名は `1.webp` でゼロ埋めなし**）

これらは NFT 制作資料（2026-03-12）由来で、**Artwork Commitment で sha256 凍結される**ため、
`traits.yaml` が v1.0 へ昇格した後は変更禁止。

### 検品（qc.py）

- trait 忠実性: 各領域系 trait について「素材のマスク領域内で out と V の差分」が閾値以下
- 幾何: 機体マスク外周の構図一致（アンカー比）
- 全 500 点の画像 sha256 ユニーク / trait 組合せ `unique_key` ユニーク
- 分布集計が `rarity_quota` / `rarity_rules` と一致
- コンタクトシート出力（目視用）

### メタデータ

OpenSea 形式。`attributes` = Rarity 先頭 + Background, Body, Frame, Reel, Light, Effect(, Logo, Overlay)。
Logo / Overlay は `code=''` のとき attributes 自体を省略。`image` = `ipfs://<CID>/{tokenId}.webp`。

### LEGEND 5 体

**合成対象外**。1/1 フルアートを個別生成する（別途）。

### pvm-art の実行環境

- Python は必ず `.venv/bin/python`（pillow / numpy / pyyaml 導入済み）。**pip install 禁止**
- テストは pytest ではなく各スクリプトの `--selftest` フラグ
- 合成はローカル処理のみでネットワークアクセス不要（素材生成時のみ fal.ai を使う）
- fal.ai の API キーは `~/.fal_key`。**コード・ログ・チャットに値を出さない**

## 11. セキュリティ運用

- 秘密鍵・本番 RPC・API キー・HMAC 鍵はコミットしない（両リポジトリで `.gitignore` 済み）
- **upgradeable にしない。** ロジックはデプロイ後不変
- **Signer は公開インターネットに直接置かない。** VPN / private network / IP allowlist / Cloudflare Access のいずれかを前段に置く
- mTLS はインフラ層で追加する（HMAC はアプリケーション層の認証として残す）
- 環境（production / staging / development）ごとに別の鍵を使う
- 会社ウォレットの秘密鍵の承継が、譲渡・引き継ぎ時の**最重要アイテム**（要件定義書 §6）
