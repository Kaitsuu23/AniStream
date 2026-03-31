const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const { minify } = require('html-minifier-terser');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;

const minifyOpts = {
  collapseWhitespace: true,
  removeComments: true,
  minifyCSS: true,
  minifyJS: true,
  removeAttributeQuotes: true,
  removeRedundantAttributes: true,
  useShortDoctype: true,
};

async function sendMinified(res, filePath) {
  const html = fs.readFileSync(filePath, 'utf8');
  const minified = await minify(html, minifyOpts);
  res.setHeader('Content-Type', 'text/html');
  res.send(minified);
}

app.use(cors());
app.use(express.json());

// Serve static assets (css, js, img) but NOT html files
app.use(express.static(path.join(__dirname, 'public'), {
  index: false,
  extensions: []
}));

// Suppress favicon 404
app.get('/favicon.ico', (req, res) => res.status(204).end());

// API Routes
app.use('/api', apiRoutes);

// Serve frontend pages
app.get('/', (req, res) => sendMinified(res, path.join(__dirname, 'public', 'index.html')));
app.get('/anime/:id', (req, res) => sendMinified(res, path.join(__dirname, 'public', 'anime.html')));
app.get('/episode', (req, res) => sendMinified(res, path.join(__dirname, 'public', 'episode.html')));
app.get('/episode/:id', (req, res) => sendMinified(res, path.join(__dirname, 'public', 'episode.html')));
app.get('/genres/:id', (req, res) => sendMinified(res, path.join(__dirname, 'public', 'genres.html')));
app.get('/az-list/:letter', (req, res) => sendMinified(res, path.join(__dirname, 'public', 'az.html')));
app.get('/search/', (req, res) => sendMinified(res, path.join(__dirname, 'public', 'search.html')));

app.get('/history/', (req, res) => sendMinified(res, path.join(__dirname, 'public', 'history.html')));
app.get('/history', (req, res) => res.redirect('/history/'));
app.get('/ongoing/', (req, res) => sendMinified(res, path.join(__dirname, 'public', 'ongoing.html')));
app.get('/completed/', (req, res) => sendMinified(res, path.join(__dirname, 'public', 'completed.html')));
app.get('/recent/', (req, res) => sendMinified(res, path.join(__dirname, 'public', 'recent.html')));
app.get('/movies/', (req, res) => sendMinified(res, path.join(__dirname, 'public', 'movies.html')));
app.get('/dropped/', (req, res) => sendMinified(res, path.join(__dirname, 'public', 'dropped.html')));
app.get('/schedule/', (req, res) => sendMinified(res, path.join(__dirname, 'public', 'schedule.html')));
app.get('/genres/', (req, res) => sendMinified(res, path.join(__dirname, 'public', 'genres.html')));
app.get('/az-list/', (req, res) => sendMinified(res, path.join(__dirname, 'public', 'az.html')));
app.get('/filter/', (req, res) => sendMinified(res, path.join(__dirname, 'public', 'filter.html')));

// Support both for convenience
app.get('/ongoing', (req, res) => res.redirect('/ongoing/'));
app.get('/completed', (req, res) => res.redirect('/completed/'));
app.get('/recent', (req, res) => res.redirect('/recent/'));
app.get('/movies', (req, res) => res.redirect('/movies/'));
app.get('/dropped', (req, res) => res.redirect('/dropped/'));
app.get('/schedule', (req, res) => res.redirect('/schedule/'));
app.get('/genres', (req, res) => res.redirect('/genres/'));
app.get('/az-list', (req, res) => res.redirect('/az-list/'));
app.get('/filter', (req, res) => res.redirect('/filter/'));
app.get('/search', (req, res) => res.redirect('/search/'));

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

module.exports = app;
