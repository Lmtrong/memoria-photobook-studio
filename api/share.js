// Vercel Serverless Function & Node.js Cloud Share Relay for MEMORIA Photo Book Studio
// Handles uploading and fetching shared album bundles (photos + cover + pages + trimmed audio)
// using permanent cloud object storage (Catbox / Litterbox) server-side to avoid any browser CORS or Cloudflare blocks.

const inMemoryBundles = new Map();

async function readRawBody(req) {
  if (typeof req.body === 'string') return req.body;
  if (req.body && typeof req.body === 'object' && !Buffer.isBuffer(req.body)) {
    return JSON.stringify(req.body);
  }
  if (Buffer.isBuffer(req.body)) {
    return req.body.toString('utf8');
  }
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', (chunk) => chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk)));
    req.on('end', () => resolve(Buffer.concat(chunks).toString('utf8')));
    req.on('error', reject);
  });
}

async function uploadToCatbox(jsonStr) {
  const form = new FormData();
  form.append('reqtype', 'fileupload');
  form.append(
    'fileToUpload',
    new Blob([jsonStr], { type: 'text/plain' }),
    `memoria-album-${Date.now()}.txt`
  );

  const res = await fetch('https://catbox.moe/user/api.php', {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error(`Catbox status ${res.status}`);
  const text = (await res.text()).trim();
  if (!text.startsWith('https://files.catbox.moe/')) {
    throw new Error(`Unexpected Catbox response: ${text}`);
  }
  const fileName = text.split('/').pop();
  return `cb_${fileName}`;
}

async function uploadToLitterbox(jsonStr) {
  const form = new FormData();
  form.append('reqtype', 'fileupload');
  form.append('time', '72h');
  form.append(
    'fileToUpload',
    new Blob([jsonStr], { type: 'application/json' }),
    `memoria-album-${Date.now()}.json`
  );

  const res = await fetch('https://litterbox.catbox.moe/resources/internals/api.php', {
    method: 'POST',
    body: form,
  });
  if (!res.ok) throw new Error(`Litterbox status ${res.status}`);
  const text = (await res.text()).trim();
  if (!text.startsWith('https://litter.catbox.moe/')) {
    throw new Error(`Unexpected Litterbox response: ${text}`);
  }
  const fileName = text.split('/').pop();
  return `lb_${fileName}`;
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }

  try {
    if (req.method === 'POST') {
      const bodyStr = await readRawBody(req);
      if (!bodyStr || bodyStr.length < 10) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: false, error: 'Empty bundle payload' }));
        return;
      }

      // Also cache in memory by albumId if present
      let albumId = null;
      try {
        const parsed = JSON.parse(bodyStr);
        albumId = parsed?.album?.id || null;
        if (albumId) {
          inMemoryBundles.set(albumId, bodyStr);
        }
      } catch {
        // ignore parse error
      }

      let shareKey = null;
      try {
        shareKey = await uploadToCatbox(bodyStr);
      } catch (err1) {
        try {
          shareKey = await uploadToLitterbox(bodyStr);
        } catch (err2) {
          if (albumId) {
            shareKey = `mem_${albumId}`;
          } else {
            throw err2;
          }
        }
      }

      if (shareKey) {
        inMemoryBundles.set(shareKey, bodyStr);
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ ok: true, key: shareKey }));
      return;
    }

    if (req.method === 'GET') {
      const urlObj = new URL(req.url || '', 'http://localhost');
      const key = (urlObj.searchParams.get('key') || urlObj.searchParams.get('s') || '').trim();
      const albumId = (urlObj.searchParams.get('albumId') || '').trim();

      // 1. Check in-memory cache first
      if (key && inMemoryBundles.has(key)) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        res.end(inMemoryBundles.get(key));
        return;
      }
      if (albumId && inMemoryBundles.has(albumId)) {
        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.end(inMemoryBundles.get(albumId));
        return;
      }

      if (!key) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: false, error: 'Missing share key' }));
        return;
      }

      let targetUrl = null;
      if (key.startsWith('cb_')) {
        const file = key.slice(3).replace(/[^a-zA-Z0-9._-]/g, '');
        targetUrl = `https://files.catbox.moe/${file}`;
      } else if (key.startsWith('lb_')) {
        const file = key.slice(3).replace(/[^a-zA-Z0-9._-]/g, '');
        targetUrl = `https://litter.catbox.moe/${file}`;
      } else if (/^[a-zA-Z0-9._-]+$/.test(key)) {
        targetUrl = `https://files.catbox.moe/${key}`;
      }

      if (!targetUrl) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: false, error: 'Invalid share key format' }));
        return;
      }

      const upstream = await fetch(targetUrl);
      if (!upstream.ok) {
        res.statusCode = upstream.status;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ ok: false, error: `Upstream returned ${upstream.status}` }));
        return;
      }

      const jsonText = await upstream.text();
      inMemoryBundles.set(key, jsonText);

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      res.end(jsonText);
      return;
    }

    res.statusCode = 405;
    res.end(JSON.stringify({ ok: false, error: 'Method Not Allowed' }));
  } catch (err) {
    res.statusCode = 500;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ ok: false, error: String(err) }));
  }
}
