#!/usr/bin/env python3
"""利用規模 3 段（登録／利用開始／90 日活動）を本番 DB の読み取り抽出から集計する。

用途: 譲渡評価（原価法）の添付資料。「本番で稼働し、使われている」ことの証拠として使う。
売上・顧客基盤の資産価値の算定には使わない（docs/03_TRANSFER_PLAN.md §2.4）。

使い方:
  scripts/usage_scale.py <prod_db_export.json> [--asof 2026-09-13T15:00:46+09:00] > docs/06_USAGE_SCALE.md

入力は members.pachiverse.com の `prod_db_export_readonly.php` が出す JSON
（{"exported_at", "prefix", "users":[{"ID","user_email","user_registered"}], "meta":[[user_id, meta_key, meta_value], ...]}）。
標準ライブラリのみ。個人情報は読むが出力しない（件数のみ）。
"""
import argparse
import collections
import datetime as dt
import json
import sys

# 保有として数える usermeta キー（値 > 0 で保有）。パック・小口・オーナーチケット・PV Coin。
HOLDING_KEYS = {
    'uni_pachinko_unit_qty': 'UNI 1 台パック',
    'vb_pachinko_unit_qty': 'VB 1 台パック',
    'uni_pachinko_mini_unit_nft_qty': 'UNI mini',
    'vb_pachinko_mini_nft_qty': 'VB mini',
    'uni_pachinko_island_nft_qty': 'UNI 島',
    'vb_pachinko_island_nft_qty': 'VB 島',
    'vb_pachinko_share_6_10_qty': 'VB 6/10', 'vb_pachinko_share_4_10_qty': 'VB 4/10',
    'vb_pachinko_share_2_10_qty': 'VB 2/10', 'vb_pachinko_share_1_10_qty': 'VB 1/10',
    'vb_pachinko_share_1_20_qty': 'VB 1/20', 'vb_pachinko_share_1_200_qty': 'VB 1/200',
    'vb_pachipro_amateur_qty': 'パチプロ アマ', 'vb_pachipro_semi_qty': 'パチプロ セミ',
    'vb_koguchi_amount_man': '小口（万円）',
    'uni_owner_ticket_nft_qty': 'オーナーチケット',
    'vb_coin_qty': 'PV Coin',
}


def parse_dt(s):
    if not s:
        return None
    s = s.strip()
    for fmt in ('%Y-%m-%d %H:%M:%S', '%Y-%m-%dT%H:%M:%S%z', '%Y-%m-%d'):
        try:
            v = dt.datetime.strptime(s, fmt)
            return v if v.tzinfo else v.replace(tzinfo=dt.timezone(dt.timedelta(hours=9)))
        except ValueError:
            continue
    return None


