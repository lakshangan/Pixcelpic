/**
 * PixelPic Studio – Dynamic Portfolio Integration (Zero-Backend)
 * Reads videos from PortfolioStore (localStorage + data/videos.json),
 * with full Google Drive & YouTube support, responsive ratios, and fullscreen modal.
 */

(function () {
  'use strict';

  const grid = document.getElementById('grid');
  const modal = document.getElementById('modal');
  const mFrame = document.getElementById('mFrame');
  const mTitle = document.getElementById('mTitle');
  const mYt = document.getElementById('mYt');

  let vidObserver = null;
  let revealObserver = null;
  let loadQueue = [];
  let isQueueProcessing = false;

  function getFilterSlug(category) {
    const c = (category || '').toLowerCase();
    if (c.includes('short')) return 'shorts';
    if (c.includes('ad')) return 'ad';
    return 'film';
  }

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Staggered queue processor for loading iframes when scrolled into view
  function processQueue() {
    if (loadQueue.length === 0) {
      isQueueProcessing = false;
      return;
    }
    isQueueProcessing = true;

    const wrap = loadQueue.shift();
    if (!wrap || wrap.querySelector('iframe')) {
      setTimeout(processQueue, 150);
      return;
    }

    const platform = wrap.dataset.platform || 'youtube';
    const vidId = wrap.dataset.vid;
    const embedUrl = wrap.dataset.embed;

    const ifr = document.createElement('iframe');
    ifr.setAttribute('allow', 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture');
    ifr.setAttribute('allowfullscreen', 'true');

    if (platform === 'google_drive' || (!vidId && embedUrl)) {
      ifr.src = embedUrl;
    } else {
      ifr.src = `https://www.youtube-nocookie.com/embed/${vidId}?autoplay=1&mute=1&loop=1&playlist=${vidId}&controls=1&modestbranding=1&rel=0`;
    }

    ifr.onload = () => {
      ifr.style.display = 'block';
    };

    wrap.appendChild(ifr);
    setTimeout(processQueue, 300);
  }

  function initVideoObservers() {
    if (vidObserver) vidObserver.disconnect();
    if (revealObserver) revealObserver.disconnect();

    loadQueue = [];
    isQueueProcessing = false;

    vidObserver = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          loadQueue.push(entry.target);
          obs.unobserve(entry.target);
          if (!isQueueProcessing) processQueue();
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px 250px 0px' });

    document.querySelectorAll('.vid-wrap').forEach(wrap => {
      vidObserver.observe(wrap);
    });

    const cells = [...document.querySelectorAll('.cell')];
    revealObserver = new IntersectionObserver(entries => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          const i = cells.indexOf(e.target);
          setTimeout(() => e.target.classList.add('vis'), (i % 5) * 70);
          revealObserver.unobserve(e.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -20px 0px' });

    cells.forEach(c => revealObserver.observe(c));
  }

  function closeM() {
    if (modal) modal.classList.remove('on');
    if (mFrame) mFrame.src = '';
    document.body.style.overflow = '';
  }

  const mClose = document.getElementById('mClose');
  if (mClose) mClose.onclick = closeM;
  if (modal) modal.addEventListener('click', e => { if (e.target === modal) closeM(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeM(); });

  function bindExpandModalHandlers() {
    document.querySelectorAll('.vid-expand').forEach(btn => {
      const newBtn = btn.cloneNode(true);
      btn.parentNode.replaceChild(newBtn, btn);

      newBtn.addEventListener('click', e => {
        e.stopPropagation();
        const cell = newBtn.closest('.cell');
        const wrap = cell ? cell.querySelector('.vid-wrap') : null;
        if (!wrap || !modal || !mFrame) return;

        const platform = cell.dataset.platform || 'youtube';
        const vidId = wrap.dataset.vid;
        const embedUrl = wrap.dataset.embed;
        const originalUrl = cell.dataset.yt || '#';
        const title = cell.dataset.title || '';

        if (platform === 'google_drive' || (!vidId && embedUrl)) {
          mFrame.src = embedUrl;
          if (mYt) {
            mYt.href = originalUrl;
            mYt.innerHTML = `
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/>
              </svg>
              <span>Open in Google Drive →</span>
            `;
          }
        } else {
          mFrame.src = `https://www.youtube.com/embed/${vidId}?autoplay=1&mute=0&rel=0&modestbranding=1`;
          if (mYt) {
            mYt.href = originalUrl;
            mYt.innerHTML = `
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.5 6.2a3 3 0 00-2.1-2.1C19.5 3.6 12 3.6 12 3.6s-7.5 0-9.4.5A3 3 0 00.5 6.2C0 8.1 0 12 0 12s0 3.9.5 5.8a3 3 0 002.1 2.1c1.9.5 9.4.5 9.4.5s7.5 0 9.4-.5a3 3 0 002.1-2.1C24 15.9 24 12 24 12s0-3.9-.5-5.8zM9.5 15.6V8.4L15.8 12z" />
              </svg>
              <span>Watch on YouTube →</span>
            `;
          }
        }

        if (mTitle) mTitle.textContent = title;
        modal.classList.add('on');
        document.body.style.overflow = 'hidden';
      });
    });
  }

  function bindFilterButtons() {
    document.querySelectorAll('.fb').forEach(btn => {
      btn.onclick = () => {
        document.querySelectorAll('.fb').forEach(b => b.classList.remove('on'));
        btn.classList.add('on');
        const filter = btn.dataset.f;

        const cells = document.querySelectorAll('#grid .cell');
        cells.forEach(c => {
          const cardFilter = c.dataset.f;
          if (filter === 'all' || cardFilter === 'all' || cardFilter === filter) {
            c.classList.remove('hide');
            requestAnimationFrame(() => c.classList.add('vis'));
          } else {
            c.classList.remove('vis');
            c.classList.add('hide');
          }
        });
      };
    });
  }

  function createVideoCellHtml(v) {
    const isPortrait = v.category === 'Shorts';
    const filterSlug = getFilterSlug(v.category);
    let spanClass = '';
    if (!isPortrait && v.layout_span && v.layout_span !== 'normal') {
      spanClass = v.layout_span;
    }

    let vidId = '';
    if (v.platform === 'youtube') {
      const match = (v.embed_url || '').match(/embed\/([^"&?\/\s]{11})/i);
      vidId = match ? match[1] : '';
    }

    return `
      <div class="cell vid-cell ${isPortrait ? 'portrait' : ''} ${spanClass}"
           data-f="${filterSlug}"
           data-platform="${escapeHtml(v.platform)}"
           data-yt="${escapeHtml(v.original_url)}"
           data-title="${escapeHtml(v.title)}">
        <div class="vid-wrap"
             data-vid="${escapeHtml(vidId)}"
             data-platform="${escapeHtml(v.platform)}"
             data-embed="${escapeHtml(v.embed_url)}">
        </div>
        <button class="vid-expand" title="Expand">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
          </svg>
        </button>
      </div>
    `;
  }

  const decorativeCards = {
    impact: `
      <div class="cell" data-f="all" style="background:linear-gradient(145deg,#10101e,#1a0f2e)">
        <div class="info-cell mid">
          <div class="cell-eyebrow">Our Impact</div>
          <div class="stat-big">12<em>M</em></div>
          <div class="stat-desc">Views Generated<br>Across All Projects</div>
        </div>
      </div>
    `,
    identity: `
      <div class="cell" data-f="all" style="background:linear-gradient(155deg,#0a0a18,#101828)">
        <div class="info-cell">
          <div class="cell-eyebrow">Our Studio</div>
          <div class="cell-headline">Visual<br>Identity<br>that Lasts.</div>
          <div class="cell-body">Cinematic stories built frame by frame — every cut, intentional.</div>
        </div>
      </div>
    `,
    recognition: `
      <div class="cell" data-f="all" style="background:linear-gradient(145deg,#0f0e1a,#1a100f)">
        <div class="info-cell mid">
          <div class="cell-eyebrow">Global Recognition</div>
          <div class="stat-big">25<em>+</em></div>
          <div class="stat-desc">Awards Won<br>Across Categories</div>
        </div>
      </div>
    `,
    brand: `
      <div class="cell" data-f="all" style="background:var(--brand)">
        <div class="info-cell" style="justify-content:center">
          <div class="cell-eyebrow" style="color:#000">PixelPic Studio</div>
          <div class="cell-headline" style="color:#000;font-size:clamp(1.6rem,2.5vw,2.4rem)">Where Story<br>Meets Screen.</div>
        </div>
      </div>
    `
  };

  function renderDynamicPortfolio(videos) {
    if (!grid || !videos || videos.length === 0) return;

    let html = '';
    videos.forEach((v, index) => {
      html += createVideoCellHtml(v);

      if (index === 0) {
        html += decorativeCards.impact;
      } else if (index === 4) {
        html += decorativeCards.identity;
      } else if (index === 7) {
        html += decorativeCards.recognition;
      } else if (index === 11) {
        html += decorativeCards.brand;
      }
    });

    grid.innerHTML = html;

    initVideoObservers();
    bindExpandModalHandlers();
    bindFilterButtons();
  }

  async function loadPortfolio() {
    initVideoObservers();
    bindExpandModalHandlers();
    bindFilterButtons();

    if (window.PortfolioStore) {
      try {
        const videos = await window.PortfolioStore.getPublishedVideos();
        if (videos && videos.length > 0) {
          renderDynamicPortfolio(videos);
        }
      } catch (err) {
        console.warn('[PixelPic] Using fallback portfolio items:', err);
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadPortfolio);
  } else {
    loadPortfolio();
  }

})();
