const crypto = require('crypto');

const DEFAULT_MEMBERS_API_BASE = 'https://members.pachiverse.com/wp-json/pachiverse/v1';
const MACHINE_CONTRACT = '0x55E3A05eaAc41aAeB596227CD4076e91033541b3';
const SUCCESS_CACHE = 'public, s-maxage=60, stale-while-revalidate=600, stale-if-error=86400';

function assetHash(key, tokenId) {
  return crypto
    .createHmac('sha256', Buffer.from(key, 'hex'))
    .update('pvm:' + tokenId)
    .digest('hex')
    .slice(0, 40);
}

function metadataUrl(uri) {
  return 'https://ipfs.filebase.io/ipfs/' + String(uri || '').replace(/^ipfs:\/\//, '');
}

function decorateMachine(machine, key) {
  const source = machine && typeof machine === 'object' ? machine : {};
  const whitelisted = {
    token_id: source.token_id,
    serial_no: source.serial_no,
    name: source.name,
    rarity: source.rarity,
    traits: Array.isArray(source.traits) ? source.traits.map(function (trait) {
      const item = trait && typeof trait === 'object' ? trait : {};
      return { label: item.label, value: item.value, code: item.code };
    }) : [],
    legend: source.legend && typeof source.legend === 'object' ? {
      name: source.legend.name,
      edition: source.legend.edition,
    } : null,
    ipfs_image_uri: source.ipfs_image_uri,
    ipfs_metadata_uri: source.ipfs_metadata_uri,
    image_url: source.image_url,
    image_url_fallback: source.image_url_fallback,
  };
  const hash = assetHash(key, whitelisted.token_id);
  return Object.assign(whitelisted, {
    thumb: '/assets/machines/t/' + hash + '.webp',
    detail: '/assets/machines/d/' + hash + '.webp',
    metadata_url: metadataUrl(whitelisted.ipfs_metadata_uri),
    opensea_url: 'https://opensea.io/assets/matic/' + MACHINE_CONTRACT + '/' + whitelisted.token_id,
  });
}

function sendJson(res, status, body, cacheControl) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', cacheControl);
  return res.status(status).json(body);
}

module.exports = async (req, res) => {
  const key = process.env.MACHINE_ASSET_KEY;
  if (!key || !/^[0-9a-f]{64}$/i.test(key)) {
    return sendJson(res, 500, { error: 'asset_key_missing' }, 'no-store');
  }

  const base = (process.env.MEMBERS_API_BASE || DEFAULT_MEMBERS_API_BASE).replace(/\/+$/, '');
  const controller = new AbortController();
  const timeout = setTimeout(function () { controller.abort(); }, 8000);

  try {
    const upstream = await fetch(base + '/collection', {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    });
    if (!upstream.ok) {
      console.error('collection: upstream returned ' + upstream.status);
      return sendJson(res, 502, { error: 'upstream_unavailable' }, 'no-store');
    }

    const data = await upstream.json();
    if (!data || typeof data !== 'object' || !Array.isArray(data.machines)) {
      console.error('collection: upstream payload has no machines array');
      return sendJson(res, 502, { error: 'upstream_unavailable' }, 'no-store');
    }

    const output = {
      collection: data.collection,
      total: data.total,
      discovered: data.discovered,
      rarity_quota: data.rarity_quota,
      rarity_discovered: data.rarity_discovered,
      reveal_open: data.reveal_open,
      release_at: data.release_at,
      generated_at: data.generated_at,
      machines: data.machines.map(function (machine) {
        return decorateMachine(machine, key);
      }),
    };
    return sendJson(res, 200, output, SUCCESS_CACHE);
  } catch (err) {
    console.error('collection: upstream fetch failed: ' + (err && err.message ? err.message : err));
    return sendJson(res, 502, { error: 'upstream_unavailable' }, 'no-store');
  } finally {
    clearTimeout(timeout);
  }
};

module.exports.assetHash = assetHash;
module.exports.decorateMachine = decorateMachine;
