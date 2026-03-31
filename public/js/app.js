// ===== UTILITIES =====
const API = '/api';

async function fetchAPI(endpoint) {
  const res = await fetch(API + endpoint);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

function showToast(msg, duration = 3000) {
  const t = document.getElementById('toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

function getParam(key) {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.has(key)) return urlParams.get(key);
  
  // Try to get from pathname for clean URLs /episode/abc, /episode/abc, /genres/abc
  const path = window.location.pathname;
  const parts = path.split('/').filter(Boolean);
  
  if (key === 'id') {
    if (path.startsWith('/episode/') || path.startsWith('/anime/') || path.startsWith('/genres/')) {
      return decodeURIComponent(parts[1] || '');
    }
  }
  if (key === 'letter') {
    if (path.startsWith('/az-list/')) {
      return decodeURIComponent(parts[1] || '');
    }
  }
  return '';
}

function navigate(path) {
  window.location.href = path;
}

// ===== CUSTOM SELECT UI =====
function createCustomSelectItems() {
  // Remove any previously built custom UIs for these selects
  document.querySelectorAll('.custom-select-container').forEach(c => {
    // also remove any orphan lists attached to body
    if (c._listRef) c._listRef.remove();
    c.remove();
  });
  document.querySelectorAll('.custom-select-list-body').forEach(l => l.remove());

  document.querySelectorAll('.filter-select').forEach(sel => {
    sel.style.display = 'none';
    
    const wrapper = document.createElement('div');
    wrapper.className = 'custom-select-container';
    
    const trigger = document.createElement('div');
    trigger.className = 'custom-select-trigger';
    
    const updateTriggerText = () => {
      if (sel.multiple) {
        const selectedOpts = Array.from(sel.options).filter(o => o.selected && o.value);
        if (selectedOpts.length === 0) {
          trigger.textContent = sel.options[0]?.textContent || '';
        } else if (selectedOpts.length === 1) {
          trigger.textContent = selectedOpts[0].textContent;
        } else {
          trigger.textContent = selectedOpts.map(o => o.textContent).join(', ');
        }
      } else {
        trigger.textContent = sel.options[sel.selectedIndex]?.textContent || sel.options[0]?.textContent || '';
      }
    };
    updateTriggerText();
    
    // Build list and append directly to BODY to escape stacking context
    const list = document.createElement('div');
    list.className = 'custom-select-list custom-select-list-body';
    if (sel.dataset.wide === 'true') {
      list.classList.add('wide');
      if (sel.dataset.cols === '4') list.classList.add('narrow');
    }
    document.body.appendChild(list);
    wrapper._listRef = list;

    // helper to position the list relative to trigger (position:fixed = viewport coords)
    const positionList = () => {
      const rect = trigger.getBoundingClientRect();
      list.style.top = (rect.bottom + 4) + 'px';
      if (sel.dataset.wide === 'true') {
        // right edge of panel aligned to right edge of trigger, extends left
        list.style.left = 'auto';
        list.style.right = (document.documentElement.clientWidth - rect.right) + 'px';
      } else {
        list.style.left = rect.left + 'px';
        list.style.right = 'auto';
        list.style.width = rect.width + 'px';
      }
    };
    
    Array.from(sel.options).forEach((opt, idx) => {
      if (!opt.value) return; // skip "All" placeholder — implicit when nothing selected
      
      const item = document.createElement('div');
      item.className = 'custom-select-item';
      item.textContent = opt.textContent;
      item.title = opt.textContent;
      if (opt.selected) item.classList.add('selected');
      
      item.addEventListener('click', (e) => {
        e.stopPropagation();
        if (sel.multiple) {
          opt.selected = !opt.selected;
          item.classList.toggle('selected');
          updateTriggerText();
        } else {
          sel.value = opt.value;
          updateTriggerText();
          list.querySelectorAll('.custom-select-item').forEach(i => i.classList.remove('selected'));
          item.classList.add('selected');
          list.classList.remove('open');
        }
      });
      list.appendChild(item);
    });
    
    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      // close all others
      document.querySelectorAll('.custom-select-list-body').forEach(l => {
        if (l !== list) l.classList.remove('open');
      });
      positionList();
      list.classList.toggle('open');
    });
    
    wrapper.appendChild(trigger);
    sel.parentNode.insertBefore(wrapper, sel.nextSibling);

    sel.addEventListener('change', () => {
      updateTriggerText();
      // match list items by value since "All" option is not rendered
      const valueOpts = Array.from(sel.options).filter(o => o.value);
      Array.from(list.children).forEach((child, i) => {
        const opt = valueOpts[i];
        if (!opt) return;
        if (opt.selected) child.classList.add('selected');
        else child.classList.remove('selected');
      });
    });
  });
}

