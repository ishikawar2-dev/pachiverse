import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function responseStub() {
  return {
    headers: {},
    statusCode: 200,
    body: null,
    setHeader(name, value) { this.headers[name.toLowerCase()] = value; },
    status(code) { this.statusCode = code; return this; },
    json(value) { this.body = value; return this; },
    send(value) { this.body = value; return this; },
  };
}

function machine(tokenId, rarity, legend) {
  return {
    token_id: tokenId,
    serial_no: tokenId,
    name: 'Pachiverse Machine #' + tokenId,
    rarity,
    traits: [
      { label: 'Background', value: legend ? legend.name : 'Night City', code: 'BG_NIGHT_CITY' },
      { label: 'Body', value: legend ? legend.name : 'Chrome', code: 'BODY_CHROME' },
      { label: 'Effect', value: legend ? legend.name : 'Sparks', code: 'FX_SPARKS' },
    ],
    legend,
    ipfs_image_uri: 'ipfs://example/' + tokenId + '.webp',
    ipfs_metadata_uri: 'ipfs://example/' + tokenId + '.json',
    image_url: 'https://ipfs.filebase.io/ipfs/example/' + tokenId + '.webp',
    image_url_fallback: 'https://ipfs.io/ipfs/example/' + tokenId + '.webp',
  };
}

const vercel = JSON.parse(fs.readFileSync(path.join(root, 'vercel.json'), 'utf8'));
const rewriteSources = vercel.rewrites.map((rewrite) => rewrite.source);
assert(rewriteSources.includes('/collection'), 'vercel.json must rewrite /collection');
assert(rewriteSources.includes('/collection/:id(\\d{1,3})'), 'vercel.json must rewrite numeric detail paths');
assert(rewriteSources.includes('/collection/:id(\\d{1,3})/'), 'vercel.json must rewrite numeric detail paths with a trailing slash');

const collectionApi = require(path.join(root, 'api/collection.js'));
const machinePage = require(path.join(root, 'api/machine-page.js'));
assert.equal(typeof collectionApi, 'function', 'api/collection.js must export a handler');
assert.equal(typeof machinePage, 'function', 'api/machine-page.js must export a handler');

const zeroKey = '0'.repeat(64);
assert.equal(
  collectionApi.assetHash(zeroKey, 137),
  '1c03a9f4abd260569e7e8606d7c21ad91fde3f3c',
  'assetHash verification vector failed',
);

const sample = {
  collection: 'Pachiverse Machines',
  user_id: 41,
  total: 500,
  discovered: 2,
  rarity_quota: { LEGEND: 5, UR: 15, SSSR: 30, SSR: 60, SR: 120, R: 270 },
  rarity_discovered: { LEGEND: 1, UR: 0, SSSR: 0, SSR: 1, SR: 0, R: 0 },
  reveal_open: true,
  release_at: '2026-09-09T00:00:00+09:00',
  generated_at: '2026-09-02T10:00:00+00:00',
  machines: [
    machine(137, 'SSR', null),
    machine(241, 'LEGEND', { name: 'Genesis', edition: '1 of 1' }),
  ],
};
sample.machines[0].burn_status = 'pending_burn';

const originalFetch = globalThis.fetch;
process.env.MACHINE_ASSET_KEY = zeroKey;

globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => sample });
const collectionResponse = responseStub();
await collectionApi({}, collectionResponse);
assert.equal(collectionResponse.statusCode, 200, 'collection proxy mock must succeed');
assert.equal(collectionResponse.body.machines[0].name, sample.machines[0].name);
assert.equal(collectionResponse.body.machines[0].rarity, sample.machines[0].rarity);
assert.equal(collectionResponse.body.machines[0].traits[0].label, sample.machines[0].traits[0].label);
assert(!Object.hasOwn(collectionResponse.body, 'user_id'), 'collection proxy must omit non-whitelisted top-level fields');
assert(!Object.hasOwn(collectionResponse.body.machines[0], 'burn_status'), 'collection proxy must omit non-whitelisted machine fields');
for (const enriched of collectionResponse.body.machines) {
  assert.match(enriched.thumb, /^\/assets\/machines\/t\/[0-9a-f]{40}\.webp$/);
  assert.match(enriched.detail, /^\/assets\/machines\/d\/[0-9a-f]{40}\.webp$/);
  assert.match(enriched.metadata_url, /^https:\/\/ipfs\.filebase\.io\/ipfs\//);
  assert.match(enriched.opensea_url, /^https:\/\/opensea\.io\/assets\/matic\//);
}

globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => sample.machines[0] });
const discoveredResponse = responseStub();
await machinePage({ query: { id: '137' } }, discoveredResponse);
assert.equal(discoveredResponse.statusCode, 200);
assert.match(discoveredResponse.body, /<title>Pachiverse Machine #137 \| Pachiverse<\/title>/);
assert.match(discoveredResponse.body, /<meta property="og:image" content="https:\/\/pachiverse\.com\/assets\/machines\/d\/[0-9a-f]{40}\.webp" \/>/);
assert.match(discoveredResponse.body, /<meta property="og:image:width" content="1024" \/>/);
assert.match(discoveredResponse.body, /window\.__PACHIVERSE_MACHINE__/);
assert(!discoveredResponse.body.includes('@@HEAD_INJECT@@'));
assert(!discoveredResponse.body.includes('@@META_START@@'));

delete process.env.MACHINE_ASSET_KEY;
globalThis.fetch = async () => ({ ok: true, status: 200, json: async () => sample.machines[0] });
const missingKeyResponse = responseStub();
await machinePage({ query: { id: '137' } }, missingKeyResponse);
assert.equal(missingKeyResponse.statusCode, 500, 'machine page must fail closed when the asset key is missing');

globalThis.fetch = async () => ({ ok: false, status: 404, json: async () => ({ code: 'collection_machine_undiscovered' }) });
const undiscoveredResponse = responseStub();
await machinePage({ query: { id: '137' } }, undiscoveredResponse);
assert.equal(undiscoveredResponse.statusCode, 200);
assert.match(undiscoveredResponse.body, /<meta name="robots" content="noindex" \/>/);
assert(!undiscoveredResponse.body.includes('@@HEAD_INJECT@@'));
assert(!undiscoveredResponse.body.includes('@@META_START@@'));

globalThis.fetch = originalFetch;

const collectionHtml = fs.readFileSync(path.join(root, 'collection.html'), 'utf8');
assert(!collectionHtml.includes('ipfs://'), 'collection.html must not contain an IPFS URI');
assert(!/\bbafy[0-9a-z]+/i.test(collectionHtml), 'collection.html must not contain a CID');
assert(!/assets\/machines\/t\/[0-9a-f]{40}\.webp/i.test(collectionHtml), 'collection.html must not contain a derived asset filename');

for (const size of ['t', 'd']) {
  const files = fs.readdirSync(path.join(root, 'assets/machines', size));
  assert.equal(files.filter((name) => name.endsWith('.webp')).length, 500, size + ' must contain 500 webp files');
}

const pages = ['index.html', 'docs.html', 'faq.html', 'transparency.html', 'contracts.html', 'litepaper.html'];
for (const page of pages) {
  const html = fs.readFileSync(path.join(root, page), 'utf8');
  assert.equal((html.match(/class="nav-link" href="\/collection"/g) || []).length, 1, page + ' must contain the desktop Machines nav link');
  const mobileMenu = html.match(/<div class="mobile-menu"[\s\S]*?<\/div>/);
  assert(mobileMenu && mobileMenu[0].includes('href="/collection"'), page + ' must contain the mobile Machines menu link');
}

const contracts = fs.readFileSync(path.join(root, 'contracts.html'), 'utf8');
assert(contracts.includes('0x55E3A05eaAc41aAeB596227CD4076e91033541b3'));
assert(contracts.includes('0x2B5DaC082f664986e77b4f075617D1908BBd109C'));
assert(!contracts.toLowerCase().includes('0x9f3a5b10da36888f31a679f2f401eb9af27e2fe6'));

console.log('Collection Explorer checks passed.');