def num(s):
    try:
        return float(str(s).strip())
    except (TypeError, ValueError):
        return 0.0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('export')
    ap.add_argument('--asof', help='基準時刻（既定: JSON の exported_at）')
    a = ap.parse_args()
    d = json.load(open(a.export))
    asof = parse_dt(a.asof or d['exported_at'])
    users = d['users']
    meta = collections.defaultdict(dict)
    for uid, k, v in d['meta']:
        meta[str(uid)][k] = v
    ids = [str(u['ID']) for u in users]

    registered = len(ids)
    merged = sum(1 for i in ids if meta[i].get('uni_account_merged_into'))
    roles = collections.Counter('administrator' if 'administrator' in meta[i].get('wp_capabilities', '')
                                else 'editor' if 'editor' in meta[i].get('wp_capabilities', '')
                                else 'subscriber' for i in ids)
    started = sum(1 for i in ids if meta[i].get('uni_initial_login_completed') == '1')
    def active(days):
        n = 0
        for i in ids:
            t = parse_dt(meta[i].get('uni_last_login_at'))
            if t and (asof - t).days <= days:
                n += 1
        return n
    act90, act30, act7 = active(90), active(30), active(7)
    NFT_KEYS = [k for k in HOLDING_KEYS if k not in ('vb_koguchi_amount_man', 'uni_owner_ticket_nft_qty', 'vb_coin_qty')]
    holders = sum(1 for i in ids if any(num(meta[i].get(k)) > 0 for k in NFT_KEYS))
    holders_any = sum(1 for i in ids if any(num(meta[i].get(k)) > 0 for k in HOLDING_KEYS))
    holders_by = {label: sum(1 for i in ids if num(meta[i].get(k)) > 0) for k, label in HOLDING_KEYS.items()}
    uni = sum(1 for i in ids if meta[i].get('uni_member') == '1')
    vb = sum(1 for i in ids if meta[i].get('vb_member') == '1')
    regs = sorted(u['user_registered'] for u in users)

    print('# 利用規模 3 段（登録／利用開始／90 日活動）')
    print()
    print(f'基準時刻: {asof.isoformat()}　入力: `{a.export.split("/")[-1]}`（exported_at {d["exported_at"]}）　生成: `scripts/usage_scale.py`（再実行で同じ表が出る）')
    print()
    print('本表は「本番で稼働し、会員に使われている」ことを示す資料。売上・顧客基盤の資産価値の算定には使わない（`docs/03_TRANSFER_PLAN.md` §2.4）。')
    print()
    print('## 1. 3 段の値')
    print()
    print('| 段 | 値 | 定義（本番 DB の根拠） |')
    print('|---|---:|---|')
    print(f'| 登録 | {registered:,} | `wp_users` の全行。内訳: 会員 {roles["subscriber"]:,}・運営 {roles["administrator"] + roles["editor"]}。一括取り込み（2026-03-31）が大半で、`user_registered` は購入日ではない |')
    print(f'| 利用開始 | {started:,} | usermeta `uni_initial_login_completed = 1`（初回ログインを完了し、マイページを開いた会員）。登録比 {started / registered:.1%} |')
    print(f'| 90 日活動 | {act90:,} | usermeta `uni_last_login_at` が基準時刻から 90 日以内。登録比 {act90 / registered:.1%}、利用開始比 {act90 / started:.1%} |')
    print()
    print('## 2. 補助指標')
    print()
    print('| 指標 | 値 | 定義 |')
    print('|---|---:|---|')
    print(f'| 30 日活動 / 7 日活動 | {act30:,} / {act7:,} | 同上の 30 日・7 日 |')
    print(f'| 商品換価権 NFT（パック・持分・パチプロ・島・mini）の保有者 | {holders:,} | 小口・オーナーチケット・PV Coin を除く保有 usermeta のいずれかが 0 より大きい |')
    print(f'| 何らかの保有がある会員（小口・オーナーチケット・PV Coin を含む） | {holders_any:,} | オーナーチケットは Owner\'s Pass の枚数確認用の記録で、ほぼ全会員が持つ |')
    print(f'| UNI 由来 / VB 由来（重複あり） | {uni:,} / {vb:,} | `uni_member = 1` / `vb_member = 1` |')
    print(f'| 別口座へ統合済み | {merged} | `uni_account_merged_into` あり（登録数に含まれる） |')
    print(f'| 登録日レンジ | {regs[0][:10]} 〜 {regs[-1][:10]} | `user_registered` |')
    print()
    print('## 3. 保有の内訳（保有者数）')
    print()
    print('| 区分 | 保有者数 |')
    print('|---|---:|')
    for label, n in holders_by.items():
        if n:
            print(f'| {label} | {n:,} |')
    print()
    print('## 4. 定義上の注意')
    print()
    print('- **退会・停止のステータス値は本番 DB に存在しない**（usermeta `status` は全員 active）。退会者は 2026-03-31 の取り込み時点で除外されており、VB リストの「退会・返金依頼中」行（132 行）は DB に反映されていない。登録数はこれを含まない上限値として読む。')
    print('- 「利用開始」は初回ログイン完了で数える。初回ログイン通知の送付有無（`uni_initial_login_notice_sent_at`）ではない。')
    print('- 「90 日活動」はログインのみを見る。開封・送信などの操作は数えない（監査ログで別途取れる）。')
    print('- 同一人物の重複口座は 2026-09-13 に 15 組を統合したが、抽出（9/13 15:00）はその前後どちらかであり、±10 人程度の差が出る。')
    print('- 個人情報は出力しない。再実行時は `prod_db_export_readonly.php` の最新 JSON を渡す。')


if __name__ == '__main__':
    main()
