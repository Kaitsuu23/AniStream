const ALLOWED_HOSTS = ['anichin.moe', 'cdn.anichin.moe', 'anichin-player.web.id'];

function isAllowed(hostname) {
  return ALLOWED_HOSTS.some(h => hostname === h || hostname.endsWith('.' + h));
}

const UPSTREAM_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Referer': 'https://anichin.moe/',
  'Origin': 'https://anichin.moe',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
};

export default {
  async fetch(request) {
    const url = new URL(request.url);

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': '*',
        },
      });
    }

    const target = url.searchParams.get('url');
    if (!target) return new Response('Missing ?url= parameter', { status: 400 });

    let targetUrl;
    try { targetUrl = new URL(target); } catch { return new Response('Invalid URL', { status: 400 }); }

    if (!isAllowed(targetUrl.hostname)) return new Response('Forbidden', { status: 403 });

    // Proxy the request
    const upstreamRes = await fetch(targetUrl.toString(), {
      headers: {
        ...UPSTREAM_HEADERS,
        // Forward Range header for video seeking
        ...(request.headers.get('Range') ? { 'Range': request.headers.get('Range') } : {}),
        'Accept': '*/*',
      },
    });

    const contentType = upstreamRes.headers.get('Content-Type') || '';
    const isHtml = contentType.includes('text/html');

    if (isHtml) {
      // ── HTML embed proxy ──────────────────────────────────────────────
      let html = await upstreamRes.text();

      // Rewrite anichin-player.web.id iframes through this worker
      html = html.replace(
        /(<iframe[^>]+src=["'])([^"']*anichin-player\.web\.id[^"']*)(['"])/gi,
        (match, pre, iframeSrc, post) => {
          const proxied = `${url.origin}/?url=${encodeURIComponent(iframeSrc)}`;
          return `${pre}${proxied}${post}`;
        }
      );

      // Strip Cloudflare bot-challenge scripts
      html = html.replace(/<script[^>]*cdn-cgi\/challenge-platform[^>]*>[\s\S]*?<\/script>/gi, '');

      // If anichin-player.web.id page: override CSS so player fills viewport
      if (targetUrl.hostname === 'anichin-player.web.id') {
        const overrideStyle = `<style>
          html,body{margin:0!important;padding:0!important;gap:0!important;
            min-height:100%!important;width:100%!important;height:100%!important;
            display:block!important;overflow:hidden!important;background:#000!important;}
          .player-wrapper{position:fixed!important;inset:0!important;width:100%!important;
            height:100%!important;max-width:none!important;padding:0!important;
            border-radius:0!important;box-shadow:none!important;}
          .embed-panel,.back-link,.hint{display:none!important;}
        </style>`;
        html = html.replace('</head>', overrideStyle + '</head>');
      }

      return new Response(html, {
        status: upstreamRes.status,
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          'Access-Control-Allow-Origin': '*',
        },
      });
    } else {
      // ── Binary / stream proxy (mp4, m3u8, ts, etc.) ───────────────────
      const headers = new Headers({
        'Access-Control-Allow-Origin': '*',
      });

      // Forward relevant headers
      for (const h of ['Content-Type', 'Content-Length', 'Content-Range', 'Accept-Ranges']) {
        const v = upstreamRes.headers.get(h);
        if (v) headers.set(h, v);
      }

      return new Response(upstreamRes.body, {
        status: upstreamRes.status,
        headers,
      });
    }
  },
};
