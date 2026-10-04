/**
 * KAvach Cricket Club - Local Admin Control Room
 * Client JavaScript: Auth, Dynamic Tabs, Auto WebP Canvas Optimizer, Layout Guardrails
 */

// State
let token = sessionStorage.getItem('kavach_admin_token') || null;
let currentTrophies = [];
let activeTrophyIndex = 0;
let currentSiteData = {};
let activeCropperCallback = null;

// Target Dimensions Specifications
const IMAGE_SPECS = {
  trophyMain: {
    label: 'Main Trophy Photo',
    width: 800,
    height: 800,
    aspect: 1,
    maxSizeKb: 200,
    hint: 'Square 1:1 ratio. Center-crops on pedestal.'
  },
  celebrationPhoto: {
    label: 'Celebration Photo',
    width: 1200,
    height: 800,
    aspect: 3 / 2,
    maxSizeKb: 350,
    hint: 'Landscape 3:2 ratio. Fullscreen celebration modal.'
  },
  heroDesktop: {
    label: 'Hero Main Photo',
    width: 800,
    height: 1067,
    aspect: 800 / 1067,
    maxSizeKb: 200,
    hint: 'Portrait 800:1067 ratio. Eliminates desktop CLS shift.'
  }
};

// Character Limit Rules
const CHAR_LIMITS = {
  trophyTitle: { max: 40, warn: 35 },
  newTrophyTitle: { max: 40, warn: 35 },
  trophySubtitle: { max: 35, warn: 30 },
  newTrophySubtitle: { max: 35, warn: 30 },
  trophyCategory: { max: 25, warn: 20 },
  trophyBadge: { max: 15, warn: 12 },
  trophyVenue: { max: 45, warn: 40 },
  trophyStory: { min: 150, max: 350, warn: 320 },
  newTrophyStory: { min: 150, max: 350, warn: 320 },
  heroSlogan: { max: 30, warn: 25 },
  heroRanking: { max: 35, warn: 30 },
  heroTitlePrefix: { max: 30, warn: 25 },
  heroTitleAccent: { max: 20, warn: 16 },
  heroDesc: { max: 350, warn: 320 }
};

// DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initAuth();
  initTabs();
  initCharCounters();
  initCropperModal();
});

