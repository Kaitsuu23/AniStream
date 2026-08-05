const express = require('express');
const router = express.Router();
const scraper = require('../scraper/anichin');
const axios = require('axios');

function handleError(res, err) {
  console.error(err.message);
  res.status(500).json({ error: err.message || 'Scraping failed' });
}

router.get('/home', async (req, res) => {
  try {
    const data = await scraper.getHome();
    res.json(data);
  } catch (err) { handleError(res, err); }
});

router.get('/ongoing', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const data = await scraper.getOngoing(page);
    res.json(data);
  } catch (err) { handleError(res, err); }
});

router.get('/completed', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const data = await scraper.getCompleted(page);
    res.json(data);
  } catch (err) { handleError(res, err); }
});

router.get('/recent', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const data = await scraper.getRecent(page);
    res.json(data);
  } catch (err) { handleError(res, err); }
});

router.get('/movies', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const data = await scraper.getMovies(page);
    res.json(data);
  } catch (err) { handleError(res, err); }
});

router.get('/dropped', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const data = await scraper.getDropped(page);
    res.json(data);
  } catch (err) { handleError(res, err); }
});

router.get('/anime/:id(*)', async (req, res) => {
  try {
    const data = await scraper.getAnimeDetails(req.params.id);
    res.json(data);
  } catch (err) { handleError(res, err); }
});

router.get('/episode/:id(*)', async (req, res) => {
  try {
    const data = await scraper.getEpisode(req.params.id);
    res.json(data);
  } catch (err) { handleError(res, err); }
});

router.get('/search', async (req, res) => {
  try {
    const q = req.query.q || '';
    if (!q) return res.json({ query: '', items: [] });
    const data = await scraper.searchAnime(q);
    res.json(data);
  } catch (err) { handleError(res, err); }
});

router.get('/filter', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const data = await scraper.filterAnime(req.query, page);
    res.json(data);
  } catch (err) { handleError(res, err); }
});

router.get('/genres/:genreId(*)', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const data = await scraper.getGenres(req.params.genreId, page);
    res.json(data);
  } catch (err) { handleError(res, err); }
});

router.get('/az/:letter', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const data = await scraper.getAZ(req.params.letter, page);
    res.json(data);
  } catch (err) { handleError(res, err); }
});

router.get('/popular', async (req, res) => {
  try {
    const data = await scraper.getPopular();
    res.json(data);
  } catch (err) { handleError(res, err); }
});

router.get('/schedule', async (req, res) => {
  try {
    const data = await scraper.getSchedule();
    res.json(data);
  } catch (err) { handleError(res, err); }
});

// ── Proxy: embed wrapper pages & direct streams from anichin.moe ─────────────
// anichin.moe/stream/* returns an HTML page with an inner iframe.
// When loaded from a different domain the server returns 403.
// We proxy the HTML on our server (sending the correct Referer) so the
// browser receives the page as if it came from us directly.
const ALLOWED_PROXY_HOSTS = ['anichin.moe', 'cdn.anichin.moe', 'anichin-player.web.id'];

const anichinHeaders = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
  'Referer': 'https://anichin.moe/',
  'Origin': 'https://anichin.moe',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'id-ID,id;q=0.9,en-US;q=0.8',
};

function isAllowedProxyHost(hostname) {
  return ALLOWED_PROXY_HOSTS.some(h => hostname === h || hostname.endsWith('.' + h));
}

// Proxy HTML embed wrapper (anichin.moe/stream/* pages)
// Also rewrites inner iframe URLs to go through this same proxy so the
// anichin-player.web.id referer check passes (it expects Referer: anichin.moe).
router.get('/proxy/embed', async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).send('Missing url param');

  let targetUrl;
  try { targetUrl = new URL(target); } catch { return res.status(400).send('Invalid URL'); }

  if (!isAllowedProxyHost(targetUrl.hostname)) return res.status(403).send('Host not allowed');

  try {
    const upstream = await axios.get(targetUrl.toString(), {
      timeout: 20000,
      headers: anichinHeaders,
    });

    let html = upstream.data;

    // Rewrite any inner iframe src that points to allowed hosts so it also
    // goes through our proxy (preserving the Referer: anichin.moe on the way).
    html = html.replace(
      /(<iframe[^>]+src=["'])([^"']+anichin-player\.web\.id[^"']*)(['"])/gi,
      (match, pre, iframeSrc, post) => {
        const proxied = `/api/proxy/embed?url=${encodeURIComponent(iframeSrc)}`;
        return `${pre}${proxied}${post}`;
      }
    );

    // Also strip the Cloudflare bot-challenge script to keep the page clean
    html = html.replace(/<script[^>]*cdn-cgi\/challenge-platform[^>]*>[\s\S]*?<\/script>/gi, '');

    // If this is the anichin-player.web.id page, override its CSS so the player
    // fills the entire iframe viewport (strip body padding/gap, expand .player-wrapper).
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

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  } catch (err) {
    console.error('Proxy embed error:', err.message);
    if (!res.headersSent) res.status(502).send('Upstream error: ' + err.message);
  }
});

// Proxy raw binary stream (mp4/m3u8/etc.)
router.get('/proxy/stream', async (req, res) => {
  const target = req.query.url;
  if (!target) return res.status(400).json({ error: 'Missing url param' });

  let targetUrl;
  try { targetUrl = new URL(target); } catch { return res.status(400).json({ error: 'Invalid URL' }); }

  if (!isAllowedProxyHost(targetUrl.hostname)) return res.status(403).json({ error: 'Host not allowed' });

  try {
    const upstream = await axios.get(targetUrl.toString(), {
      responseType: 'stream',
      timeout: 30000,
      headers: {
        ...anichinHeaders,
        'Accept': '*/*',
        ...(req.headers.range ? { 'Range': req.headers.range } : {}),
      },
    });

    res.status(upstream.status);
    res.setHeader('Content-Type', upstream.headers['content-type'] || 'application/octet-stream');
    res.setHeader('Access-Control-Allow-Origin', '*');
    if (upstream.headers['content-length']) res.setHeader('Content-Length', upstream.headers['content-length']);
    if (upstream.headers['content-range']) res.setHeader('Content-Range', upstream.headers['content-range']);
    if (upstream.headers['accept-ranges']) res.setHeader('Accept-Ranges', upstream.headers['accept-ranges']);

    upstream.data.pipe(res);
  } catch (err) {
    console.error('Proxy stream error:', err.message);
    if (!res.headersSent) res.status(502).json({ error: 'Upstream error: ' + err.message });
  }
});

module.exports = router;
