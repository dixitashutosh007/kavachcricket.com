/**
 * KAvach Cricket Club - Local Admin Server
 * Zero-dependency Node.js HTTP Server for Website & Trophy Room Content Management
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

const PORT = 4040;
const HOST = '127.0.0.1';
const ROOT_DIR = path.resolve(__dirname, '..');
const ADMIN_DIR = __dirname;
const BACKUPS_DIR = path.join(ROOT_DIR, 'backups');
const CONFIG_FILE = path.join(ADMIN_DIR, '.config.json');
const SITE_DATA_FILE = path.join(ADMIN_DIR, 'site-data.json');
const TROPHIES_DATA_FILE = path.join(ROOT_DIR, 'assets', 'js', 'trophies-data.js');
const INDEX_HTML_FILE = path.join(ROOT_DIR, 'index.html');
const ASSETS_IMAGES_DIR = path.join(ROOT_DIR, 'assets', 'images');

// Ensure directories exist
if (!fs.existsSync(BACKUPS_DIR)) fs.mkdirSync(BACKUPS_DIR, { recursive: true });
if (!fs.existsSync(ADMIN_DIR)) fs.mkdirSync(ADMIN_DIR, { recursive: true });

// Load or initialize config
function getConfig() {
  if (fs.existsSync(CONFIG_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
    } catch (e) {
      console.error('Error reading config, using defaults', e);
    }
  }
  const defaultConfig = {
    pinHash: crypto.createHash('sha256').update('kavach2026').digest('hex'),
    sessionSecret: crypto.randomBytes(32).toString('hex')
  };
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(defaultConfig, null, 2), 'utf8');
  return defaultConfig;
}

let activeSessions = new Set();

// Utility: Create timestamped backup
function createBackup(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    const baseName = path.basename(filePath);
    const timeStamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupName = `${baseName}.${timeStamp}.bak`;
    const destPath = path.join(BACKUPS_DIR, backupName);
    fs.copyFileSync(filePath, destPath);
    return backupName;
  } catch (err) {
    console.error('Backup creation failed for', filePath, err);
    return null;
  }
}

// Utility: Parse JSON body
function parseJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => {
      body += chunk;
      if (body.length > 50 * 1024 * 1024) { // 50MB limit
        req.destroy();
        reject(new Error('Payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (err) {
        reject(err);
      }
    });
  });
}

// Utility: Auth check
function isAuthenticated(req) {
  const authHeader = req.headers['authorization'];
  if (!authHeader) return false;
  const token = authHeader.replace(/^Bearer\s+/, '').trim();
  return activeSessions.has(token);
}

// Utility: Render Hero HTML
function renderHeroHtml(hero) {
  const perksHtml = (hero.perks || []).map(perk => `
              <div class="hero-perk-item">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" style="width: 16px; height: 16px; min-width: 16px; max-width: 16px; flex-shrink: 0; display: block;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                <span>${escapeHtml(perk)}</span>
              </div>`).join('');

  return `<!-- Hero Text Content -->
          <div class="hero-text-content reveal">
            <div class="hero-badges-row">
              <div class="hero-badge-slogan">
                <span class="slogan-dot"></span>
                <span class="slogan-text">${escapeHtml(hero.slogan)}</span>
              </div>
              <div class="hero-badge-ranking" id="rankings">
                <svg viewBox="0 0 24 24" fill="currentColor"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
                <span>${escapeHtml(hero.ranking)}</span>
              </div>
            </div>

            <h1 class="hero-title">
              ${escapeHtml(hero.titlePrefix)} <span class="text-gradient-red">${escapeHtml(hero.titleAccent)}</span>
              <span class="sr-only"> — Best Leather Ball Cricket Club in Bangalore for Adults &amp; Seniors</span>
            </h1>

            <p class="hero-desc">
              ${hero.description}
            </p>

            <div class="hero-ctas">
              <div class="contact-action-dropdown">
                <button type="button" class="btn btn-primary btn-lg dropdown-action-btn" aria-expanded="false" aria-haspopup="true">
                  <span>Join KAvach</span>
                  <svg class="dropdown-arrow" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
                <div class="action-dropdown-menu" role="menu">
                  <a href="https://wa.me/918296211687?text=Hi%20KAvach%2C%20I%20want%20to%20join%20the%20club.%20Please%20share%20details%20on%20practice%20sessions%20and%20upcoming%20matches." target="_blank" rel="noopener" class="action-dropdown-item" role="menuitem" aria-label="Chat with admissions team on WhatsApp to join KAvach">
                    <div class="action-item-icon wa-icon-color">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.711 2.598 2.669-.699c.969.529 1.79.814 2.791.814 3.178 0 5.767-2.587 5.768-5.768 0-3.18-2.588-5.768-5.768-5.768zm3.387 8.163c-.144.405-.837.774-1.17.824-.312.045-.694.074-2.148-.528-1.733-.718-2.853-2.482-2.939-2.597-.087-.115-.703-.935-.703-1.783 0-.848.442-1.265.599-1.439.157-.174.343-.217.457-.217.115 0 .23 0 .331.005.106.006.248-.04.388.297.144.348.491 1.2.534 1.288.043.088.072.19.014.305-.058.115-.087.187-.173.288l-.26.307c-.087.086-.178.181-.077.355.101.173.449.742.964 1.201.662.59 1.221.773 1.394.86.173.086.274.072.376-.044.101-.116.433-.506.549-.68.116-.173.231-.144.389-.086.158.058 1.002.472 1.175.558.173.087.288.13.331.202.044.073.044.419-.1.824z"/></svg>
                    </div>
                    <div class="action-item-body">
                      <span class="action-item-title">WhatsApp on 8296211687</span>
                      <span class="action-item-hint">Instant chat with member admissions</span>
                    </div>
                  </a>
                  <a href="tel:+918296211687" class="action-dropdown-item" role="menuitem">
                    <div class="action-item-icon call-icon-color">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M6.62 10.79a15.053 15.053 0 006.59 6.59l2.2-2.2c.27-.27.67-.36 1.02-.24 1.12.37 2.33.57 3.57.57.55 0 1 .45 1 1V20c0 .55-.45 1-1 1-9.39 0-17-7.61-17-17 0-.55.45-1 1-1h3.5c.55 0 1 .45 1 1 0 1.25.2 2.45.57 3.57.11.35.03.74-.25 1.02l-2.2 2.2z"/></svg>
                    </div>
                    <div class="action-item-body">
                      <span class="action-item-title">Call us on 8296211687</span>
                      <span class="action-item-hint">Direct Phone Call Option</span>
                    </div>
                  </a>
                  <a href="https://form.jotform.com/231925336416153" target="_blank" rel="noopener" class="action-dropdown-item" role="menuitem">
                    <div class="action-item-icon form-icon-color">
                      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
                    </div>
                    <div class="action-item-body">
                      <span class="action-item-title">Fill Player Registration Form</span>
                      <span class="action-item-hint">Online form (best if WhatsApp not on desktop)</span>
                    </div>
                  </a>
                </div>
              </div>
            </div>

            <div class="hero-perks">${perksHtml}
            </div>
          </div>

          <!-- Hero Media Visual Card -->
          <div class="hero-media-card">
            <div class="hero-image-wrapper">
              <picture>
                <source media="(max-width: 600px)" srcset="${escapeHtml(hero.imageMobile || hero.imageDesktop)}" type="image/webp">
                <source media="(min-width: 601px)" srcset="${escapeHtml(hero.imageDesktop)}" type="image/webp">
                <img src="${escapeHtml(hero.imageFallback || hero.imageDesktop)}" alt="KAvach Cricket Club players at Play Arena Bangalore in Scarlet Red match jerseys" class="hero-main-img" width="800" height="1067" fetchpriority="high" decoding="async">
              </picture>
              <div class="hero-image-overlay"></div>
              <div class="hero-caption">
                <p class="hero-caption-title">${escapeHtml(hero.captionTitle)}</p>
                <p>${escapeHtml(hero.captionVenue)}</p>
              </div>
            </div>

            <!-- Floating Hero Badge -->
            <div class="hero-floating-badge">
              <div class="floating-badge-icon">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="7"></circle><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"></polyline></svg>
              </div>
              <div class="floating-badge-text">
                <p class="floating-badge-title">${escapeHtml(hero.floatingBadgeTitle)}</p>
                <p>${escapeHtml(hero.floatingBadgeSubtitle)}</p>
              </div>
            </div>
          </div>`;
}

// Utility: Render Stats HTML
function renderStatsHtml(stats) {
  const itemsHtml = (stats || []).map((s, idx) => `
          <div class="stat-item reveal${idx > 0 ? ` delay-${idx}` : ''}">
            <div class="stat-number-wrapper">
              <span class="stat-number" data-target="${escapeHtml(s.target)}">${escapeHtml(s.target)}</span>
              <span class="stat-suffix">${escapeHtml(s.suffix)}</span>
            </div>
            <div class="stat-label">${escapeHtml(s.label)}</div>
            <div class="stat-desc">${escapeHtml(s.desc)}</div>
          </div>`).join('\n');

  return `<div class="stats-grid">
${itemsHtml}
        </div>`;
}

// Utility: Render Announcement HTML
function renderAnnouncementHtml(ann) {
  const featsHtml = (ann.features || []).map(f => `
                <div class="kpl-feature-item">
                  <div class="kpl-feat-icon" style="width: 20px; height: 20px; min-width: 20px; max-width: 20px; flex-shrink: 0;">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" style="width: 18px; height: 18px; min-width: 18px; max-width: 18px; display: block;"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                  </div>
                  <div>
                    <strong>${escapeHtml(f.title)}</strong> ${escapeHtml(f.desc)}
                  </div>
                </div>`).join('\n');

  return `<div class="kpl-promo-card reveal">
          
          <div class="kpl-promo-badge-row">
            <span class="kpl-season-badge">${escapeHtml(ann.badge)}</span>
            <span class="kpl-status-pill">${escapeHtml(ann.status)}</span>
          </div>

          <div class="kpl-promo-content-grid">
            
            <!-- Left: KPL V Official Crest Logo -->
            <div class="kpl-promo-logo-col reveal delay-1">
              <div class="kpl-logo-frame">
                <picture>
                  <source media="(max-width: 600px)" srcset="./assets/images/kpl-v-logo-mobile.webp" type="image/webp">
                  <source media="(min-width: 601px)" srcset="./assets/images/kpl-v-logo.webp" type="image/webp">
                  <img src="./assets/images/kpl-v-logo.jpg" alt="KAvach Cricket Club players at Play Arena Bangalore - KPL Season 5 official tournament crest" width="560" height="679" style="height: auto; aspect-ratio: 560 / 679;" loading="lazy" decoding="async" class="kpl-v-logo-img">
                </picture>
              </div>
            </div>

            <!-- Right: KPL V Details & Promo Copy -->
            <div class="kpl-promo-text-col reveal delay-2">
              <span class="section-tag yellow-tag">${escapeHtml(ann.tag)}</span>
              <h2 class="kpl-promo-title">
                ${ann.title.includes('<br>') ? ann.title : `${escapeHtml(ann.title)}`}
              </h2>
              <p class="kpl-promo-desc">
                ${ann.description}
              </p>

              <!-- Feature Highlights -->
              <div class="kpl-promo-features">
${featsHtml}
              </div>

              <!-- CTA Buttons -->
              <div class="kpl-promo-actions">
                <a href="${escapeHtml(ann.ctaLink || './kpl.html')}" class="btn btn-primary btn-lg">
                  <span>${escapeHtml(ann.ctaText || 'Know More →')}</span>
                </a>
                <a href="${escapeHtml(ann.secondaryCtaLink || 'https://auction.kavachcricket.com/league-kpl5/register')}" target="_blank" rel="noopener" class="btn btn-accent btn-lg">
                  <span>${escapeHtml(ann.secondaryCtaText || 'Register for KPL 5 Draft →')}</span>
                </a>
              </div>
              <p class="kpl-promo-disclaimer">
                * Note: KPL Season 5 draft is open to existing KAvach Cricket Club members. Non-members who register will be evaluated during trial sessions for club admission.
              </p>

            </div>

          </div>

        </div>`;
}

// Utility: Render FAQ HTML
function renderFaqHtml(faqs) {
  const itemsHtml = (faqs || []).map(faq => `
          <div class="faq-item">
            <button class="faq-question" aria-expanded="false">
              <span>${escapeHtml(faq.question)}</span>
              <svg class="faq-icon-arrow" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"></polyline></svg>
            </button>
            <div class="faq-answer">
              ${faq.answer.startsWith('<') ? faq.answer : `<p>${faq.answer}</p>`}
            </div>
          </div>`).join('\n');

  return `<div class="faq-accordion reveal">
${itemsHtml}
        </div>`;
}

function escapeHtml(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
}

// Utility: Inject updated sections into index.html
function updateIndexHtml(siteData) {
  let html = fs.readFileSync(INDEX_HTML_FILE, 'utf8');

  function replaceSection(startMarker, endMarker, newContent) {
    const startIdx = html.indexOf(startMarker);
    const endIdx = html.indexOf(endMarker);
    if (startIdx !== -1 && endIdx !== -1) {
      html = html.substring(0, startIdx + startMarker.length) +
             '\n' + newContent + '\n        ' +
             html.substring(endIdx);
    }
  }

  if (siteData.hero) {
    replaceSection('<!-- EDITABLE:HERO_START -->', '<!-- EDITABLE:HERO_END -->', renderHeroHtml(siteData.hero));
  }
  if (siteData.stats) {
    replaceSection('<!-- EDITABLE:STATS_START -->', '<!-- EDITABLE:STATS_END -->', renderStatsHtml(siteData.stats));
  }
  if (siteData.announcement) {
    replaceSection('<!-- EDITABLE:ANNOUNCEMENT_START -->', '<!-- EDITABLE:ANNOUNCEMENT_END -->', renderAnnouncementHtml(siteData.announcement));
  }
  if (siteData.faqs) {
    replaceSection('<!-- EDITABLE:FAQ_START -->', '<!-- EDITABLE:FAQ_END -->', renderFaqHtml(siteData.faqs));
  }

  createBackup(INDEX_HTML_FILE);
  fs.writeFileSync(INDEX_HTML_FILE, html, 'utf8');
}

// Utility: Read Trophies from JS
function getTrophies() {
  const code = fs.readFileSync(TROPHIES_DATA_FILE, 'utf8');
  const vm = require('vm');
  const sandbox = { window: {} };
  vm.createContext(sandbox);
  vm.runInContext(code + '\nsandbox_export = sandbox.window.TROPHY_COLLECTION || sandbox.TROPHY_COLLECTION || window.TROPHY_COLLECTION;', sandbox);
  return sandbox.sandbox_export || [];
}

// Utility: Save Trophies to JS
function saveTrophies(trophies) {
  createBackup(TROPHIES_DATA_FILE);
  const code = `/**
 * KAvach Cricket Club - Trophy Room Collection Data
 * Auto-generated by KAvach Admin CMS
 * Last Updated: ${new Date().toISOString()}
 */