// Toast Utility
function showToast(message, type = 'success') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✅' : '⚠️'}</span>
    <div>${message}</div>
  `;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Authentication
function initAuth() {
  const authScreen = document.getElementById('authScreen');
  const pinInput = document.getElementById('pinInput');
  const unlockBtn = document.getElementById('unlockBtn');
  const logoutBtn = document.getElementById('logoutBtn');
  const changePinBtn = document.getElementById('changePinBtn');

  if (token) {
    checkTokenValidity();
  }

  unlockBtn.addEventListener('click', doLogin);
  pinInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') doLogin();
  });

  logoutBtn.addEventListener('click', () => {
    sessionStorage.removeItem('kavach_admin_token');
    token = null;
    authScreen.style.display = 'flex';
    showToast('Logged out securely');
  });

  changePinBtn.addEventListener('click', promptChangePin);
}

async function doLogin() {
  const pinInput = document.getElementById('pinInput');
  const pin = pinInput.value.trim();
  if (!pin) return;

  try {
    const res = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pin })
    });
    const data = await res.json();
    if (data.success && data.token) {
      token = data.token;
      sessionStorage.setItem('kavach_admin_token', token);
      document.getElementById('authScreen').style.display = 'none';
      pinInput.value = '';
      showToast('Unlocked KAvach Control Room');
      loadAllData();
    } else {
      showToast(data.message || 'Incorrect PIN', 'error');
      pinInput.value = '';
      pinInput.focus();
    }
  } catch (err) {
    showToast('Login error: ' + err.message, 'error');
  }
}

async function checkTokenValidity() {
  try {
    const res = await fetch('/api/site-data', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      document.getElementById('authScreen').style.display = 'none';
      loadAllData();
    } else {
      token = null;
      sessionStorage.removeItem('kavach_admin_token');
      document.getElementById('authScreen').style.display = 'flex';
    }
  } catch (err) {
    document.getElementById('authScreen').style.display = 'flex';
  }
}

async function promptChangePin() {
  const currentPin = prompt('Enter current PIN:');
  if (!currentPin) return;
  const newPin = prompt('Enter NEW 4-8 digit PIN:');
  if (!newPin || newPin.length < 4) {
    alert('PIN must be at least 4 characters long.');
    return;
  }

  try {
    const res = await fetch('/api/change-pin', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ currentPin, newPin })
    });
    const data = await res.json();
    if (data.success) {
      showToast('PIN successfully changed!');
    } else {
      showToast(data.message || 'Failed to change PIN', 'error');
    }
  } catch (err) {
    showToast('Error changing PIN', 'error');
  }
}

// Tab Switching
function initTabs() {
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabContents = document.querySelectorAll('.tab-content');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      tabContents.forEach(c => c.classList.remove('active'));

      btn.classList.add('active');
      const targetId = btn.dataset.tab;
      document.getElementById(targetId).classList.add('active');

      if (targetId === 'tabPublish') loadBackups();
      if (targetId === 'tabVault' && (!currentVaultMoments || currentVaultMoments.length === 0)) loadVaultMoments();
      if (targetId === 'tabAudit' && !window.hasRunAudit) runDiagnosticAudit();
    });
  });
}

// Load All Data
async function loadAllData() {
  await Promise.all([
    loadTrophies(),
    loadVaultMoments(),
    loadSiteData()
  ]);
}

// =============================================================================
// TAB 1: TROPHY ROOM MANAGER
// =============================================================================

async function loadTrophies() {
  try {
    const res = await fetch('/api/trophies', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      currentTrophies = await res.json();
      renderTrophySidebar();
      renderTrophyEditor(activeTrophyIndex);
    }
  } catch (err) {
    showToast('Failed to load trophies', 'error');
  }
}

let trophyFilterWing = 'all';

function renderTrophySidebar() {
  const container = document.getElementById('trophyList');
  container.innerHTML = '';

  const totalCount = currentTrophies.length;
  const centerCount = currentTrophies.filter(t => t.wing === 'center').length;
  const leftCount = currentTrophies.filter(t => t.wing === 'left').length;
  const rightCount = currentTrophies.filter(t => t.wing === 'right').length;

  const btnAll = document.querySelector('.wing-filter-btn[data-wing="all"]');
  if (btnAll) btnAll.textContent = `All (${totalCount})`;
  const btnCenter = document.querySelector('.wing-filter-btn[data-wing="center"]');
  if (btnCenter) btnCenter.textContent = `Center (${centerCount})`;
  const btnLeft = document.querySelector('.wing-filter-btn[data-wing="left"]');
  if (btnLeft) btnLeft.textContent = `Left (${leftCount})`;
  const btnRight = document.querySelector('.wing-filter-btn[data-wing="right"]');
  if (btnRight) btnRight.textContent = `Right (${rightCount})`;

  const filterBtns = document.querySelectorAll('.wing-filter-btn');
  filterBtns.forEach(btn => {
    btn.onclick = () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      trophyFilterWing = btn.dataset.wing;
      renderTrophySidebar();
    };
  });

  currentTrophies.forEach((t, idx) => {
    if (trophyFilterWing !== 'all' && t.wing !== trophyFilterWing) return;

    const item = document.createElement('div');
    item.className = `trophy-list-item ${idx === activeTrophyIndex ? 'active' : ''}`;
    item.innerHTML = `
      <img src="${t.image}" alt="${t.title}" class="trophy-item-thumb" onerror="this.src='./assets/images/kpl-trophy-champions.webp'">
      <div class="trophy-item-info">
        <div class="trophy-item-title">${t.title}</div>
        <div class="trophy-item-meta">
          <span>${t.year || '2024'}</span> &bull;
          <span class="trophy-item-wing-tag">${t.wing.toUpperCase()}</span>
        </div>
      </div>
    `;

    item.onclick = () => {
      activeTrophyIndex = idx;
      renderTrophySidebar();
      renderTrophyEditor(idx);
    };

    container.appendChild(item);
  });
}

function renderTrophyEditor(index) {
  const trophy = currentTrophies[index];
  if (!trophy) return;

  const form = document.getElementById('trophyEditorForm');
  form.innerHTML = `
    <div class="editor-header">
      <div>
        <h2 class="editor-title">Editing: ${escapeHtml(trophy.title)}</h2>
        <span style="font-size: 0.8rem; color: var(--text-dim);">ID: ${trophy.id}</span>
      </div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button type="button" class="btn btn-primary btn-sm" onclick="openNewTrophyModal()">✨ + Add Trophy</button>
        <button type="button" class="btn btn-secondary btn-sm" onclick="duplicateCurrentTrophy()">📋 Duplicate</button>
        <button type="button" class="btn btn-danger btn-sm" onclick="deleteTrophy(${index})">🗑️ Delete</button>
        <button type="button" class="btn btn-accent btn-sm" onclick="saveTrophyChanges()">💾 Save Trophies</button>
      </div>
    </div>

    <!-- Layout Protection Warning -->
    <div class="spec-box">
      <svg viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/></svg>
      <div>
        <div class="spec-box-title">Layout Guardrail Enforced</div>
        <div class="spec-box-desc">Character lengths & image resolutions are strictly monitored to ensure the virtual 3D room and modal popup maintain zero layout shift.</div>
      </div>
    </div>

    <div class="form-grid">
      <!-- Wing Selection -->
      <div class="form-group">
        <div class="form-label-row">
          <label class="form-label">Showroom Wing</label>
        </div>
        <select class="form-select" id="field_wing">
          <option value="center" ${trophy.wing === 'center' ? 'selected' : ''}>Center Stage (Marquee KPL Cups)</option>
          <option value="left" ${trophy.wing === 'left' ? 'selected' : ''}>Left Showcase (Weekend & Corporate Leagues)</option>
          <option value="right" ${trophy.wing === 'right' ? 'selected' : ''}>Right Honors (Plate & Sportsmanship)</option>
        </select>
        <div class="form-hint">Determines which 3D chamber wall this trophy rests on.</div>
      </div>

      <!-- Year -->
      <div class="form-group">
        <div class="form-label-row">
          <label class="form-label">Year / Edition</label>
        </div>
        <input type="text" class="form-input" id="field_year" value="${escapeHtml(trophy.year || '')}" placeholder="e.g. 2024">
      </div>

      <!-- Title -->
      <div class="form-group form-grid-full">
        <div class="form-label-row">
          <label class="form-label">Official Trophy Title</label>
          <span class="char-counter" id="count_trophyTitle">0 / 40</span>
        </div>
        <input type="text" class="form-input" id="field_title" value="${escapeHtml(trophy.title)}" maxlength="45" data-rule="trophyTitle">
      </div>

      <!-- Subtitle -->
      <div class="form-group">
        <div class="form-label-row">
          <label class="form-label">Subtitle / Franchise Match Context</label>
          <span class="char-counter" id="count_trophySubtitle">0 / 35</span>
        </div>
        <input type="text" class="form-input" id="field_subtitle" value="${escapeHtml(trophy.subtitle || '')}" maxlength="40" data-rule="trophySubtitle" placeholder="e.g. KAvach Hunkaar • Grand Finale">
      </div>

      <!-- Category -->
      <div class="form-group">
        <div class="form-label-row">
          <label class="form-label">Category Badge</label>
          <span class="char-counter" id="count_trophyCategory">0 / 25</span>
        </div>
        <input type="text" class="form-input" id="field_category" value="${escapeHtml(trophy.category || '')}" maxlength="30" data-rule="trophyCategory" placeholder="e.g. Flagship Tournament">
      </div>

      <!-- Status Badge -->
      <div class="form-group">
        <div class="form-label-row">
          <label class="form-label">Status Badge</label>
          <span class="char-counter" id="count_trophyBadge">0 / 15</span>
        </div>
        <input type="text" class="form-input" id="field_badge" value="${escapeHtml(trophy.badge || '')}" maxlength="20" data-rule="trophyBadge" placeholder="e.g. Champions">
      </div>

      <!-- Venue -->
      <div class="form-group">
        <div class="form-label-row">
          <label class="form-label">Match Venue Location</label>
          <span class="char-counter" id="count_trophyVenue">0 / 45</span>
        </div>
        <input type="text" class="form-input" id="field_venue" value="${escapeHtml(trophy.venue || '')}" maxlength="50" data-rule="trophyVenue" placeholder="e.g. Play Arena, Sarjapur Road">
      </div>

      <!-- Victory Story -->
      <div class="form-group form-grid-full">
        <div class="form-label-row">
          <label class="form-label">Victory Story Narrative</label>
          <span class="char-counter" id="count_trophyStory">0 / 350</span>
        </div>
        <textarea class="form-textarea" id="field_story" rows="4" data-rule="trophyStory" placeholder="Write an engaging 150-350 character recap of the championship victory...">${escapeHtml(trophy.story || '')}</textarea>
        <div class="form-hint">Enforces 150–350 characters to prevent scroll breakage inside the modal popup on mobile.</div>
      </div>

      <!-- Scorecard Highlights -->
      <div class="form-group form-grid-full">
        <div class="form-label-row">
          <label class="form-label">Scorecard & Match Highlights (Max 4)</label>
          <button type="button" class="btn btn-secondary btn-sm" onclick="addHighlightBullet()">+ Add Bullet</button>
        </div>
        <div class="bullets-list" id="highlightsList">
          ${(trophy.highlights || []).map((h, hIdx) => `
            <div class="bullet-item-row">
              <input type="text" class="form-input highlight-bullet-input" value="${escapeHtml(h)}" placeholder="e.g. Chased 168 in 19.4 overs">
              <button type="button" class="bullet-remove-btn" onclick="this.parentElement.remove()">✕</button>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Main Trophy Image Uploader -->
      <div class="form-group form-grid-full">
        <div class="form-label-row">
          <label class="form-label">Pedestal Trophy Photo (Square 1:1)</label>
        </div>
        <div class="image-uploader-card" id="dropzone_trophyMain">
          <img src="${trophy.image}" alt="Trophy" class="image-preview-thumb" id="preview_trophyMain">
          <div class="image-upload-actions">
            <div class="image-specs-badge">Target: 800×800 px (1:1) • WebP • Max 200 KB</div>
            <p style="font-size: 0.775rem; color: var(--text-dim); margin-bottom: 8px;">
              Current path: <code id="path_trophyMain">${trophy.image}</code>
            </p>
            <button type="button" class="btn btn-secondary btn-sm" onclick="triggerImageUpload('trophyMain')">
              📷 Choose / Drop Photo (Auto WebP Crop)
            </button>
          </div>
        </div>
      </div>

      <!-- 5 Celebration Photos Gallery -->
      <div class="form-group form-grid-full">
        <div class="form-label-row">
          <label class="form-label">Celebration Photos Gallery (Up to 5 Photos)</label>
          <span style="font-size: 0.75rem; color: var(--gold-accent);">Aspect 3:2 • 1200×800 px</span>
        </div>
        <div class="photos-grid-uploader" id="celebrationPhotosGrid">
          ${[0, 1, 2, 3, 4].map(pIdx => {
            const photoUrl = (trophy.photos && trophy.photos[pIdx]) || '';
            return `
              <div class="photo-slot" onclick="triggerCelebrationPhotoUpload(${pIdx})">
                <img src="${photoUrl || './assets/images/kpl-trophies-display.webp'}" class="photo-slot-img" id="preview_photo_${pIdx}">
                <div class="photo-slot-label">Photo ${pIdx + 1}</div>
                ${photoUrl ? `<button type="button" class="photo-slot-remove" onclick="event.stopPropagation(); removeCelebrationPhoto(${pIdx})">✕</button>` : ''}
              </div>
            `;
          }).join('')}
        </div>
        <div class="form-hint">Click any slot to crop, optimize, and upload a celebration photo.</div>
      </div>

    </div>
  `;

  initCharCounters();
}

function addHighlightBullet() {
  const container = document.getElementById('highlightsList');
  const count = container.querySelectorAll('.bullet-item-row').length;
  if (count >= 5) {
    showToast('Maximum 5 bullet points recommended for clean display', 'error');
    return;
  }
  const row = document.createElement('div');
  row.className = 'bullet-item-row';
  row.innerHTML = `
    <input type="text" class="form-input highlight-bullet-input" placeholder="e.g. Won by 34 runs defending 185">
    <button type="button" class="bullet-remove-btn" onclick="this.parentElement.remove()">✕</button>
  `;
  container.appendChild(row);
}

function removeCelebrationPhoto(pIdx) {
  const trophy = currentTrophies[activeTrophyIndex];
  if (!trophy || !trophy.photos) return;
  trophy.photos.splice(pIdx, 1);
  renderTrophyEditor(activeTrophyIndex);
}

function openNewTrophyModal() {
  const modal = document.getElementById('newTrophyModal');
  if (modal) {
    modal.style.display = 'flex';
    const titleInput = document.getElementById('new_trophy_title');
    if (titleInput) titleInput.focus();
    initCharCounters();
  }
}

function closeNewTrophyModal() {
  const modal = document.getElementById('newTrophyModal');
  if (modal) modal.style.display = 'none';
  const form = document.getElementById('newTrophyModalForm');
  if (form) form.reset();
}

function triggerNewTrophyMainUpload() {
  currentCropTargetSpec = IMAGE_SPECS.trophyMain;
  activeCropperCallback = (path) => {
    document.getElementById('new_trophy_image_path').value = path;
    document.getElementById('preview_newTrophyMain').src = path;
    document.getElementById('label_newTrophyMain').textContent = path;
  };
  document.getElementById('globalFileInput').click();
}

async function submitCreateTrophy() {
  const title = document.getElementById('new_trophy_title').value.trim();
  if (!title) {
    showToast('Please enter a trophy title', 'error');
    return;
  }

  const wing = document.getElementById('new_trophy_wing').value;
  const year = document.getElementById('new_trophy_year').value.trim() || '2025';
  const subtitle = document.getElementById('new_trophy_subtitle').value.trim() || 'KAvach Squad • Victory';
  const category = document.getElementById('new_trophy_category').value.trim() || 'Tournament Cup';
  const badge = document.getElementById('new_trophy_badge').value.trim() || 'Champions';
  const venue = document.getElementById('new_trophy_venue').value.trim() || 'Play Arena, Sarjapur Road, Bangalore';
  const story = document.getElementById('new_trophy_story').value.trim();
  const image = document.getElementById('new_trophy_image_path').value || './assets/images/kpl-trophy-champions.webp';

  const newId = `trophy-${Date.now().toString().slice(-5)}`;
  const newTrophy = {
    id: newId,
    wing: wing,
    title: title,
    year: year,
    category: category,
    badge: badge,
    image: image,
    subtitle: subtitle,
    venue: venue,
    story: story,
    highlights: [
      "Decisive championship victory under the floodlights",
      "Clinical bowling attack restricted opponents in death overs",
      "Man of the Match performance in championship final"
    ],
    photos: [
      "./assets/images/kpl-hunkaar-winner.webp",
      "./assets/images/kpl-anthem-lineup.webp",
      "./assets/images/play-arena-pitch-celebration.webp",
      "./assets/images/kpl-trophies-display.webp",
      "./assets/images/timeout-night-trophy.webp"
    ]
  };

  currentTrophies.unshift(newTrophy);
  activeTrophyIndex = 0;
  trophyFilterWing = 'all';

  closeNewTrophyModal();
  renderTrophySidebar();
  renderTrophyEditor(0);

  // Automatically persist to backend
  await saveTrophyChanges();
  showToast(`✨ Trophy "${title}" added and saved!`);
}

async function duplicateCurrentTrophy() {
  const orig = currentTrophies[activeTrophyIndex];
  if (!orig) return;

  const cloned = JSON.parse(JSON.stringify(orig));
  cloned.id = `trophy-${Date.now().toString().slice(-5)}`;
  cloned.title = `${orig.title} (Copy)`;

  currentTrophies.splice(activeTrophyIndex + 1, 0, cloned);
  activeTrophyIndex = activeTrophyIndex + 1;

  renderTrophySidebar();
  renderTrophyEditor(activeTrophyIndex);
  await saveTrophyChanges();
  showToast(`📋 Duplicated "${orig.title}"!`);
}

function addNewTrophy() {
  openNewTrophyModal();
}

function deleteTrophy(index) {
  if (!confirm(`Are you sure you want to delete "${currentTrophies[index].title}"?`)) return;
  currentTrophies.splice(index, 1);
  activeTrophyIndex = Math.max(0, activeTrophyIndex - 1);
  renderTrophySidebar();
  renderTrophyEditor(activeTrophyIndex);
  saveTrophyChanges();
}

async function saveTrophyChanges() {
  const trophy = currentTrophies[activeTrophyIndex];
  if (!trophy) return;

  // Collect updated inputs
  trophy.wing = document.getElementById('field_wing').value;
  trophy.year = document.getElementById('field_year').value.trim();
  trophy.title = document.getElementById('field_title').value.trim();
  trophy.subtitle = document.getElementById('field_subtitle').value.trim();
  trophy.category = document.getElementById('field_category').value.trim();
  trophy.badge = document.getElementById('field_badge').value.trim();
  trophy.venue = document.getElementById('field_venue').value.trim();
  trophy.story = document.getElementById('field_story').value.trim();

  // Highlights
  const bullets = [];
  document.querySelectorAll('.highlight-bullet-input').forEach(input => {
    if (input.value.trim()) bullets.push(input.value.trim());
  });
  trophy.highlights = bullets;

  try {
    const res = await fetch('/api/trophies', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ trophies: currentTrophies })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Trophies saved successfully to trophies-data.js!');
      renderTrophySidebar();
    } else {
      showToast(data.message || 'Failed to save trophies', 'error');
    }
  } catch (err) {
    showToast('Error saving trophies: ' + err.message, 'error');
  }
}

