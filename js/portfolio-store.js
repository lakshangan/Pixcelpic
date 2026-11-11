/**
 * PixelPic Studio – Zero-Backend Portfolio Store & Video Driver
 * 
 * 100% Serverless & Account-Free:
 * - Uses browser storage (localStorage) + local data/videos.json fallback
 * - Fixes Google Drive video links into playable iframe preview embeds
 * - Auto-extracts YouTube video IDs and thumbnails
 * - Browser-native image compression (Canvas + FileReader) for local uploads
 * - 1-click Download / Export of videos.json for permanent deployment
 */

(function (window) {
  'use strict';

  const STORAGE_KEY = 'pixelpic_portfolio_videos';
  const DEFAULT_JSON_PATH = 'data/videos.json';

  // =========================================================================
  // 1. GOOGLE DRIVE & YOUTUBE LINK PARSERS
  // =========================================================================

  /**
   * Fix Google Drive link and generate preview embed URL
   * Supports:
   *  - drive.google.com/file/d/FILE_ID/view?usp=sharing
   *  - drive.google.com/file/d/FILE_ID/view
   *  - drive.google.com/open?id=FILE_ID
   *  - drive.google.com/uc?id=FILE_ID
   *  - drive.google.com/file/d/FILE_ID/preview
   */
  function fixGoogleDriveUrl(url) {
    if (!url || typeof url !== 'string') {
      return { valid: false, error: 'Please enter a Google Drive link.' };
    }

    const trimmed = url.trim();
    const driveRegex = /(?:drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?id=))([a-zA-Z0-9_-]{25,})/i;
    const match = trimmed.match(driveRegex);

    if (match && match[1]) {
      const fileId = match[1];
      return {
        valid: true,
        platform: 'google_drive',
        fileId: fileId,
        originalUrl: trimmed,
        // The fixed embed URL required to play inside the iframe
        embedUrl: `https://drive.google.com/file/d/${fileId}/preview`,
        thumbnailUrl: `https://drive.google.com/thumbnail?id=${fileId}&sz=w1280`
      };
    }

    return {
      valid: false,
      error: 'Invalid Google Drive link. Please paste a standard file share link (e.g. drive.google.com/file/d/FILE_ID/view?usp=sharing).'
    };
  }

  /**
   * Parse YouTube URL and generate embed + thumbnail
   */
  function fixYouTubeUrl(url) {
    if (!url || typeof url !== 'string') {
      return { valid: false, error: 'Please enter a YouTube link.' };
    }

    const trimmed = url.trim();
    const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const match = trimmed.match(ytRegex);

    if (match && match[1]) {
      const videoId = match[1];
      const isShort = trimmed.includes('/shorts/');
      return {
        valid: true,
        platform: 'youtube',
        videoId: videoId,
        isShort: isShort,
        originalUrl: trimmed,
        embedUrl: `https://www.youtube.com/embed/${videoId}`,
        noCookieEmbedUrl: `https://www.youtube-nocookie.com/embed/${videoId}`,
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
        highResThumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
      };
    }

    return {
      valid: false,
      error: 'Invalid YouTube link. Please paste a standard YouTube video, Shorts, or youtu.be URL.'
    };
  }

  /**
   * Unified parser
   */
  function parseVideoLink(url, platformHint) {
    if (!url) return { valid: false, error: 'Please enter a video URL.' };

    const lower = url.toLowerCase();
    if (platformHint === 'google_drive' || lower.includes('drive.google.com')) {
      return fixGoogleDriveUrl(url);
    }
    if (platformHint === 'youtube' || lower.includes('youtube.com') || lower.includes('youtu.be')) {
      return fixYouTubeUrl(url);
    }

    const driveRes = fixGoogleDriveUrl(url);
    if (driveRes.valid) return driveRes;

    const ytRes = fixYouTubeUrl(url);
    if (ytRes.valid) return ytRes;

    return { valid: false, error: 'Please enter a valid YouTube or Google Drive URL.' };
  }

  // =========================================================================
  // 2. BROWSER-NATIVE IMAGE UPLOAD & COMPRESSION
  // =========================================================================

  /**
   * Reads an image file from an <input type="file"> and compresses it via HTML5 Canvas
   * into a lightweight base64 Data URL (~40KB-80KB) so it can be saved locally in JSON!
   */
  function compressImageFile(file, maxWidth = 960, maxHeight = 540, quality = 0.8) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) {
        return reject(new Error('Please select a valid image file.'));
      }

      const reader = new FileReader();
      reader.onerror = () => reject(new Error('Failed to read image file.'));
      reader.onload = (e) => {
        const img = new Image();
        img.onerror = () => reject(new Error('Failed to decode image.'));
        img.onload = () => {
          let width = img.width;
          let height = img.height;

          // Maintain aspect ratio while bounding within max dimensions
          if (width > maxWidth || height > maxHeight) {
            const ratio = Math.min(maxWidth / width, maxHeight / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
          }

          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;

          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Export compressed JPEG base64
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          resolve(dataUrl);
        };
        img.src = e.target.result;
      };
      reader.readAsDataURL(file);
    });
  }

  // =========================================================================
  // 3. STORAGE & DATA MANAGEMENT (ZERO BACKEND)
  // =========================================================================

  /**
   * Get all videos (checks localStorage first, falls back to data/videos.json)
   */
  async function getAllVideos() {
    // 1. Check browser localStorage
    const local = localStorage.getItem(STORAGE_KEY);
    if (local) {
      try {
        const parsed = JSON.parse(local);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return sortVideos(parsed);
        }
      } catch (e) {
        console.warn('Corrupt local storage data, resetting to JSON file.');
      }
    }

    // 2. Fetch default data/videos.json
    try {
      // Find proper relative path depending on if in /admin or root
      const prefix = window.location.pathname.includes('/admin') ? '../' : '';
      const response = await fetch(prefix + DEFAULT_JSON_PATH);
      if (response.ok) {
        const data = await response.json();
        // Seed localStorage so user can edit immediately
        saveVideos(data);
        return sortVideos(data);
      }
    } catch (err) {
      console.warn('Could not fetch data/videos.json:', err);
    }

    return [];
  }

  /**
   * Get only published videos for website visitors
   */
  async function getPublishedVideos() {
    const all = await getAllVideos();
    return all.filter(v => v.is_published !== false);
  }

  /**
   * Save list to localStorage
   */
  function saveVideos(videos) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(videos));
  }

  /**
   * Sort by display_order ascending
   */
  function sortVideos(videos) {
    return videos.sort((a, b) => (a.display_order || 0) - (b.display_order || 0));
  }

  /**
   * Add new video
   */
  async function addVideo(videoData) {
    const videos = await getAllVideos();

    const parsed = parseVideoLink(videoData.original_url, videoData.platform);
    if (!parsed.valid) throw new Error(parsed.error);

    const newVideo = {
      id: 'vid-' + Date.now() + '-' + Math.random().toString(36).substr(2, 5),
      title: (videoData.title || 'Untitled Video').trim(),
      description: videoData.description ? videoData.description.trim() : null,
      category: videoData.category || 'Films',
      platform: parsed.platform,
      original_url: parsed.originalUrl,
      embed_url: parsed.embedUrl,
      thumbnail_url: videoData.thumbnail_url || parsed.thumbnailUrl || null,
      layout_span: videoData.layout_span || 'normal',
      display_order: parseInt(videoData.display_order, 10) || (videos.length + 1),
      is_published: videoData.is_published !== false,
      created_at: new Date().toISOString()
    };

    videos.push(newVideo);
    saveVideos(videos);
    return newVideo;
  }

  /**
   * Update existing video
   */
  async function updateVideo(id, updates) {
    const videos = await getAllVideos();
    const index = videos.findIndex(v => v.id === id);
    if (index === -1) throw new Error('Video not found.');

    const target = videos[index];

    if (updates.title !== undefined) target.title = updates.title.trim();
    if (updates.description !== undefined) target.description = updates.description ? updates.description.trim() : null;
    if (updates.category !== undefined) target.category = updates.category;
    if (updates.layout_span !== undefined) target.layout_span = updates.layout_span;
    if (updates.display_order !== undefined) target.display_order = parseInt(updates.display_order, 10);
    if (updates.is_published !== undefined) target.is_published = !!updates.is_published;

    if (updates.original_url) {
      const parsed = parseVideoLink(updates.original_url, updates.platform);
      if (!parsed.valid) throw new Error(parsed.error);
      target.platform = parsed.platform;
      target.original_url = parsed.originalUrl;
      target.embed_url = parsed.embedUrl;
      if (!updates.thumbnail_url && !target.thumbnail_url) {
        target.thumbnail_url = parsed.thumbnailUrl;
      }
    }

    if (updates.thumbnail_url !== undefined) {
      target.thumbnail_url = updates.thumbnail_url;
    }

    target.updated_at = new Date().toISOString();
    videos[index] = target;
    saveVideos(videos);
    return target;
  }

  /**
   * Delete video
   */
  async function deleteVideo(id) {
    let videos = await getAllVideos();
    videos = videos.filter(v => v.id !== id);
    saveVideos(videos);
    return true;
  }

  /**
   * Toggle published / draft
   */
  async function togglePublish(id) {
    const videos = await getAllVideos();
    const target = videos.find(v => v.id === id);
    if (!target) return false;
    target.is_published = !target.is_published;
    saveVideos(videos);
    return target.is_published;
  }

  /**
   * Move order up or down
   */
  async function moveOrder(id, delta) {
    const videos = await getAllVideos();
    const index = videos.findIndex(v => v.id === id);
    if (index === -1) return;

    const newIndex = index + delta;
    if (newIndex < 0 || newIndex >= videos.length) return;

    const temp = videos[index];
    videos[index] = videos[newIndex];
    videos[newIndex] = temp;

    // Renumber sequentially
    videos.forEach((v, i) => { v.display_order = i + 1; });
    saveVideos(videos);
    return videos;
  }

  /**
   * Reset local storage back to default data/videos.json
   */
  async function resetToDefaults() {
    localStorage.removeItem(STORAGE_KEY);
    return await getAllVideos();
  }

  /**
   * 1-Click Download of videos.json
   */
  async function downloadVideosJson() {
    const videos = await getAllVideos();
    const jsonStr = JSON.stringify(videos, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const a = document.createElement('a');
    a.href = url;
    a.download = 'videos.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  /**
   * Import videos from a selected JSON file
   */
  function importVideosJson(file) {
    return new Promise((resolve, reject) => {
      if (!file) return reject(new Error('No file selected'));
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target.result);
          if (!Array.isArray(parsed)) throw new Error('File must contain an array of video items.');
          saveVideos(parsed);
          resolve(parsed);
        } catch (err) {
          reject(new Error('Invalid JSON file: ' + err.message));
        }
      };
      reader.readAsText(file);
    });
  }

  /**
   * Compute stats
   */
  function computeStats(videos) {
    const stats = {
      total: videos.length,
      ads: 0,
      films: 0,
      shorts: 0,
      published: 0,
      drafts: 0,
      youtube: 0,
      googleDrive: 0
    };

    videos.forEach(v => {
      const cat = (v.category || '').toLowerCase();
      if (cat.includes('ad')) stats.ads++;
      else if (cat.includes('film')) stats.films++;
      else if (cat.includes('short')) stats.shorts++;

      if (v.is_published !== false) stats.published++;
      else stats.drafts++;

      if (v.platform === 'google_drive') stats.googleDrive++;
      else stats.youtube++;
    });

    return stats;
  }

  // Export to global scope
  window.PortfolioStore = {
    fixGoogleDriveUrl,
    fixYouTubeUrl,
    parseVideoLink,
    compressImageFile,
    getAllVideos,
    getPublishedVideos,
    saveVideos,
    addVideo,
    updateVideo,
    deleteVideo,
    togglePublish,
    moveOrder,
    resetToDefaults,
    downloadVideosJson,
    importVideosJson,
    computeStats
  };

})(window);

