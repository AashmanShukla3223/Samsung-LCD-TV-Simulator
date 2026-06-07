/**
 * /api/proxy-media.js — Same-origin media proxy for Safari CORS/Content-Type fix
 * Samsung C5000 LCD TV Simulator
 *
 * Uses Web Handler format (return Response) for native Vercel streaming.
 */
const MIME_MAP = {
  mp4:  'video/mp4',   mp3:  'audio/mpeg',
  m4a:  'audio/mp4',   m4v:  'video/mp4',
  ogg:  'audio/ogg',   ogv:  'video/ogg',
  wav:  'audio/wav',   webm: 'video/webm',
  mov:  'video/quicktime', mkv: 'video/x-matroska',
};

export default {
  async fetch(request) {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Max-Age': '86400',
        },
      });
    }
    if (request.method !== 'GET') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), {
        status: 405, headers: { 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(request.url).searchParams.get('url');
    if (!url) {
      return new Response(JSON.stringify({ error: 'Missing url query parameter' }), {
        status: 400, headers: { 'Content-Type': 'application/json' },
      });
    }

    const ext = url.split('.').pop().toLowerCase().split('?')[0];
    const contentType = MIME_MAP[ext] || 'application/octet-stream';
    const range = request.headers.get('range') || '';

    try {
      const abort = new AbortController();
      const timeout = setTimeout(() => abort.abort(), 15000);
      const upstreamRes = await fetch(url, {
        headers: {
          ...(range ? { Range: range } : {}),
          'User-Agent': 'Mozilla/5.0',
        },
        signal: abort.signal,
      });
      clearTimeout(timeout);

      if (!upstreamRes.ok && upstreamRes.status !== 206) {
        return new Response(JSON.stringify({ error: 'Upstream ' + upstreamRes.status }), {
          status: upstreamRes.status, headers: { 'Content-Type': 'application/json' },
        });
      }

      const responseHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400, immutable',
        'X-Proxy-Type': ext,
      };
      const cl = upstreamRes.headers.get('content-length');
      if (cl) responseHeaders['Content-Length'] = cl;
      const cr = upstreamRes.headers.get('content-range');
      if (cr) responseHeaders['Content-Range'] = cr;

      const statusCode = range ? 206 : (upstreamRes.status === 206 ? 206 : 200);
      return new Response(upstreamRes.body, {
        status: statusCode,
        headers: responseHeaders,
      });
    } catch (err) {
      return new Response(JSON.stringify({ error: err.message }), {
        status: 502, headers: { 'Content-Type': 'application/json' },
      });
    }
  },
};