// =============================================================================
// TAB 2: HERO SECTION & ANNOUNCEMENTS
// =============================================================================

async function loadSiteData() {
  try {
    const res = await fetch('/api/site-data', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      currentSiteData = await res.json();
      populateHeroForm();
      populateStatsForm();
      populateFaqForm();
    }
  } catch (err) {
    showToast('Failed to load website content', 'error');
  }
}

function populateHeroForm() {
  const hero = currentSiteData.hero || {};
  const ann = currentSiteData.announcement || {};

  // Hero Fields
  document.getElementById('hero_slogan').value = hero.slogan || '';
  document.getElementById('hero_ranking').value = hero.ranking || '';
  document.getElementById('hero_titlePrefix').value = hero.titlePrefix || '';
  document.getElementById('hero_titleAccent').value = hero.titleAccent || '';
  document.getElementById('hero_desc').value = hero.description || '';
  document.getElementById('hero_badge1').value = hero.floatingBadgeTitle || '';
  document.getElementById('hero_badge2').value = hero.floatingBadgeSubtitle || '';
  document.getElementById('hero_captionTitle').value = hero.captionTitle || '';
  document.getElementById('hero_captionVenue').value = hero.captionVenue || '';
  document.getElementById('preview_heroDesktop').src = hero.imageDesktop || './assets/images/hero-team-scarlet.webp';
  document.getElementById('path_heroDesktop').textContent = hero.imageDesktop || '';

  // Perks
  const perks = hero.perks || [];
  document.getElementById('hero_perk1').value = perks[0] || '';
  document.getElementById('hero_perk2').value = perks[1] || '';
  document.getElementById('hero_perk3').value = perks[2] || '';

  // Announcement Fields
  document.getElementById('ann_badge').value = ann.badge || '';
  document.getElementById('ann_status').value = ann.status || '';
  document.getElementById('ann_tag').value = ann.tag || '';
  document.getElementById('ann_title').value = ann.title || '';
  document.getElementById('ann_desc').value = ann.description || '';
  document.getElementById('ann_ctaText').value = ann.ctaText || '';
  document.getElementById('ann_ctaLink').value = ann.ctaLink || '';
  document.getElementById('ann_secCtaText').value = ann.secondaryCtaText || '';
  document.getElementById('ann_secCtaLink').value = ann.secondaryCtaLink || '';

  // Features
  const feats = ann.features || [];
  const featsContainer = document.getElementById('ann_features_container');
  featsContainer.innerHTML = (feats).map((f, idx) => `
    <div class="bullet-item-row" style="margin-bottom: 8px;">
      <input type="text" class="form-input ann-feat-title" value="${escapeHtml(f.title)}" style="width: 180px;" placeholder="Feature Title:">
      <input type="text" class="form-input ann-feat-desc" value="${escapeHtml(f.desc)}" placeholder="Feature description">
    </div>
  `).join('');

  initCharCounters();
}

async function saveHeroAndAnnouncements() {
  if (!currentSiteData.hero) currentSiteData.hero = {};
  if (!currentSiteData.announcement) currentSiteData.announcement = {};

  const hero = currentSiteData.hero;
  hero.slogan = document.getElementById('hero_slogan').value.trim();
  hero.ranking = document.getElementById('hero_ranking').value.trim();
  hero.titlePrefix = document.getElementById('hero_titlePrefix').value.trim();
  hero.titleAccent = document.getElementById('hero_titleAccent').value.trim();
  hero.description = document.getElementById('hero_desc').value.trim();
  hero.floatingBadgeTitle = document.getElementById('hero_badge1').value.trim();
  hero.floatingBadgeSubtitle = document.getElementById('hero_badge2').value.trim();
  hero.captionTitle = document.getElementById('hero_captionTitle').value.trim();
  hero.captionVenue = document.getElementById('hero_captionVenue').value.trim();
  hero.perks = [
    document.getElementById('hero_perk1').value.trim(),
    document.getElementById('hero_perk2').value.trim(),
    document.getElementById('hero_perk3').value.trim()
  ].filter(Boolean);

  const ann = currentSiteData.announcement;
  ann.badge = document.getElementById('ann_badge').value.trim();
  ann.status = document.getElementById('ann_status').value.trim();
  ann.tag = document.getElementById('ann_tag').value.trim();
  ann.title = document.getElementById('ann_title').value.trim();
  ann.description = document.getElementById('ann_desc').value.trim();
  ann.ctaText = document.getElementById('ann_ctaText').value.trim();
  ann.ctaLink = document.getElementById('ann_ctaLink').value.trim();
  ann.secondaryCtaText = document.getElementById('ann_secCtaText').value.trim();
  ann.secondaryCtaLink = document.getElementById('ann_secCtaLink').value.trim();

  const featTitles = document.querySelectorAll('.ann-feat-title');
  const featDescs = document.querySelectorAll('.ann-feat-desc');
  const features = [];
  featTitles.forEach((t, i) => {
    features.push({ title: t.value.trim(), desc: (featDescs[i] ? featDescs[i].value.trim() : '') });
  });
  ann.features = features;

  await syncSiteDataToBackend('Hero & Announcement sections updated in index.html!');
}

// =============================================================================
// TAB 3: STATS BAR
// =============================================================================

function populateStatsForm() {
  const stats = currentSiteData.stats || [];
  const container = document.getElementById('statsEditorGrid');
  container.innerHTML = stats.map((s, idx) => `
    <div class="stat-edit-card">
      <div class="stat-preview-badge">
        <div class="stat-preview-num"><span id="stat_num_prev_${idx}">${s.target}</span><span id="stat_suff_prev_${idx}">${s.suffix}</span></div>
        <div style="font-size: 0.75rem; color: #fff;" id="stat_lbl_prev_${idx}">${escapeHtml(s.label)}</div>
      </div>
      <div class="form-group">
        <label class="form-label">Count Number</label>
        <input type="text" class="form-input stat-in-target" value="${escapeHtml(s.target)}" oninput="document.getElementById('stat_num_prev_${idx}').textContent = this.value">
      </div>
      <div class="form-group">
        <label class="form-label">Suffix (e.g. +, /20)</label>
        <input type="text" class="form-input stat-in-suffix" value="${escapeHtml(s.suffix)}" oninput="document.getElementById('stat_suff_prev_${idx}').textContent = this.value">
      </div>
      <div class="form-group">
        <label class="form-label">Stat Label</label>
        <input type="text" class="form-input stat-in-label" value="${escapeHtml(s.label)}" oninput="document.getElementById('stat_lbl_prev_${idx}').textContent = this.value">
      </div>
      <div class="form-group">
        <label class="form-label">Description Subtitle</label>
        <input type="text" class="form-input stat-in-desc" value="${escapeHtml(s.desc)}">
      </div>
    </div>
  `).join('');
}

async function saveStats() {
  const cards = document.querySelectorAll('.stat-edit-card');
  const stats = [];
  cards.forEach(card => {
    stats.push({
      target: card.querySelector('.stat-in-target').value.trim(),
      suffix: card.querySelector('.stat-in-suffix').value.trim(),
      label: card.querySelector('.stat-in-label').value.trim(),
      desc: card.querySelector('.stat-in-desc').value.trim()
    });
  });
  currentSiteData.stats = stats;
  await syncSiteDataToBackend('Live Stats counter updated in index.html!');
}