document.addEventListener('click', () => {
  document.querySelectorAll('.custom-select-list-body').forEach(l => l.classList.remove('open'));
});

window.addEventListener('scroll', () => {
  document.querySelectorAll('.custom-select-list-body').forEach(l => l.classList.remove('open'));
});

// ===== CARD BUILDER =====
function buildCard(item, forceAnime = false, autoplay = false) {
  const id = item.id || '';
  const animeId = item.animeId || id;
  const title = (item.title || 'Unknown').replace(/\s*episode\s+\d+.*$/i, '').trim();
  const poster = item.poster || '/img/placeholder.svg';
  const episode = item.episode || '';
  const rating = item.rating || '';
  const genre = item.genre || '';
  const type = item.type || '';
  let url;
  if (!forceAnime && episode && !['completed','ongoing','movie','hiatus','dropped'].includes(episode.toLowerCase())) {
    url = `/episode/${encodeURIComponent(id)}`;
  } else {
    url = `/anime/${encodeURIComponent(animeId)}${autoplay ? '?play=1' : ''}`;
  }

  return `
    <div class="card" onclick="navigate('${url}')">
      <div class="card-thumb">
        <img src="${poster}" alt="${title}" loading="lazy"
          onerror="this.src='/img/placeholder.svg'" />
        <div class="card-overlay">
          <div class="play-btn">▶</div>
        </div>
        ${type ? `<span class="card-badge">${type}</span>` : ''}
        ${episode ? `<span class="card-badge ep" style="top:auto;bottom:8px;left:8px;">${episode}</span>` : ''}
        ${rating ? `<span class="card-rating rating-value">⭐ ${rating}</span>` : ''}
      </div>
      <div class="card-info">
        <div class="card-title">${title}</div>
        <div class="card-meta">
          ${genre ? `<span class="card-genre">${genre}</span>` : ''}
        </div>
      </div>
    </div>`;
}


function renderGrid(containerId, items, forceAnime = false, autoplay = false) {
  const el = document.getElementById(containerId);
  if (!el) return;
  if (!items || items.length === 0) {
    el.innerHTML = '<p style="color:var(--text2);grid-column:1/-1;padding:20px 0;">Tidak ada data.</p>';
    return;
  }
  el.innerHTML = items.map(item => buildCard(item, forceAnime, autoplay)).join('');
}

function renderSkeletons(containerId, count = 12) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = Array(count).fill('<div class="skeleton skeleton-card"></div>').join('');
}

// ===== HERO =====
function buildHero(items) {
  const hero = document.getElementById('hero');
  if (!hero || !items || items.length === 0) return;

  const slides = items.slice(0, 10);
  hero.innerHTML = `
    ${slides.map((item, i) => `
      <div class="hero-slide ${i === 0 ? 'active' : ''}" data-index="${i}">
        <img src="${item.poster || ''}" alt="${item.title}" onerror="this.src='/img/placeholder.svg'" />
        <div class="hero-content">
          <span class="hero-badge">${item.type || 'Donghua'}</span>
          <div class="hero-title">${item.title || ''}</div>
          <div class="hero-meta">
            ${item.synopsis ? `<span style="color:var(--text2);font-size:0.85rem;line-height:1.5;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;max-width:600px;">${item.synopsis}</span>` : ''}
          </div>
        </div>
      </div>`).join('')}
    <div class="hero-dots">
      ${slides.map((_, i) => `<div class="hero-dot ${i === 0 ? 'active' : ''}" data-dot="${i}"></div>`).join('')}
    </div>
    <button class="hero-arrow hero-prev" id="heroPrev">&#8249;</button>
    <button class="hero-arrow hero-next" id="heroNext">&#8250;</button>`;

  let current = 0;
  const allSlides = hero.querySelectorAll('.hero-slide');
  const dots = hero.querySelectorAll('.hero-dot');

  function goTo(idx) {
    allSlides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = idx;
    allSlides[current].classList.add('active');
    dots[current].classList.add('active');
  }

  dots.forEach(dot => dot.addEventListener('click', () => goTo(parseInt(dot.dataset.dot))));

  hero.querySelector('#heroPrev')?.addEventListener('click', (e) => { e.stopPropagation(); goTo((current - 1 + slides.length) % slides.length); });
  hero.querySelector('#heroNext')?.addEventListener('click', (e) => { e.stopPropagation(); goTo((current + 1) % slides.length); });

  // Click hero to navigate
  allSlides.forEach((slide, i) => {
    slide.style.cursor = 'pointer';
    slide.addEventListener('click', () => navigate(`/episode/${encodeURIComponent(slides[i].id)}`));
  });

  setInterval(() => goTo((current + 1) % slides.length), 5000);
}

