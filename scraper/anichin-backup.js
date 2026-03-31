const axios = require('axios');
const cheerio = require('cheerio');

const BASE_URL = 'https://anichin.moe';

const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
  'Referer': BASE_URL,
};

async function fetchPage(url) {
  try {
    const res = await axios.get(url, { headers, timeout: 15000 });
    return cheerio.load(res.data);
  } catch (err) {
    console.error(`Fetch error: ${url}`, err.message);
    throw new Error(`Failed to fetch: ${url}`);
  }
}

function parseCard($, el) {
  const $el = $(el);
  const $a = $el.find('a[title]').first();
  const title = $a.attr('title') || $el.find('.tt').first().text().trim() || $el.find('h2').first().text().trim();
  const poster = $el.find('img').first().attr('src') || $el.find('img').first().attr('data-src') || '';
  const link = $a.attr('href') || $el.find('a').first().attr('href') || '';
  const id = link.replace(BASE_URL, '').replace(/^\//, '').replace(/\/$/, '');
  const animeId = id.replace(/-episode-[\d-]+$/i, '');
  const episode = $el.find('.epx').first().text().trim();
  const rating = $el.find('.rating, .imdb, .score, .numscore').first().text().trim();
  const genre = $el.find('.genres a, .genre a').first().text().trim();
  const type = $el.find('.typez').first().text().trim();
  return { id, animeId, title, poster, link, episode, rating, genre, type };
}

function dedup(items) {
  const seen = new Set();
  return items.filter(item => {
    if (!item.id || seen.has(item.id)) return false;
    seen.add(item.id);
    return true;
  });
}

async function getHome() {
  const $ = await fetchPage(BASE_URL);
  const latestEpisodes = [];
  const banners = [];

  $('.swiper-slide.item').each((i, el) => {
    const bgStyle = $(el).find('.backdrop').attr('style') || '';
    const poster = bgStyle.match(/url\(['"]?([^'")\s]+)['"]?\)/)?.[1] || '';
    const $titleA = $(el).find('h2 a').first();
    const title = $titleA.attr('data-jtitle') || $titleA.text().trim();
    const link = $titleA.attr('href') || $(el).find('a.watch').attr('href') || '';
    const id = link.replace(BASE_URL, '').replace(/^\//, '').replace(/\/$/, '');
    const synopsis = $(el).find('p').text().trim().substring(0, 200);
    if (title && poster) banners.push({ id, title, poster, link, synopsis });
  });

  $('.listupd.normal .bs').each((i, el) => {
    latestEpisodes.push(parseCard($, el));
  });

  const allFilters = {};
  $('.filter').each((i, el) => {
    const parentName = $(el).find('button').text().trim();
    const opts = [];
    $(el).find('input').each((j, input) => {
      const val = $(input).attr('value');
      const text = $(input).parent().text().trim();
      if (val) opts.push({ id: val, name: text });
    });
    if (opts.length > 0) allFilters[parentName] = opts;
  });

  const genres = allFilters['Genre All'] || [];

  const [movieData, droppedData] = await Promise.all([
    getMovies(1),
    getDropped(1)
  ]);

  return {
    banners,
    latestEpisodes: dedup(latestEpisodes).slice(0, 20),
    movies: movieData.items.slice(0, 12),
    dropped: droppedData.items.slice(0, 12),
    genres,
    allFilters
  };
}

async function getRecent(page = 1) {
  const url = `${BASE_URL}/page/${page}/`;
  const $ = await fetchPage(url);
  const items = [];
  $('.listupd .bs, .bixbox .bs').each((i, el) => items.push(parseCard($, el)));
  const hasNext = $('a').toArray().some(el => $(el).text().trim() === 'Next' || $(el).attr('href')?.includes(`/page/${page + 1}/`));
  return { page, items: dedup(items), hasNext };
}

async function getOngoing(page = 1) {
  const url = page > 1 ? `${BASE_URL}/ongoing/page/${page}/` : `${BASE_URL}/ongoing/`;
  const $ = await fetchPage(url);
  const items = [];
  $('.bixbox').first().find('.bsx').each((i, el) => items.push(parseCard($, el)));
  const hasNext = !!$('.next.page-numbers, a.next').length;
  return { page, items: dedup(items), hasNext };
}

async function getCompleted(page = 1) {
  const url = page > 1 ? `${BASE_URL}/completed/page/${page}/` : `${BASE_URL}/completed/`;
  const $ = await fetchPage(url);
  const items = [];
  $('.bixbox').first().find('.bsx').each((i, el) => items.push(parseCard($, el)));
  const hasNext = !!$('.next.page-numbers, a.next').length;
  return { page, items: dedup(items), hasNext };
}

async function getAnimeDetails(id) {
  const url = `${BASE_URL}/${id}/`;
  const $ = await fetchPage(url);

  const title = $('h1.entry-title, .entry-title, h1').first().text().trim();
  const poster = $('.thumb img, .poster img').first().attr('src') || '';

  // Ambil semua paragraf synopsis dari entry-content
  const synParts = [];
  $('.entry-content p').each((i, el) => {
    const t = $(el).text().trim();
    if (t) synParts.push(t);
  });
  const synopsis = synParts.join(' ') || $('.synops, .desc').first().text().trim();

  const rating = $('.rating strong, .imdb, .score, .numscore').first().text().trim();

  // native/alternative title
  const native = $('.alter, .alttitle, .native').first().text().trim();

  const getMeta = (label) => {
    let val = '';
    $('.spe span, .infox span').each((i, el) => {
      const b = $(el).find('b').text().trim();
      if (b.toLowerCase().includes(label.toLowerCase())) {
        val = $(el).text().replace(b, '').replace(':', '').trim();
      }
    });
    return val;
  };

  const studio    = getMeta('Studio') || $('.spe span:contains("Studio") a').first().text().trim();
  const network   = getMeta('Network') || getMeta('Produser');
  const status    = getMeta('Status');
  const type      = getMeta('Type');
  const released  = getMeta('Released');
  const duration  = getMeta('Duration');
  const season    = getMeta('Season');
  const country   = getMeta('Country');
  const episodes_count = getMeta('Episodes');
  const fansub    = getMeta('Fansub');
  const posted_by = getMeta('Posted by') || getMeta('Posted By');
  const released_on = getMeta('Released on') || getMeta('Released On');
  const updated_on  = getMeta('Updated on') || getMeta('Updated On');

  const genres = [];
  $('.genxed a, .genres a, .genre a').each((i, el) => {
    const g = $(el).text().trim();
    if (g) genres.push(g);
  });

  const episodes = [];
  $('.eplister ul li, #episodelist li').each((i, el) => {
    const epTitle = $(el).find('.epl-title').text().trim();
    const epNum = $(el).find('.epl-num').text().trim();
    const epLink = $(el).find('a').attr('href') || '';
    const epId = epLink.replace(BASE_URL, '').replace(/^\//, '').replace(/\/$/, '');
    const epDate = $(el).find('.epl-date').text().trim();
    if (epTitle || epId) episodes.push({ id: epId, title: epTitle, num: epNum, link: epLink, date: epDate });
  });

  const batchGroups = [];
  $('.mctnx .soraddlx').each((i, group) => {
    const groupTitle = $(group).find('.sorattlx h3').text().trim();
    const qualities = [];
    $(group).find('.soraurlx').each((j, row) => {
      const quality = $(row).find('strong').text().trim();
      const links = [];
      $(row).find('a').each((k, a) => {
        const host = $(a).text().trim();
        const url = $(a).attr('href') || '';
        if (url) links.push({ host, url });
      });
      if (quality) qualities.push({ quality, links });
    });
    if (groupTitle) batchGroups.push({ title: groupTitle, qualities });
  });

  // legacy flat batch (fallback)
  const batchLinks = [];
  $('.batchlink a, .dlbatch a').each((i, el) => {
    const quality = $(el).text().trim();
    const href = $(el).attr('href') || '';
    if (href) batchLinks.push({ quality, url: href });
  });

  return { id, title, native, poster, synopsis, rating, studio, network, status, type, released, duration, season, country, episodes_count, fansub, posted_by, released_on, updated_on, genres, episodes, batchGroups, batchLinks };
}

async function getEpisode(id) {
  const url = `${BASE_URL}/${id}/`;
  const $ = await fetchPage(url);

  const title = $('h1.entry-title, .entry-title').first().text().trim();
  const servers = [];
  const downloads = [];

  // Servers are in .mirror <select> options — value is base64-encoded iframe HTML
  $('.mirror option').each((i, el) => {
    const name = $(el).text().trim();
    const val = $(el).attr('value') || '';
    if (!val) return;
    try {
      const decoded = Buffer.from(val, 'base64').toString('utf-8');
      const $iframe = cheerio.load(decoded);
      const iframe = $iframe('iframe').attr('src') || '';
      if (iframe) servers.push({ name, iframe });
    } catch (_) {}
  });

  // Fallback: grab iframe directly from player embed
  if (servers.length === 0) {
    $('iframe').each((i, el) => {
      const src = $(el).attr('src') || '';
      if (src) servers.push({ name: `Server ${i + 1}`, iframe: src });
    });
  }

  // Parse download groups: each .soraddlx = one group (episode title + quality rows)
  const dlGroups = [];
  $('.mctnx .soraddlx').each((i, group) => {
    const groupTitle = $(group).find('.sorattlx h3').text().trim();
    const qualities = [];
    $(group).find('.soraurlx').each((j, row) => {
      const quality = $(row).find('strong').text().trim();
      const links = [];
      $(row).find('a').each((k, a) => {
        const host = $(a).text().trim();
        const url = $(a).attr('href') || '';
        if (url) links.push({ host, url });
      });
      if (quality) qualities.push({ quality, links });
    });
    if (groupTitle || qualities.length) dlGroups.push({ title: groupTitle, qualities });
  });

  const prevEp = $('.naveps .bpr a, .prev-ep a').attr('href') || '';
  const nextEp = $('.naveps .bnt a, .next-ep a').attr('href') || '';
  const prevId = prevEp.replace(BASE_URL, '').replace(/^\//, '').replace(/\/$/, '');
  const nextId = nextEp.replace(BASE_URL, '').replace(/^\//, '').replace(/\/$/, '');

  // Derive animeId from episode URL (strip -episode-NNN-... suffix)
  const animeId = id.replace(/-episode-\d+.*$/i, '').replace(/-ep-?\d+.*$/i, '');

  // Fetch anime detail in parallel to get episode list for sidebar
  let episodes = [];
  try {
    const animeData = await getAnimeDetails(animeId);
    episodes = animeData.episodes || [];
  } catch (_) {}

  return { id, animeId, title, servers, downloads, dlGroups, prevId, nextId, episodes };
}

async function searchAnime(query) {
  const url = `${BASE_URL}/?s=${encodeURIComponent(query)}`;
  const $ = await fetchPage(url);
  const items = [];
  $('.listupd .bs, .bsx, .search-result .bs').each((i, el) => items.push(parseCard($, el)));
  return { query, items: dedup(items) };
}

async function filterAnime(queryObj, page = 1) {
  const params = new URLSearchParams();
  const appendMulti = (key, val) => {
    if (Array.isArray(val)) val.forEach(v => params.append(key, v));
    else params.append(key, val);
  };
  if (queryObj.genre) appendMulti('genre[]', queryObj.genre);
  if (queryObj.season) appendMulti('season[]', queryObj.season);
  if (queryObj.studio) appendMulti('studio[]', queryObj.studio);
  if (queryObj.status) params.append('status', queryObj.status);
  if (queryObj.type) params.append('type', queryObj.type);
  if (queryObj.order) params.append('order', queryObj.order);

  const url = page > 1
    ? `${BASE_URL}/anime/page/${page}/?${params.toString()}`
    : `${BASE_URL}/anime/?${params.toString()}`;
  const $ = await fetchPage(url);
  const items = [];
  $('.listupd .bs, .bsx, .search-result .bs').each((i, el) => items.push(parseCard($, el)));
  const hasNext = !!$('.next.page-numbers, a.next').length;
  return { page, items: dedup(items), hasNext };
}

async function getMovies(page = 1) {
  return filterAnime({ type: 'movie' }, page);
}

async function getDropped(page = 1) {
  const url = page > 1 ? `${BASE_URL}/drop/page/${page}/` : `${BASE_URL}/drop/`;
  const $ = await fetchPage(url);
  const items = [];
  $('.listupd .bs, .bsx').each((i, el) => items.push(parseCard($, el)));
  const hasNext = !!$('.next.page-numbers, a.next').length;
  return { page, items: dedup(items), hasNext };
}

async function getGenres(genreId, page = 1) {
  const url = page > 1 ? `${BASE_URL}/genres/${genreId}/page/${page}/` : `${BASE_URL}/genres/${genreId}/`;
  const $ = await fetchPage(url);
  const items = [];
  $('.listupd .bs, .bsx').each((i, el) => items.push(parseCard($, el)));
  const genreName = $('h1.entry-title, .page-title').first().text().trim();
  const hasNext = !!$('.next.page-numbers, a.next').length;
  return { genreId, genreName, page, items: dedup(items), hasNext };
}

async function getAZ(letter, page = 1) {
  const show = letter === '#' ? '%23' : letter.toUpperCase();
  const url = page > 1
    ? `${BASE_URL}/az-lists/page/${page}/?show=${show}`
    : `${BASE_URL}/az-lists/?show=${show}`;
  const $ = await fetchPage(url);
  const items = [];
  $('.bsx').each((i, el) => items.push(parseCard($, el)));
  const hasNext = !!$('.next.page-numbers, a.next').length;
  return { letter, page, items: dedup(items), hasNext };
}

async function getPopular() {
  const $ = await fetchPage(BASE_URL);
  const result = { weekly: [], monthly: [], all: [] };
  const map = { 'wpop-weekly': 'weekly', 'wpop-monthly': 'monthly', 'wpop-alltime': 'all' };
  Object.entries(map).forEach(([cls, key]) => {
    $(`.serieslist.pop.${cls} li`).each((i, el) => {
      const num = $(el).find('.ctr').text().trim();
      const $a = $(el).find('h4 a').first();
      const title = $a.text().trim();
      const link = $a.attr('href') || '';
      const id = link.replace(BASE_URL, '').replace(/^\//, '').replace(/\/$/, '');
      const animeId = id.replace(/-episode-[\d-]+$/i, '');
      const poster = $(el).find('img').first().attr('src') || '';
      const genres = $(el).find('span a').map((j, g) => $(g).text().trim()).get();
      const rating = $(el).find('.numscore').text().trim();
      const ratingPct = $(el).find('.rtb span').attr('style') || '';
      result[key].push({ num, id, animeId, title, link, poster, genres, rating, ratingPct });
    });
  });
  return result;
}

async function getSchedule() {
  const scrapeAt = Date.now();
  const $ = await fetchPage(`${BASE_URL}/schedule/`);
  const schedule = {};
  $('.bixbox.schedulepage').each((i, dayEl) => {
    const day = $(dayEl).find('h3').first().text().trim();
    if (!day) return;
    const animes = [];
    $(dayEl).find('.bs').each((j, el) => {
      const $a = $(el).find('a[title]').first();
      const title = $a.attr('title') || '';
      const link = $a.attr('href') || '';
      const id = link.replace(BASE_URL, '').replace(/^\//, '').replace(/\/$/, '');
      const poster = $(el).find('img').first().attr('src') || '';
      const $epx = $(el).find('.epx.cndwn').first();
      const time = $epx.text().trim().replace(/^at\s*/i, '');
      const cndwn = parseInt($epx.attr('data-cndwn') || '0');
      const episode = $(el).find('.sb').first().text().trim();
      if (title) animes.push({ id, title, link, poster, time, cndwn, episode });
    });
    schedule[day] = animes;
  });
  return { schedule, scrapeAt };
}

module.exports = {
  getHome, getRecent, getOngoing, getCompleted,
  getAnimeDetails, getEpisode, searchAnime,
  getGenres, getAZ, getSchedule, getPopular,
  filterAnime, getMovies, getDropped,
};
