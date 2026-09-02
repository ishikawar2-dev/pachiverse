const fs = require('fs');
const path = require('path');
const collectionApi = require('./collection.js');

const DEFAULT_MEMBERS_API_BASE = 'https://members.pachiverse.com/wp-json/pachiverse/v1';

function htmlEscape(value) {
  return String(value).replace(/[&<>"']/g, function (character) {
    return {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }[character];
  });
}

function scriptJson(value) {
  return JSON.stringify(value).replace(/<\/script/gi, '<\\/script');
}

function replaceMeta(html, meta, initialMachine) {
  const title = htmlEscape(meta.title);
  const description = htmlEscape(meta.description);
  const url = htmlEscape(meta.url);
  const image = htmlEscape(meta.image);
  const imageWidth = meta.imageWidth || 1200;
  const imageHeight = meta.imageHeight || 630;
  const robots = meta.noindex ? '<meta name="robots" content="noindex" />\n' : '';
  const block = [
    '<title>' + title + '</title>',
    '<meta name="description" content="' + description + '" />',
    robots.replace(/\n$/, ''),
    '<meta property="og:type" content="website" />',
    '<meta property="og:site_name" content="Pachiverse" />',
    '<meta property="og:title" content="' + title + '" />',
    '<meta property="og:description" content="' + description + '" />',
    '<meta property="og:url" content="' + url + '" />',
    '<meta property="og:image" content="' + image + '" />',
    '<meta property="og:image:width" content="' + imageWidth + '" />',
    '<meta property="og:image:height" content="' + imageHeight + '" />',
    '<meta property="og:image:alt" content="' + title + '" />',
    '<meta property="og:locale" content="en_US" />',
    '<meta name="twitter:card" content="summary_large_image" />',
    '<meta name="twitter:title" content="' + title + '" />',
    '<meta name="twitter:description" content="' + description + '" />',
    '<meta name="twitter:image" content="' + image + '" />',
    '<link rel="canonical" href="' + url + '" />',
  ].filter(Boolean).join('\n');

  return html
    .replace(/<!-- @@META_START@@ -->[\s\S]*?<!-- @@META_END@@ -->/, block)
    .replace('<!-- @@HEAD_INJECT@@ -->', '<script>window.__PACHIVERSE_MACHINE__ = ' + scriptJson(initialMachine) + ';<\/script>');
}

function undiscoveredPage(html, id) {
  return replaceMeta(html, {
    title: 'Machine #' + id + ' · Undiscovered | Pachiverse',
    description: 'This Pachiverse Machine has not been discovered yet.',
    url: 'https://pachiverse.com/collection/' + id,
    image: 'https://pachiverse.com/assets/ogp.png',
    noindex: true,
  }, { token_id: id, undiscovered: true });
}

module.exports = async (req, res) => {
  const id = Number(req.query && req.query.id);
  if (!Number.isInteger(id) || id < 1 || id > 500) {
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.status(404).send('Machine not found');
  }

  const html = fs.readFileSync(path.join(process.cwd(), 'collection.html'), 'utf8');
  const base = (process.env.MEMBERS_API_BASE || DEFAULT_MEMBERS_API_BASE).replace(/\/+$/, '');
  const controller = new AbortController();
  const timeout = setTimeout(function () { controller.abort(); }, 8000);

  try {
    const upstream = await fetch(base + '/collection/machines/' + id, {
      headers: { accept: 'application/json' },
      signal: controller.signal,
    });

    if (upstream.status === 404) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
      return res.status(200).send(undiscoveredPage(html, id));
    }
    if (!upstream.ok) {
      console.error('machine-page: upstream returned ' + upstream.status + ' for token ' + id);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      return res.status(200).send(undiscoveredPage(html, id));
    }

    const key = process.env.MACHINE_ASSET_KEY;
    if (!key || !/^[0-9a-f]{64}$/i.test(key)) {
      console.error('machine-page: MACHINE_ASSET_KEY is missing or malformed');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.setHeader('Cache-Control', 'no-store');
      return res.status(500).send('asset_key_missing');
    }

    const machine = collectionApi.decorateMachine(await upstream.json(), key);
    const title = 'Pachiverse Machine #' + id + ' | Pachiverse';
    const output = replaceMeta(html, {
      title: title,
      description: 'Pachiverse Machine #' + id + ' is a unique ' + machine.rarity + ' machine from the 500-piece Pachiverse generative NFT collection.',
      url: 'https://pachiverse.com/collection/' + id,
      image: 'https://pachiverse.com' + machine.detail,
      imageWidth: 1024,
      imageHeight: 1024,
      noindex: false,
    }, machine);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=600');
    return res.status(200).send(output);
  } catch (err) {
    console.error('machine-page: upstream fetch failed for token ' + id + ': ' + (err && err.message ? err.message : err));
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(undiscoveredPage(html, id));
  } finally {
    clearTimeout(timeout);
  }
};
