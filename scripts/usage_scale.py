#!/usr/bin/env python3
"""利用規模 3 段（登録／利用開始／90 日活動）を本番 DB の読み取り抽出から集計する。

用途: 譲渡評価（原価法）の添付資料。「本番で稼働し、使われている」ことの証拠として使う。
売上・顧客基盤の資産価値の算定には使わない（docs/03_TRANSFER_PLAN.md §2.4）。

使い方:
  scripts/usage_scale.py <prod_db_export.json> [--asof 2026-09-13T15:00:46+09:00] \
      [--input-location '<入力 JSON の置き場所>'] [--note '<抽出ごとの注記>' ...] > docs/06_USAGE_SCALE.md

入力は members.pachiverse.com の `prod_db_export_readonly.php` が出す JSON
（{"exported_at", "prefix", "users":[{"ID","user_email","user_registered"}], "meta":[[user_id, meta_key, meta_value], ...]}）。
標準ライブラリのみ。個人情報は読むが出力しない（件数のみ）。

テストアカウント（usermeta `uni_test_account = 1`。members `docs/DECISIONS.md` D42）は、「登録」の内訳に件数だけを出し、
利用開始・活動・保有者・UNI/VB 由来・統合済みの値と、割合の分母からは外す。運営の口座は「登録」の内訳で分けて示すだけで、
それ以外の値と割合の分母には含む（D42。含めるかは次に表を作り直すときに判断する）。
活動の窓は基準時刻の前 N×24 時間（N = 90・30・7）。基準時刻より後の最終ログインは数えない。
`user_registered` は UTC で保存されているので、登録日レンジは JST の日付に直して出す。
抽出の日付や件数に依存する注記（重複口座の統合の前後関係など）は --note で渡す（固定の文に数字を書かない）。
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
    'vb_pachipro_amateur_qty': 'パチプロ アマ', 'vb_pachipro_semi_qty': 'パチプロ セミ', 'vb_pachipro_pro_qty': 'パチプロ プロ',
    'baccarat_table_nft_qty': 'バカラテーブル',
    'vb_koguchi_amount_man': '小口（万円）',
    'uni_owner_ticket_nft_qty': 'オーナーチケット',
    'vb_coin_qty': 'PV Coin',
}


JST = dt.timezone(dt.timedelta(hours=9))


def parse_dt(s, naive_tz=JST):
    """日時を解釈する。タイムゾーンの無い値は naive_tz とみなす（既定は JST。`user_registered` は UTC を渡す）。"""
    if not s:
        return None
    s = s.strip()
    for fmt in ('%Y-%m-%d %H:%M:%S', '%Y-%m-%dT%H:%M:%S%z', '%Y-%m-%d'):
        try:
            v = dt.datetime.strptime(s, fmt)
            return v if v.tzinfo else v.replace(tzinfo=naive_tz)
        except ValueError:
            continue
    return None


def pct(n, d):
    """割合。分母が 0 のときは「—」（0 件の入力で止めない）。"""
    return f'{n / d:.1%}' if d else '—'


def num(s):
    try:
        return float(str(s).strip())
    except (TypeError, ValueError):
        return 0.0


def holding(m, k):
    """保有量 = 利用可能残高 + 出庫保留（<key>_withdraw_hold）。

    出庫申請中の分は利用可能残高から保留キーへ移っているだけで会員の保有（members PR #103、D29）。
    保留だけが残る会員（全量を申請中）を非保有に数えないための加算。
    """
    return num(m.get(k)) + num(m.get(k + '_withdraw_hold'))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('export')
    ap.add_argument('--asof', help='基準時刻（既定: JSON の exported_at）')
    ap.add_argument('--input-location', help='入力 JSON の置き場所（Git 外）。指定すると表の冒頭に書く')
    ap.add_argument('--note', action='append', default=[],
                    help='抽出ごとの注記（§4 に 1 行ずつ出す。抽出の日付や件数に依存する文はここで渡す）')
    a = ap.parse_args()
    d = json.load(open(a.export))
    asof = parse_dt(a.asof or d['exported_at'])
    users = d['users']
    meta = collections.defaultdict(dict)
    for uid, k, v in d['meta']:
        meta[str(uid)][k] = v
    ids = [str(u['ID']) for u in users]
    # 権限の usermeta はテーブルの接頭辞付き（wp_capabilities など）。入力 JSON に prefix があればそれを使い、
    # 無ければ（prefix を出さない版の抽出）従来どおり wp_ とみなす
    cap_key = d.get('prefix', 'wp_') + 'capabilities'

    registered = len(ids)
    # テストアカウントは登録（wp_users の全行）には含め、以降の指標と割合の分母からは外す
    tests = {i for i in ids if str(meta[i].get('uni_test_account', '')).strip() == '1'}
    ids = [i for i in ids if i not in tests]
    base = len(ids)  # 割合の分母（テストを除く登録。運営・統合済みを含み、分子と同じ母集団）
    test_note = f'・テスト {len(tests)}' if tests else ''
    merged = sum(1 for i in ids if meta[i].get('uni_account_merged_into'))
    roles = collections.Counter('administrator' if 'administrator' in meta[i].get(cap_key, '')
                                else 'editor' if 'editor' in meta[i].get(cap_key, '')
                                else 'subscriber' for i in ids)
    staff = roles['administrator'] + roles['editor']
    started = sum(1 for i in ids if meta[i].get('uni_initial_login_completed') == '1')
    last_login = {i: parse_dt(meta[i].get('uni_last_login_at')) for i in ids}
    # 基準時刻より後の最終ログイン（時計のずれ等）は活動に数えず、件数を注記に出す
    future = sum(1 for t in last_login.values() if t and t > asof)

    def active(days):
        window = dt.timedelta(days=days)
        return sum(1 for t in last_login.values() if t and t <= asof and asof - t <= window)
    act90, act30, act7 = active(90), active(30), active(7)
    NFT_KEYS = [k for k in HOLDING_KEYS if k not in ('vb_koguchi_amount_man', 'uni_owner_ticket_nft_qty', 'vb_coin_qty')]
    holders = sum(1 for i in ids if any(holding(meta[i], k) > 0 for k in NFT_KEYS))
    holders_any = sum(1 for i in ids if any(holding(meta[i], k) > 0 for k in HOLDING_KEYS))
    holders_by = {label: sum(1 for i in ids if holding(meta[i], k) > 0) for k, label in HOLDING_KEYS.items()}
    uni = sum(1 for i in ids if meta[i].get('uni_member') == '1')
    vb = sum(1 for i in ids if meta[i].get('vb_member') == '1')
    # user_registered は UTC。JST の日付に直す。解釈できない値は件数を出して範囲から外す
    reg_parsed = [parse_dt(u['user_registered'], naive_tz=dt.timezone.utc) for u in users]
    regs = sorted(r.astimezone(JST) for r in reg_parsed if r)
    reg_bad = sum(1 for r in reg_parsed if not r)
    reg_range = f'{regs[0].date().isoformat()} 〜 {regs[-1].date().isoformat()}' if regs else '—'
    reg_bad_note = f'。解釈できない値 {reg_bad} 件は範囲から外した' if reg_bad else ''

    print('# 利用規模 3 段（登録／利用開始／90 日活動）')
    print()
    print(f'基準時刻: {asof.isoformat()}　入力: `{a.export.split("/")[-1]}`（exported_at {d["exported_at"]}）　生成: `scripts/usage_scale.py`（再実行で同じ表が出る）')
    print()
    if a.input_location:
        print(f'入力の所在: {a.input_location}（**Git 外**。個人情報を含むため第三者には渡さず、本表のみを渡す）')
        print()
    print('本表は「本番で稼働し、会員に使われている」ことを示す資料。売上・顧客基盤の資産価値の算定には使わない（`docs/03_TRANSFER_PLAN.md` §2.4）。')
    print()
    print('## 1. 3 段の値')
    print()
    print('| 段 | 値 | 定義（本番 DB の根拠） |')
    print('|---|---:|---|')
    print(f'| 登録 | {registered:,} | `wp_users` の全行。内訳: 会員 {roles["subscriber"]:,}・運営 {staff}{test_note}。一括取り込み（2026-03-31）が大半で、`user_registered` は購入日ではない |')
    print(f'| 利用開始 | {started:,} | usermeta `uni_initial_login_completed = 1`（初回ログインを完了し、マイページを開いた会員）。登録比 {pct(started, base)} |')
    print(f'| 90 日活動 | {act90:,} | usermeta `uni_last_login_at` が基準時刻の前 90 日（90×24 時間）以内。登録比 {pct(act90, base)}、利用開始比 {pct(act90, started)} |')
    print()
    print(f'登録比の分母は、登録からテストアカウントを除いた {base:,}（運営 {staff}・別口座へ統合済み {merged} を含む。分子の利用開始・活動と同じ母集団）。')
    print()
    print('## 2. 補助指標')
    print()
    print('| 指標 | 値 | 定義 |')
    print('|---|---:|---|')
    print(f'| 30 日活動 / 7 日活動 | {act30:,} / {act7:,} | 同上の 30 日（30×24 時間）・7 日（7×24 時間） |')
    print(f'| 商品換価権 NFT（パック・持分・パチプロ・島・mini）の保有者 | {holders:,} | 小口・オーナーチケット・PV Coin を除く保有 usermeta（利用可能残高＋出庫保留 `_withdraw_hold`）のいずれかが 0 より大きい |')
    print(f'| 何らかの保有がある会員（小口・オーナーチケット・PV Coin を含む） | {holders_any:,} | オーナーチケットは Owner\'s Pass の枚数確認用の記録で、ほぼ全会員が持つ |')
    print(f'| UNI 由来 / VB 由来（重複あり） | {uni:,} / {vb:,} | `uni_member = 1` / `vb_member = 1` |')
    print(f'| 別口座へ統合済み | {merged} | `uni_account_merged_into` あり（登録数に含まれる） |')
    print(f'| 登録日レンジ | {reg_range} | `user_registered`（UTC で保存。JST の日付に直した{reg_bad_note}） |')
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
    print('- **退会・停止のステータス値は本番 DB に存在しない**（usermeta `status` は全員 active）。退会者は 2026-03-31 の取り込み時点で除外されており、VB リストの「退会・返金依頼中」の行は DB に反映されていない。登録数はこれを含まない上限値として読む。')
    print('- 「利用開始」は初回ログイン完了で数える。初回ログイン通知の送付有無（`uni_initial_login_notice_sent_at`）ではない。')
    print('- 「90 日活動」はログインのみを見る。開封・送信などの操作は数えない（監査ログで別途取れる）。')
    print(f'- 活動はイベント駆動で、Reveal（2026-09-09）などの出来事の直後に山が出る。7 日活動（{act7:,}）は抽出日の直前の出来事の影響を受けるため、平常時の水準は複数回の抽出で確かめる。')
    print('- 小口（万円）と PV Coin は会員側の残高（会社側の履行義務）であり、NFT の保有とは性質が異なる。§3 では区別して読む。')
    print('- 運営の口座は「登録」の内訳で分けて示すだけで、利用開始・活動・保有者などの値と割合の分母には含む（members `docs/DECISIONS.md` D42。含めるかは次に表を作り直すときに判断する）。')
    print('- 個人情報は出力しない。再実行時は `prod_db_export_readonly.php` の最新 JSON を渡す。')
    if tests:
        print(f'- テストアカウント（usermeta `uni_test_account = 1`）{len(tests)} 件は「登録」の内訳にだけ出し、利用開始・活動・保有者・UNI/VB 由来・統合済みの値と割合の分母には含めない。')
    if future:
        print(f'- 最終ログインが基準時刻より後の口座 {future} 件は活動に数えていない（時計のずれ等。値の確認が要る）。')
    for note in a.note:
        print(f'- {note}')


if __name__ == '__main__':
    main()