// ===== HOME PAGE =====
async function initHome() {
  try {
    const data = await fetchAPI('/home');
    buildHero(data.banners && data.banners.length > 0 ? data.banners : data.latestEpisodes);
    renderGrid('latestGrid', data.latestEpisodes);
    renderGrid('movieGrid', data.movies.slice(0, 5), false, true);
    renderGrid('droppedGrid', data.dropped.slice(0, 5), false, true);
    buildSidebarGenres(data.genres);
    initPopularWidget();
    buildFilterOptions(data.allFilters);
  } catch (err) {
    showToast('Gagal memuat data: ' + err.message);
    console.error(err);
  }
}

function buildSidebarGenres(genres) {
  const el = document.getElementById('sidebarGenres');
  if (!el || !genres || genres.length === 0) return;
  el.innerHTML = genres.slice(0, 20).map(g =>
    `<a href="/genres/${encodeURIComponent(g.id)}" class="sidebar-genre-tag">${g.name}</a>`
  ).join('');
}

async function initPopularWidget() {
  const container = document.getElementById('popularList');
  if (!container) return;

  let popularData = null;

  function renderPopular(tab) {
    if (!popularData || !container) return;
    const items = popularData[tab] || [];
    container.innerHTML = items.map(item => `
      <div class="pop-item" onclick="navigate('/anime/${encodeURIComponent(item.animeId || item.id)}')">
        <span class="pop-num">${item.num}</span>
        <img src="${item.poster || '/img/placeholder.svg'}" alt="${item.title}" onerror="this.src='/img/placeholder.svg'" />
        <div class="pop-info">
          <div class="pop-title">${item.title}</div>
          <div class="pop-genres">${item.genres ? item.genres.slice(0,2).join(', ') : ''}</div>
          ${item.rating ? `<div class="pop-rating">⭐ ${item.rating}</div>` : ''}
        </div>
      </div>`).join('');
  }

  try {
    const res = await fetch('/api/popular');
    const data = await res.json();
    popularData = data;
    renderPopular('weekly');

    document.querySelectorAll('.pop-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.pop-tab').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderPopular(btn.dataset.tab);
      });
    });
  } catch (err) {
    container.innerHTML = '<p style="color:var(--text2);">Gagal memuat data populer.</p>';
  }
}

function buildFilterOptions(allFilters) {
  if (!allFilters) return;
  const maps = {
    'Genre All': 'fGenre',
    'Season All': 'fSeason',
    'Studio All': 'fStudio',
    'Status All': 'fStatus',
    'Type All': 'fType',
    'Order by All': 'fOrder'
  };
  
  for (const [key, id] of Object.entries(maps)) {
    const sel = document.getElementById(id);
    if (sel && allFilters[key]) {
      allFilters[key].forEach(opt => {
        if (!opt.id) return;
        const o = document.createElement('option');
        o.value = opt.id; o.textContent = opt.name;
        sel.appendChild(o);
      });
    }
  }

  createCustomSelectItems();

  document.getElementById('filterSearchBtn')?.addEventListener('click', () => {
    const p = new URLSearchParams();
    const map = { fGenre: 'genre', fSeason: 'season', fStudio: 'studio', fStatus: 'status', fType: 'type', fOrder: 'order' };
    
    for (const [id, key] of Object.entries(map)) {
      const sel = document.getElementById(id);
      if (sel) {
        if (sel.multiple) {
          Array.from(sel.options).forEach(o => {
            if (o.selected && o.value) p.append(key, o.value);
          });
        } else {
          if (sel.value) p.append(key, sel.value);
        }
      }
    }

    navigate(`/filter/?${p.toString()}`);
  });
}

