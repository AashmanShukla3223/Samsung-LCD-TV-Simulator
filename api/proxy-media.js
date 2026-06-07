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
    const range = req.headers['range'] || '';
    const upstreamRes = await fetch(url, {
      headers: range ? { Range: range } : {},
    });
    if (!upstreamRes.ok && upstreamRes.status !== 206) {
      return res.status(upstreamRes.status).json({ error: 'Upstream ' + upstreamRes.status });
    }

    const contentType = MIME_MAP[ext] || upstreamRes.headers.get('content-type') || 'application/octet-stream';
    const contentLength = upstreamRes.headers.get('content-length');
    const contentRange = upstreamRes.headers.get('content-range');

    const responseHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Content-Type': contentType,
      'Cache-Control': 'public, max-age=86400, immutable',
      'X-Proxy-Type': ext,
    };
    if (contentLength) responseHeaders['Content-Length'] = contentLength;
    if (contentRange) responseHeaders['Content-Range'] = contentRange;

    const statusCode = range ? 206 : 200;
    res.writeHead(statusCode, responseHeaders);

    const reader = upstreamRes.body.getReader();
    while (true) {
      const { done, value } = await reader.read();
      if (done) { res.end(); break; }
      res.write(value);
    }
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
}
