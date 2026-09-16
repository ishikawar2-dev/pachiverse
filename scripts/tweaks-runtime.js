/* Tweaks 受信ランタイム（開発時専用）。scripts/tweaks-dev-server.mjs が配信する HTML に注入する。
   /api/dev/tweaks を 0.5 秒ごとにポーリングし、版（version）が変わったら window.PV_TWEAKS_APPLY に渡す。
   本番の HTML はこのファイルを参照しない。 */
(function () {
  if (!window.PV_TWEAKS_APPLY) {
    console.warn('tweaks: window.PV_TWEAKS_APPLY が無いページのため何もしません');
    return;
  }
  var API = '/api/dev/tweaks';
  var lastVersion = null;
  var failures = 0;
  function poll() {
    fetch(API, { cache: 'no-store' }).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.json();
    }).then(function (d) {
      failures = 0;
      if (d.version === lastVersion) return;
      lastVersion = d.version;
      window.PV_TWEAKS_APPLY(d.values || d.defaults || {});
    }).catch(function (err) {
      failures++;
      if (failures === 1 || failures % 40 === 0) console.debug('tweaks: poll failed', err);
    });
  }
  poll();
  setInterval(poll, 500);
  console.info('tweaks: runtime active (' + API + ')');
})();
