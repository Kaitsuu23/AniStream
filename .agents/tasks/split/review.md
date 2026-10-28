# Review — AniStream Backend/Frontend Split (Pass 2)

## Evidence collected

- All source files read directly from the workspace.
- Prior review had 2 blockers (B1, B2) in `public/anime.html`: hardcoded `fetch('/api/movies?page=1')` and unguarded `item.poster` in Movie Baru sidebar.
- Both blockers verified fixed in this pass by reading `public/anime.html` lines 488–510.
- Spot-check: `grep fetch\('/api` across all `public/js/*.js` and `public/*.html` — no raw unguarded `/api` fetches remain.
- No coder-supplied verification log found; review is by source-file inspection.

---

## Checklist results

### server.js
- No `require('html-minifier-terser')`, no `require('path')`, no `require('fs')`. ✓
- No `express.static`. ✓
- No `sendMinified`, no HTML-serving routes. ✓
- `GET /health → res.json({ status: 'ok' })`. ✓
- CORS uses `process.env.FRONTEND_URL || '*'` with comma-split support. ✓
- `module.exports = app`; listen guarded by `require.main === module`. ✓

### package.json
- `"build": "node build.js"` present. ✓
- `html-minifier-terser` absent from dependencies and devDependencies. ✓

### public/js/config.js (placeholder form in repo)
- Contains literal `%%BACKEND_URL%%` and `%%CF_WORKER_URL%%`. ✓

### build.js
- Inline `.env` parser; no dotenv dependency. ✓
- `process.env` takes priority over `.env` values. ✓
- Always rebuilds from hardcoded template string (idempotent). ✓
- Writes `window.API_BASE_URL` and `window.CF_WORKER_URL` to `public/js/config.js`. ✓

### public/js/app.js
- `apiUrl()` helper at top; prefixes `/api`-leading strings only. ✓
- `const API = (window.API_BASE_URL || '') + '/api'`. ✓
- `initPopularWidget()`: `fetch(apiUrl('/api/popular'))`. ✓
- `buildCard()` poster: `apiUrl(item.poster || '/img/placeholder.svg')`. ✓
- `buildHero()` poster: `apiUrl(item.poster || '')`. ✓
- Popular widget `renderPopular()` img: `apiUrl(...)`. ✓
- `initAnimeDetail()` banner + poster: `apiUrl(data.poster)`. ✓
- Search dropdown img: `apiUrl(item.poster)`. ✓

### public/js/player.js
- `const CF_WORKER_URL = window.CF_WORKER_URL || ''`. No `window.__CF_WORKER_URL__`. ✓
- `const API_BASE = window.API_BASE_URL || ''`. ✓
- `proxyEmbed` fallback: `API_BASE + \`/api/proxy/embed?...\``. ✓
- `proxyStream` fallback: `API_BASE + \`/api/proxy/stream?...\``. ✓
- `initEpisodePlayer` fetch: `API_BASE + \`/api/episode/...\``. ✓
- Anime fetch: `API_BASE + \`/api/anime/...\``. ✓
- `poster.src = apiUrl(anime.poster)`. ✓
- `.ep-item-thumb-wrap img.src = apiUrl(anime.poster)`. ✓

### public/js/router.js
- All `fetch('/api/home')` calls: `fetch(apiUrl('/api/home'))`. ✓
- `renderListPage`: `fetch(apiUrl(apiPath) + ...)`. ✓
- `renderSchedulePage`: `fetch(apiUrl('/api/schedule'))`. ✓
- Schedule card img: `apiUrl(a.poster || '/img/placeholder.svg')`. ✓
- `renderGenresPage` genre list fetch: `fetch(apiUrl('/api/home'))`. ✓
- `renderGenresPage` paginated fetch: `fetch(apiUrl(\`/api/genres/...\`))`. ✓
- `renderAZPage` fetch: `fetch(apiUrl(\`/api/az/...\`))`. ✓

### public/anime.html — prior blockers B1 and B2
- `fetch(apiUrl('/api/movies?page=1'))` — fixed. ✓
- `apiUrl(item.poster || '/img/placeholder.svg')` in Movie Baru sidebar — fixed. ✓

### history.html inline script
- `apiUrl(item.poster || '/img/placeholder.svg')` applied on render. ✓

### HTML files — config.js before app.js
All 14 files confirmed by grep: index.html, anime.html, az.html, completed.html, dropped.html, episode.html, filter.html, genres.html, history.html, movies.html, ongoing.html, recent.html, schedule.html, search.html. ✓

### episode.html — no %%CF_WORKER_URL%%
Old inline injection block absent. `window.CF_WORKER_URL` set by config.js. ✓

### vercel.json
- `"outputDirectory": "public"`. ✓
- `"buildCommand": "node build.js"`. ✓
- `"version": 2`. ✓
- No `"builds"` key. ✓
- 28 rewrite rules covering all 14 page types (with/without trailing slash, parameter variants). ✓

### README-DEPLOY.md
- Exists. Covers backend VPS steps, PM2, health check, Nginx reverse-proxy snippet. ✓
- Covers frontend Vercel env vars, build command, output directory. ✓
- Covers local dev with `node build.js` + `npx serve public`. ✓
- Environment variables reference table present. ✓

### Unchanged files
- `routes/api.js`, `scraper/anichin.js`, `cf-worker/worker.js` — not modified. ✓

---

## Blockers

None.

---

## Non-blocking observations (out of scope)

- `saveToHistory` in `player.js` stores `anime.poster` (relative `/api/proxy/image?...`) in localStorage. On the history page, `apiUrl()` is applied at render time (config.js loads before app.js). Correct behavior.
- `vercel.json` uses `"buildCommand"` (correct Vercel key for build commands), not a `"builds"` array. Aligns with pure static model.