// ===== ANIME DETAIL =====
async function initAnimeDetail() {
  const id = getParam('id');
  if (!id) return navigate('/');

  try {
    const data = await fetchAPI(`/anime/${encodeURIComponent(id)}`);
    document.title = `${data.title} - AniStream`;

    // Breadcrumb
    const bc = document.getElementById('breadcrumbTitle');
    if (bc) bc.textContent = data.title;

    // Banner image
    const bannerImg = document.getElementById('detailBannerImg');
    if (bannerImg && data.poster) { bannerImg.src = data.poster; bannerImg.alt = data.title; }

    // Poster
    const posterImg = document.getElementById('detailPosterImg');
    if (posterImg && data.poster) { posterImg.src = data.poster; posterImg.alt = data.title; }

    // Rating
    if (data.rating) {
      const ratingEl = document.getElementById('detailRating');
      const ratingVal = document.getElementById('detailRatingVal');
      const starsEl = document.getElementById('detailStars');
      if (ratingEl && ratingVal && starsEl) {
        const score = parseFloat(data.rating) || 0;
        const fullStars = Math.round(score / 2); // scale 10 → 5
        ratingVal.textContent = `Rating ${data.rating}`;
        starsEl.textContent = '★'.repeat(Math.min(fullStars, 5)) + '☆'.repeat(Math.max(0, 5 - fullStars));
        ratingEl.style.display = 'block';
      }
    }

    // Play button → first episode
    const firstEpId = data.episodes && data.episodes.length > 0 ? data.episodes[0].id : null;
    const playBtn = document.getElementById('detailBannerPlay');
    if (playBtn && firstEpId) {
      playBtn.addEventListener('click', () => navigate(`/episode/${encodeURIComponent(firstEpId)}`));
    } else if (playBtn) {
      playBtn.style.display = 'none';
    }

    // Auto-redirect to latest episode if ?play=1
    if (new URLSearchParams(window.location.search).get('play') === '1' && firstEpId) {
      const lastEpId = data.episodes[data.episodes.length - 1]?.id || firstEpId;
      return navigate(`/episode/${encodeURIComponent(lastEpId)}`);
    }

    // Info col
    const infoCol = document.getElementById('detailInfoCol');
    if (infoCol) {
      const metaRows = [
        ['Status',      data.status],
        ['Network',     data.network],
        ['Studio',      data.studio],
        ['Released',    data.released],
        ['Duration',    data.duration],
        ['Season',      data.season],
        ['Country',     data.country],
        ['Type',        data.type],
        ['Episodes',    data.episodes_count],
        ['Fansub',      data.fansub],
        ['Posted by',   data.posted_by],
        ['Released on', data.released_on],
        ['Updated on',  data.updated_on],
      ].filter(([, v]) => v);

      // split into 2 columns
      const half = Math.ceil(metaRows.length / 2);
      const left = metaRows.slice(0, half);
      const right = metaRows.slice(half);
      const maxRows = Math.max(left.length, right.length);

      const renderRow = ([label, val]) => `
        <div class="meta-row">
          <span class="meta-dot"></span>
          <span class="meta-label">${label}:</span>
          <span class="meta-val">${val}</span>
        </div>`;

      const tableRows = Array.from({ length: maxRows }, (_, i) => `
        <div style="display:contents;">
          ${left[i] ? renderRow(left[i]) : '<div></div>'}
          ${right[i] ? renderRow(right[i]) : '<div></div>'}
        </div>`).join('');

      const genreTags = (data.genres || []).map(g =>
        `<a href="/genres/${encodeURIComponent(g.toLowerCase().replace(/\s+/g,'-'))}" class="detail-tag">${g}</a>`
      ).join('');

      infoCol.innerHTML = `
        <h1 class="detail-title">${data.title}</h1>
        ${data.native ? `<div class="detail-native">${data.native}</div>` : ''}
        <div class="detail-meta-grid">${tableRows}</div>
        ${genreTags ? `<div class="detail-tags" style="margin-top:12px;">${genreTags}</div>` : ''}`;
    }

    // Synopsis section
    if (data.synopsis) {
      const synSec = document.getElementById('synopsisSection');
      const synTitle = document.getElementById('synopsisTitle');
      const synText = document.getElementById('synopsisText');
      if (synSec && synTitle && synText) {
        synTitle.textContent = `Synopsis ${data.title}`;
        synText.textContent = data.synopsis;
        synSec.style.display = 'block';
      }
    }

    // Episode count
    const epCount = document.getElementById('epCount');
    if (epCount && data.episodes) epCount.textContent = `${data.episodes.length} Episode`;

    // Section title
    const epSectionTitle = document.getElementById('epSectionTitle');
    if (epSectionTitle) epSectionTitle.textContent = `Watch ${data.title}`;

    // Episode list
    const epList = document.getElementById('episodeList');
    if (epList) {
      if (!data.episodes || data.episodes.length === 0) {
        epList.innerHTML = '<tr><td colspan="4" style="color:var(--text2);padding:20px;">Belum ada episode.</td></tr>';
      } else {
        const eps = data.episodes;
        const total = eps.length;

        // Jump buttons
        const jumpBtns = document.getElementById('epJumpBtns');
        const jumpFirstVal = document.getElementById('epJumpFirstVal');
        const jumpLastVal = document.getElementById('epJumpLastVal');
        if (jumpBtns && eps.length > 0) {
          jumpBtns.style.display = 'grid';
          const firstEp = eps[total - 1]; // oldest = last in array
          const lastEp = eps[0];          // newest = first in array
          const firstNum = firstEp.title?.match(/\d+/)?.[0] || '01';
          const lastNum = lastEp.title?.match(/\d+/)?.[0] || String(total);
          if (jumpFirstVal) jumpFirstVal.textContent = `Episode ${String(firstNum).padStart(2,'0')}`;
          if (jumpLastVal) jumpLastVal.textContent = `Episode ${String(lastNum).padStart(2,'0')}`;
          document.getElementById('epJumpFirst')?.addEventListener('click', () => navigate(`/episode/${encodeURIComponent(firstEp.id)}`));
          document.getElementById('epJumpLast')?.addEventListener('click', () => navigate(`/episode/${encodeURIComponent(lastEp.id)}`));
        }

        epList.innerHTML = eps.map((ep, i) => {
          const epNum = total - i;
          return `<tr onclick="navigate('/episode/${encodeURIComponent(ep.id)}')">
            <td class="td-num">${epNum}</td>
            <td class="td-title">${ep.title || `${data.title} Episode ${epNum} Subtitle Indonesia`}</td>
            <td class="td-sub"><span class="sub-badge">Sub</span></td>
            <td class="td-date">${ep.date || ''}</td>
          </tr>`;
        }).join('');
      }
    }

    // Batch download
    const hasBatchGroups = data.batchGroups && data.batchGroups.length > 0;
    const hasBatchLinks = data.batchLinks && data.batchLinks.length > 0;
    if (hasBatchGroups || hasBatchLinks) {
      const batchSection = document.getElementById('batchSection');
      const batchList = document.getElementById('batchList');
      if (batchSection) batchSection.style.display = 'block';
      const batchTitle = document.getElementById('batchTitle');
      if (batchTitle) batchTitle.textContent = `Download ${data.title}`;
      if (batchList) {
        if (hasBatchGroups) {
          batchList.innerHTML = data.batchGroups.map(group => `
            <div class="batch-group">
              <div class="batch-group-title">${group.title}</div>
              ${group.qualities.map(q => `
                <div class="batch-quality-row">
                  <span class="batch-quality-label">${q.quality}</span>
                  <div class="batch-links">
                    ${q.links.length > 0
                      ? q.links.map(l => `<a href="${l.url}" target="_blank" class="dl-btn">${l.host}</a>`).join('')
                      : '<span style="color:var(--text2);font-size:0.8rem;">-</span>'}
                  </div>
                </div>`).join('')}
            </div>`).join('');
        } else {
          batchList.innerHTML = data.batchLinks.map(b =>
            `<a href="${b.url}" target="_blank" class="dl-btn">⬇ ${b.quality}</a>`
          ).join('');
        }
      }
    }

    // Load filter options for sidebar
    try {
      const homeData = await fetchAPI('/home');
      buildFilterOptions(homeData.allFilters);
    } catch (_) {}

  } catch (err) {
    showToast('Gagal memuat detail: ' + err.message);
    console.error(err);
  }
}

