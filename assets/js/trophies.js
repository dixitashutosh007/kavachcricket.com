/**
 * KAvach Cricket Club - Interactive Trophy Room Engine
 * 
 * Features:
 * 1. Web Audio API Synthesizer (0 KB external audio, zero-latency sound effects)
 * 2. 3D Vault Door Entrance & Room Reveal Controller
 * 3. Spatial Multi-Wing Navigator (Center Stage, Left Wing, Right Wing)
 * 4. Touch Swipe Navigation for Mobile
 * 5. Dynamic 3D Pedestal Tilt
 * 6. Detailed Story Lightbox Modal with 5-Photo Gallery Carousel
 */

(function () {
  'use strict';

  // State Management
  let audioCtx = null;
  let isMuted = localStorage.getItem('kavach_trophy_muted') === 'true';
  let currentWing = 'center';
  let currentTrophyId = null;
  let currentPhotoIndex = 0;

  // Wing order for arrow / swipe navigation
  const WING_ORDER = ['left', 'center', 'right'];

  /* --------------------------------------------------------------------------
     1. Web Audio API Synthesizer
     -------------------------------------------------------------------------- */
  function getAudioContext() {
    if (!audioCtx) {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  }

  // Sound 1: Deep Cinematic Door Opening Rumble & Whoosh
  function playDoorOpenSound() {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const now = ctx.currentTime;

      // Low frequency rumble oscillator
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(65, now);
      osc1.frequency.exponentialRampToValueAtTime(35, now + 1.2);

      gain1.gain.setValueAtTime(0.01, now);
      gain1.gain.linearRampToValueAtTime(0.2, now + 0.2);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

      // Low-pass filter for heavy stone/steel feel
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(180, now);
      filter.frequency.linearRampToValueAtTime(400, now + 0.6);
      filter.frequency.exponentialRampToValueAtTime(120, now + 1.4);

      osc1.connect(filter);
      filter.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 1.5);

      // Ethereal golden chime chord as light spills
      setTimeout(() => {
        playChimeChord([523.25, 659.25, 783.99, 1046.50], 0.12, 1.8);
      }, 400);

    } catch (e) {
      console.warn('Audio synthesis not supported or blocked:', e);
    }
  }

  // Sound 2: Harmonic Golden Shimmer Chime on Trophy Click
  function playTrophyClickSound() {
    if (isMuted) return;
    try {
      playChimeChord([659.25, 830.61, 987.77, 1318.51], 0.15, 1.2);
    } catch (e) {
      // Graceful fallback
    }
  }

  // Sound 3: Soft Tactile Photo Switch Click
  function playPhotoClickSound() {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(300, now + 0.05);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.06);
    } catch (e) {}
  }

  // Helper: Play shimmering harmonic chord
  function playChimeChord(frequencies, masterVol, duration) {
    const ctx = getAudioContext();
    if (!ctx) return;
    const now = ctx.currentTime;

    frequencies.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + i * 0.04);

      gain.gain.setValueAtTime(0.001, now + i * 0.04);
      gain.gain.linearRampToValueAtTime(masterVol / frequencies.length, now + i * 0.04 + 0.05);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now + i * 0.04);
      osc.stop(now + duration + 0.1);
    });
  }

  /* --------------------------------------------------------------------------
     2. Audio Mute Toggle Button
     -------------------------------------------------------------------------- */
  function initAudioToggle() {
    const btn = document.getElementById('audioToggleBtn');
    if (!btn) return;

    const updateBtnUI = () => {
      btn.classList.toggle('muted', isMuted);
      const label = btn.querySelector('.audio-label');
      if (label) {
        label.textContent = isMuted ? 'Sound: Off' : 'Sound: On';
      }
      btn.setAttribute('aria-pressed', isMuted ? 'false' : 'true');
    };

    updateBtnUI();

    btn.addEventListener('click', () => {
      isMuted = !isMuted;
      localStorage.setItem('kavach_trophy_muted', isMuted ? 'true' : 'false');
      updateBtnUI();

      if (!isMuted) {
        playTrophyClickSound();
      }
    });
  }

  /* --------------------------------------------------------------------------
     3. Vault Door Entrance & Room Reveal
     -------------------------------------------------------------------------- */
  function initVaultEntrance() {
    const enterBtn = document.getElementById('btnEnterVault');
    const portalFrame = document.getElementById('vaultPortalFrame');
    const trophyRoom = document.getElementById('trophyRoomSection');
    const exitBtn = document.getElementById('btnExitVault');

    if (!enterBtn || !portalFrame || !trophyRoom) return;

    enterBtn.addEventListener('click', () => {
      playDoorOpenSound();
      portalFrame.classList.add('doors-open');

      // Seamless reveal of the room showcase
      setTimeout(() => {
        trophyRoom.classList.add('active-room');
        trophyRoom.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 850);
    });

    if (exitBtn) {
      exitBtn.addEventListener('click', (e) => {
        e.preventDefault();
        trophyRoom.classList.remove('active-room');
        portalFrame.classList.remove('doors-open');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }
  }

  /* --------------------------------------------------------------------------
     4. Dynamic Pedestal Generation & 3D Tilt
     -------------------------------------------------------------------------- */
  function renderTrophyPedestals() {
    if (!window.TROPHY_COLLECTION || !Array.isArray(window.TROPHY_COLLECTION)) return;

    ['center', 'left', 'right'].forEach(wing => {
      const container = document.getElementById(`pedestals-${wing}`);
      if (!container) return;

      const wingTrophies = window.TROPHY_COLLECTION.filter(t => t.wing === wing);
      container.innerHTML = '';

      wingTrophies.forEach(trophy => {
        const card = document.createElement('div');
        card.className = 'trophy-pedestal-card';
        card.setAttribute('data-id', trophy.id);
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', `View details for ${trophy.title}`);

        const photoCount = trophy.photos && trophy.photos.length ? trophy.photos.length : 0;
        const photoTag = photoCount > 0 ? `<span class="trophy-badge-pill">📸 ${photoCount} Photos</span>` : `<span class="trophy-badge-pill">${trophy.badge}</span>`;

        card.innerHTML = `
          ${photoTag}
          <div class="trophy-img-wrap">
            <img src="${trophy.image}" alt="${trophy.title}" loading="lazy" decoding="async">
          </div>
          <div class="pedestal-base"></div>
          <div class="trophy-info-plate">
            <div class="trophy-year">${trophy.year} • ${trophy.badge}</div>
            <h3 class="trophy-name">${trophy.title}</h3>
            <div class="trophy-category">${trophy.subtitle}</div>
            <div class="trophy-inspect-hint">
              <span>Read Story</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </div>
          </div>
        `;

        // Interactive 3D tilt on hover (Desktop)
        card.addEventListener('mousemove', (e) => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left - rect.width / 2;
          const y = e.clientY - rect.top - rect.height / 2;
          const rotateX = (-y / rect.height) * 12;
          const rotateY = (x / rect.width) * 12;

          card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-8px)`;
        });

        card.addEventListener('mouseleave', () => {
          card.style.transform = '';
        });

        // Click to open modal
        card.addEventListener('click', () => {
          openTrophyModal(trophy.id);
        });

        // Keyboard Enter/Space
        card.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openTrophyModal(trophy.id);
          }
        });

        container.appendChild(card);
      });
    });
  }

  /* --------------------------------------------------------------------------
     5. Wing Navigation & Mobile Touch Swipe
     -------------------------------------------------------------------------- */
  function switchWing(targetWing) {
    if (!['center', 'left', 'right'].includes(targetWing)) return;
    currentWing = targetWing;

    // Update nav buttons
    const navBtns = document.querySelectorAll('.wing-nav-btn');
    navBtns.forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-wing') === targetWing);
    });

    // Update active wing pane
    const panes = document.querySelectorAll('.wing-pane');
    panes.forEach(pane => {
      pane.classList.toggle('active-pane', pane.id === `wing-${targetWing}`);
    });

    playPhotoClickSound();
  }

  function initWingNavigation() {
    const navBtns = document.querySelectorAll('.wing-nav-btn');
    navBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const wing = btn.getAttribute('data-wing');
        switchWing(wing);
      });
    });

    // Mobile Touch Swipe Handling
    const stage = document.querySelector('.wings-stage-wrapper');
    if (!stage) return;

    let touchStartX = 0;
    let touchEndX = 0;

    stage.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
    }, { passive: true });

    stage.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      handleSwipe();
    }, { passive: true });

    function handleSwipe() {
      const swipeDistance = touchEndX - touchStartX;
      const threshold = 50;

      const currentIndex = WING_ORDER.indexOf(currentWing);

      if (swipeDistance > threshold) {
        // Swiped Right -> Go to previous wing
        const prevIndex = (currentIndex - 1 + WING_ORDER.length) % WING_ORDER.length;
        switchWing(WING_ORDER[prevIndex]);
      } else if (swipeDistance < -threshold) {
        // Swiped Left -> Go to next wing
        const nextIndex = (currentIndex + 1) % WING_ORDER.length;
        switchWing(WING_ORDER[nextIndex]);
      }
    }
  }

  /* --------------------------------------------------------------------------
     6. Trophy Detail Story Modal & 5-Photo Gallery
     -------------------------------------------------------------------------- */
  const modal = document.getElementById('trophyModal');
  const closeBtn = document.getElementById('modalCloseBtn');
  const prevTrophyBtn = document.getElementById('modalPrevTrophy');
  const nextTrophyBtn = document.getElementById('modalNextTrophy');

  function openTrophyModal(trophyId) {
    if (!modal || !window.TROPHY_COLLECTION) return;

    const trophy = window.TROPHY_COLLECTION.find(t => t.id === trophyId);
    if (!trophy) return;

    currentTrophyId = trophyId;
    currentPhotoIndex = 0;

    playTrophyClickSound();

    // Populate Details
    document.getElementById('modalBadge').textContent = trophy.badge;
    document.getElementById('modalYear').textContent = trophy.year;
    document.getElementById('modalTitle').textContent = trophy.title;
    document.getElementById('modalSubtitle').textContent = trophy.subtitle;
    document.getElementById('modalVenueText').textContent = trophy.venue;
    document.getElementById('modalStoryText').textContent = trophy.story;

    // Populate Scorecard Highlights
    const highlightsList = document.getElementById('modalHighlightsList');
    highlightsList.innerHTML = '';
    if (Array.isArray(trophy.highlights)) {
      trophy.highlights.forEach(item => {
        const li = document.createElement('li');
        li.innerHTML = `
          <svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
          <span>${item}</span>
        `;
        highlightsList.appendChild(li);
      });
    }

    // Populate Photo Gallery (Accommodates up to 5 celebration/match photos)
    const gallerySection = document.getElementById('modalGallerySection');
    const thumbsStrip = document.getElementById('modalThumbsStrip');
    const mainImg = document.getElementById('modalMainImg');
    const photoCounter = document.getElementById('modalPhotoCounter');

    thumbsStrip.innerHTML = '';

    // Array of photos (defaulting to trophy image if no photos provided)
    const photosList = (trophy.photos && trophy.photos.length) ? trophy.photos : [trophy.image];

    // Set initial preview photo
    mainImg.src = photosList[0];
    mainImg.alt = `${trophy.title} celebration photo`;

    if (photoCounter) {
      photoCounter.textContent = photosList.length > 1 ? `1 of ${photosList.length}` : '';
    }

    // Render thumbnail strip
    if (photosList.length > 1) {
      gallerySection.style.display = 'block';

      photosList.forEach((src, idx) => {
        const thumbBtn = document.createElement('button');
        thumbBtn.type = 'button';
        thumbBtn.className = `modal-thumb-btn ${idx === 0 ? 'active-thumb' : ''}`;
        thumbBtn.setAttribute('aria-label', `View celebration photo ${idx + 1}`);
        thumbBtn.innerHTML = `<img src="${src}" alt="Thumbnail ${idx + 1}" loading="lazy">`;

        thumbBtn.addEventListener('click', () => {
          currentPhotoIndex = idx;
          mainImg.src = src;
          mainImg.style.transform = 'scale(0.97)';
          setTimeout(() => { mainImg.style.transform = 'scale(1)'; }, 100);

          thumbsStrip.querySelectorAll('.modal-thumb-btn').forEach((btn, i) => {
            btn.classList.toggle('active-thumb', i === idx);
          });

          if (photoCounter) {
            photoCounter.textContent = `${idx + 1} of ${photosList.length}`;
          }

          playPhotoClickSound();
        });

        thumbsStrip.appendChild(thumbBtn);
      });
    } else {
      gallerySection.style.display = 'none';
    }

    // Show Modal
    modal.classList.add('modal-active');
    document.body.style.overflow = 'hidden';
  }

  function closeTrophyModal() {
    if (!modal) return;
    modal.classList.remove('modal-active');
    document.body.style.overflow = '';
  }

  function navigateTrophies(direction) {
    if (!window.TROPHY_COLLECTION || !currentTrophyId) return;

    const currentIndex = window.TROPHY_COLLECTION.findIndex(t => t.id === currentTrophyId);
    if (currentIndex === -1) return;

    let targetIndex;
    if (direction === 'prev') {
      targetIndex = (currentIndex - 1 + window.TROPHY_COLLECTION.length) % window.TROPHY_COLLECTION.length;
    } else {
      targetIndex = (currentIndex + 1) % window.TROPHY_COLLECTION.length;
    }

    const nextTrophy = window.TROPHY_COLLECTION[targetIndex];
    if (nextTrophy) {
      openTrophyModal(nextTrophy.id);
    }
  }

  function initTrophyModal() {
    if (!modal) return;

    if (closeBtn) {
      closeBtn.addEventListener('click', closeTrophyModal);
    }

    // Dismiss by clicking backdrop
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeTrophyModal();
      }
    });

    // Keyboard Shortcuts: Esc to close, Arrow keys to navigate
    document.addEventListener('keydown', (e) => {
      if (!modal.classList.contains('modal-active')) return;

      if (e.key === 'Escape') {
        closeTrophyModal();
      } else if (e.key === 'ArrowLeft') {
        navigateTrophies('prev');
      } else if (e.key === 'ArrowRight') {
        navigateTrophies('next');
      }
    });

    if (prevTrophyBtn) {
      prevTrophyBtn.addEventListener('click', () => navigateTrophies('prev'));
    }

    if (nextTrophyBtn) {
      nextTrophyBtn.addEventListener('click', () => navigateTrophies('next'));
    }
  }

  /* --------------------------------------------------------------------------
     Initialization on DOM Ready
     -------------------------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    initAudioToggle();
    initVaultEntrance();
    renderTrophyPedestals();
    initWingNavigation();
    initTrophyModal();
  });

})();