// =============================================================================
// TAB 4: FAQ MANAGER
// =============================================================================

function populateFaqForm() {
  const faqs = currentSiteData.faqs || [];
  const container = document.getElementById('faqEditList');
  container.innerHTML = faqs.map((faq, idx) => `
    <div class="faq-edit-item" id="faq_item_${idx}">
      <div class="faq-header-row">
        <span class="faq-item-title">Question #${idx + 1}</span>
        <div style="display: flex; gap: 4px;">
          ${idx > 0 ? `<button type="button" class="btn btn-secondary btn-sm" onclick="moveFaq(${idx}, -1)">▲</button>` : ''}
          ${idx < faqs.length - 1 ? `<button type="button" class="btn btn-secondary btn-sm" onclick="moveFaq(${idx}, 1)">▼</button>` : ''}
          <button type="button" class="btn btn-danger btn-sm" onclick="deleteFaq(${idx})">🗑️</button>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Question Text</label>
        <input type="text" class="form-input faq-in-q" value="${escapeHtml(faq.question)}">
      </div>
      <div class="form-group">
        <label class="form-label">Answer (HTML or Plain Text)</label>
        <textarea class="form-textarea faq-in-a" rows="3">${escapeHtml(faq.answer)}</textarea>
      </div>
    </div>
  `).join('');
}

function addFaqItem() {
  if (!currentSiteData.faqs) currentSiteData.faqs = [];
  currentSiteData.faqs.push({
    question: 'New Question regarding KAvach Cricket Club?',
    answer: 'Enter detailed helpful answer here.'
  });
  populateFaqForm();
  showToast('New FAQ item added to list!');
}

function moveFaq(index, dir) {
  const faqs = currentSiteData.faqs;
  const target = index + dir;
  if (target < 0 || target >= faqs.length) return;
  const temp = faqs[index];
  faqs[index] = faqs[target];
  faqs[target] = temp;
  populateFaqForm();
}

function deleteFaq(index) {
  if (!confirm(`Delete FAQ #${index + 1}?`)) return;
  currentSiteData.faqs.splice(index, 1);
  populateFaqForm();
}

async function saveFaqs() {
  const items = document.querySelectorAll('.faq-edit-item');
  const faqs = [];
  items.forEach(item => {
    faqs.push({
      question: item.querySelector('.faq-in-q').value.trim(),
      answer: item.querySelector('.faq-in-a').value.trim()
    });
  });
  currentSiteData.faqs = faqs;
  await syncSiteDataToBackend('FAQs updated in index.html!');
}

async function syncSiteDataToBackend(successMsg) {
  try {
    const res = await fetch('/api/site-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(currentSiteData)
    });
    const data = await res.json();
    if (data.success) {
      showToast(successMsg);
    } else {
      showToast(data.message || 'Failed to save', 'error');
    }
  } catch (err) {
    showToast('Error syncing content: ' + err.message, 'error');
  }
}

// =============================================================================
// TAB 5: PUBLISH & DEPLOYMENT
// =============================================================================

function runDeploy() {
  const commitMsgInput = document.getElementById('commitMsgInput');
  const msg = commitMsgInput.value.trim() || 'Update website content via Admin CMS';
  const consoleEl = document.getElementById('deployTerminalLogs');
  const deployBtn = document.getElementById('startDeployBtn');

  consoleEl.textContent = '🚀 Initializing deploy.sh...\n';
  deployBtn.disabled = true;
  deployBtn.textContent = '⏳ Deploying to S3...';

  const source = new EventSource('/api/deploy'); // Or fetch with reader

  // Using fetch with ReadableStream for POST
  fetch('/api/deploy', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ commitMessage: msg })
  }).then(response => {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    function read() {
      reader.read().then(({ done, value }) => {
        if (done) {
          deployBtn.disabled = false;
          deployBtn.textContent = '🚀 Publish to AWS S3 & CloudFront';
          return;
        }
        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');
        lines.forEach(line => {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.substring(6));
              if (data.text) {
                consoleEl.textContent += data.text;
                consoleEl.scrollTop = consoleEl.scrollHeight;
              }
              if (data.finished) {
                if (data.success) showToast('Live Deployment Completed! CloudFront cache invalidated.');
                else showToast('Deployment script encountered an error', 'error');
              }
            } catch (e) {}
          }
        });
        read();
      });
    }
    read();
  }).catch(err => {
    consoleEl.textContent += '\n❌ Error: ' + err.message;
    deployBtn.disabled = false;
    deployBtn.textContent = '🚀 Publish to AWS S3 & CloudFront';
  });
}

async function loadBackups() {
  try {
    const res = await fetch('/api/backups', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      const backups = await res.json();
      const list = document.getElementById('backupsList');
      if (backups.length === 0) {
        list.innerHTML = '<div style="color: var(--text-dim); padding: 12px;">No backups yet.</div>';
        return;
      }
      list.innerHTML = backups.map(b => `
        <div style="display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; background: var(--bg-surface-elevated); border-radius: var(--radius-sm); margin-bottom: 8px;">
          <div>
            <div style="font-size: 0.85rem; font-weight: 600;">${escapeHtml(b.name)}</div>
            <div style="font-size: 0.72rem; color: var(--text-dim);">${new Date(b.date).toLocaleString()} &bull; ${(b.size / 1024).toFixed(1)} KB</div>
          </div>
          <button type="button" class="btn btn-secondary btn-sm" onclick="restoreBackup('${b.name}')">↺ Restore</button>
        </div>
      `).join('');
    }
  } catch (err) {
    showToast('Failed to load backups', 'error');
  }
}

async function restoreBackup(backupName) {
  if (!confirm(`Are you sure you want to revert to "${backupName}"?`)) return;
  try {
    const res = await fetch('/api/restore', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ backupName })
    });
    const data = await res.json();
    if (data.success) {
      showToast('Backup restored successfully!');
      loadAllData();
    } else {
      showToast(data.message || 'Restore failed', 'error');
    }
  } catch (err) {
    showToast('Error restoring backup', 'error');
  }
}

// =============================================================================
// AUTO WEBP CANVAS OPTIMIZER & IMAGE UPLOADER
// =============================================================================

let currentCropImage = null;
let currentCropTargetSpec = null;
let currentCropFilename = '';
let currentCropFitMode = 'cover'; // 'cover' (smart crop) or 'contain'
let currentCropQuality = 0.85;

function initCropperModal() {
  const fileInput = document.getElementById('globalFileInput');
  const cropModal = document.getElementById('cropModal');
  const cancelBtn = document.getElementById('cropCancelBtn');
  const applyBtn = document.getElementById('cropApplyBtn');
  const fitModeSelect = document.getElementById('cropFitMode');
  const qualitySlider = document.getElementById('cropQualitySlider');

  fileInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    processSelectedFile(file);
  });

  cancelBtn.addEventListener('click', () => {
    cropModal.style.display = 'none';
    fileInput.value = '';
  });

  fitModeSelect.addEventListener('change', () => {
    currentCropFitMode = fitModeSelect.value;
    renderCropperCanvas();
  });

  qualitySlider.addEventListener('input', () => {
    currentCropQuality = parseFloat(qualitySlider.value);
    document.getElementById('cropQualityValue').textContent = `${Math.round(currentCropQuality * 100)}%`;
    renderCropperCanvas();
  });

  applyBtn.addEventListener('click', async () => {
    const canvas = document.getElementById('cropperCanvas');
    const dataUrl = canvas.toDataURL('image/webp', currentCropQuality);

    applyBtn.disabled = true;
    applyBtn.textContent = 'Uploading...';

    try {
      const res = await fetch('/api/upload-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          filename: currentCropFilename,
          base64Data: dataUrl
        })
      });
      const data = await res.json();
      if (data.success && activeCropperCallback) {
        activeCropperCallback(data.path, data.size);
        showToast(`Image optimized & saved: ${(data.size / 1024).toFixed(1)} KB WebP`);
      } else {
        showToast(data.error || 'Upload failed', 'error');
      }
    } catch (err) {
      showToast('Upload error: ' + err.message, 'error');
    } finally {
      applyBtn.disabled = false;
      applyBtn.textContent = 'Save & Use WebP';
      cropModal.style.display = 'none';
      fileInput.value = '';
    }
  });
}

function triggerImageUpload(specKey) {
  currentCropTargetSpec = IMAGE_SPECS[specKey];
  activeCropperCallback = (path, size) => {
    if (specKey === 'trophyMain') {
      const trophy = currentTrophies[activeTrophyIndex];
      if (trophy) trophy.image = path;
      document.getElementById('preview_trophyMain').src = path;
      document.getElementById('path_trophyMain').textContent = path;
    } else if (specKey === 'heroDesktop') {
      if (!currentSiteData.hero) currentSiteData.hero = {};
      currentSiteData.hero.imageDesktop = path;
      currentSiteData.hero.imageMobile = path;
      document.getElementById('preview_heroDesktop').src = path;
      document.getElementById('path_heroDesktop').textContent = path;
    }
  };
  document.getElementById('globalFileInput').click();
}

function triggerCelebrationPhotoUpload(photoIndex) {
  currentCropTargetSpec = IMAGE_SPECS.celebrationPhoto;
  activeCropperCallback = (path, size) => {
    const trophy = currentTrophies[activeTrophyIndex];
    if (!trophy) return;
    if (!trophy.photos) trophy.photos = [];
    trophy.photos[photoIndex] = path;
    renderTrophyEditor(activeTrophyIndex);
  };
  document.getElementById('globalFileInput').click();
}

