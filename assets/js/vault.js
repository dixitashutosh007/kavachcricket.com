/**
 * KAvach Cricket Club - Memories Vault Client Controller
 * Powers interactive video modal, category filters, real-time search, and deep linking
 */

(function() {
  'use strict';

  // Data Source
  let moments = (window.VAULT_COLLECTION && Array.isArray(window.VAULT_COLLECTION)) ? window.VAULT_COLLECTION : [];
  let currentFilter = 'all';
  let searchQuery = '';
  let activeModalIndex = -1;

  // DOM Elements
  const gridContainer = document.getElementById('vaultGrid');
  const filterPills = document.querySelectorAll('.filter-pill');
  const searchInput = document.getElementById('vaultSearchInput');
  const modalOverlay = document.getElementById('vaultModalOverlay');
  const modalPlayerStage = document.getElementById('modalPlayerStage');
  const modalHeadlineTitle = document.getElementById('modalHeadlineTitle');
  const modalSubtitle = document.getElementById('modalSubtitle');
  const modalStatPill = document.getElementById('modalStatPill');
  const modalMetaPlayer = document.getElementById('modalMetaPlayer');
  const modalMetaOpponent = document.getElementById('modalMetaOpponent');
  const modalMetaDate = document.getElementById('modalMetaDate');
  const modalMetaVenue = document.getElementById('modalMetaVenue');
  const modalStory = document.getElementById('modalStory');
  const modalHighlightsList = document.getElementById('modalHighlightsList');
  const modalInstagramLink = document.getElementById('modalInstagramLink');
  const modalShareBtn = document.getElementById('modalShareBtn');
  const modalPrevBtn = document.getElementById('modalPrevBtn');
  const modalNextBtn = document.getElementById('modalNextBtn');
  const modalCloseBtn = document.getElementById('modalCloseBtn');
  const totalMomentsCount = document.getElementById('totalMomentsCount');

  // Category Names Map
  const CATEGORY_NAMES = {
    all: 'All Moments',
    centuries: 'Centuries & Knocks',
    bowling: '5-Wicket Hauls & Spells',
    dugout: 'Dugout & Celebrations',
    thrillers: 'Last-Over Thrillers',
    milestones: 'Club Milestones'
  };

  // Helper: Escape HTML
  function escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  // Update Counters on Filter Pills
  function updateCounters() {
    if (totalMomentsCount) {
      totalMomentsCount.textContent = moments.length;
    }

    filterPills.forEach(pill => {
      const cat = pill.dataset.category;
      const countSpan = pill.querySelector('.count');
      if (countSpan) {
        if (cat === 'all') {
          countSpan.textContent = moments.length;
        } else {
          const count = moments.filter(m => m.category === cat).length;
          countSpan.textContent = count;
        }
      }
    });
  }

  // Filter & Search Moments
  function getFilteredMoments() {
    return moments.filter(m => {
      const matchCat = (currentFilter === 'all' || m.category === currentFilter);
      if (!matchCat) return false;

      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        (m.title && m.title.toLowerCase().includes(q)) ||
        (m.player && m.player.toLowerCase().includes(q)) ||
        (m.opponent && m.opponent.toLowerCase().includes(q)) ||
        (m.subtitle && m.subtitle.toLowerCase().includes(q)) ||
        (m.badge && m.badge.toLowerCase().includes(q)) ||
        (m.year && m.year.toString().includes(q))
      );
    });
  }

  // Render Grid
  function renderGrid() {
    if (!gridContainer) return;
    const filtered = getFilteredMoments();

    if (filtered.length === 0) {
      gridContainer.innerHTML = `
        <div class="vault-empty-state">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
          </svg>
          <h3 style="color: #fff; margin-bottom: 8px;">No Moments Found</h3>
          <p>No archives match "${escapeHtml(searchQuery || currentFilter)}". Try clearing filters.</p>
        </div>
      `;
      return;
    }

    gridContainer.innerHTML = filtered.map((m, filteredIdx) => {
      const realIndex = moments.findIndex(item => item.id === m.id);
      const isFeatured = m.featured ? 'featured' : '';
      const mediaIcon = m.mediaType === 'youtube' ? '▶ YouTube' :
                        m.mediaType === 'instagram' ? '📱 Reel' :
                        m.mediaType === 'video' ? '🎬 Clip' : '📷 Photo';

      return `
        <article class="moment-card ${isFeatured}" data-index="${realIndex}" data-id="${m.id}" tabindex="0" role="button" aria-label="Open moment: ${escapeHtml(m.title)}">
          <div class="moment-thumb-wrap">
            <img src="${escapeHtml(m.poster || './assets/images/kavach-winning-trophy.webp')}" alt="${escapeHtml(m.title)}" class="moment-thumb-img" loading="lazy">
            <div class="moment-thumb-gradient"></div>
            
            <div class="thumb-top-badges">
              <span class="category-tag">${escapeHtml(m.badge || m.category)}</span>
              <span class="media-type-badge">${mediaIcon}</span>
            </div>

            <div class="play-badge-overlay">
              <div class="play-btn-circle">
                <svg viewBox="0 0 24 24"><polygon points="5 3 19 12 5 21 5 3"/></svg>
              </div>
            </div>
          </div>

          <div class="moment-card-body">
            <div class="moment-stat-pill">
              <svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
              <span>${escapeHtml(m.statPill || m.badge || 'Historic Match')}</span>
            </div>

            <h3 class="moment-card-title">${escapeHtml(m.title)}</h3>

            <div class="moment-card-meta">
              <span>👤 ${escapeHtml(m.player)}</span>
              <span>•</span>
              <span>🏏 ${escapeHtml(m.opponent)}</span>
              <span>•</span>
              <span>📅 ${escapeHtml(m.date || m.year)}</span>
            </div>

            <p class="moment-card-story">${escapeHtml(m.story)}</p>

            <div class="moment-card-footer">
              <button type="button" class="card-action-btn">
                <span>Watch Highlights</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
              </button>
            </div>
          </div>
        </article>
      `;
    }).join('');

    // Attach Click Events to Cards
    gridContainer.querySelectorAll('.moment-card').forEach(card => {
      const idx = parseInt(card.dataset.index, 10);
      card.addEventListener('click', () => openModal(idx));
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openModal(idx);
        }
      });
    });
  }

  // Open Cinema Modal
  function openModal(index) {
    if (index < 0 || index >= moments.length) return;
    activeModalIndex = index;
    const m = moments[index];

    // Populate Modal Content
    if (modalHeadlineTitle) modalHeadlineTitle.textContent = m.title;
    if (modalSubtitle) modalSubtitle.textContent = m.subtitle || m.badge || '';
    if (modalStatPill) modalStatPill.textContent = m.statPill || m.badge || '';
    if (modalMetaPlayer) modalMetaPlayer.textContent = m.player || 'KAvach Team';
    if (modalMetaOpponent) modalMetaOpponent.textContent = m.opponent || 'Club Tournament';
    if (modalMetaDate) modalMetaDate.textContent = m.date || m.year || '';
    if (modalMetaVenue) modalMetaVenue.textContent = m.venue || 'Play Arena, Sarjapur';
    if (modalStory) modalStory.textContent = m.story || '';

    // Render Highlights
    if (modalHighlightsList) {
      if (m.highlights && m.highlights.length > 0) {
        modalHighlightsList.innerHTML = m.highlights.map(h => `
          <li class="modal-highlight-item">
            <svg viewBox="0 0 24 24"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
            <span>${escapeHtml(h)}</span>
          </li>
        `).join('');
      } else {
        modalHighlightsList.innerHTML = '';
      }
    }

    // Instagram CTA
    if (modalInstagramLink) {
      if (m.instagramUrl) {
        modalInstagramLink.href = m.instagramUrl;
        modalInstagramLink.style.display = 'inline-flex';
      } else {
        modalInstagramLink.style.display = 'none';
      }
    }

    // Share Button Event
    if (modalShareBtn) {
      modalShareBtn.onclick = () => {
        const shareUrl = `${window.location.origin}${window.location.pathname}#moment-${m.id}`;
        navigator.clipboard.writeText(shareUrl).then(() => {
          modalShareBtn.innerHTML = '<span>✅ Link Copied!</span>';
          setTimeout(() => {
            modalShareBtn.innerHTML = `
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>
              <span>Share Moment</span>
            `;
          }, 2000);
        });
      };
    }

    // Render Media Stage
    renderMediaStage(m);

    // Update Browser Hash without scrolling
    history.replaceState(null, '', `#moment-${m.id}`);

    // Show Modal
    if (modalOverlay) {
      modalOverlay.classList.add('active');
      document.body.style.overflow = 'hidden';
    }
  }

  // Render Video / Media Player in Modal
  function renderMediaStage(m) {
    if (!modalPlayerStage) return;

    if (m.mediaType === 'video' && m.mediaUrl) {
      modalPlayerStage.innerHTML = `
        <video class="modal-video-element" controls autoplay playsinline poster="${escapeHtml(m.poster || '')}">
          <source src="${escapeHtml(m.mediaUrl)}" type="video/mp4">
          Your browser does not support HTML5 video playback.
        </video>
      `;
    } else if (m.mediaType === 'youtube' && (m.youtubeId || m.mediaUrl)) {
      let ytId = m.youtubeId;
      if (!ytId && m.mediaUrl) {
        const match = m.mediaUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
        ytId = match ? match[1] : '';
      }
      if (ytId) {
        modalPlayerStage.innerHTML = `
          <iframe class="modal-iframe-element" 
                  src="https://www.youtube-nocookie.com/embed/${escapeHtml(ytId)}?autoplay=1&rel=0&modestbranding=1" 
                  title="${escapeHtml(m.title)}" 
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
                  allowfullscreen>
          </iframe>
        `;
      } else {
        renderFallbackPhoto(m);
      }
    } else if (m.mediaType === 'instagram' && m.instagramUrl) {
      modalPlayerStage.innerHTML = `
        <div style="text-align: center; padding: 40px 20px; color: #fff;">
          <img src="${escapeHtml(m.poster || './assets/images/trophy-celebration-night.webp')}" alt="${escapeHtml(m.title)}" style="max-height: 220px; border-radius: 12px; margin-bottom: 20px; box-shadow: 0 10px 25px rgba(0,0,0,0.5);">
          <div style="font-size: 1.1rem; font-weight: 700; margin-bottom: 12px;">📱 Instagram Reel Spotlight</div>
          <p style="font-size: 0.85rem; color: #94a3b8; max-width: 400px; margin: 0 auto 20px;">Watch this viral club reel directly with original audio on Instagram.</p>
          <a href="${escapeHtml(m.instagramUrl)}" target="_blank" rel="noopener noreferrer" class="modal-btn-cta">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
            <span>Watch Reel on Instagram</span>
          </a>
        </div>
      `;
    } else {
      renderFallbackPhoto(m);
    }
  }

  function renderFallbackPhoto(m) {
    modalPlayerStage.innerHTML = `
      <img src="${escapeHtml(m.poster || m.mediaUrl || './assets/images/kavach-winning-trophy.webp')}" alt="${escapeHtml(m.title)}" class="modal-photo-element">
    `;
  }

  // Close Modal
  function closeModal() {
    if (!modalOverlay) return;
    modalOverlay.classList.remove('active');
    document.body.style.overflow = '';
    
    // Stop any playing video/iframe
    if (modalPlayerStage) {
      modalPlayerStage.innerHTML = '';
    }

    // Clean hash
    if (window.location.hash.startsWith('#moment-')) {
      history.replaceState(null, '', window.location.pathname);
    }
  }

  // Prev / Next Modal Navigation
  function navigateModal(direction) {
    if (activeModalIndex === -1) return;
    let nextIndex = activeModalIndex + direction;
    if (nextIndex < 0) nextIndex = moments.length - 1;
    if (nextIndex >= moments.length) nextIndex = 0;
    openModal(nextIndex);
  }

  // Handle URL Deep-Linking (e.g. #moment-vault-1)
  function handleDeepLink() {
    const hash = window.location.hash;
    if (hash && hash.startsWith('#moment-')) {
      const id = hash.replace('#moment-', '');
      const idx = moments.findIndex(m => m.id === id);
      if (idx !== -1) {
        setTimeout(() => openModal(idx), 200);
      }
    }
  }

  // Initialize
  function init() {
    updateCounters();
    renderGrid();

    // Filter Buttons
    filterPills.forEach(pill => {
      pill.addEventListener('click', () => {
        filterPills.forEach(p => p.classList.remove('active'));
        pill.classList.add('active');
        currentFilter = pill.dataset.category || 'all';
        renderGrid();
      });
    });

    // Search Input
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value.trim();
        renderGrid();
      });
    }

    // Modal Events
    if (modalCloseBtn) modalCloseBtn.addEventListener('click', closeModal);
    if (modalPrevBtn) modalPrevBtn.addEventListener('click', () => navigateModal(-1));
    if (modalNextBtn) modalNextBtn.addEventListener('click', () => navigateModal(1));

    if (modalOverlay) {
      modalOverlay.addEventListener('click', (e) => {
        if (e.target === modalOverlay) closeModal();
      });
    }

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      if (!modalOverlay || !modalOverlay.classList.contains('active')) return;
      if (e.key === 'Escape') closeModal();
      if (e.key === 'ArrowLeft') navigateModal(-1);
      if (e.key === 'ArrowRight') navigateModal(1);
    });

    // Deep link check
    handleDeepLink();
  }

  // Run on DOM Ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
