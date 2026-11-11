/**
 * PixelPic Studio – Zero-Backend Admin CMS Controller
 * Operates 100% in the browser using PortfolioStore.
 */

(function () {
  'use strict';

  // Auth Guard
  if (sessionStorage.getItem('pixelpic_admin_auth') !== 'true' && localStorage.getItem('pixelpic_admin_auth') !== 'true') {
    window.location.replace('/admin/login.html');
    return;
  }

  let allVideos = [];
  let activeFilter = {
    search: '',
    category: 'all',
    status: 'all',
    platform: 'all'
  };
  let editingVideoId = null;
  let deletingVideoId = null;
  let previewTimeout = null;
  let compressedThumbnailBase64 = null;

  // DOM Elements
  const elements = {
    // Nav & Views
    navItems: document.querySelectorAll('.nav-item[data-view]'),
    views: document.querySelectorAll('.view-section'),
    pageTitle: document.getElementById('pageTitle'),
    mobileMenuBtn: document.getElementById('mobileMenuBtn'),
    sidebar: document.getElementById('adminSidebar'),

    // Stats
    statTotal: document.getElementById('statTotal'),
    statAds: document.getElementById('statAds'),
    statFilms: document.getElementById('statFilms'),
    statShorts: document.getElementById('statShorts'),
    statPublished: document.getElementById('statPublished'),
    statDrafts: document.getElementById('statDrafts'),
    recentVideosContainer: document.getElementById('recentVideosContainer'),

    // Table
    tableBody: document.getElementById('portfolioTableBody'),
    emptyState: document.getElementById('tableEmptyState'),
    searchInput: document.getElementById('tableSearchInput'),
    categoryFilter: document.getElementById('tableCategoryFilter'),
    statusFilter: document.getElementById('tableStatusFilter'),
    platformFilter: document.getElementById('tablePlatformFilter'),

    // Top action triggers
    btnOpenAddModal: document.getElementById('btnOpenAddModal'),
    btnQuickAddOverview: document.getElementById('btnQuickAddOverview'),
    btnDownloadJsonTop: document.getElementById('btnDownloadJsonTop'),
    btnCopyJsonTop: document.getElementById('btnCopyJsonTop'),
    btnDownloadJsonOverview: document.getElementById('btnDownloadJsonOverview'),
    btnCopyJsonOverview: document.getElementById('btnCopyJsonOverview'),
    btnDownloadJsonBackup: document.getElementById('btnDownloadJsonBackup'),
    btnCopyJsonBackup: document.getElementById('btnCopyJsonBackup'),
    importJsonFileInput: document.getElementById('importJsonFileInput'),
    btnResetDefaults: document.getElementById('btnResetDefaults'),

    // Video Form Modal
    videoModalBackdrop: document.getElementById('videoModalBackdrop'),
    videoModalTitle: document.getElementById('videoModalTitle'),
    videoForm: document.getElementById('videoForm'),
    btnCancelVideoModal: document.getElementById('btnCancelVideoModal'),
    btnCloseVideoModal: document.getElementById('btnCloseVideoModal'),
    btnSubmitVideo: document.getElementById('btnSubmitVideo'),

    // Inputs
    inputTitle: document.getElementById('videoTitleInput'),
    inputCategory: document.getElementById('videoCategorySelect'),
    platformBtns: document.querySelectorAll('.platform-toggle-btn'),
    inputUrl: document.getElementById('videoUrlInput'),
    urlFeedback: document.getElementById('urlFeedback'),
    driveNotice: document.getElementById('driveNotice'),
    previewBoxContainer: document.getElementById('modalPreviewContainer'),
    imageFileInput: document.getElementById('imageFileInput'),
    thumbPreviewImg: document.getElementById('thumbPreviewImg'),
    thumbEmptySpan: document.getElementById('thumbEmptySpan'),
    inputThumbnail: document.getElementById('videoThumbnailInput'),
    inputLayoutSpan: document.getElementById('videoLayoutSpanSelect'),
    layoutSpanGroup: document.getElementById('layoutSpanGroup'),
    inputOrder: document.getElementById('videoOrderInput'),
    inputPublished: document.getElementById('videoPublishedToggle'),
    inputDescription: document.getElementById('videoDescriptionInput'),

    // Delete Modal
    deleteModalBackdrop: document.getElementById('deleteModalBackdrop'),
    deleteTitleDisplay: document.getElementById('deleteVideoTitleDisplay'),
    btnCancelDelete: document.getElementById('btnCancelDelete'),
    btnCloseDelete: document.getElementById('btnCloseDelete'),
    btnConfirmDelete: document.getElementById('btnConfirmDelete'),

    // Preview Modal
    previewModalBackdrop: document.getElementById('previewModalBackdrop'),
    previewModalTitle: document.getElementById('previewModalTitle'),
    previewModalFrame: document.getElementById('previewModalFrame'),
    previewModalMeta: document.getElementById('previewModalMeta'),
    previewModalOriginalLink: document.getElementById('previewModalOriginalLink'),
    btnClosePreviewModal: document.getElementById('btnClosePreviewModal'),

    // Toast Container
    toastContainer: document.getElementById('toastContainer')
  };

  // =========================================================================
  // TOASTS
  // =========================================================================

  function showToast(message, type = 'info', duration = 3500) {
    if (!elements.toastContainer) return;
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;

    let iconSvg = '';
    if (type === 'success') {
      iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>`;
    } else if (type === 'error') {
      iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`;
    } else {
      iconSvg = `<svg class="toast-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="8"/></svg>`;
    }

    toast.innerHTML = `${iconSvg}<div class="toast-msg">${message}</div>`;
    elements.toastContainer.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(20px)';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }

  // =========================================================================
  // NAVIGATION & VIEWS
  // =========================================================================

  function switchView(targetView) {
    elements.navItems.forEach(item => {
      item.classList.toggle('active', item.dataset.view === targetView);
    });

    elements.views.forEach(section => {
      section.classList.toggle('active', section.id === `view-${targetView}`);
    });

    if (elements.pageTitle) {
      if (targetView === 'overview') elements.pageTitle.textContent = 'Dashboard Overview';
      else if (targetView === 'portfolio') elements.pageTitle.textContent = 'Portfolio Video Management';
      else if (targetView === 'backup') elements.pageTitle.textContent = 'Data Backup & Export';
      else if (targetView === 'security') elements.pageTitle.textContent = 'Security & Passcode Settings';
    }

    if (elements.sidebar) elements.sidebar.classList.remove('open');
  }

  // =========================================================================
  // DATA LOAD & RENDER
  // =========================================================================

  async function loadData() {
    try {
      allVideos = await window.PortfolioStore.getAllVideos();
      updateStats();
      renderPortfolioTable();
      renderRecentOverview();
    } catch (err) {
      console.error('Failed to load portfolio items:', err);
      showToast('Error loading items: ' + err.message, 'error');
    }
  }

  function updateStats() {
    const stats = window.PortfolioStore.computeStats(allVideos);
    if (elements.statTotal) elements.statTotal.textContent = stats.total;
    if (elements.statAds) elements.statAds.textContent = stats.ads;
    if (elements.statFilms) elements.statFilms.textContent = stats.films;
    if (elements.statShorts) elements.statShorts.textContent = stats.shorts;
    if (elements.statPublished) elements.statPublished.textContent = stats.published;
    if (elements.statDrafts) elements.statDrafts.textContent = stats.drafts;
  }

  function renderRecentOverview() {
    if (!elements.recentVideosContainer) return;
    const recent = allVideos.slice(0, 5);

    if (recent.length === 0) {
      elements.recentVideosContainer.innerHTML = `
        <div style="padding: 24px; text-align: center; color: var(--text-dim); font-size: 13px;">
          No portfolio videos added yet. Click "Add New Video" to begin!
        </div>
      `;
      return;
    }

    elements.recentVideosContainer.innerHTML = recent.map(v => {
      const isPortrait = v.category === 'Shorts';
      const thumb = v.thumbnail_url || (v.platform === 'youtube'
        ? `https://img.youtube.com/vi/${(v.embed_url || '').split('/').pop()}/hqdefault.jpg`
        : '/poster.jpg');

      return `
        <div style="display: flex; align-items: center; justify-content: space-between; padding: 12px 18px; border-bottom: 1px solid var(--border);">
          <div style="display: flex; align-items: center; gap: 12px;">
            <div class="thumb-wrap ${isPortrait ? 'portrait' : ''}" style="width: 50px; height: 32px;">
              <img src="${escapeHtml(thumb)}" alt="${escapeHtml(v.title)}" onerror="this.src='/poster.jpg'">
            </div>
            <div>
              <div style="font-weight: 700; font-size: 13.5px; color: var(--text-primary);">${escapeHtml(v.title)}</div>
              <div style="font-size: 11.5px; color: var(--text-muted);">${escapeHtml(v.category)} • ${v.platform === 'google_drive' ? 'Google Drive' : 'YouTube'}</div>
            </div>
          </div>
          <div>
            <span class="badge ${v.is_published ? 'badge-status published' : 'badge-status draft'}">${v.is_published ? 'Published' : 'Draft'}</span>
          </div>
        </div>
      `;
    }).join('');
  }

  function renderPortfolioTable() {
    if (!elements.tableBody) return;

    const filtered = allVideos.filter(v => {
      if (activeFilter.search) {
        const q = activeFilter.search.toLowerCase();
        if (!(v.title || '').toLowerCase().includes(q) && !(v.description || '').toLowerCase().includes(q)) {
          return false;
        }
      }
      if (activeFilter.category !== 'all' && v.category !== activeFilter.category) return false;
      if (activeFilter.status !== 'all') {
        const isPub = activeFilter.status === 'published';
        if (v.is_published !== isPub) return false;
      }
      if (activeFilter.platform !== 'all' && v.platform !== activeFilter.platform) return false;
      return true;
    });

    if (filtered.length === 0) {
      elements.tableBody.innerHTML = '';
      if (elements.emptyState) elements.emptyState.style.display = 'flex';
      return;
    }

    if (elements.emptyState) elements.emptyState.style.display = 'none';

    elements.tableBody.innerHTML = filtered.map((v, index) => {
      const isPortrait = v.category === 'Shorts';
      const thumb = v.thumbnail_url || (v.platform === 'youtube'
        ? `https://img.youtube.com/vi/${(v.embed_url || '').split('/').pop()}/hqdefault.jpg`
        : '/poster.jpg');

      let categoryBadgeClass = 'badge-cat-films';
      if (v.category === 'Ads') categoryBadgeClass = 'badge-cat-ads';
      else if (v.category === 'Shorts') categoryBadgeClass = 'badge-cat-shorts';

      const isFirst = index === 0;
      const isLast = index === filtered.length - 1;

      return `
        <tr data-id="${v.id}">
          <td>
            <div class="order-cell">
              <span class="order-badge">${v.display_order}</span>
              <div class="order-arrows">
                <button class="btn-order-arrow" title="Move Up" ${isFirst ? 'disabled style="opacity:0.2;cursor:default"' : ''} onclick="window.PixelPicAdmin.moveOrder('${v.id}', -1)">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 15l-6-6-6 6"/></svg>
                </button>
                <button class="btn-order-arrow" title="Move Down" ${isLast ? 'disabled style="opacity:0.2;cursor:default"' : ''} onclick="window.PixelPicAdmin.moveOrder('${v.id}', 1)">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M6 9l6 6 6-6"/></svg>
                </button>
              </div>
            </div>
          </td>
          <td>
            <div class="video-info-cell">
              <div class="thumb-wrap ${isPortrait ? 'portrait' : ''}">
                <img src="${escapeHtml(thumb)}" alt="${escapeHtml(v.title)}" onerror="this.src='/poster.jpg'">
                <div class="thumb-play-icon">
                  <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                </div>
              </div>
              <div class="video-text-meta">
                <div class="video-table-title" title="${escapeHtml(v.title)}">${escapeHtml(v.title)}</div>
                <div class="video-table-desc">${escapeHtml(v.description || 'No description provided.')}</div>
              </div>
            </div>
          </td>
          <td>
            <div style="display:flex; flex-direction:column; gap:4px; align-items:flex-start;">
              <span class="badge ${categoryBadgeClass}">${escapeHtml(v.category)}</span>
              ${v.layout_span && v.layout_span !== 'normal' ? `<span style="font-size:10px; color:var(--text-muted); font-weight:700;">${v.layout_span.toUpperCase()}</span>` : ''}
            </div>
          </td>
          <td>
            <a href="${escapeHtml(v.original_url)}" target="_blank" rel="noopener noreferrer" class="badge badge-platform ${v.platform === 'google_drive' ? 'drive' : 'youtube'}" title="Open original link">
              ${v.platform === 'google_drive'
                ? `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14.5v-9l6 4.5-6 4.5z"/></svg> Google Drive ↗`
                : `<svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19.615 3.184c-3.604-.246-11.631-.245-15.23 0-3.897.266-4.356 2.62-4.385 8.816.029 6.185.484 8.549 4.385 8.816 3.6.245 11.626.246 15.23 0 3.897-.266 4.356-2.62 4.385-8.816-.029-6.185-.484-8.549-4.385-8.816zm-10.615 12.816v-8l8 3.993-8 4.007z"/></svg> YouTube ↗`}
            </a>
          </td>
          <td>
            <span class="badge badge-status ${v.is_published ? 'published' : 'draft'}" onclick="window.PixelPicAdmin.togglePublish('${v.id}')" title="Click to toggle publish status">
              ${v.is_published ? '● Published' : '○ Draft'}
            </span>
          </td>
          <td>
            <div class="actions-cell">
              <button class="btn-icon" title="Preview Video" onclick="window.PixelPicAdmin.openPreview('${v.id}')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
              </button>
              <button class="btn-icon" title="Edit Video" onclick="window.PixelPicAdmin.openEditModal('${v.id}')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button class="btn-icon danger" title="Delete Video" onclick="window.PixelPicAdmin.openDeleteModal('${v.id}')">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/></svg>
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  // =========================================================================
  // ADD / EDIT MODAL & FORM
  // =========================================================================

  function openAddModal() {
    editingVideoId = null;
    compressedThumbnailBase64 = null;
    elements.videoModalTitle.textContent = 'Add New Portfolio Video';
    elements.btnSubmitVideo.textContent = 'Save to Portfolio';

    elements.videoForm.reset();
    setPlatformToggle('google_drive'); // default to Google Drive as requested
    elements.inputCategory.value = 'Films';
    elements.inputLayoutSpan.value = 'normal';
    elements.layoutSpanGroup.style.display = 'flex';
    elements.inputPublished.checked = true;

    // Reset thumbnail preview
    setThumbPreview('');

    const maxOrder = allVideos.reduce((max, v) => Math.max(max, v.display_order || 0), 0);
    elements.inputOrder.value = maxOrder + 1;

    clearModalPreview();
    elements.videoModalBackdrop.classList.add('open');
  }

  function openEditModal(id) {
    const video = allVideos.find(v => v.id === id);
    if (!video) return;

    editingVideoId = id;
    compressedThumbnailBase64 = null;
    elements.videoModalTitle.textContent = 'Edit Portfolio Video';
    elements.btnSubmitVideo.textContent = 'Save Changes';

    elements.inputTitle.value = video.title || '';
    elements.inputCategory.value = video.category || 'Films';
    setPlatformToggle(video.platform || 'google_drive');
    elements.inputUrl.value = video.original_url || '';
    elements.inputThumbnail.value = video.thumbnail_url || '';
    setThumbPreview(video.thumbnail_url || '');

    elements.inputLayoutSpan.value = video.layout_span || 'normal';
    elements.inputOrder.value = video.display_order || 0;
    elements.inputPublished.checked = video.is_published !== false;
    elements.inputDescription.value = video.description || '';

    elements.layoutSpanGroup.style.display = video.category === 'Shorts' ? 'none' : 'flex';

    updateModalPreview(video.original_url, video.platform, video.category);
    elements.videoModalBackdrop.classList.add('open');
  }

  function closeVideoModal() {
    elements.videoModalBackdrop.classList.remove('open');
    clearModalPreview();
    editingVideoId = null;
    compressedThumbnailBase64 = null;
  }

  function setThumbPreview(src) {
    if (src) {
      elements.thumbPreviewImg.src = src;
      elements.thumbPreviewImg.style.display = 'block';
      elements.thumbEmptySpan.style.display = 'none';
    } else {
      elements.thumbPreviewImg.src = '';
      elements.thumbPreviewImg.style.display = 'none';
      elements.thumbEmptySpan.style.display = 'block';
    }
  }

  function setPlatformToggle(platform) {
    elements.platformBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.platform === platform);
    });

    if (platform === 'google_drive') {
      elements.inputUrl.placeholder = 'Paste Google Drive sharing link (e.g. drive.google.com/file/d/.../view)';
      elements.driveNotice.style.display = 'flex';
    } else {
      elements.inputUrl.placeholder = 'Paste YouTube video or Shorts link (e.g. youtu.be/... or youtube.com/watch?v=...)';
      elements.driveNotice.style.display = 'none';
    }
  }

  function getActivePlatform() {
    const active = document.querySelector('.platform-toggle-btn.active');
    return active ? active.dataset.platform : 'google_drive';
  }

  function clearModalPreview() {
    elements.previewBoxContainer.innerHTML = `
      <div class="preview-empty-state">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>
        <span>Enter a valid video URL above to see real-time player preview</span>
      </div>
    `;
    elements.urlFeedback.innerHTML = '';
  }

  function updateModalPreview(url, platform, category) {
    if (!url || !url.trim()) {
      clearModalPreview();
      return;
    }

    const parsed = window.PortfolioStore.parseVideoLink(url, platform);

    if (!parsed.valid) {
      elements.urlFeedback.innerHTML = `<span style="color:var(--danger); font-size:12px;">✕ ${escapeHtml(parsed.error)}</span>`;
      clearModalPreview();
      return;
    }

    elements.urlFeedback.innerHTML = `<span style="color:var(--success); font-size:12px;">✓ ${parsed.platform === 'google_drive' ? 'Google Drive link fixed into playable preview embed!' : 'Valid YouTube video detected!'}</span>`;

    const isShorts = category === 'Shorts' || parsed.isShort;
    const ratioClass = isShorts ? 'preview-ratio-9-16' : 'preview-ratio-16-9';

    elements.previewBoxContainer.innerHTML = `
      <div class="${ratioClass}">
        <iframe src="${escapeHtml(parsed.embedUrl)}" allow="autoplay; encrypted-media; fullscreen"></iframe>
      </div>
    `;

    // Auto-suggest thumbnail if none provided
    if (!compressedThumbnailBase64 && !elements.inputThumbnail.value && parsed.thumbnailUrl) {
      setThumbPreview(parsed.thumbnailUrl);
    }
  }

  // Submit Handler
  async function handleVideoFormSubmit(e) {
    e.preventDefault();

    const title = elements.inputTitle.value.trim();
    const category = elements.inputCategory.value;
    const platform = getActivePlatform();
    const original_url = elements.inputUrl.value.trim();
    const thumbnail_url = compressedThumbnailBase64 || elements.inputThumbnail.value.trim() || null;
    const layout_span = elements.inputLayoutSpan.value;
    const display_order = parseInt(elements.inputOrder.value, 10) || 0;
    const is_published = elements.inputPublished.checked;
    const description = elements.inputDescription.value.trim();

    if (!title) {
      showToast('Please provide a video title.', 'error');
      elements.inputTitle.focus();
      return;
    }
    if (!original_url) {
      showToast('Please paste a video link.', 'error');
      elements.inputUrl.focus();
      return;
    }

    elements.btnSubmitVideo.disabled = true;
    elements.btnSubmitVideo.textContent = 'Saving...';

    try {
      const payload = {
        title,
        category,
        platform,
        original_url,
        thumbnail_url,
        layout_span: category === 'Shorts' ? 'normal' : layout_span,
        display_order,
        is_published,
        description: description || null
      };

      if (editingVideoId) {
        await window.PortfolioStore.updateVideo(editingVideoId, payload);
        showToast('Video updated successfully!', 'success');
      } else {
        await window.PortfolioStore.addVideo(payload);
        showToast('Video added to portfolio!', 'success');
      }

      closeVideoModal();
      await loadData();
    } catch (err) {
      showToast('Error: ' + err.message, 'error');
    } finally {
      elements.btnSubmitVideo.disabled = false;
      elements.btnSubmitVideo.textContent = editingVideoId ? 'Save Changes' : 'Save to Portfolio';
    }
  }

  // =========================================================================
  // DELETE & PREVIEW MODALS
  // =========================================================================

  function openDeleteModal(id) {
    const video = allVideos.find(v => v.id === id);
    if (!video) return;
    deletingVideoId = id;
    elements.deleteTitleDisplay.textContent = `"${video.title}" (${video.category})`;
    elements.deleteModalBackdrop.classList.add('open');
  }

  function closeDeleteModal() {
    elements.deleteModalBackdrop.classList.remove('open');
    deletingVideoId = null;
  }

  async function confirmDeleteVideo() {
    if (!deletingVideoId) return;
    await window.PortfolioStore.deleteVideo(deletingVideoId);
    showToast('Video deleted.', 'success');
    closeDeleteModal();
    await loadData();
  }

  function openPreview(id) {
    const video = allVideos.find(v => v.id === id);
    if (!video) return;

    elements.previewModalTitle.textContent = video.title;
    elements.previewModalFrame.src = video.embed_url;
    elements.previewModalMeta.textContent = `${video.category} • ${video.platform === 'google_drive' ? 'Google Drive' : 'YouTube'} • Order #${video.display_order}`;
    elements.previewModalOriginalLink.href = video.original_url;
    elements.previewModalOriginalLink.textContent = video.platform === 'google_drive' ? 'Open in Google Drive ↗' : 'Watch on YouTube ↗';

    elements.previewModalBackdrop.classList.add('open');
  }

  function closePreviewModal() {
    elements.previewModalBackdrop.classList.remove('open');
    elements.previewModalFrame.src = '';
  }

  // =========================================================================
  // REORDER & TOGGLE
  // =========================================================================

  async function moveOrder(id, delta) {
    await window.PortfolioStore.moveOrder(id, delta);
    showToast('Order updated.', 'info', 1500);
    await loadData();
  }

  async function togglePublish(id) {
    const newState = await window.PortfolioStore.togglePublish(id);
    showToast(newState ? 'Video published to live website!' : 'Video moved to drafts.', 'success');
    await loadData();
  }

  // =========================================================================
  // EVENT LISTENERS & SETUP
  // =========================================================================

  function escapeHtml(str) {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function setupEventListeners() {
    // Nav
    elements.navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        switchView(item.dataset.view);
      });
    });

    if (elements.mobileMenuBtn && elements.sidebar) {
      elements.mobileMenuBtn.addEventListener('click', () => {
        elements.sidebar.classList.toggle('open');
      });
    }

    // Search & Filters
    elements.searchInput.addEventListener('input', (e) => {
      activeFilter.search = e.target.value;
      renderPortfolioTable();
    });
    elements.categoryFilter.addEventListener('change', (e) => {
      activeFilter.category = e.target.value;
      renderPortfolioTable();
    });
    elements.statusFilter.addEventListener('change', (e) => {
      activeFilter.status = e.target.value;
      renderPortfolioTable();
    });
    elements.platformFilter.addEventListener('change', (e) => {
      activeFilter.platform = e.target.value;
      renderPortfolioTable();
    });

    // Add modal triggers
    if (elements.btnOpenAddModal) elements.btnOpenAddModal.addEventListener('click', openAddModal);
    if (elements.btnQuickAddOverview) elements.btnQuickAddOverview.addEventListener('click', openAddModal);

    // Modal close
    if (elements.btnCancelVideoModal) elements.btnCancelVideoModal.addEventListener('click', closeVideoModal);
    if (elements.btnCloseVideoModal) elements.btnCloseVideoModal.addEventListener('click', closeVideoModal);
    if (elements.videoModalBackdrop) {
      elements.videoModalBackdrop.addEventListener('click', (e) => {
        if (e.target === elements.videoModalBackdrop) closeVideoModal();
      });
    }

    // Platform toggle buttons
    elements.platformBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        setPlatformToggle(btn.dataset.platform);
        updateModalPreview(elements.inputUrl.value, btn.dataset.platform, elements.inputCategory.value);
      });
    });

    // Category change in modal
    elements.inputCategory.addEventListener('change', (e) => {
      const isShorts = e.target.value === 'Shorts';
      elements.layoutSpanGroup.style.display = isShorts ? 'none' : 'flex';
      updateModalPreview(elements.inputUrl.value, getActivePlatform(), e.target.value);
    });

    // URL input live parsing
    elements.inputUrl.addEventListener('input', (e) => {
      clearTimeout(previewTimeout);
      previewTimeout = setTimeout(() => {
        updateModalPreview(e.target.value, getActivePlatform(), elements.inputCategory.value);
      }, 300);
    });

    // Browser Image File Picker with Canvas Compression
    elements.imageFileInput.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      try {
        showToast('Compressing image in browser...', 'info', 1500);
        const compressedBase64 = await window.PortfolioStore.compressImageFile(file, 960, 540, 0.82);
        compressedThumbnailBase64 = compressedBase64;
        setThumbPreview(compressedBase64);
        showToast('Image uploaded & compressed locally!', 'success');
      } catch (err) {
        showToast('Image error: ' + err.message, 'error');
      }
    });

    // Custom thumbnail URL input
    elements.inputThumbnail.addEventListener('input', (e) => {
      if (e.target.value) {
        compressedThumbnailBase64 = null;
        setThumbPreview(e.target.value);
      }
    });

    // Video form submit
    elements.videoForm.addEventListener('submit', handleVideoFormSubmit);

    // Delete modal
    if (elements.btnCancelDelete) elements.btnCancelDelete.addEventListener('click', closeDeleteModal);
    if (elements.btnCloseDelete) elements.btnCloseDelete.addEventListener('click', closeDeleteModal);
    if (elements.btnConfirmDelete) elements.btnConfirmDelete.addEventListener('click', confirmDeleteVideo);
    if (elements.deleteModalBackdrop) {
      elements.deleteModalBackdrop.addEventListener('click', (e) => {
        if (e.target === elements.deleteModalBackdrop) closeDeleteModal();
      });
    }

    // Preview modal
    if (elements.btnClosePreviewModal) elements.btnClosePreviewModal.addEventListener('click', closePreviewModal);
    if (elements.previewModalBackdrop) {
      elements.previewModalBackdrop.addEventListener('click', (e) => {
        if (e.target === elements.previewModalBackdrop) closePreviewModal();
      });
    }

    // Download & Copy JSON buttons
    const triggerDownload = async () => {
      await window.PortfolioStore.downloadVideosJson();
      showToast('videos.json downloaded! Place in data/ folder for deployment.', 'success', 5000);
    };
    if (elements.btnDownloadJsonTop) elements.btnDownloadJsonTop.addEventListener('click', triggerDownload);
    if (elements.btnDownloadJsonOverview) elements.btnDownloadJsonOverview.addEventListener('click', triggerDownload);
    if (elements.btnDownloadJsonBackup) elements.btnDownloadJsonBackup.addEventListener('click', triggerDownload);

    const triggerCopy = async () => {
      try {
        const videos = await window.PortfolioStore.getAllVideos();
        const jsonStr = JSON.stringify(videos, null, 2);
        await navigator.clipboard.writeText(jsonStr);
        showToast('JSON copied to clipboard! Paste into data/videos.json anytime.', 'success', 3500);
      } catch (e) {
        showToast('Clipboard access denied. Please use Download button.', 'error');
      }
    };
    if (elements.btnCopyJsonTop) elements.btnCopyJsonTop.addEventListener('click', triggerCopy);
    if (elements.btnCopyJsonOverview) elements.btnCopyJsonOverview.addEventListener('click', triggerCopy);
    if (elements.btnCopyJsonBackup) elements.btnCopyJsonBackup.addEventListener('click', triggerCopy);

    // Import JSON file
    if (elements.importJsonFileInput) {
      elements.importJsonFileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        try {
          await window.PortfolioStore.importVideosJson(file);
          showToast('Portfolio imported successfully from JSON!', 'success');
          await loadData();
        } catch (err) {
          showToast('Import error: ' + err.message, 'error');
        }
      });
    }

    // Reset Defaults
    if (elements.btnResetDefaults) {
      elements.btnResetDefaults.addEventListener('click', async () => {
        if (confirm('Reset portfolio back to the studio defaults (21 videos)?')) {
          await window.PortfolioStore.resetToDefaults();
          showToast('Reset to original studio portfolio.', 'info');
          await loadData();
        }
      });
    }

    // Logout
    const logoutBtn = document.getElementById('sidebarLogoutBtn');
    if (logoutBtn) {
      logoutBtn.addEventListener('click', () => {
        sessionStorage.removeItem('pixelpic_admin_auth');
        localStorage.removeItem('pixelpic_admin_auth');
        showToast('Logged out. Redirecting to login...', 'info');
        setTimeout(() => {
          window.location.replace('/admin/login.html');
        }, 300);
      });
    }

    // Change Passcode Form
    const changePasscodeForm = document.getElementById('changePasscodeForm');
    const btnResetPasscodeDefault = document.getElementById('btnResetPasscodeDefault');
    const DEFAULT_HASH = '202634f4e59165f48f28222d599c5a95198a44511ff43794689ceba7c7966fd3'; // SHA-256 for 'pixelpic2026'

    async function hashText(str) {
      const buffer = new TextEncoder().encode(str);
      const digest = await crypto.subtle.digest('SHA-256', buffer);
      return Array.from(new Uint8Array(digest)).map(b => b.toString(16).padStart(2, '0')).join('');
    }

    if (changePasscodeForm) {
      changePasscodeForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPass = document.getElementById('currentPasscodeInput').value.trim();
        const newPass = document.getElementById('newPasscodeInput').value.trim();
        const confirmPass = document.getElementById('confirmPasscodeInput').value.trim();

        if (newPass !== confirmPass) {
          showToast('New passwords do not match!', 'error');
          return;
        }

        if (newPass.length < 6) {
          showToast('Password must be at least 6 characters.', 'error');
          return;
        }

        const currentHash = await hashText(currentPass);
        const storedHash = localStorage.getItem('pixelpic_admin_hash') || DEFAULT_HASH;

        if (currentHash !== storedHash) {
          showToast('Current password is incorrect!', 'error');
          return;
        }

        const newHash = await hashText(newPass);
        localStorage.setItem('pixelpic_admin_hash', newHash);
        showToast('Admin password updated successfully!', 'success');
        changePasscodeForm.reset();
      });
    }

    if (btnResetPasscodeDefault) {
      btnResetPasscodeDefault.addEventListener('click', () => {
        if (confirm('Reset admin password to default (pixelpic2026)?')) {
          localStorage.removeItem('pixelpic_admin_hash');
          showToast('Password reset to default (pixelpic2026).', 'info');
          if (changePasscodeForm) changePasscodeForm.reset();
        }
      });
    }

    // ESC to close modals
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        closeVideoModal();
        closeDeleteModal();
        closePreviewModal();
      }
    });
  }

  // Export methods
  window.PixelPicAdmin = {
    openEditModal,
    openDeleteModal,
    openPreview,
    moveOrder,
    togglePublish
  };

  document.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    loadData();
  });

})();