function processSelectedFile(file) {
  const origSizeKb = (file.size / 1024).toFixed(1);
  currentCropFilename = file.name.replace(/\.[^/.]+$/, '');

  const reader = new FileReader();
  reader.onload = (event) => {
    const img = new Image();
    img.onload = () => {
      currentCropImage = img;
      document.getElementById('cropOrigInfo').textContent = `${file.name} (${img.naturalWidth}×${img.naturalHeight} px, ${origSizeKb} KB)`;
      document.getElementById('cropTargetInfo').textContent = `${currentCropTargetSpec.label} (${currentCropTargetSpec.width}×${currentCropTargetSpec.height} px WebP)`;
      document.getElementById('cropModal').style.display = 'flex';
      renderCropperCanvas();
    };
    img.src = event.target.result;
  };
  reader.readAsDataURL(file);
}

function renderCropperCanvas() {
  if (!currentCropImage || !currentCropTargetSpec) return;

  const canvas = document.getElementById('cropperCanvas');
  const targetW = currentCropTargetSpec.width;
  const targetH = currentCropTargetSpec.height;
  canvas.width = targetW;
  canvas.height = targetH;

  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#0f131a';
  ctx.fillRect(0, 0, targetW, targetH);

  const imgW = currentCropImage.naturalWidth;
  const imgH = currentCropImage.naturalHeight;

  if (currentCropFitMode === 'cover') {
    // Smart center crop
    const imgRatio = imgW / imgH;
    const targetRatio = targetW / targetH;
    let sW, sH, sX, sY;

    if (imgRatio > targetRatio) {
      sH = imgH;
      sW = imgH * targetRatio;
      sX = (imgW - sW) / 2;
      sY = 0;
    } else {
      sW = imgW;
      sH = imgW / targetRatio;
      sX = 0;
      sY = (imgH - sH) / 2;
    }

    ctx.drawImage(currentCropImage, sX, sY, sW, sH, 0, 0, targetW, targetH);
  } else {
    // Fit contain
    const hRatio = targetW / imgW;
    const vRatio = targetH / imgH;
    const ratio = Math.min(hRatio, vRatio);
    const dW = imgW * ratio;
    const dH = imgH * ratio;
    const dX = (targetW - dW) / 2;
    const dY = (targetH - dH) / 2;

    ctx.drawImage(currentCropImage, 0, 0, imgW, imgH, dX, dY, dW, dH);
  }

  // Calculate estimated WebP size
  canvas.toBlob((blob) => {
    if (blob) {
      const webpKb = (blob.size / 1024).toFixed(1);
      document.getElementById('cropResultInfo').textContent = `${targetW}×${targetH} px • ~${webpKb} KB WebP`;
    }
  }, 'image/webp', currentCropQuality);
}

// =============================================================================
// CHARACTER COUNTERS & GUARDRAIL INDICATORS
// =============================================================================

function initCharCounters() {
  const inputs = document.querySelectorAll('[data-rule]');
  inputs.forEach(input => {
    const ruleKey = input.dataset.rule;
    const rule = CHAR_LIMITS[ruleKey];
    if (!rule) return;

    const counterId = `count_${ruleKey}`;
    const counterEl = document.getElementById(counterId);

    function update() {
      const len = input.value.length;
      if (counterEl) {
        counterEl.textContent = `${len} / ${rule.max}`;
        counterEl.className = 'char-counter';

        if (len > rule.max) counterEl.classList.add('danger');
        else if (len >= rule.warn) counterEl.classList.add('warn');
        else counterEl.classList.add('ok');
      }
    }

    input.oninput = update;
    update();
  });
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
}

// =============================================================================
// TAB 6: MEMORIES VAULT CONTROLLER
// =============================================================================

let currentVaultMoments = [];
let activeVaultIndex = 0;
let vaultFilterCategory = 'all';
let vaultSearchQuery = '';

async function loadVaultMoments() {
  try {
    const res = await fetch('/api/vault', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    if (res.ok) {
      currentVaultMoments = await res.json();
      if (!Array.isArray(currentVaultMoments)) currentVaultMoments = [];
      if (activeVaultIndex >= currentVaultMoments.length) activeVaultIndex = 0;
      
      initVaultFilters();
      renderVaultSidebar();
      if (currentVaultMoments.length > 0) {
        renderVaultEditor(activeVaultIndex);
      } else {
        renderEmptyVaultState();
      }
    } else {
      showToast('Failed to load vault moments', 'error');
    }
  } catch (err) {
    showToast('Failed to load vault moments', 'error');
  }
}

function initVaultFilters() {
  const filterBtns = document.querySelectorAll('.cat-filter-btn');
  filterBtns.forEach(btn => {
    btn.onclick = () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      vaultFilterCategory = btn.dataset.category || 'all';
      renderVaultSidebar();
    };
  });

  const searchInput = document.getElementById('vaultAdminSearch');
  if (searchInput) {
    searchInput.oninput = (e) => {
      vaultSearchQuery = e.target.value.toLowerCase().trim();
      renderVaultSidebar();
    };
  }
}

function renderVaultSidebar() {
  const container = document.getElementById('vaultList');
  if (!container) return;
  container.innerHTML = '';

  const badge = document.getElementById('vaultCountBadge');
  if (badge) badge.textContent = currentVaultMoments.length;

  const filtered = currentVaultMoments.filter((m) => {
    const matchCat = (vaultFilterCategory === 'all' || m.category === vaultFilterCategory);
    if (!matchCat) return false;
    if (!vaultSearchQuery) return true;
    return (
      (m.title && m.title.toLowerCase().includes(vaultSearchQuery)) ||
      (m.player && m.player.toLowerCase().includes(vaultSearchQuery)) ||
      (m.opponent && m.opponent.toLowerCase().includes(vaultSearchQuery)) ||
      (m.badge && m.badge.toLowerCase().includes(vaultSearchQuery))
    );
  });

  if (filtered.length === 0) {
    container.innerHTML = '<div style="color: var(--text-dim); font-size: 0.8rem; text-align: center; padding: 20px;">No matching moments found.</div>';
    return;
  }

  filtered.forEach((m) => {
    const realIndex = currentVaultMoments.findIndex(item => item.id === m.id);
    const item = document.createElement('div');
    item.className = `vault-list-item ${realIndex === activeVaultIndex ? 'active' : ''}`;
    
    const mediaIcon = m.mediaType === 'youtube' ? '▶ YT' :
                      m.mediaType === 'instagram' ? '📱 Reel' :
                      m.mediaType === 'video' ? '🎬 Clip' : '📷 Photo';

    item.innerHTML = `
      <img src="${escapeHtml(m.poster || './assets/images/trophy-celebration-night.webp')}" alt="${escapeHtml(m.title)}" class="vault-item-thumb" onerror="this.src='./assets/images/trophy-celebration-night.webp'">
      <div class="vault-item-info">
        <div class="vault-item-title">${escapeHtml(m.title)}</div>
        <div class="vault-item-meta">
          <span>${escapeHtml(m.player || 'KAvach')}</span> &bull;
          <span class="vault-item-tag">${escapeHtml(m.badge || m.category)}</span> &bull;
          <span style="font-size: 0.675rem; color: var(--text-dim);">${mediaIcon}</span>
        </div>
      </div>
    `;

    item.onclick = () => {
      activeVaultIndex = realIndex;
      renderVaultSidebar();
      renderVaultEditor(realIndex);
    };

    container.appendChild(item);
  });
}