// ===== SEARCH =====
let searchTimer = null;

function initSearch() {
  const input = document.getElementById('searchInput');
  const dropdown = document.getElementById('searchDropdown');
  if (!input || !dropdown) return;

  input.addEventListener('input', () => {
    clearTimeout(searchTimer);
    const q = input.value.trim();
    if (!q) { dropdown.classList.remove('show'); return; }

    searchTimer = setTimeout(async () => {
      try {
        const data = await fetchAPI(`/search?q=${encodeURIComponent(q)}`);
        if (!data.items || data.items.length === 0) {
          dropdown.innerHTML = '<div style="padding:16px;color:var(--text2);text-align:center;">Tidak ditemukan</div>';
        } else {
          dropdown.innerHTML = data.items.slice(0, 8).map(item => `
            <div class="search-dropdown-item" onclick="navigate('/anime/${encodeURIComponent(item.animeId || item.id)}')">
              <img src="${item.poster}" alt="${item.title}" onerror="this.src='/img/placeholder.svg'" />
              <div class="info">
                <div class="title">${item.title}</div>
                <div class="ep">${item.episode || item.type || ''}</div>
              </div>
            </div>`).join('');
        }
        dropdown.classList.add('show');
      } catch (e) { console.error(e); }
    }, 400);
  });

  input.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      dropdown.classList.remove('show');
      navigate(`/search/?q=${encodeURIComponent(input.value.trim())}`);
    }
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.search-bar')) dropdown.classList.remove('show');
  });
}

