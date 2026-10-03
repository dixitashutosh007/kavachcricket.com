/**
 * KAvach Cricket Club - Virtual Trophy Room Interactive Engine
 * 
 * Features:
 * 1. Web Audio API Synthesizer (Zero-latency sound effects, 0 KB external downloads)
 * 2. 3D Vault Entrance Transition with Double-Door Swing Animation
 * 3. Spatial Showroom Carousel (Center Stage, Left Showcase, Right Honors)
 * 4. Touch Swipe & Arrow Navigation for Mobile & Desktop
 * 5. Dynamic Pedestal Generation with Spotlights & Hover Feedback
 * 6. Detailed Victory Story Lightbox Modal with 5-Photo Gallery Carousel
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // State Management
  // ---------------------------------------------------------------------------
  let audioCtx = null;
  let isMuted = localStorage.getItem('kavach_trophy_muted') === 'true';

  const WALL_ORDER = ['left', 'center', 'right'];
  let currentWall = 'center';

  let currentTrophyId = null;
  let currentPhotoIndex = 0;

  // DOM Elements Cache
  const vaultStage = document.getElementById('vaultEntranceStage');
  const vaultDoorsWrapper = document.getElementById('vaultDoorsWrapper');
  const btnUnlockVault = document.getElementById('btnUnlockVault');

  const showroomStage = document.getElementById('showroomStage');
  const showroomViewport = document.getElementById('showroomViewport');
  const hudWallHeading = document.getElementById('hudWallHeading');
  const btnExitShowroom = document.getElementById('btnExitShowroom');
  const btnTurnLeft = document.getElementById('btnTurnLeft');
  const btnTurnRight = document.getElementById('btnTurnRight');

  const modal = document.getElementById('trophyModal');
  const audioToggleBtn = document.getElementById('audioToggleBtn');

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

  // Vault Door Opening Heavy Rumble & Shimmering Chord
  function playDoorOpenSound() {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      // Heavy low-pass rumble
      const osc1 = ctx.createOscillator();
      const gain1 = ctx.createGain();
      osc1.type = 'sawtooth';
      osc1.frequency.setValueAtTime(65, now);
      osc1.frequency.exponentialRampToValueAtTime(32, now + 1.2);

      gain1.gain.setValueAtTime(0.01, now);
      gain1.gain.linearRampToValueAtTime(0.22, now + 0.2);
      gain1.gain.exponentialRampToValueAtTime(0.001, now + 1.4);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(180, now);
      filter.frequency.linearRampToValueAtTime(420, now + 0.6);
      filter.frequency.exponentialRampToValueAtTime(100, now + 1.4);

      osc1.connect(filter);
      filter.connect(gain1);
      gain1.connect(ctx.destination);

      osc1.start(now);
      osc1.stop(now + 1.5);

      // Shimmering Golden Chime
      setTimeout(() => {
        playChimeChord([523.25, 659.25, 783.99, 1046.50], 0.12, 1.8);
      }, 400);
    } catch (e) {
      console.warn('Audio synthesis note:', e);
    }
  }

  // Golden Chime on Trophy Inspection
  function playTrophyClickSound() {
    if (isMuted) return;
    try {
      playChimeChord([659.25, 830.61, 987.77, 1318.51], 0.14, 1.2);
    } catch (e) {}
  }

  // Soft Tactile Click
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

  // Soft Glide Whoosh when Turning View
  function playGlideSound() {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(260, now);
      osc.frequency.exponentialRampToValueAtTime(130, now + 0.3);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.07, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {}
  }

  // Harmonic Chord Synthesizer
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
     2. Stage 1: Vault Entrance Transitions
     -------------------------------------------------------------------------- */
  function initVaultEntrance() {
    if (!btnUnlockVault || !vaultDoorsWrapper) return;

    btnUnlockVault.addEventListener('click', () => {
      playDoorOpenSound();
      vaultDoorsWrapper.classList.add('doors-open');

      // Seamlessly transition to showroom chamber
      setTimeout(() => {
        if (vaultStage) vaultStage.style.display = 'none';
        if (showroomStage) {
          showroomStage.style.display = 'block';
          switchWall('center');
          window.scrollTo({ top: showroomStage.offsetTop - 80, behavior: 'smooth' });
        }
      }, 750);
    });

    if (btnExitShowroom) {
      btnExitShowroom.addEventListener('click', (e) => {
        e.preventDefault();
        if (showroomStage) showroomStage.style.display = 'none';
        if (vaultStage) {
          vaultStage.style.display = 'flex';
          vaultDoorsWrapper.classList.remove('doors-open');
          window.scrollTo({ top: vaultStage.offsetTop - 80, behavior: 'smooth' });
        }
      });
    }
  }

  /* --------------------------------------------------------------------------
     3. Stage 2: Spatial Showroom Wall Switching & Navigation
     -------------------------------------------------------------------------- */
  function switchWall(targetWall) {
    if (!WALL_ORDER.includes(targetWall)) return;
    currentWall = targetWall;

    // Update navigation pill buttons
    document.querySelectorAll('.nav-pill-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-wall') === targetWall);
    });

    // Update wall panes
    const paneCenter = document.getElementById('wallCenterPane');
    const paneLeft = document.getElementById('wallLeftPane');
    const paneRight = document.getElementById('wallRightPane');

    if (paneCenter) {
      paneCenter.classList.toggle('active-wall', targetWall === 'center');
      paneCenter.classList.toggle('wall-prev', targetWall === 'right');
    }
    if (paneLeft) {
      paneLeft.classList.toggle('active-wall', targetWall === 'left');
      paneLeft.classList.toggle('wall-prev', targetWall === 'center' || targetWall === 'right');
    }
    if (paneRight) {
      paneRight.classList.toggle('active-wall', targetWall === 'right');
      paneRight.classList.toggle('wall-prev', false);
    }

    // Update HUD heading
    if (hudWallHeading) {
      if (targetWall === 'center') {
        hudWallHeading.textContent = '🏆 Center Stage: KAvach Premier League (KPL)';
      } else if (targetWall === 'left') {
        hudWallHeading.textContent = '🛡️ Left Showcase: Corporate & Weekend Leagues';
      } else if (targetWall === 'right') {
        hudWallHeading.textContent = '🎖️ Right Honors: Plate, Veterans & Sportsmanship';
      }
    }

    playGlideSound();
  }

  function initShowroomNavigation() {
    // Navigation Pills
    document.querySelectorAll('.nav-pill-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const wall = btn.getAttribute('data-wall');
        switchWall(wall);
      });
    });

    // Left / Right Turn Arrows
    if (btnTurnLeft) {
      btnTurnLeft.addEventListener('click', () => {
        const currentIndex = WALL_ORDER.indexOf(currentWall);
        const prevIndex = (currentIndex - 1 + WALL_ORDER.length) % WALL_ORDER.length;
        switchWall(WALL_ORDER[prevIndex]);
      });
    }

    if (btnTurnRight) {
      btnTurnRight.addEventListener('click', () => {
        const currentIndex = WALL_ORDER.indexOf(currentWall);
        const nextIndex = (currentIndex + 1) % WALL_ORDER.length;
        switchWall(WALL_ORDER[nextIndex]);
      });
    }

    // Horizontal Touch Swipe Handling on Viewport
    if (showroomViewport) {
      let touchStartX = 0;
      let touchEndX = 0;

      showroomViewport.addEventListener('touchstart', (e) => {
        touchStartX = e.changedTouches[0].screenX;
      }, { passive: true });

      showroomViewport.addEventListener('touchend', (e) => {
        touchEndX = e.changedTouches[0].screenX;
        const diff = touchEndX - touchStartX;
        if (diff > 50) {
          // Swipe Right -> previous wall
          const currentIndex = WALL_ORDER.indexOf(currentWall);
          const prevIndex = (currentIndex - 1 + WALL_ORDER.length) % WALL_ORDER.length;
          switchWall(WALL_ORDER[prevIndex]);
        } else if (diff < -50) {
          // Swipe Left -> next wall
          const currentIndex = WALL_ORDER.indexOf(currentWall);
          const nextIndex = (currentIndex + 1) % WALL_ORDER.length;
          switchWall(WALL_ORDER[nextIndex]);
        }
      }, { passive: true });
    }
  }

  /* --------------------------------------------------------------------------
     4. Dynamic Pedestal Generation
     -------------------------------------------------------------------------- */
  function renderTrophyPedestals() {
    if (!window.TROPHY_COLLECTION || !Array.isArray(window.TROPHY_COLLECTION)) return;

    const gridCenter = document.getElementById('gridPedestalsCenter');
    const gridLeft = document.getElementById('gridPedestalsLeft');
    const gridRight = document.getElementById('gridPedestalsRight');

    if (!gridCenter || !gridLeft || !gridRight) return;

    gridCenter.innerHTML = '';
    gridLeft.innerHTML = '';
    gridRight.innerHTML = '';

    window.TROPHY_COLLECTION.forEach(trophy => {
      const card = document.createElement('div');
      card.className = 'pedestal-item-card';
      card.setAttribute('data-id', trophy.id);
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `Inspect ${trophy.title}`);

      const photoCount = (trophy.photos && trophy.photos.length) ? trophy.photos.length : 1;

      card.innerHTML = `
        <div class="spotlight-beam-cone"></div>
        <div class="trophy-media-wrap">
          <img src="${trophy.image}" alt="${trophy.title}" loading="lazy" decoding="async">
        </div>
        <div class="pedestal-marble-base"></div>
        <div class="pedestal-brass-plate">
          <div class="plate-status-badge">${trophy.year} • ${trophy.badge}</div>
          <h3 class="plate-trophy-name">${trophy.title}</h3>
          <div class="plate-franchise-sub">${trophy.subtitle}</div>
          <div class="plate-action-tag">
            <span class="photo-count-pill">📸 ${photoCount} Photos</span>
            <span class="inspect-cta-text">Story &rarr;</span>
          </div>
        </div>
      `;

      card.addEventListener('mouseenter', () => {
        playPhotoClickSound();
      });

      card.addEventListener('click', (e) => {
        e.stopPropagation();
        openTrophyModal(trophy.id);
      });

      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openTrophyModal(trophy.id);
        }
      });

      if (trophy.wing === 'center') {
        gridCenter.appendChild(card);
      } else if (trophy.wing === 'left') {
        gridLeft.appendChild(card);
      } else if (trophy.wing === 'right') {
        gridRight.appendChild(card);
      }
    });
  }

  /* --------------------------------------------------------------------------
     5. Trophy Story Lightbox Modal with 5-Photo Gallery Carousel
     -------------------------------------------------------------------------- */
  function openTrophyModal(trophyId) {
    if (!modal || !window.TROPHY_COLLECTION) return;

    const trophy = window.TROPHY_COLLECTION.find(t => t.id === trophyId);
    if (!trophy) return;

    currentTrophyId = trophyId;
    currentPhotoIndex = 0;

    playTrophyClickSound();

    // Populate metadata & story
    const badgeEl = document.getElementById('modalBadge');
    const yearEl = document.getElementById('modalYear');
    const titleEl = document.getElementById('modalTitle');
    const subtitleEl = document.getElementById('modalSubtitle');
    const venueEl = document.getElementById('modalVenueText');
    const storyEl = document.getElementById('modalStoryText');

    if (badgeEl) badgeEl.textContent = trophy.badge;
    if (yearEl) yearEl.textContent = trophy.year;
    if (titleEl) titleEl.textContent = trophy.title;
    if (subtitleEl) subtitleEl.textContent = trophy.subtitle;
    if (venueEl) venueEl.textContent = trophy.venue;
    if (storyEl) storyEl.textContent = trophy.story;

    // Populate scorecard highlights
    const highlightsList = document.getElementById('modalHighlightsList');
    if (highlightsList) {
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
    }

    // Populate 5-Photo Gallery Carousel
    const gallerySection = document.getElementById('modalGallerySection');
    const thumbsStrip = document.getElementById('modalThumbsStrip');
    const mainImg = document.getElementById('modalMainImg');
    const photoCounter = document.getElementById('modalPhotoCounter');

    if (thumbsStrip) thumbsStrip.innerHTML = '';

    const photosList = (trophy.photos && trophy.photos.length) ? trophy.photos : [trophy.image];

    if (mainImg) {
      mainImg.src = photosList[0];
      mainImg.alt = `${trophy.title} celebration photo`;
    }

    if (photoCounter) {
      photoCounter.textContent = photosList.length > 1 ? `1 of ${photosList.length}` : '';
    }

    if (photosList.length > 1 && thumbsStrip && gallerySection) {
      gallerySection.style.display = 'block';

      photosList.forEach((src, idx) => {
        const thumbBtn = document.createElement('button');
        thumbBtn.type = 'button';
        thumbBtn.className = `modal-thumb-btn ${idx === 0 ? 'active-thumb' : ''}`;
        thumbBtn.setAttribute('aria-label', `View celebration photo ${idx + 1}`);
        thumbBtn.innerHTML = `<img src="${src}" alt="Thumbnail ${idx + 1}" loading="lazy">`;

        thumbBtn.addEventListener('click', () => {
          currentPhotoIndex = idx;
          if (mainImg) {
            mainImg.src = src;
            mainImg.style.transform = 'scale(0.96)';
            setTimeout(() => { mainImg.style.transform = 'scale(1)'; }, 100);
          }

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
    } else if (gallerySection) {
      gallerySection.style.display = 'none';
    }

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

    const closeBtn = document.getElementById('modalCloseBtn');
    const prevBtn = document.getElementById('modalPrevTrophy');
    const nextBtn = document.getElementById('modalNextTrophy');

    if (closeBtn) closeBtn.addEventListener('click', closeTrophyModal);

    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        closeTrophyModal();
      }
    });

    if (prevBtn) prevBtn.addEventListener('click', () => navigateTrophies('prev'));
    if (nextBtn) nextBtn.addEventListener('click', () => navigateTrophies('next'));

    // Keyboard Shortcuts
    document.addEventListener('keydown', (e) => {
      if (!modal.classList.contains('modal-active')) {
        if (showroomStage && showroomStage.style.display !== 'none') {
          if (e.key === 'ArrowLeft') {
            const currentIndex = WALL_ORDER.indexOf(currentWall);
            const prevIndex = (currentIndex - 1 + WALL_ORDER.length) % WALL_ORDER.length;
            switchWall(WALL_ORDER[prevIndex]);
          } else if (e.key === 'ArrowRight') {
            const currentIndex = WALL_ORDER.indexOf(currentWall);
            const nextIndex = (currentIndex + 1) % WALL_ORDER.length;
            switchWall(WALL_ORDER[nextIndex]);
          } else if (e.key === '1') {
            switchWall('center');
          } else if (e.key === '2') {
            switchWall('left');
          } else if (e.key === '3') {
            switchWall('right');
          }
        }
        return;
      }

      if (e.key === 'Escape') {
        closeTrophyModal();
      } else if (e.key === 'ArrowLeft') {
        navigateTrophies('prev');
      } else if (e.key === 'ArrowRight') {
        navigateTrophies('next');
      }
    });
  }

  /* --------------------------------------------------------------------------
     6. Audio Toggle
     -------------------------------------------------------------------------- */
  function initAudioToggle() {
    if (!audioToggleBtn) return;

    const updateAudioUI = () => {
      audioToggleBtn.classList.toggle('muted', isMuted);
      const label = audioToggleBtn.querySelector('.audio-label');
      if (label) label.textContent = isMuted ? 'Sound: Off' : 'Sound: On';
      audioToggleBtn.setAttribute('aria-pressed', isMuted ? 'false' : 'true');
    };

    updateAudioUI();

    audioToggleBtn.addEventListener('click', () => {
      isMuted = !isMuted;
      localStorage.setItem('kavach_trophy_muted', isMuted ? 'true' : 'false');
      updateAudioUI();
      if (!isMuted) {
        playTrophyClickSound();
      }
    });
  }

  /* --------------------------------------------------------------------------
     7. Initialization on DOM Ready
     -------------------------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    initAudioToggle();
    initVaultEntrance();
    renderTrophyPedestals();
    initShowroomNavigation();
    initTrophyModal();
  });

})();