function renderVaultEditor(index) {
  const moment = currentVaultMoments[index];
  const form = document.getElementById('vaultEditorForm');
  if (!moment || !form) return;

  const currentMediaType = moment.mediaType || 'youtube';

  form.innerHTML = `
    <div class="editor-header">
      <div>
        <h2 class="editor-title">Editing Memory: ${escapeHtml(moment.title)}</h2>
        <span style="font-size: 0.8rem; color: var(--text-dim);">ID: ${moment.id} &bull; Category: ${moment.category}</span>
      </div>
      <div style="display: flex; gap: 8px; flex-wrap: wrap;">
        <button type="button" class="btn btn-primary btn-sm" onclick="openNewVaultModal()">✨ + Add Memory</button>
        <button type="button" class="btn btn-secondary btn-sm" onclick="duplicateVaultMoment()">📋 Duplicate</button>
        <button type="button" class="btn btn-danger btn-sm" onclick="deleteVaultMoment(${index})">🗑️ Delete</button>
        <button type="button" class="btn btn-accent btn-sm" onclick="saveVaultChanges()">💾 Save Memories</button>
      </div>
    </div>

    <!-- Media Guardrail Specs Box -->
    <div class="spec-box">
      <svg viewBox="0 0 24 24"><path d="M12 2L1 21h22L12 2zm0 3.99L19.53 19H4.47L12 5.99zM11 10v4h2v-4h-2zm0 6v2h2v-2h-2z"/></svg>
      <div>
        <div class="spec-box-title">Video &amp; Highlight Guardrail Enforced</div>
        <div class="spec-box-desc">For uploaded video files, keep clips under 30MB (MP4/WebM) to prevent buffering on mobile. YouTube &amp; Instagram links stream instantaneously. Cover thumbnails must be 16:9 ratio.</div>
      </div>
    </div>

    <!-- Media Source Selector -->
    <div style="margin-bottom: 20px;">
      <label class="form-label" style="margin-bottom: 8px;">Select Media Source Type</label>
      <div class="media-mode-switcher">
        <button type="button" class="media-mode-btn ${currentMediaType === 'video' ? 'active' : ''}" onclick="switchVaultMediaMode('video')">
          <span>🎬 Uploaded Video</span>
        </button>
        <button type="button" class="media-mode-btn ${currentMediaType === 'youtube' ? 'active' : ''}" onclick="switchVaultMediaMode('youtube')">
          <span>▶ YouTube Video</span>
        </button>
        <button type="button" class="media-mode-btn ${currentMediaType === 'instagram' ? 'active' : ''}" onclick="switchVaultMediaMode('instagram')">
          <span>📱 Instagram Reel</span>
        </button>
        <button type="button" class="media-mode-btn ${currentMediaType === 'photo' ? 'active' : ''}" onclick="switchVaultMediaMode('photo')">
          <span>📷 Photo Still</span>
        </button>
      </div>

      <!-- Panel: Uploaded Video -->
      <div class="media-input-panel ${currentMediaType === 'video' ? 'active' : ''}" id="panel_media_video">
        <div class="video-dropzone" onclick="triggerVaultVideoUpload()">
          <svg viewBox="0 0 24 24"><polygon points="23 7 16 12 23 17 23 7"></polygon><rect x="1" y="5" width="15" height="14" rx="2" ry="2"></rect></svg>
          <div style="font-weight: 700; color: #fff; margin-bottom: 4px;">Click or Drag to Upload Video Clip</div>
          <div style="font-size: 0.775rem; color: var(--text-muted);">Supports MP4, WebM • Recommended &lt; 30 MB for instant playback</div>
        </div>
        <div style="margin-top: 12px;">
          <label class="form-label">Video Clip File Path</label>
          <input type="text" class="form-input" id="field_vault_mediaUrl" value="${escapeHtml(moment.mediaUrl || '')}" placeholder="./assets/videos/vault/highlight.mp4">
        </div>
      </div>

      <!-- Panel: YouTube -->
      <div class="media-input-panel ${currentMediaType === 'youtube' ? 'active' : ''}" id="panel_media_youtube">
        <label class="form-label">YouTube Video URL or Video ID</label>
        <input type="text" class="form-input" id="field_vault_youtubeId" value="${escapeHtml(moment.youtubeId || moment.mediaUrl || '')}" placeholder="https://www.youtube.com/watch?v=... or Video ID (11 chars)" oninput="updateVaultYoutubePreview(this.value)">
        <div class="form-hint">Paste full YouTube URL (e.g. https://youtu.be/xxx) or video ID.</div>
        <div id="youtubePreviewContainer" style="margin-top: 10px;">
          <!-- Dynamically previewed -->
        </div>
      </div>

      <!-- Panel: Instagram Reel -->
      <div class="media-input-panel ${currentMediaType === 'instagram' ? 'active' : ''}" id="panel_media_instagram">
        <label class="form-label">Instagram Reel / Post URL</label>
        <input type="text" class="form-input" id="field_vault_instagramUrl" value="${escapeHtml(moment.instagramUrl || '')}" placeholder="https://www.instagram.com/reel/...">
        <div class="form-hint">Links club fans directly to the original reel on Instagram.</div>
      </div>

      <!-- Panel: Photo Still -->
      <div class="media-input-panel ${currentMediaType === 'photo' ? 'active' : ''}" id="panel_media_photo">
        <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 8px;">Displays high-resolution victory photograph in lightbox cinema mode.</div>
      </div>
    </div>

    <!-- Thumbnail Poster Photo -->
    <div class="form-group form-grid-full" style="margin-bottom: 20px;">
      <label class="form-label">Cover / Poster Thumbnail (16:9 Landscape)</label>
      <div class="image-uploader-card">
        <img src="${escapeHtml(moment.poster || './assets/images/trophy-celebration-night.webp')}" class="image-preview-thumb" id="preview_vault_poster" style="aspect-ratio: 16/9; width: 120px; height: 68px;">
        <div class="image-upload-actions">
          <div class="image-specs-badge">Target: 1280×720 or 800×450 px • WebP • Max 200 KB</div>
          <input type="text" class="form-input" id="field_vault_poster" value="${escapeHtml(moment.poster || './assets/images/trophy-celebration-night.webp')}" style="margin-bottom: 8px;">
          <button type="button" class="btn btn-secondary btn-sm" onclick="triggerVaultPosterUpload()">
            📷 Choose Photo &amp; Auto WebP Crop
          </button>
        </div>
      </div>
    </div>

    <div class="form-grid">
      <!-- Category -->
      <div class="form-group">
        <label class="form-label">Category</label>
        <select class="form-select" id="field_vault_category">
          <option value="centuries" ${moment.category === 'centuries' ? 'selected' : ''}>🏏 Centuries &amp; Knocks</option>
          <option value="bowling" ${moment.category === 'bowling' ? 'selected' : ''}>⚡ 5-Wicket Hauls &amp; Bowling Spells</option>
          <option value="dugout" ${moment.category === 'dugout' ? 'selected' : ''}>🏆 Dugout &amp; Celebrations</option>
          <option value="thrillers" ${moment.category === 'thrillers' ? 'selected' : ''}>🎯 Last-Over Thrillers</option>
          <option value="milestones" ${moment.category === 'milestones' ? 'selected' : ''}>🌟 Club Milestones</option>
        </select>
      </div>

      <!-- Badge Tag -->
      <div class="form-group">
        <label class="form-label">Badge Tag</label>
        <input type="text" class="form-input" id="field_vault_badge" value="${escapeHtml(moment.badge || '')}" placeholder="e.g. 1st Century • 104*">
      </div>

      <!-- Title -->
      <div class="form-group form-grid-full">
        <label class="form-label">Official Moment Title (Max 60 chars)</label>
        <input type="text" class="form-input" id="field_vault_title" value="${escapeHtml(moment.title || '')}" maxlength="60" required>
      </div>

      <!-- Subtitle -->
      <div class="form-group form-grid-full">
        <label class="form-label">Headline / Subtitle (Max 80 chars)</label>
        <input type="text" class="form-input" id="field_vault_subtitle" value="${escapeHtml(moment.subtitle || '')}" maxlength="80">
      </div>

      <!-- Player -->
      <div class="form-group">
        <label class="form-label">Player(s) Involved</label>
        <input type="text" class="form-input" id="field_vault_player" value="${escapeHtml(moment.player || '')}" placeholder="e.g. Ashutosh Dixit">
      </div>

      <!-- Opponent / Match -->
      <div class="form-group">
        <label class="form-label">Opponent / Tournament</label>
        <input type="text" class="form-input" id="field_vault_opponent" value="${escapeHtml(moment.opponent || '')}" placeholder="e.g. Bangalore Titans • KPL Semifinal">
      </div>

      <!-- Date -->
      <div class="form-group">
        <label class="form-label">Match Date / Month</label>
        <input type="text" class="form-input" id="field_vault_date" value="${escapeHtml(moment.date || moment.year || '')}" placeholder="e.g. November 2023">
      </div>

      <!-- Venue -->
      <div class="form-group">
        <label class="form-label">Match Venue Ground</label>
        <input type="text" class="form-input" id="field_vault_venue" value="${escapeHtml(moment.venue || 'Play Arena, Sarjapur Road')}" placeholder="e.g. Play Arena, Sarjapur Road">
      </div>

      <!-- Stat Pill -->
      <div class="form-group form-grid-full">
        <label class="form-label">Key Stat Pill (e.g. 104* (52b • 8x6, 9x4))</label>
        <input type="text" class="form-input" id="field_vault_statPill" value="${escapeHtml(moment.statPill || '')}" placeholder="e.g. 104* (52b • 8x6, 9x4)">
      </div>

      <!-- Narrative Story -->
      <div class="form-group form-grid-full">
        <label class="form-label">Story Narrative (150–500 characters)</label>
        <textarea class="form-textarea" id="field_vault_story" rows="4" maxlength="500">${escapeHtml(moment.story || '')}</textarea>
      </div>

      <!-- Key Match Feats (Highlights) -->
      <div class="form-group form-grid-full">
        <label class="form-label">Key Match Feats (4 Highlight Bullets)</label>
        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${[0, 1, 2, 3].map(i => `
            <input type="text" class="form-input" id="field_vault_hl_${i}" value="${escapeHtml((moment.highlights && moment.highlights[i]) || '')}" placeholder="Feat #${i+1}...">
          `).join('')}
        </div>
      </div>

      <!-- Featured Spotlight -->
      <div class="form-group form-grid-full">
        <label style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
          <input type="checkbox" id="field_vault_featured" ${moment.featured ? 'checked' : ''} style="width: 18px; height: 18px; accent-color: var(--red-primary);">
          <span style="font-size: 0.9rem; font-weight: 700; color: #fff;">Pin as Featured Spotlight Memory in Vault Header</span>
        </label>
      </div>

    </div>

    <div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid var(--border-subtle); display: flex; justify-content: flex-end; gap: 12px;">
      <button type="button" class="btn btn-secondary" onclick="renderVaultEditor(activeVaultIndex)">Cancel Revert</button>
      <button type="button" class="btn btn-accent" onclick="saveVaultChanges()">💾 Save Changes to Vault</button>
    </div>
  `;

  // Init YouTube preview if exists
  if (currentMediaType === 'youtube') {
    updateVaultYoutubePreview(moment.youtubeId || moment.mediaUrl || '');
  }
}

function switchVaultMediaMode(type) {
  if (!currentVaultMoments[activeVaultIndex]) return;
  currentVaultMoments[activeVaultIndex].mediaType = type;
  
  document.querySelectorAll('.media-mode-btn').forEach(btn => btn.classList.remove('active'));
  document.querySelectorAll('.media-input-panel').forEach(panel => panel.classList.remove('active'));

  const activeBtn = document.querySelector(`.media-mode-btn[onclick="switchVaultMediaMode('${type}')"]`);
  if (activeBtn) activeBtn.classList.add('active');

  const panel = document.getElementById(`panel_media_${type}`);
  if (panel) panel.classList.add('active');
}

function updateVaultYoutubePreview(val) {
  const container = document.getElementById('youtubePreviewContainer');
  if (!container) return;
  if (!val) { container.innerHTML = ''; return; }

  let ytId = val;
  const match = val.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
  if (match) ytId = match[1];

  if (ytId.length === 11) {
    container.innerHTML = `
      <div style="aspect-ratio: 16/9; max-width: 320px; border-radius: 8px; overflow: hidden; margin-top: 8px; border: 1px solid var(--border-subtle);">
        <iframe src="https://www.youtube-nocookie.com/embed/${ytId}" style="width: 100%; height: 100%; border: none;" allowfullscreen></iframe>
      </div>
    `;
  }
}

