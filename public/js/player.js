// ===== EPISODE PLAYER =====
async function initEpisodePlayer() {
  const id = getParam('id');
  if (!id) return navigate('/');

  try {
    const data = await fetch(`/api/episode/${encodeURIComponent(id)}`).then(r => r.json());

    if (data.id && data.id !== id) {
      window.history.replaceState(null, '', `/episode/${data.id}`);
    }

    const title = data.title || 'Episode';
    document.title = `${title} - AniStream`;

    // Title + breadcrumb
    const titleEl = document.getElementById('epTitle');
    if (titleEl) titleEl.textContent = title;

    const bcEpisode = document.getElementById('bcEpisode');
    if (bcEpisode) bcEpisode.textContent = title;

    // Share buttons
    const url = encodeURIComponent(window.location.href);
    const text = encodeURIComponent(title);
    const shareFb = document.getElementById('shareFb');
    const shareTw = document.getElementById('shareTw');
    const shareWa = document.getElementById('shareWa');
    const shareTg = document.getElementById('shareTg');
    if (shareFb) shareFb.href = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
    if (shareTw) shareTw.href = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
    if (shareWa) shareWa.href = `https://wa.me/?text=${text}%20${url}`;
    if (shareTg) shareTg.href = `https://t.me/share/url?url=${url}&text=${text}`;

    // Render player
    renderPlayer(data.servers, 0);

    // Server buttons
    const serverList = document.getElementById('serverList');
    if (serverList) {
      if (!data.servers || data.servers.length === 0) {
        serverList.innerHTML = '<p style="color:var(--text2);font-size:.85rem;">Tidak ada server tersedia.</p>';
      } else {
        serverList.innerHTML = data.servers.map((s, i) => `
          <button class="server-btn ${i === 0 ? 'active' : ''}" data-index="${i}">
            📺 ${s.name || `Server ${i + 1}`}
          </button>`).join('');
        serverList.querySelectorAll('.server-btn').forEach(btn => {
          btn.addEventListener('click', () => selectServer(parseInt(btn.dataset.index)));
        });
      }
    }

    // Download links
    const dlList = document.getElementById('downloadList');
    const dlSection = document.getElementById('downloadSection');
    if (dlList) {
      if (data.dlGroups && data.dlGroups.length > 0) {
        dlList.innerHTML = data.dlGroups.map(group => `
          <table class="dl-table">
            <thead><tr><td class="dl-table-title" colspan="2">${group.title ? `Download ${group.title}` : 'Download'}</td></tr></thead>
            <tbody>
              ${group.qualities.map(q => `
                <tr class="dl-table-row">
                  <td class="dl-quality">${q.quality}</td>
                  <td class="dl-links">
                    ${q.links.map(l => `<a href="${l.url}" target="_blank" rel="noopener" class="dl-link">${l.host}</a>`).join('')}
                  </td>
                </tr>`).join('')}
            </tbody>
          </table>`).join('');
      } else if (data.downloads && data.downloads.length > 0) {
        dlList.innerHTML = data.downloads.map(d =>
          `<a href="${d.url}" target="_blank" rel="noopener" class="dl-btn">⬇ ${d.quality || 'Download'}</a>`).join('');
      } else {
        if (dlSection) dlSection.style.display = 'none';
      }
    }

    // Prev/Next
    const epNav = document.getElementById('epNav');
    if (epNav) {
      epNav.innerHTML = `
        ${data.prevId ? `<button class="ep-nav-btn" onclick="navigate('/episode/${encodeURIComponent(data.prevId)}')">← Sebelumnya</button>` : '<span></span>'}
        ${data.nextId ? `<button class="ep-nav-btn primary" onclick="navigate('/episode/${encodeURIComponent(data.nextId)}')">Selanjutnya →</button>` : '<span></span>'}`;
    }

    window._epServers = data.servers;

    // Episode list with thumbnails
    const epList = document.getElementById('episodeList');
    if (epList) {
      if (!data.episodes || data.episodes.length === 0) {
        epList.innerHTML = '<p style="color:var(--text2);padding:14px;font-size:.85rem;">Daftar episode tidak tersedia.</p>';
      } else {
        epList.innerHTML = data.episodes.map(ep => {
          const isActive = ep.id === id || ep.id === decodeURIComponent(id);
          const meta = [ep.num ? `Eps ${ep.num}` : '', ep.date || ''].filter(Boolean).join(' - ');
          return `
            <div class="ep-item ${isActive ? 'active' : ''}" onclick="navigate('/episode/${encodeURIComponent(ep.id)}')">
              <div class="ep-item-thumb-wrap">
                <img src="/img/placeholder.svg" alt="" onerror="this.src='/img/placeholder.svg'" />
              </div>
              <div class="ep-item-info">
                <div class="ep-item-title">${ep.title || ep.id}</div>
                <div class="ep-item-meta">${meta}</div>
              </div>
            </div>`;
        }).join('');

        // Scroll active into view
        const activeEl = epList.querySelector('.ep-item.active');
        if (activeEl) setTimeout(() => activeEl.scrollIntoView({ block: 'center', behavior: 'smooth' }), 300);
      }
    }

    // Try load anime info from parent anime
    const animeId = data.animeId || id.replace(/-episode-[\d-]+$/i, '').replace(/-ep-?\d+.*$/i, '');
    if (animeId) {
      fetch(`/api/anime/${encodeURIComponent(animeId)}`).then(r => r.json()).then(anime => {
        const card = document.getElementById('animeInfoCard');
        const poster = document.getElementById('animePoster');
        const animeTitle = document.getElementById('animeTitle');
        const animeStatus = document.getElementById('animeStatus');
        const animeEpCount = document.getElementById('animeEpCount');
        const bcAnime = document.getElementById('bcAnime');

        if (anime.title && card) {
          if (poster && anime.poster) poster.src = anime.poster;
          if (animeTitle) animeTitle.textContent = anime.title;
          if (animeStatus) animeStatus.textContent = anime.status || 'Ongoing';
          if (animeEpCount && data.episodes) animeEpCount.textContent = `${data.episodes.length} / ${anime.episodes?.length || '?'} Eps`;
          if (bcAnime) { bcAnime.textContent = anime.title; bcAnime.href = `/anime/${encodeURIComponent(animeId)}`; }
          card.classList.add('visible');

          // Use anime poster for episode thumbnails
          if (anime.poster) {
            document.querySelectorAll('.ep-item-thumb-wrap img').forEach(img => { img.src = anime.poster; });
          }

          // Update history with full info
          const epNum = data.title?.match(/episode\s+(\d+)/i)?.[1] || '';
          saveToHistory({ id, animeId, title: data.title || title, poster: anime.poster || '', animeTitle: anime.title, epNum });
        }
      }).catch(() => {});
    }

  } catch (err) {
    showToast('Gagal memuat episode: ' + err.message);
    const wrap = document.getElementById('playerWrap');
    if (wrap) wrap.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text2);flex-direction:column;gap:12px;"><div style="font-size:3rem;">📺</div><p>Gagal memuat player</p></div>`;
    console.error(err);
  }
}

function renderPlayer(servers, index) {
  const wrap = document.getElementById('playerWrap');
  if (!wrap) return;

  if (!servers || servers.length === 0) {
    wrap.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text2);flex-direction:column;gap:12px;">
      <div style="font-size:3rem;">📺</div><p>Tidak ada video tersedia</p></div>`;
    return;
  }

  const server = servers[index];
  const src = server.iframe || '';

  if (!src) {
    wrap.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text2);"><p>Server tidak tersedia</p></div>`;
    return;
  }

  if (src.match(/\.(mp4|webm|ogg|m3u8)(\?|$)/i)) {
    wrap.innerHTML = `<video controls autoplay style="width:100%;height:100%;background:#000;"><source src="${src}" />Browser tidak mendukung video HTML5.</video>`;
  } else {
    wrap.innerHTML = `<iframe src="${src}" allow="autoplay; fullscreen; picture-in-picture"
      sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
      referrerpolicy="no-referrer"></iframe>`;
  }
}

function selectServer(index) {
  const servers = window._epServers;
  if (!servers) return;
  document.querySelectorAll('.server-btn').forEach((btn, i) => {
    btn.classList.toggle('active', i === index);
  });
  renderPlayer(servers, index);
}
