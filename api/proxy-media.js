/**
 * /api/proxy-media.js — Same-origin media proxy for Safari CORS/Content-Type fix
 * Samsung C5000 LCD TV Simulator
 * ────────────────────────────────────────────────────────────────────────────
 *  GitHub release assets (release-assets.githubusercontent.com) return
 *  Content-Type: application/octet-stream with no CORS headers. Safari
 *  refuses to play media with unknown content-type from cross-origin requests.
 *
 *  This proxy fetches the media from GitHub and returns it with proper
 *  Content-Type and Access-Control-Allow-Origin headers from the same origin.
 * ────────────────────────────────────────────────────────────────────────── */

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(204).end();
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const url = new URL(req.url, 'http://localhost').searchParams.get('url');
  if (!url) {
    return res.status(400).json({ error: 'Missing url query parameter' });
  }

  const ext = url.split('.').pop().toLowerCase().split('?')[0];
  const MIME_MAP = {
    mp4:  'video/mp4',   mp3:  'audio/mpeg',
    m4a:  'audio/mp4',   m4v:  'video/mp4',
    ogg:  'audio/ogg',   ogv:  'video/ogg',
    wav:  'audio/wav',   webm: 'video/webm',
    mov:  'video/quicktime', mkv: 'video/x-matroska',
  };

  try {
    const upstream = await fetch(url);
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: 'Upstream ' + upstream.status });
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    const contentType = MIME_MAP[ext] || upstream.headers.get('content-type') || 'application/octet-stream';

    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buffer.length);
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
    res.setHeader('X-Proxy-Type', ext);
    res.status(200).end(buffer);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
}