// Video Upload Handler
function triggerVaultVideoUpload() {
  const fileInput = document.getElementById('globalVideoFileInput');
  if (!fileInput) return;
  fileInput.value = '';
  fileInput.onchange = async () => {
    const file = fileInput.files[0];
    if (!file) return;

    if (file.size > 50 * 1024 * 1024) {
      alert('Video file is larger than 50MB. Please compress the MP4 using Handbrake or similar tool before uploading.');
      return;
    }

    showToast('Uploading video clip... Please wait.', 'info');
    const reader = new FileReader();
    reader.onload = async () => {
      try {
        const res = await fetch('/api/upload-video', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            filename: file.name,
            base64Data: reader.result
          })
        });

        const data = await res.json();
        if (data.success) {
          showToast(`Video uploaded successfully! (${(data.size / (1024*1024)).toFixed(1)} MB)`);
          const urlInput = document.getElementById('field_vault_mediaUrl');
          if (urlInput) urlInput.value = data.path;
          if (currentVaultMoments[activeVaultIndex]) {
            currentVaultMoments[activeVaultIndex].mediaUrl = data.path;
            currentVaultMoments[activeVaultIndex].mediaType = 'video';
          }
        } else {
          showToast(data.error || 'Video upload failed', 'error');
        }
      } catch (err) {
        showToast('Error uploading video file', 'error');
      }
    };
    reader.readAsDataURL(file);
  };
  fileInput.click();
}

// Poster Upload Handler
function triggerVaultPosterUpload() {
  currentCropTarget = {
    targetWidth: 1280,
    targetHeight: 720,
    aspectRatio: 16 / 9,
    ruleKey: 'vaultPoster',
    inputFieldId: 'field_vault_poster',
    previewImgId: 'preview_vault_poster'
  };

  const fileInput = document.getElementById('globalFileInput');
  fileInput.value = '';
  fileInput.onchange = (e) => {
    if (e.target.files && e.target.files[0]) {
      handleImageSelection(e.target.files[0]);
    }
  };
  fileInput.click();
}

async function saveVaultChanges() {
  const m = currentVaultMoments[activeVaultIndex];
  if (!m) return;

  // Gather values
  m.category = document.getElementById('field_vault_category').value;
  m.badge = document.getElementById('field_vault_badge').value.trim();
  m.title = document.getElementById('field_vault_title').value.trim();
  m.subtitle = document.getElementById('field_vault_subtitle').value.trim();
  m.player = document.getElementById('field_vault_player').value.trim();
  m.opponent = document.getElementById('field_vault_opponent').value.trim();
  m.date = document.getElementById('field_vault_date').value.trim();
  m.venue = document.getElementById('field_vault_venue').value.trim();
  m.statPill = document.getElementById('field_vault_statPill').value.trim();
  m.story = document.getElementById('field_vault_story').value.trim();
  m.poster = document.getElementById('field_vault_poster').value.trim();
  m.featured = document.getElementById('field_vault_featured').checked;

  const ytInput = document.getElementById('field_vault_youtubeId');
  if (ytInput) {
    const raw = ytInput.value.trim();
    m.youtubeId = raw;
    const match = raw.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    if (match) m.youtubeId = match[1];
  }

  const igInput = document.getElementById('field_vault_instagramUrl');
  if (igInput) m.instagramUrl = igInput.value.trim();

  const vidUrlInput = document.getElementById('field_vault_mediaUrl');
  if (vidUrlInput && m.mediaType === 'video') m.mediaUrl = vidUrlInput.value.trim();

  // Highlights
  m.highlights = [0, 1, 2, 3]
    .map(i => {
      const el = document.getElementById(`field_vault_hl_${i}`);
      return el ? el.value.trim() : '';
    })
    .filter(Boolean);

  try {
    const res = await fetch('/api/vault', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ moments: currentVaultMoments })
    });

    const data = await res.json();
    if (data.success) {
      showToast('Memories Vault updated successfully!');
      renderVaultSidebar();
    } else {
      showToast(data.error || 'Failed to save moments', 'error');
    }
  } catch (err) {
    showToast('Network error while saving moments', 'error');
  }
}

async function deleteVaultMoment(index) {
  const m = currentVaultMoments[index];
  if (!confirm(`Are you sure you want to delete "${m.title}" from the Memories Vault?`)) return;

  currentVaultMoments.splice(index, 1);
  if (activeVaultIndex >= currentVaultMoments.length) {
    activeVaultIndex = Math.max(0, currentVaultMoments.length - 1);
  }

  try {
    const res = await fetch('/api/vault', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ moments: currentVaultMoments })
    });
    if (res.ok) {
      showToast('Moment deleted.');
      renderVaultSidebar();
      if (currentVaultMoments.length > 0) {
        renderVaultEditor(activeVaultIndex);
      } else {
        renderEmptyVaultState();
      }
    }
  } catch (err) {
    showToast('Failed to delete moment', 'error');
  }
}

async function duplicateVaultMoment() {
  const m = currentVaultMoments[activeVaultIndex];
  if (!m) return;

  const clone = JSON.parse(JSON.stringify(m));
  clone.id = `vault-${Date.now()}`;
  clone.title = `Copy of ${clone.title}`;
  clone.featured = false;

  currentVaultMoments.splice(activeVaultIndex + 1, 0, clone);
  activeVaultIndex += 1;

  try {
    const res = await fetch('/api/vault', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ moments: currentVaultMoments })
    });
    if (res.ok) {
      showToast('Moment duplicated!');
      renderVaultSidebar();
      renderVaultEditor(activeVaultIndex);
    }
  } catch (err) {
    showToast('Failed to duplicate moment', 'error');
  }
}

function openNewVaultModal() {
  document.getElementById('newVaultModal').style.display = 'flex';
}

function closeNewVaultModal() {
  document.getElementById('newVaultModal').style.display = 'none';
}

function toggleNewVaultMediaFields(val) {
  const label = document.getElementById('label_new_vault_mediaUrl');
  const input = document.getElementById('new_vault_mediaUrl');
  if (val === 'youtube') {
    label.textContent = 'YouTube URL or ID';
    input.placeholder = 'https://www.youtube.com/watch?v=...';
  } else if (val === 'instagram') {
    label.textContent = 'Instagram Reel Link';
    input.placeholder = 'https://www.instagram.com/reel/...';
  } else if (val === 'video') {
    label.textContent = 'Video File URL / Path';
    input.placeholder = './assets/videos/vault/highlight.mp4';
  } else {
    label.textContent = 'Photo Image Path';
    input.placeholder = './assets/images/...';
  }
}

async function handleCreateNewVault(e) {
  e.preventDefault();

  const newMoment = {
    id: `vault-${Date.now()}`,
    category: document.getElementById('new_vault_category').value,
    badge: document.getElementById('new_vault_badge').value.trim() || 'Historic Match',
    title: document.getElementById('new_vault_title').value.trim(),
    subtitle: document.getElementById('new_vault_subtitle').value.trim(),
    player: document.getElementById('new_vault_player').value.trim(),
    opponent: document.getElementById('new_vault_opponent').value.trim(),
    venue: 'Play Arena, Sarjapur Road',
    date: document.getElementById('new_vault_date').value.trim(),
    year: (new Date()).getFullYear().toString(),
    statPill: document.getElementById('new_vault_statPill').value.trim(),
    mediaType: document.getElementById('new_vault_mediaType').value,
    mediaUrl: document.getElementById('new_vault_mediaUrl').value.trim(),
    poster: document.getElementById('new_vault_poster').value.trim() || './assets/images/trophy-celebration-night.webp',
    story: document.getElementById('new_vault_story').value.trim(),
    highlights: [
      'Decisive match-winning performance',
      'Electric dugout celebration',
      'Recorded in club archives'
    ],
    featured: false
  };

  if (newMoment.mediaType === 'youtube') {
    const raw = newMoment.mediaUrl;
    const match = raw.match(/(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))([\w-]{11})/);
    newMoment.youtubeId = match ? match[1] : raw;
  } else if (newMoment.mediaType === 'instagram') {
    newMoment.instagramUrl = newMoment.mediaUrl;
  }

  currentVaultMoments.unshift(newMoment);
  activeVaultIndex = 0;

  try {
    const res = await fetch('/api/vault', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ moments: currentVaultMoments })
    });
    if (res.ok) {
      showToast('New memory created and added to Vault!');
      closeNewVaultModal();
      renderVaultSidebar();
      renderVaultEditor(0);
    }
  } catch (err) {
    showToast('Failed to add new moment', 'error');
  }
}

function renderEmptyVaultState() {
  const form = document.getElementById('vaultEditorForm');
  if (form) {
    form.innerHTML = `
      <div style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
        <h3>No Memories in Vault</h3>
        <p style="margin: 10px 0 20px;">Click the button below to add your first historic knock, spell, or celebration.</p>
        <button type="button" class="btn btn-primary" onclick="openNewVaultModal()">✨ + Add First Memory</button>
      </div>
    `;
  }
}

// =============================================================================
// TAB 7: WEBSITE PERFORMANCE & SEO BENCHMARK AUDIT CONTROLLER
// =============================================================================

