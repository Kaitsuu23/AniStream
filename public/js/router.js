// ===== ROUTER - handles /ongoing, /completed, /schedule, /genres, /az pages =====
// These pages are served by their own HTML files and initialized via these functions

window.initListPage = renderListPage;
window.initSchedulePage = renderSchedulePage;
window.initGenresPage = renderGenresPage;
window.initAZPage = renderAZPage;


// Logic to handle params and path for functions
const params = new URLSearchParams(window.location.search);
const app = document.getElementById('app');

  // ===== LIST PAGE (ongoing/completed/recent) =====
  async function renderListPage(type, title, apiPath) {
    let page = parseInt(params.get('page')) || 1;

    app.innerHTML = `
      <div class="container page-fade" style="padding-top:24px;">
        <div class="list-page-layout">
          <!-- kiri: judul + grid -->
          <div class="list-page-main">
            <div class="section-header" style="margin-bottom:20px;">
              <h1 class="section-title" style="font-size:1.3rem;">${title}</h1>
            </div>
            <div class="grid grid-sm" id="mainGrid">
              ${Array(18).fill('<div class="skeleton skeleton-card"></div>').join('')}
            </div>
            <div class="pagination" id="pagination"></div>
          </div>
          <!-- kanan: filter sejajar judul -->
          <aside class="list-page-sidebar">
            <div class="sidebar-box">
              <div class="sidebar-title">Filter Search</div>
              <div class="filter-grid">
                <select class="filter-select" id="fGenre" multiple data-wide="true" data-cols="4"><option value="">Genre All</option></select>
                <select class="filter-select" id="fSeason" multiple data-wide="true" data-cols="4"><option value="">Season All</option></select>
                <select class="filter-select" id="fStudio" multiple data-wide="true" data-cols="4"><option value="">Studio All</option></select>
                <select class="filter-select" id="fStatus"><option value="">Status All</option></select>
                <select class="filter-select" id="fType"><option value="">Type All</option></select>
                <select class="filter-select" id="fOrder"><option value="">Order by Default</option></select>
              </div>
              <button class="filter-btn" id="filterSearchBtn">🔍 Search</button>
            </div>
            <!-- Popular Widget -->
            <div class="sidebar-box" style="margin-top:16px;">
              <div class="sidebar-title">🔥 Donghua Paling Populer</div>
              <div class="pop-tabs">
                <button class="pop-tab active" data-tab="weekly">Weekly</button>
                <button class="pop-tab" data-tab="monthly">Monthly</button>
                <button class="pop-tab" data-tab="all">All</button>
              </div>
              <div id="popularList"><div class="skeleton" style="height:80px;border-radius:8px;margin-top:12px;"></div><div class="skeleton" style="height:80px;border-radius:8px;margin-top:8px;"></div><div class="skeleton" style="height:80px;border-radius:8px;margin-top:8px;"></div></div>
            </div>
          </aside>
        </div>
      </div>`;

    fetch('/api/home').then(r => r.json()).then(data => {
      if (!data.allFilters) return;
      const maps = {
        'Genre All': 'fGenre',
        'Season All': 'fSeason',
        'Studio All': 'fStudio',
        'Status All': 'fStatus',
        'Type All': 'fType',
        'Order by All': 'fOrder'
      };
      
      const searchParams = new URLSearchParams(window.location.search);
      
      for (const [key, id] of Object.entries(maps)) {
        const sel = document.getElementById(id);
        if (sel && data.allFilters[key]) {
          data.allFilters[key].forEach(opt => {
            if (!opt.id) return; // ignore empty value for 'All'
            const o = document.createElement('option');
            o.value = opt.id; o.textContent = opt.name;
            sel.appendChild(o);
          });
          
          // Set selection from URL if present
          let urlVals = [];
          if (key === 'Genre All') urlVals = searchParams.getAll('genre');
          else if (key === 'Season All') urlVals = searchParams.getAll('season');
          else if (key === 'Studio All') urlVals = searchParams.getAll('studio');
          else if (key === 'Status All') urlVals = searchParams.getAll('status');
          else if (key === 'Type All') urlVals = searchParams.getAll('type');
          else if (key === 'Order by All') urlVals = searchParams.getAll('order');
          
          if (urlVals.length > 0) {
            Array.from(sel.options).forEach(o => {
              if (urlVals.includes(o.value)) o.selected = true;
            });
            sel.dispatchEvent(new Event('change'));
          }
        }
      }
      if (typeof createCustomSelectItems === 'function') createCustomSelectItems();
    }).catch(() => {});

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

    // Load popular widget
    initPopularWidget();

    try {
      const sep = apiPath.includes('?') ? '&' : '?';
      const data = await fetch(`${apiPath}${sep}page=${page}`).then(r => r.json());
      renderGrid('mainGrid', data.items, type === 'ongoing' || type === 'completed');
      buildPagination(page, data.hasNext, (p) => {
        const u = new URL(window.location.href);
        u.searchParams.set('page', p);
        window.location.href = u.pathname + u.search;
      });
    } catch (err) {
      document.getElementById('mainGrid').innerHTML = `<p style="color:var(--text2);">Gagal memuat data.</p>`;
    }
  }

  // ===== SCHEDULE PAGE =====
  async function renderSchedulePage() {
    app.innerHTML = `
      <div class="container page-fade" style="padding-top:32px;">
        <div class="section-header" style="margin-bottom:24px;">
          <h1 class="section-title" style="font-size:1.4rem;">Jadwal Rilis Mingguan</h1>
        </div>
        <div class="schedule-grid" id="scheduleGrid">
          ${Array(7).fill('<div class="skeleton" style="height:300px;border-radius:var(--radius);"></div>').join('')}
        </div>
      </div>`;

    try {
      const data = await fetch('/api/schedule').then(r => r.json());
      const grid = document.getElementById('scheduleGrid');
      const days = Object.keys(data.schedule);
      if (days.length === 0) { grid.innerHTML = '<p style="color:var(--text2);">Jadwal tidak tersedia.</p>'; return; }

      const scrapeTime = data.scrapeAt || Date.now();

      grid.innerHTML = days.map(day => `
        <div class="schedule-day">
          <div class="schedule-day-header">📅 ${day}</div>
          <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:10px;padding:12px;">
            ${(data.schedule[day] || []).map(a => {
              const isUpcoming = a.cndwn > 0;
              const badgeBg = isUpcoming ? '#f97316' : 'rgba(0,0,0,0.6)';
              const badgeText = isUpcoming ? fmtCd(a.cndwn) : (a.time || '');
              return `
              <div class="card" onclick="navigate('/episode/${encodeURIComponent(a.id)}')">
                <div class="card-thumb">
                  <img src="${a.poster || '/img/placeholder.svg'}" alt="${a.title}" loading="lazy" onerror="this.src='/img/placeholder.svg'" />
                  <div class="card-overlay"><div class="play-btn">▶</div></div>
                  <span class="sched-badge${isUpcoming ? ' sched-cd' : ''}"
                    data-cndwn="${a.cndwn}" data-scrape="${scrapeTime}"
                    style="position:absolute;bottom:8px;left:6px;background:${badgeBg};backdrop-filter:blur(6px);color:#fff;font-size:0.65rem;font-weight:700;padding:3px 8px;border-radius:20px;">
                    ${badgeText}
                  </span>
                  ${a.episode && a.episode !== '??' ? `<span style="position:absolute;bottom:8px;right:6px;background:#f59e0b;color:#000;font-size:0.65rem;font-weight:800;padding:3px 8px;border-radius:20px;">${a.episode}</span>` : ''}
                </div>
                <div class="card-info">
                  <div class="card-title" style="font-size:0.78rem;">${a.title}</div>
                </div>
              </div>`;
            }).join('')}
          </div>
        </div>`).join('');

      // Live ticker tiap 30 detik
      clearInterval(window._cdTimer);
      window._cdTimer = setInterval(() => {
        const elapsed = Math.floor((Date.now() - scrapeTime) / 1000);
        document.querySelectorAll('.sched-cd').forEach(el => {
          const remaining = parseInt(el.dataset.cndwn) - elapsed;
          if (remaining <= 0) {
            el.textContent = 'Aired';
            el.style.background = 'rgba(0,0,0,0.6)';
            el.classList.remove('sched-cd');
          } else {
            el.textContent = fmtCd(remaining);
          }
        });
      }, 30000);

    } catch (err) {
      document.getElementById('scheduleGrid').innerHTML = '<p style="color:var(--text2);">Gagal memuat jadwal.</p>';
    }
  }

  function fmtCd(sec) {
    if (sec <= 0) return 'Aired';
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  }

  // ===== GENRES PAGE =====
  async function renderGenresPage() {
    const genreId = getParam('id');
    const page = parseInt(params.get('page')) || 1;

    if (!genreId) {
      // Show all genres
      app.innerHTML = `
        <div class="container page-fade" style="padding-top:32px;">
          <h1 class="section-title" style="font-size:1.4rem;margin-bottom:24px;">Semua Genre</h1>
          <div class="genre-filter" id="genreList">
            ${Array(20).fill('<div class="skeleton" style="width:80px;height:32px;border-radius:20px;"></div>').join('')}
          </div>
        </div>`;

      try {
        const data = await fetch('/api/home').then(r => r.json());
        const list = document.getElementById('genreList');
        if (data.genres && data.genres.length > 0) {
          list.innerHTML = data.genres.map(g => `
            <a href="/genres/${encodeURIComponent(g.id)}" class="btn btn-ghost" style="border-radius:20px;padding:6px 16px;font-size:0.85rem;">${g.name}</a>
          `).join('');
        } else {
          list.innerHTML = '<p style="color:var(--text2);">Genre tidak tersedia.</p>';
        }
      } catch (e) {
        document.getElementById('genreList').innerHTML = '<p style="color:var(--text2);">Gagal memuat genre.</p>';
      }
      return;
    }

    app.innerHTML = `
      <div class="container page-fade" style="padding-top:32px;">
        <div class="section-header" style="margin-bottom:24px;">
          <h1 class="section-title" id="genreTitle" style="font-size:1.4rem;">Genre</h1>
        </div>
        <div class="grid grid-lg" id="mainGrid">
          ${Array(18).fill('<div class="skeleton skeleton-card"></div>').join('')}
        </div>
        <div class="pagination" id="pagination"></div>
      </div>`;

    try {
      const data = await fetch(`/api/genres/${encodeURIComponent(genreId)}?page=${page}`).then(r => r.json());
      const titleEl = document.getElementById('genreTitle');
      if (titleEl && data.genreName) titleEl.textContent = data.genreName;
      renderGrid('mainGrid', data.items);
      buildPagination(page, data.hasNext, (p) => {
        window.location.href = `/genres/${genreId}?page=${p}`;
      });
    } catch (err) {
      document.getElementById('mainGrid').innerHTML = '<p style="color:var(--text2);">Gagal memuat genre.</p>';
    }
  }

  // ===== A-Z PAGE =====
  async function renderAZPage() {
    const letter = getParam('letter') || 'a';
    const page = parseInt(params.get('page')) || 1;
    const letters = ['#', ...('ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split(''))];

    app.innerHTML = `
      <div class="container page-fade" style="padding-top:24px;">
        <div class="list-page-layout">
          <div class="list-page-main">
            <div class="section-header" style="margin-bottom:16px;">
              <h1 class="section-title" style="font-size:1.3rem;">Browse A-Z</h1>
            </div>
            <div class="az-nav">
              ${letters.map(l => `
                <div class="az-btn ${l.toLowerCase() === letter.toLowerCase() ? 'active' : ''}"
                  onclick="window.location.href='/az-list/${l.toLowerCase() === '#' ? '%23' : l.toLowerCase()}'">
                  ${l}
                </div>`).join('')}
            </div>
            <div class="grid grid-sm" id="mainGrid">
              ${Array(18).fill('<div class="skeleton skeleton-card"></div>').join('')}
            </div>
            <div class="pagination" id="pagination"></div>
          </div>
          <aside class="list-page-sidebar">
            <div class="sidebar-box">
              <div class="sidebar-title">Filter Search</div>
              <div class="filter-grid">
                <select class="filter-select" id="fGenre" multiple data-wide="true" data-cols="4"><option value="">Genre All</option></select>
                <select class="filter-select" id="fSeason" multiple data-wide="true" data-cols="4"><option value="">Season All</option></select>
                <select class="filter-select" id="fStudio" multiple data-wide="true" data-cols="4"><option value="">Studio All</option></select>
                <select class="filter-select" id="fStatus"><option value="">Status All</option></select>
                <select class="filter-select" id="fType"><option value="">Type All</option></select>
                <select class="filter-select" id="fOrder"><option value="">Order by Default</option></select>
              </div>
              <button class="filter-btn" id="filterSearchBtn">🔍 Search</button>
            </div>
            <div class="sidebar-box" style="margin-top:16px;">
              <div class="sidebar-title">🔥 Donghua Paling Populer</div>
              <div class="pop-tabs">
                <button class="pop-tab active" data-tab="weekly">Weekly</button>
                <button class="pop-tab" data-tab="monthly">Monthly</button>
                <button class="pop-tab" data-tab="all">All</button>
              </div>
              <div id="popularList"><div class="skeleton" style="height:80px;border-radius:8px;margin-top:12px;"></div><div class="skeleton" style="height:80px;border-radius:8px;margin-top:8px;"></div><div class="skeleton" style="height:80px;border-radius:8px;margin-top:8px;"></div></div>
            </div>
          </aside>
        </div>
      </div>`;

    fetch('/api/home').then(r => r.json()).then(data => {
      if (!data.allFilters) return;
      const maps = { 'Genre All': 'fGenre', 'Season All': 'fSeason', 'Studio All': 'fStudio', 'Status All': 'fStatus', 'Type All': 'fType', 'Order by All': 'fOrder' };
      for (const [key, id] of Object.entries(maps)) {
        const sel = document.getElementById(id);
        if (sel && data.allFilters[key]) {
          data.allFilters[key].forEach(opt => {
            if (!opt.id) return;
            const o = document.createElement('option');
            o.value = opt.id; o.textContent = opt.name;
            sel.appendChild(o);
          });
        }
      }
      if (typeof createCustomSelectItems === 'function') createCustomSelectItems();
    }).catch(() => {});

    document.getElementById('filterSearchBtn')?.addEventListener('click', () => {
      const p = new URLSearchParams();
      const map = { fGenre: 'genre', fSeason: 'season', fStudio: 'studio', fStatus: 'status', fType: 'type', fOrder: 'order' };
      for (const [id, key] of Object.entries(map)) {
        const sel = document.getElementById(id);
        if (sel) {
          if (sel.multiple) Array.from(sel.options).forEach(o => { if (o.selected && o.value) p.append(key, o.value); });
          else if (sel.value) p.append(key, sel.value);
        }
      }
      navigate(`/filter/?${p.toString()}`);
    });

    initPopularWidget();

    try {
      const data = await fetch(`/api/az/${encodeURIComponent(letter)}?page=${page}`).then(r => r.json());
      renderGrid('mainGrid', data.items);
      buildPagination(page, data.hasNext, (p) => {
        window.location.href = `/az-list/${letter === '#' ? '%23' : letter}?page=${p}`;
      });
    } catch (err) {
      document.getElementById('mainGrid').innerHTML = '<p style="color:var(--text2);">Gagal memuat data.</p>';
    }
  }

  // ===== PAGINATION BUILDER =====
  function buildPagination(current, hasNext, onClick) {
    const el = document.getElementById('pagination');
    if (!el) return;
    if (current === 1 && !hasNext) { el.innerHTML = ''; return; }

    const btns = [];

    if (current > 1) btns.push({ label: '← Prev', page: current - 1, active: false });

    // show up to 2 pages before current
    for (let i = Math.max(1, current - 2); i < current; i++) {
      btns.push({ label: i, page: i, active: false });
    }

    // current page
    btns.push({ label: current, page: current, active: true });

    // show next page number only if hasNext
    if (hasNext) btns.push({ label: current + 1, page: current + 1, active: false });

    if (hasNext) btns.push({ label: 'Next →', page: current + 1, active: false });

    el.innerHTML = btns.map(b => `
      <button class="page-btn ${b.active ? 'active' : ''}" data-page="${b.page}">${b.label}</button>
    `).join('');

    el.querySelectorAll('.page-btn').forEach(btn => {
      btn.addEventListener('click', () => onClick(parseInt(btn.dataset.page)));
    });
  }