// ===== SEARCH PAGE =====
async function initSearchPage() {
  const q = getParam('q');
  const title = document.getElementById('searchTitle');
  const count = document.getElementById('searchCount');
  const grid = document.getElementById('searchGrid');
  const empty = document.getElementById('searchEmpty');
  const mainSearch = document.getElementById('mainSearch');

  if (mainSearch) {
    mainSearch.value = q;
    mainSearch.addEventListener('keydown', e => {
      if (e.key === 'Enter') navigate(`/search/?q=${encodeURIComponent(mainSearch.value.trim())}`);
    });
  }

  if (!q) {
    if (title) title.textContent = 'Cari Donghua';
    return;
  }

  if (title) title.textContent = `Hasil pencarian: "${q}"`;
  renderSkeletons('searchGrid', 18);

  try {
    const data = await fetchAPI(`/search?q=${encodeURIComponent(q)}`);
    if (!data.items || data.items.length === 0) {
      if (grid) grid.innerHTML = '';
      if (empty) empty.style.display = 'block';
      if (count) count.textContent = '0 hasil ditemukan';
    } else {
      if (count) count.textContent = `${data.items.length} hasil ditemukan`;
      renderGrid('searchGrid', data.items);
    }
  } catch (err) {
    showToast('Gagal mencari: ' + err.message);
  }
}

// ===== NAV =====
function initNav() {
  const hamburger = document.getElementById('hamburger');
  const navLinks = document.getElementById('navLinks');
  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => navLinks.classList.toggle('open'));
  }

  // Set active link
  const path = window.location.pathname;
  document.querySelectorAll('.nav-links a').forEach(a => {
    a.classList.remove('active');
    if (a.getAttribute('href') === path) a.classList.add('active');
  });
}

// ===== WATCH HISTORY =====
const HISTORY_KEY = 'anistream_history';
const HISTORY_MAX = 50;

function getWatchHistory() {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]'); } catch { return []; }
}

function saveToHistory(item) {
  let history = getWatchHistory();
  // Remove same anime (dedup by animeId, keep latest episode)
  history = history.filter(h => (h.animeId || h.id) !== (item.animeId || item.id));
  // Add to front
  history.unshift({ ...item, watchedAt: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) });
  // Limit
  if (history.length > HISTORY_MAX) history = history.slice(0, HISTORY_MAX);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function removeHistory(id) {
  const history = getWatchHistory().filter(h => h.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
}

function clearWatchHistory() {
  localStorage.removeItem(HISTORY_KEY);
}