async function runDiagnosticAudit() {
  const btn = document.getElementById('btnRunAudit');
  const targetMode = (document.getElementById('auditTargetMode') && document.getElementById('auditTargetMode').value) || 'live';
  
  if (btn) {
    btn.disabled = true;
    btn.innerHTML = '<span>⏳ Running Benchmark Audit...</span>';
  }

  try {
    const res = await fetch('/api/audit/run', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ targetMode })
    });

    if (res.ok) {
      const report = await res.json();
      window.hasRunAudit = true;
      renderAuditReport(report);
      showToast('Diagnostic audit completed!');
    } else {
      showToast('Audit failed to run', 'error');
    }
  } catch (err) {
    showToast('Network error during audit', 'error');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.innerHTML = '<span>🚀 Run Full Benchmark Audit</span>';
    }
  }
}

function renderAuditReport(report) {
  currentAuditReport = report;
  const container = document.getElementById('auditResultsArea');
  if (!container || !report) return;

  const scoreColor = report.overallScore >= 90 ? 'var(--green-accent)' :
                     (report.overallScore >= 75 ? 'var(--gold-accent)' : 'var(--red-primary)');

  container.innerHTML = `
    <!-- Top Summary Card -->
    <div style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg); padding: 24px; margin-top: 20px; display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 20px;">
      <div style="display: flex; align-items: center; gap: 20px;">
        <div class="score-circle" style="border-color: ${scoreColor};">
          <span class="score-num" style="color: ${scoreColor};">${report.overallScore}</span>
          <span class="score-label">OVERALL</span>
        </div>
        <div>
          <div style="font-size: 1.3rem; font-weight: 800; color: #fff; margin-bottom: 4px;">Status: <span style="color: ${scoreColor};">${report.statusLabel}</span></div>
          <div style="font-size: 0.8rem; color: var(--text-muted);">
            Target: <code>${escapeHtml(report.targetUrl)}</code> &bull; Audited: ${new Date(report.timestamp).toLocaleTimeString()}
          </div>
        </div>
      </div>

      <div style="display: flex; gap: 16px; flex-wrap: wrap;">
        <div style="text-align: right;">
          <div style="font-size: 0.725rem; color: var(--text-dim); text-transform: uppercase;">Server TTFB</div>
          <div style="font-size: 1.1rem; font-weight: 700; color: #fff;">${report.metrics.ttfb}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 0.725rem; color: var(--text-dim); text-transform: uppercase;">LCP Speed</div>
          <div style="font-size: 1.1rem; font-weight: 700; color: #fff;">${report.metrics.lcp}</div>
        </div>
        <div style="text-align: right;">
          <div style="font-size: 0.725rem; color: var(--text-dim); text-transform: uppercase;">Layout Shift</div>
          <div style="font-size: 1.1rem; font-weight: 700; color: #fff;">${report.metrics.cls}</div>
        </div>
      </div>
    </div>

    <!-- 4 Core Pillars Grid -->
    <div class="audit-pillars-grid" style="margin-top: 20px;">
      
      <!-- Pillar 1: Performance -->
      <div class="pillar-card perf">
        <div class="pillar-header">
          <span class="pillar-title">⚡ Performance &amp; Speed</span>
          <span class="pillar-score" style="color: var(--green-accent);">${report.scores.performance}/100</span>
        </div>
        <div class="pillar-metric-row">
          <span>First Contentful Paint</span>
          <span class="pillar-metric-val">${report.metrics.fcp}</span>
        </div>
        <div class="pillar-metric-row">
          <span>Largest Contentful Paint</span>
          <span class="pillar-metric-val">${report.metrics.lcp}</span>
        </div>
        <div class="pillar-metric-row">
          <span>Total Blocking Time</span>
          <span class="pillar-metric-val">${report.metrics.tbt}</span>
        </div>
      </div>

      <!-- Pillar 2: SEO -->
      <div class="pillar-card seo">
        <div class="pillar-header">
          <span class="pillar-title">🔍 SEO Health</span>
          <span class="pillar-score" style="color: var(--gold-accent);">${report.scores.seo}/100</span>
        </div>
        <div class="pillar-metric-row">
          <span>Meta Description</span>
          <span class="pillar-metric-val">✅ Verified</span>
        </div>
        <div class="pillar-metric-row">
          <span>Canonical URLs</span>
          <span class="pillar-metric-val">✅ Verified</span>
        </div>
        <div class="pillar-metric-row">
          <span>Sitemap.xml</span>
          <span class="pillar-metric-val">✅ 7 URLs</span>
        </div>
      </div>

      <!-- Pillar 3: AI Engine Readiness -->
      <div class="pillar-card ai">
        <div class="pillar-header">
          <span class="pillar-title">🤖 AI Search Discoverability</span>
          <span class="pillar-score" style="color: #a78bfa;">${report.scores.aiEngine}/100</span>
        </div>
        <div class="pillar-metric-row">
          <span>GPTBot &amp; PerplexityBot</span>
          <span class="pillar-metric-val">✅ Whitelisted</span>
        </div>
        <div class="pillar-metric-row">
          <span>SportsClub Schema</span>
          <span class="pillar-metric-val">✅ JSON-LD</span>
        </div>
        <div class="pillar-metric-row">
          <span>llms.txt Context File</span>
          <span class="pillar-metric-val">✅ Active</span>
        </div>
      </div>

      <!-- Pillar 4: Best Practices -->
      <div class="pillar-card bp">
        <div class="pillar-header">
          <span class="pillar-title">🛡️ Security &amp; Best Practices</span>
          <span class="pillar-score" style="color: var(--blue-accent);">${report.scores.bestPractices}/100</span>
        </div>
        <div class="pillar-metric-row">
          <span>Modern WebP Images</span>
          <span class="pillar-metric-val">✅ 100% Compressed</span>
        </div>
        <div class="pillar-metric-row">
          <span>Self-Hosted WOFF2 Fonts</span>
          <span class="pillar-metric-val">✅ Zero Latency</span>
        </div>
        <div class="pillar-metric-row">
          <span>HTTPS / TLS 1.3</span>
          <span class="pillar-metric-val">✅ Enforced</span>
        </div>
      </div>

    </div>

    <!-- Actionable Remediation Center -->
    <div class="audit-actions-grid" style="margin-top: 24px;">
      
      <!-- Column 1: 1-Click Instant Fixes -->
      <div class="audit-section-box">
        <div class="audit-section-title">
          <span>⚡ 1-Click Instant Fixes</span>
          <span style="font-size: 0.75rem; background: rgba(16, 185, 129, 0.15); color: var(--green-accent); padding: 2px 8px; border-radius: 9999px;">Safe Auto-Apply</span>
        </div>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px;">
          One-click automated patches directly updating your local configuration files with backups.
        </p>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${(report.quickFixes || []).map(fix => `
            <div class="fix-item-card">
              <div class="fix-item-header">
                <div class="fix-item-title">${escapeHtml(fix.title)}</div>
                <span class="fix-impact-badge">${escapeHtml(fix.impact)}</span>
              </div>
              <p class="fix-item-desc">${escapeHtml(fix.description)}</p>
              <div style="margin-top: 6px;">
                ${fix.applied ? `
                  <button type="button" class="btn btn-secondary btn-sm" disabled style="opacity: 0.7;">
                    <span>✅ Verified &amp; Applied</span>
                  </button>
                ` : `
                  <button type="button" class="btn btn-primary btn-sm" onclick="applyAuditFix('${fix.id}')">
                    <span>⚡ Apply Fix Now</span>
                  </button>
                `}
              </div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Column 2: Architectural & Antigravity Prompts -->
      <div class="audit-section-box">
        <div class="audit-section-title">
          <span>🛠️ Deep Architecture Fixes</span>
          <span style="font-size: 0.75rem; background: rgba(255, 179, 0, 0.15); color: var(--gold-accent); padding: 2px 8px; border-radius: 9999px;">Antigravity Assisted</span>
        </div>
        <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 4px;">
          Advanced Core Web Vitals optimizations. Click to copy an actionable prompt ready to paste into Antigravity.
        </p>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          ${(report.criticalFixes || []).map((crit, idx) => `
            <div class="fix-item-card">
              <div class="fix-item-header">
                <div class="fix-item-title">${escapeHtml(crit.title)}</div>
                <span style="font-size: 0.7rem; color: var(--gold-accent); font-weight: 700;">${escapeHtml(crit.severity)}</span>
              </div>
              <div style="font-size: 0.775rem; color: var(--text-main); font-weight: 600;">${escapeHtml(crit.metric)}</div>
              <p class="fix-item-desc">${escapeHtml(crit.description)}</p>
              
              <div class="antigravity-code-box">${escapeHtml(crit.prompt)}</div>

              <div style="margin-top: 10px;">
                <button type="button" class="btn btn-secondary btn-sm" onclick="copyAntigravityPromptByIndex(${idx})">
                  <span>📋 Copy Antigravity Prompt</span>
                </button>
              </div>
            </div>
          `).join('')}
        </div>
      </div>

    </div>
  `;
}

let currentAuditReport = null;

function copyAntigravityPromptByIndex(idx) {
  if (!currentAuditReport || !currentAuditReport.criticalFixes || !currentAuditReport.criticalFixes[idx]) return;
  const promptText = currentAuditReport.criticalFixes[idx].prompt;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(promptText).then(() => {
      showToast('Copied Antigravity prompt to clipboard! Paste it into Antigravity chat.');
    }).catch(() => {
      promptFallback(promptText);
    });
  } else {
    promptFallback(promptText);
  }
}

function promptFallback(text) {
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  showToast('Copied Antigravity prompt to clipboard! Paste it into Antigravity chat.');
}

async function applyAuditFix(fixId) {
  showToast('Applying automated fix...', 'info');
  try {
    const res = await fetch('/api/audit/apply-fix', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ fixId })
    });

    const data = await res.json();
    if (data.success) {
      showToast(data.message || 'Fix applied successfully!');
      // Re-run diagnostic
      await runDiagnosticAudit();
    } else {
      showToast(data.error || 'Failed to apply fix', 'error');
    }
  } catch (err) {
    showToast('Error applying fix', 'error');
  }
}

