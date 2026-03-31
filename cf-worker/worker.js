export default {
  async fetch(request) {
    const url = new URL(request.url);
    const target = url.searchParams.get('url');

    if (!target) {
      return new Response('Missing ?url= parameter', { status: 400 });
    }

    // Only allow anichin.moe
    const targetUrl = new URL(target);
    if (!targetUrl.hostname.endsWith('anichin.moe')) {
      return new Response('Forbidden', { status: 403 });
    }

    const res = await fetch(targetUrl.toString(), {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
        'Referer': 'https://anichin.moe/',
      },
    });

    const body = await res.text();

    return new Response(body, {
      status: res.status,
      headers: {
        'Content-Type': res.headers.get('Content-Type') || 'text/html',
        'Access-Control-Allow-Origin': '*',
      },
    });
  },
};
