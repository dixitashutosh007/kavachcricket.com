/**
 * KAvach Cricket Club - 3D Virtual Trophy Room First-Person PoV Tour Engine
 * 
 * Features:
 * 1. Web Audio API Synthesizer (0 KB external audio, zero-latency effects)
 * 2. 3D First-Person PoV Camera Rig with 360° Drag & Smooth Damping
 * 3. 3D Architectural Room Box with Floor, Ceiling, and 3 Thematic Gallery Walls
 * 4. Interactive Clickable Floor Waypoints & Radar Compass Heading
 * 5. Dynamic 3D Trophy Pedestals with Ceiling Spotlights
 * 6. Detailed Victory Story Lightbox Modal with 5-Photo Gallery Carousel
 */

(function () {
  'use strict';

  // ---------------------------------------------------------------------------
  // State Management
  // ---------------------------------------------------------------------------
  let audioCtx = null;
  let isMuted = localStorage.getItem('kavach_trophy_muted') === 'true';

  // Camera PoV Coordinates
  // 0 = North (Center Stage), 90 = West (Left Gallery), 180 = South (Vault Entrance), -90/270 = East (Right Honors)
  let currentX = 0;
  let currentY = 0;
  let currentZ = 750; // Initially in front of closed vault doors
  let targetX = 0;
  let targetY = 0;
  let targetZ = 750;

  let currentYaw = 0;
  let targetYaw = 0;
  let currentPitch = 0;
  let targetPitch = 0;

  let isInsideRoom = false;
  let isDragging = false;
  let dragStartX = 0;
  let dragStartY = 0;
  let startYaw = 0;
  let startPitch = 0;

  let currentTrophyId = null;
  let currentPhotoIndex = 0;

  // DOM Elements Cache
  const viewport = document.getElementById('tourViewport');
  const camera = document.getElementById('tourCamera');
  const radarDisc = document.getElementById('radarDisc');
  const radarHeadingLabel = document.getElementById('radarHeadingLabel');
  const entranceOverlay = document.getElementById('tourEntranceOverlay');
  const vaultPortal = document.getElementById('roomWallSouth');
  const btnEnterTour = document.getElementById('btnEnterTour');
  const fullscreenBtn = document.getElementById('tourFullscreenBtn');
  const audioBtn = document.getElementById('tourAudioBtn');
  const modal = document.getElementById('trophyModal');

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

  // Vault Door Opening Mechanical Rumble & Ethereal Chord
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
      gain1.gain.linearRampToValueAtTime(0.2, now + 0.2);
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

  // Shimmering Chime on Trophy Inspection
  function playTrophyClickSound() {
    if (isMuted) return;
    try {
      playChimeChord([659.25, 830.61, 987.77, 1318.51], 0.14, 1.2);
    } catch (e) {}
  }

  // Subtle Tactile Click
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

  // Soft Glide Whoosh when Walking / Teleporting
  function playGlideSound() {
    if (isMuted) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;
      const now = ctx.currentTime;

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(140, now + 0.35);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.07, now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {}
  }

  // Harmonic chord synthesizer
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
     2. 3D First-Person PoV Camera Render Loop (60fps LERP)
     -------------------------------------------------------------------------- */
  function updateCameraLoop() {
    // Smooth position interpolation
    currentX += (targetX - currentX) * 0.1;
    currentY += (targetY - currentY) * 0.1;
    currentZ += (targetZ - currentZ) * 0.1;

    // Smooth angle interpolation
    currentYaw += (targetYaw - currentYaw) * 0.12;
    currentPitch += (targetPitch - currentPitch) * 0.12;

    if (camera) {
      camera.style.transform = `translateZ(380px) rotateX(${currentPitch}deg) rotateY(${currentYaw}deg) translate3d(${-currentX}px, ${-currentY}px, ${-currentZ}px)`;
    }

    // Update Radar Compass rotation
    if (radarDisc) {
      radarDisc.style.transform = `rotate(${-currentYaw}deg)`;
    }

    // Update Heading Label text based on normalized yaw
    if (radarHeadingLabel) {
      let normalized = ((currentYaw % 360) + 360) % 360;
      if (normalized >= 315 || normalized < 45) {
        radarHeadingLabel.textContent = 'Center Stage (N)';
      } else if (normalized >= 45 && normalized < 135) {
        radarHeadingLabel.textContent = 'Left Showcase (W)';
      } else if (normalized >= 135 && normalized < 225) {
        radarHeadingLabel.textContent = 'Vault Doors (S)';
      } else {
        radarHeadingLabel.textContent = 'Right Honors (E)';
      }
    }

    requestAnimationFrame(updateCameraLoop);
  }

  /* --------------------------------------------------------------------------
     3. Pointer / Touch 360° Drag Look Around
     -------------------------------------------------------------------------- */
  function initPointerLook() {
    if (!viewport) return;

    const onPointerDown = (e) => {
      // Don't drag if clicking buttons, waypoints, or modal
      if (e.target.closest('button') || e.target.closest('.wall-pedestal-card') || e.target.closest('.trophy-modal')) {
        return;
      }
      isDragging = true;
      dragStartX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      dragStartY = e.clientY || (e.touches && e.touches[0].clientY) || 0;
      startYaw = targetYaw;
      startPitch = targetPitch;
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;

      const clientX = e.clientX || (e.touches && e.touches[0].clientX) || 0;
      const clientY = e.clientY || (e.touches && e.touches[0].clientY) || 0;

      const deltaX = clientX - dragStartX;
      const deltaY = clientY - dragStartY;

      targetYaw = startYaw - deltaX * 0.28;
      targetPitch = Math.max(-20, Math.min(18, startPitch + deltaY * 0.22));
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    viewport.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);

    viewport.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp, { passive: true });
  }

  /* --------------------------------------------------------------------------
     4. Vantage Point Teleportation & Navigation
     -------------------------------------------------------------------------- */
  function goToVantage(vantageName) {
    if (!isInsideRoom) {
      enterTrophyRoom();
    }

    // Update navigation pill buttons
    document.querySelectorAll('.tour-vantage-btn').forEach(btn => {
      btn.classList.toggle('active', btn.getAttribute('data-vantage') === vantageName);
    });

    playGlideSound();

    switch (vantageName) {
      case 'center':
        // Stand right in front of KPL Center Showcase
        targetX = 0;
        targetY = 0;
        targetZ = -340;
        targetYaw = 0;
        targetPitch = 0;
        break;

      case 'left':
        // Stand in front of Weekend & Corporate Showcase
        targetX = -340;
        targetY = 0;
        targetZ = 0;
        targetYaw = 90;
        targetPitch = 0;
        break;

      case 'right':
        // Stand in front of Plate & Honors Showcase
        targetX = 340;
        targetY = 0;
        targetZ = 0;
        targetYaw = -90;
        targetPitch = 0;
        break;

      case 'roomCenter':
        // Stand in center of hall for 360° overview
        targetX = 0;
        targetY = 0;
        targetZ = 0;
        targetPitch = 0;
        break;

      case 'entrance':
        // Turn to look back at the grand vault entrance
        targetX = 0;
        targetY = 0;
        targetZ = 340;
        targetYaw = 180;
        targetPitch = 0;
        break;
    }
  }

  function initVantageControls() {
    // Navigation Pills
    document.querySelectorAll('.tour-vantage-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const vantage = btn.getAttribute('data-vantage');
        goToVantage(vantage);
      });
    });

    // Floor Waypoints
    document.querySelectorAll('.floor-waypoint').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const vantage = btn.getAttribute('data-vantage');
        goToVantage(vantage);
      });
    });

    // Directional Turn Buttons
    const btnTurnLeft = document.getElementById('btnTurnLeft');
    const btnTurnRight = document.getElementById('btnTurnRight');
    const btnStepForward = document.getElementById('btnStepForward');

    if (btnTurnLeft) {
      btnTurnLeft.addEventListener('click', () => {
        targetYaw += 45;
        playGlideSound();
      });
    }

    if (btnTurnRight) {
      btnTurnRight.addEventListener('click', () => {
        targetYaw -= 45;
        playGlideSound();
      });
    }

    if (btnStepForward) {
      btnStepForward.addEventListener('click', () => {
        const rad = targetYaw * (Math.PI / 180);
        targetX += Math.sin(rad) * -160;
        targetZ += Math.cos(rad) * -160;

        // Clamp inside room boundary
        targetX = Math.max(-360, Math.min(360, targetX));
        targetZ = Math.max(-360, Math.min(360, targetZ));

        playGlideSound();
      });
    }

    // Radar Marks Clicks (N, W, E, S)
    document.querySelectorAll('.radar-mark').forEach(mark => {
      mark.addEventListener('click', (e) => {
        e.stopPropagation();
        const vantage = mark.getAttribute('data-vantage');
        goToVantage(vantage);
      });
    });
  }

  /* --------------------------------------------------------------------------
     5. Vault Entrance Sequence ("Enter Trophy Room")
     -------------------------------------------------------------------------- */
  function enterTrophyRoom() {
    playDoorOpenSound();

    if (vaultPortal) {
      vaultPortal.classList.add('doors-open');
    }

    if (entranceOverlay) {
      entranceOverlay.classList.add('hidden');
    }

    // Smooth camera glide forward through open doors into center of the room
    setTimeout(() => {
      targetZ = 0;
      targetX = 0;
      targetYaw = 0;
      targetPitch = 0;
      isInsideRoom = true;
    }, 400);
  }

  function initEntrance() {
    if (btnEnterTour) {
      btnEnterTour.addEventListener('click', enterTrophyRoom);
    }
  }

  /* --------------------------------------------------------------------------
     6. Dynamic Pedestal Generation on 3D Gallery Walls
     -------------------------------------------------------------------------- */
  function renderTrophyPedestals() {
    if (!window.TROPHY_COLLECTION || !Array.isArray(window.TROPHY_COLLECTION)) return;

    const northTrack = document.getElementById('wallNorthPedestals');
    const westTrack = document.getElementById('wallWestPedestals');
    const eastTrack = document.getElementById('wallEastPedestals');

    if (!northTrack || !westTrack || !eastTrack) return;

    northTrack.innerHTML = '';
    westTrack.innerHTML = '';
    eastTrack.innerHTML = '';

    window.TROPHY_COLLECTION.forEach(trophy => {
      const card = document.createElement('div');
      card.className = 'wall-pedestal-card';
      card.setAttribute('data-id', trophy.id);
      card.setAttribute('role', 'button');
      card.setAttribute('tabindex', '0');
      card.setAttribute('aria-label', `Inspect ${trophy.title}`);

      const photoCount = (trophy.photos && trophy.photos.length) ? trophy.photos.length : 1;

      card.innerHTML = `
        <div class="pedestal-spotlight-beam"></div>
        <div class="pedestal-trophy-wrap">
          <img src="${trophy.image}" alt="${trophy.title}" loading="lazy" decoding="async">
          <div class="trophy-ambient-halo"></div>
        </div>
        <div class="pedestal-shelf-base"></div>
        <div class="pedestal-brass-plaque">
          <div class="plaque-year-badge">${trophy.year} • ${trophy.badge}</div>
          <h3 class="plaque-title">${trophy.title}</h3>
          <div class="plaque-subtitle">${trophy.subtitle}</div>
          <div class="plaque-action-hint">
            <span class="photos-tag">📸 ${photoCount} Photos</span>
            <span class="inspect-text">Inspect &rarr;</span>
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
        northTrack.appendChild(card);
      } else if (trophy.wing === 'left') {
        westTrack.appendChild(card);
      } else if (trophy.wing === 'right') {
        eastTrack.appendChild(card);
      }
    });
  }

  /* --------------------------------------------------------------------------
     7. Trophy Story Modal with 5-Photo Gallery Carousel
     -------------------------------------------------------------------------- */
  function openTrophyModal(trophyId) {
    if (!modal || !window.TROPHY_COLLECTION) return;

    const trophy = window.TROPHY_COLLECTION.find(t => t.id === trophyId);
    if (!trophy) return;

    currentTrophyId = trophyId;
    currentPhotoIndex = 0;

    playTrophyClickSound();

    // Populate metadata & narrative
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

    // Populate Photo Gallery Carousel (up to 5 celebration photos)
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
        // In-Tour Shortcuts
        if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
          targetYaw += 15;
        } else if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
          targetYaw -= 15;
        } else if (e.key === '1') {
          goToVantage('center');
        } else if (e.key === '2') {
          goToVantage('left');
        } else if (e.key === '3') {
          goToVantage('right');
        } else if (e.key === '4') {
          goToVantage('roomCenter');
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
     8. Fullscreen & Audio Controls
     -------------------------------------------------------------------------- */
  function initHUDControls() {
    // Fullscreen Toggle
    if (fullscreenBtn && viewport) {
      fullscreenBtn.addEventListener('click', () => {
        if (!document.fullscreenElement) {
          if (viewport.requestFullscreen) {
            viewport.requestFullscreen();
          } else if (viewport.webkitRequestFullscreen) {
            viewport.webkitRequestFullscreen();
          }
        } else {
          if (document.exitFullscreen) {
            document.exitFullscreen();
          }
        }
      });

      document.addEventListener('fullscreenchange', () => {
        const isFs = !!document.fullscreenElement;
        const expandIcon = fullscreenBtn.querySelector('.fs-icon-expand');
        const compressIcon = fullscreenBtn.querySelector('.fs-icon-compress');
        if (expandIcon && compressIcon) {
          expandIcon.style.display = isFs ? 'none' : 'block';
          compressIcon.style.display = isFs ? 'block' : 'none';
        }
        viewport.classList.toggle('is-fullscreen', isFs);
      });
    }

    // Audio Toggle
    const audioToggleBtn = document.getElementById('audioToggleBtn');
    const updateAudioUI = () => {
      if (audioToggleBtn) {
        audioToggleBtn.classList.toggle('muted', isMuted);
        const label = audioToggleBtn.querySelector('.audio-label');
        if (label) label.textContent = isMuted ? 'Sound: Off' : 'Sound: On';
        audioToggleBtn.setAttribute('aria-pressed', isMuted ? 'false' : 'true');
      }
      if (audioBtn) {
        audioBtn.style.opacity = isMuted ? '0.5' : '1';
      }
    };

    updateAudioUI();

    const toggleMute = () => {
      isMuted = !isMuted;
      localStorage.setItem('kavach_trophy_muted', isMuted ? 'true' : 'false');
      updateAudioUI();
      if (!isMuted) {
        playTrophyClickSound();
      }
    };

    if (audioToggleBtn) audioToggleBtn.addEventListener('click', toggleMute);
    if (audioBtn) audioBtn.addEventListener('click', toggleMute);
  }

  /* --------------------------------------------------------------------------
     9. Initialization
     -------------------------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', () => {
    initHUDControls();
    initEntrance();
    renderTrophyPedestals();
    initPointerLook();
    initVantageControls();
    initTrophyModal();
    updateCameraLoop();
  });

})();
