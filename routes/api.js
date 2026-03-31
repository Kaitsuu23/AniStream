const express = require('express');
const router = express.Router();
const scraper = require('../scraper/anichin');

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

module.exports = router;