window.TROPHY_COLLECTION = ${JSON.stringify(trophies, null, 2)};
var TROPHY_COLLECTION = window.TROPHY_COLLECTION;
`;
  fs.writeFileSync(TROPHIES_DATA_FILE, code, 'utf8');
}

// Create HTTP Server
const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;

  // Enable CORS for local convenience
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  // --- PUBLIC API ROUTES ---

  // Auth: Login with PIN
  if (pathname === '/api/login' && req.method === 'POST') {
    try {
      const { pin } = await parseJsonBody(req);
      const config = getConfig();
      const hash = crypto.createHash('sha256').update(String(pin).trim()).digest('hex');
      if (hash === config.pinHash) {
        const token = crypto.randomBytes(24).toString('hex');
        activeSessions.add(token);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, token }));
      } else {
        res.writeHead(401, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, message: 'Invalid Master PIN' }));
      }
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
    return;
  }

  // Auth: Check status
  if (pathname === '/api/status' && req.method === 'GET') {
    const auth = isAuthenticated(req);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ authenticated: auth, version: '1.0.0' }));
    return;
  }

  // Auth: Logout
  if (pathname === '/api/logout' && req.method === 'POST') {
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      const token = authHeader.replace(/^Bearer\s+/, '').trim();
      activeSessions.delete(token);
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // --- PROTECTED ROUTES ---
  if (pathname.startsWith('/api/')) {
    if (!isAuthenticated(req)) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Unauthorized. Please login.' }));
      return;
    }

    // Change PIN
    if (pathname === '/api/change-pin' && req.method === 'POST') {
      try {
        const { currentPin, newPin } = await parseJsonBody(req);
        const config = getConfig();
        const curHash = crypto.createHash('sha256').update(String(currentPin).trim()).digest('hex');
        if (curHash !== config.pinHash) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Current PIN incorrect' }));
          return;
        }
        config.pinHash = crypto.createHash('sha256').update(String(newPin).trim()).digest('hex');
        fs.writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2), 'utf8');
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'PIN updated successfully' }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    // Get Site Data
    if (pathname === '/api/site-data' && req.method === 'GET') {
      try {
        const data = fs.existsSync(SITE_DATA_FILE) ? JSON.parse(fs.readFileSync(SITE_DATA_FILE, 'utf8')) : {};
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    // Save Site Data
    if (pathname === '/api/site-data' && req.method === 'POST') {
      try {
        const newSiteData = await parseJsonBody(req);
        createBackup(SITE_DATA_FILE);
        fs.writeFileSync(SITE_DATA_FILE, JSON.stringify(newSiteData, null, 2), 'utf8');
        updateIndexHtml(newSiteData);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Website content updated and synced to index.html' }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    // Get Trophies
    if (pathname === '/api/trophies' && req.method === 'GET') {
      try {
        const trophies = getTrophies();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(trophies));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    // Save Trophies
    if (pathname === '/api/trophies' && req.method === 'POST') {
      try {
        const { trophies } = await parseJsonBody(req);
        if (!Array.isArray(trophies)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Trophies must be an array' }));
          return;
        }
        saveTrophies(trophies);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Trophies updated successfully in trophies-data.js' }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    // Upload & Save WebP Image
    if (pathname === '/api/upload-image' && req.method === 'POST') {
      try {
        const { filename, base64Data, isHero } = await parseJsonBody(req);
        if (!filename || !base64Data) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'filename and base64Data are required' }));
          return;
        }

        // Clean filename
        const cleanName = filename.toLowerCase().replace(/[^a-z0-9-_]/g, '-').replace(/-+/g, '-');
        const targetFilename = cleanName.endsWith('.webp') ? cleanName : `${cleanName}.webp`;
        const targetPath = path.join(ASSETS_IMAGES_DIR, targetFilename);

        // Strip data:image/...;base64, prefix
        const base64Clean = base64Data.replace(/^data:image\/[a-z0-9-+.]+;base64,/, '');
        const buffer = Buffer.from(base64Clean, 'base64');

        fs.writeFileSync(targetPath, buffer);
        console.log(`Saved WebP image: ${targetPath} (${buffer.length} bytes)`);

        const relativePath = `./assets/images/${targetFilename}`;
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          path: relativePath,
          size: buffer.length
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    // List Backups
    if (pathname === '/api/backups' && req.method === 'GET') {
      try {
        const files = fs.readdirSync(BACKUPS_DIR)
          .filter(f => f.endsWith('.bak'))
          .map(f => {
            const stats = fs.statSync(path.join(BACKUPS_DIR, f));
            return {
              name: f,
              size: stats.size,
              date: stats.mtime
            };
          })
          .sort((a, b) => new Date(b.date) - new Date(a.date));

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(files));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    // Restore Backup
    if (pathname === '/api/restore' && req.method === 'POST') {
      try {
        const { backupName } = await parseJsonBody(req);
        const sourcePath = path.join(BACKUPS_DIR, backupName);
        if (!fs.existsSync(sourcePath)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Backup not found' }));
          return;
        }

        // Determine destination by matching prefix
        let destPath;
        if (backupName.startsWith('index.html')) destPath = INDEX_HTML_FILE;
        else if (backupName.startsWith('trophies-data.js')) destPath = TROPHIES_DATA_FILE;
        else if (backupName.startsWith('site-data.json')) destPath = SITE_DATA_FILE;
        else {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Unknown backup target' }));
          return;
        }

        fs.copyFileSync(sourcePath, destPath);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: `Restored ${backupName}` }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: err.message }));
      }
      return;
    }

    // Deploy to S3 via deploy.sh with Server-Sent Events (SSE)
    if (pathname === '/api/deploy' && req.method === 'POST') {
      const { commitMessage } = await parseJsonBody(req);
      const msg = commitMessage || 'Update website content via Admin CMS';

      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });

      const sendLog = (data, isError = false) => {
        res.write(`data: ${JSON.stringify({ text: data, isError })}\n\n`);
      };

      sendLog(`Starting deployment script ./deploy.sh with message: "${msg}"...`);

      const deployProcess = spawn(path.join(ROOT_DIR, 'deploy.sh'), [msg], {
        cwd: ROOT_DIR,
        shell: true
      });

      deployProcess.stdout.on('data', data => {
        sendLog(data.toString());
      });

      deployProcess.stderr.on('data', data => {
        sendLog(data.toString(), true);
      });

      deployProcess.on('close', code => {
        if (code === 0) {
          sendLog(`✅ Deployment finished successfully!`);
          res.write(`data: ${JSON.stringify({ finished: true, success: true })}\n\n`);
        } else {
          sendLog(`❌ Deployment failed with exit code ${code}`, true);
          res.write(`data: ${JSON.stringify({ finished: true, success: false, code })}\n\n`);
        }
        res.end();
      });

      return;
    }
  }

  // --- STATIC FILES SERVING ---

  // Serve Admin UI
  if (pathname === '/' || pathname === '/index.html') {
    serveFile(res, path.join(ADMIN_DIR, 'public', 'index.html'), 'text/html');
    return;
  }
  if (pathname === '/admin.css') {
    serveFile(res, path.join(ADMIN_DIR, 'public', 'admin.css'), 'text/css');
    return;
  }
  if (pathname === '/admin.js') {
    serveFile(res, path.join(ADMIN_DIR, 'public', 'admin.js'), 'application/javascript');
    return;
  }

  // Serve Local Website Preview
  if (pathname === '/preview' || pathname === '/preview/') {
    serveFile(res, INDEX_HTML_FILE, 'text/html');
    return;
  }
  if (pathname === '/preview/trophies') {
    serveFile(res, path.join(ROOT_DIR, 'trophies.html'), 'text/html');
    return;
  }

  // Serve Assets
  if (pathname.startsWith('/assets/') || pathname.startsWith('/preview/assets/')) {
    const cleanPath = pathname.replace('/preview', '');
    const filePath = path.join(ROOT_DIR, cleanPath);
    serveFile(res, filePath);
    return;
  }

  // Fallback 404
  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

// Utility: Serve static file
function serveFile(res, filePath, forcedContentType = null) {
  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('File Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.webp': 'image/webp',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.svg': 'image/svg+xml',
    '.woff2': 'font/woff2',
    '.woff': 'font/woff',
    '.ttf': 'font/ttf'
  };

  const contentType = forcedContentType || mimeTypes[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
}

// Start Server
server.listen(PORT, HOST, () => {
  console.log(`🏏 ========================================================`);
  console.log(`   KAvach Cricket Club - Local Admin Control Room`);
  console.log(`   URL: http://${HOST}:${PORT}`);
  console.log(`   Default Master PIN: kavach2026`);
  console.log(`   Bound to local interface only (${HOST})`);
  console.log(`==========================================================`);
});
