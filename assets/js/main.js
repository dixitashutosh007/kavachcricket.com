/**
 * KAvach Cricket Club - Main JavaScript (V2 Performance Optimized)
 * Interactivity: Sub-menus, Mobile Accordion Navigation, 2-Path Journey Switcher,
 * Contact Tab Switcher, Animated Number Counters, FAQ Accordions, Lightbox,
 * Trial Booking Slot Handler, and Multi-Channel Action Dropdowns.
 * 
 * Performance:
 * - Batched DOM reads before DOM writes.
 * - All DOM writes scheduled inside requestAnimationFrame() to eliminate layout thrashing.
 * - Passive scroll listeners with rAF throttling.
 */

document.addEventListener('DOMContentLoaded', () => {
  initMobileNav();
  initHeaderScroll();
  initScrollReveal();
  initAnimatedCounters();
  initPathSwitcher();
  initContactTabs();
  initFaqAccordion();
  initGalleryModal();
  initBackToTop();
  initTrialForm();
  initActionDropdowns();
});

/* --------------------------------------------------------------------------
   Mobile Navigation Drawer with Sub-menu Accordions
   -------------------------------------------------------------------------- */
function initMobileNav() {
  const toggleBtn = document.getElementById('mobileToggle');
  const drawer = document.getElementById('mobileNavDrawer');
  if (!toggleBtn || !drawer) return;

  const toggleDrawer = () => {
    // DOM Read
    const willOpen = !drawer.classList.contains('active');

    // DOM Writes batched inside requestAnimationFrame
    requestAnimationFrame(() => {
      drawer.classList.toggle('active', willOpen);
      toggleBtn.classList.toggle('open', willOpen);
      toggleBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      document.body.style.overflow = willOpen ? 'hidden' : '';
    });
  };

  toggleBtn.addEventListener('click', toggleDrawer);

  // Mobile Accordion Items
  const accordionHeaders = drawer.querySelectorAll('.mobile-nav-header');
  accordionHeaders.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const parent = btn.closest('.mobile-nav-item');
      if (!parent) return;

      // DOM Read
      const wasOpen = parent.classList.contains('open');
      const otherItems = Array.from(drawer.querySelectorAll('.mobile-nav-item')).filter(item => item !== parent);

      // DOM Writes batched inside requestAnimationFrame
      requestAnimationFrame(() => {
        otherItems.forEach(item => item.classList.remove('open'));
        parent.classList.toggle('open', !wasOpen);
      });
    });
  });

  // Close drawer when clicking any direct link or sub-link
  const closeLinks = drawer.querySelectorAll('.mobile-sub-link, .mobile-direct-link');
  closeLinks.forEach(link => {
    link.addEventListener('click', () => {
      if (drawer.classList.contains('active')) {
        toggleDrawer();
      }
    });
  });
}

/* --------------------------------------------------------------------------
   Sticky Header on Scroll (Zero Forced Reflows via IntersectionObserver)
   -------------------------------------------------------------------------- */
function initHeaderScroll() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  if ('IntersectionObserver' in window) {
    const sentinel = document.getElementById('header-sentinel');
    if (sentinel) {
      const observer = new IntersectionObserver(([entry]) => {
        const isScrolled = !entry.isIntersecting;
        requestAnimationFrame(() => {
          header.classList.toggle('scrolled', isScrolled);
        });
      }, { threshold: 0 });

      observer.observe(sentinel);
    }
  } else {
    // Fallback for legacy browsers without IntersectionObserver
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const isScrolled = (window.pageYOffset || document.documentElement.scrollTop || 0) > 30;
          header.classList.toggle('scrolled', isScrolled);
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }
}

/* --------------------------------------------------------------------------
   Scroll Reveal with IntersectionObserver (Asynchronous, Zero Reflows)
   -------------------------------------------------------------------------- */
function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal');
  if (!reveals.length) return;

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          requestAnimationFrame(() => {
            entry.target.classList.add('revealed');
          });
          obs.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '0px 0px -40px 0px',
      threshold: 0.12
    });

    reveals.forEach(el => observer.observe(el));
  } else {
    requestAnimationFrame(() => {
      reveals.forEach(el => el.classList.add('revealed'));
    });
  }
}

/* --------------------------------------------------------------------------
   Animated Number Counters (60fps rAF Animation, Zero Layout Thrashing)
   -------------------------------------------------------------------------- */
function initAnimatedCounters() {
  const statNumbers = document.querySelectorAll('.stat-number');
  if (!statNumbers.length) return;

  const animateCount = (el) => {
    const target = parseInt(el.getAttribute('data-target'), 10);
    if (isNaN(target)) return;

    let startTimestamp = null;
    const duration = 1600; // ms

    const step = (timestamp) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      // Cubic ease-out
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const current = Math.floor(easeOut * target);

      el.textContent = current;

      if (progress < 1) {
        requestAnimationFrame(step);
      } else {
        el.textContent = target;
      }
    };

    requestAnimationFrame(step);
  };

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.5 });

    const startObserving = () => {
      statNumbers.forEach(num => observer.observe(num));
    };

    if ('requestIdleCallback' in window) {
      requestIdleCallback(startObserving);
    } else {
      setTimeout(startObserving, 200);
    }
  }
}

/* --------------------------------------------------------------------------
   Two Paths of Joining Switcher (Path A vs Path B)
   -------------------------------------------------------------------------- */
function initPathSwitcher() {
  const tabBtns = document.querySelectorAll('.path-tab-btn');
  const panels = document.querySelectorAll('.path-content-panel');
  if (!tabBtns.length || !panels.length) return;

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetPath = btn.getAttribute('data-path');
      const activePanel = document.getElementById(`path-${targetPath}`);

      requestAnimationFrame(() => {
        tabBtns.forEach(b => b.classList.remove('active'));
        panels.forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        if (activePanel) activePanel.classList.add('active');
      });
    });
  });
}

/* --------------------------------------------------------------------------
   Contact Tabs Switcher (Trial Form vs Jotform Embed)
   -------------------------------------------------------------------------- */
function initContactTabs() {
  const tabBtns = document.querySelectorAll('.contact-tab-btn');
  const tabPanels = document.querySelectorAll('.contact-tab-panel');
  if (!tabBtns.length || !tabPanels.length) return;

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      const activePanel = document.getElementById(`contact-tab-${targetTab}`);

      requestAnimationFrame(() => {
        tabBtns.forEach(b => b.classList.remove('active'));
        tabPanels.forEach(p => p.classList.remove('active'));

        btn.classList.add('active');
        if (activePanel) activePanel.classList.add('active');
      });
    });
  });
}

/* --------------------------------------------------------------------------
   FAQ Accordions
   -------------------------------------------------------------------------- */
function initFaqAccordion() {
  const faqItems = document.querySelectorAll('.faq-item');
  if (!faqItems.length) return;

  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');
    if (!questionBtn) return;

    questionBtn.addEventListener('click', () => {
      const isActive = item.classList.contains('active');

      requestAnimationFrame(() => {
        // Close others
        faqItems.forEach(other => {
          if (other !== item) {
            other.classList.remove('active');
            const otherBtn = other.querySelector('.faq-question');
            if (otherBtn) otherBtn.setAttribute('aria-expanded', 'false');
          }
        });

        // Toggle current
        item.classList.toggle('active', !isActive);
        questionBtn.setAttribute('aria-expanded', !isActive ? 'true' : 'false');
      });
    });
  });
}

/* --------------------------------------------------------------------------
   Gallery Lightbox Modal
   -------------------------------------------------------------------------- */
function initGalleryModal() {
  const galleryItems = document.querySelectorAll('.gallery-item');
  const modalBackdrop = document.getElementById('galleryModal');
  const modalImg = document.getElementById('modalImage');
  const closeBtn = document.getElementById('modalClose');

  if (!galleryItems.length || !modalBackdrop || !modalImg) return;

  const openModal = (src, alt) => {
    requestAnimationFrame(() => {
      modalImg.src = src;
      modalImg.alt = alt || 'KAvach Cricket Club Gallery Photo';
      modalBackdrop.classList.add('active');
      document.body.style.overflow = 'hidden';
    });
  };

  const closeModal = () => {
    requestAnimationFrame(() => {
      modalBackdrop.classList.remove('active');
      document.body.style.overflow = '';
      modalImg.src = '';
    });
  };

  galleryItems.forEach(item => {
    item.addEventListener('click', () => {
      const img = item.querySelector('img');
      if (img) openModal(img.src, img.alt);
    });
  });

  if (closeBtn) closeBtn.addEventListener('click', closeModal);

  modalBackdrop.addEventListener('click', (e) => {
    if (e.target === modalBackdrop) closeModal();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && modalBackdrop.classList.contains('active')) {
      closeModal();
    }
  });
}

/* --------------------------------------------------------------------------
   Back to Top Button (IntersectionObserver, Zero Forced Reflows)
   -------------------------------------------------------------------------- */
function initBackToTop() {
  const backBtn = document.getElementById('backToTop');
  if (!backBtn) return;

  if ('IntersectionObserver' in window) {
    const sentinel = document.getElementById('backtotop-sentinel');
    if (sentinel) {
      const observer = new IntersectionObserver(([entry]) => {
        const isVisible = !entry.isIntersecting;
        requestAnimationFrame(() => {
          backBtn.classList.toggle('visible', isVisible);
        });
      }, { threshold: 0 });

      observer.observe(sentinel);
    }
  } else {
    let ticking = false;
    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(() => {
          const isVisible = (window.pageYOffset || document.documentElement.scrollTop || 0) > 400;
          backBtn.classList.toggle('visible', isVisible);
          ticking = false;
        });
        ticking = true;
      }
    }, { passive: true });
  }

  backBtn.addEventListener('click', (e) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* --------------------------------------------------------------------------
   "Book Your Trial Practice Session" Form Handler
   Slots: Tuesday to Friday mornings (7:00 AM, 7:30 AM, 8:00 AM)
   -------------------------------------------------------------------------- */
function initTrialForm() {
  const form = document.getElementById('trialBookingForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = form.querySelector('[name="name"]').value.trim();
    const phone = form.querySelector('[name="phone"]').value.trim();
    const area = form.querySelector('[name="area"]').value.trim();
    const skill = form.querySelector('[name="skill"]').value;
    const day = form.querySelector('[name="day"]').value;
    const time = form.querySelector('[name="time"]').value;
    const notes = form.querySelector('[name="notes"]').value.trim();

    if (!name || !phone || !area || !day || !time) {
      alert('Please fill out all required fields.');
      return;
    }

    // Format clean WhatsApp message
    const msg = 
`🏏 *Trial Practice Session Request - KAvach Cricket Club*
Hi Veer, I would like to book a trial practice session at Play Arena:

*Name:* ${name}
*Phone/WhatsApp:* ${phone}
*Area in Bangalore:* ${area}
*Skill Level (Leather Ball):* ${skill}
*Preferred Morning Day:* ${day}
*Preferred Morning Slot:* ${time}
${notes ? `*Notes / CricHeroes:* ${notes}` : ''}

Looking forward to confirmation!`;

    const encoded = encodeURIComponent(msg);
    const whatsappUrl = `https://wa.me/918296211687?text=${encoded}`;

    window.open(whatsappUrl, '_blank');
  });
}

// Window load anchor realignment to ensure accurate sticky nav clearance
window.addEventListener('load', () => {
  if (window.location.hash) {
    const target = document.querySelector(window.location.hash);
    if (target) {
      setTimeout(() => {
        target.scrollIntoView({ behavior: 'smooth' });
      }, 120);
    }
  }
});

/* --------------------------------------------------------------------------
   Golden Setup: Multi-Channel Action Dropdown Controller
   Strictly batches all DOM reads BEFORE executing DOM writes inside rAF
   -------------------------------------------------------------------------- */
function initActionDropdowns() {
  const dropdowns = document.querySelectorAll('.contact-action-dropdown');
  if (!dropdowns.length) return;

  const closeAll = () => {
    document.querySelectorAll('.has-active-dropdown').forEach(el => {
      el.classList.remove('has-active-dropdown');
    });
    dropdowns.forEach(dd => {
      dd.classList.remove('active', 'dropup');
      const btn = dd.querySelector('.dropdown-action-btn');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    });
  };

  dropdowns.forEach(dd => {
    const btn = dd.querySelector('.dropdown-action-btn');
    if (!btn) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();

      // --- PHASE 1: STRICT DOM READS FIRST (no prior write operations) ---
      const isActive = dd.classList.contains('active');
      const menu = dd.querySelector('.action-dropdown-menu');
      const rect = btn.getBoundingClientRect();
      const menuHeight = menu ? (menu.offsetHeight || 230) : 230;
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const shouldDropup = spaceBelow < menuHeight + 20 && spaceAbove > menuHeight;

      // Identify parents to elevate in read phase
      const parentsToElevate = [];
      let parent = dd.parentElement;
      while (parent && parent !== document.body) {
        if (
          parent.tagName === 'SECTION' ||
          parent.tagName === 'HEADER' ||
          parent.tagName === 'FOOTER' ||
          parent.classList.contains('section') ||
          parent.classList.contains('hero') ||
          parent.classList.contains('path-content-panel') ||
          parent.classList.contains('two-paths-container') ||
          parent.classList.contains('policy-agreement-card') ||
          parent.classList.contains('youth-scholarship-card') ||
          parent.classList.contains('reveal')
        ) {
          parentsToElevate.push(parent);
        }
        parent = parent.parentElement;
      }

      // --- PHASE 2: BATCHED DOM WRITES IN requestAnimationFrame ---
      requestAnimationFrame(() => {
        closeAll();

        if (!isActive) {
          dd.classList.toggle('dropup', shouldDropup);
          dd.classList.add('active');
          btn.setAttribute('aria-expanded', 'true');

          parentsToElevate.forEach(p => p.classList.add('has-active-dropdown'));
        }
      });
    });

    const items = dd.querySelectorAll('.action-dropdown-item');
    items.forEach(item => {
      item.addEventListener('click', () => {
        requestAnimationFrame(closeAll);
      });
    });
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.contact-action-dropdown')) {
      requestAnimationFrame(closeAll);
    }
  });

  // Close on Escape key press and restore focus to trigger
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const activeDd = document.querySelector('.contact-action-dropdown.active');
      if (activeDd) {
        const btn = activeDd.querySelector('.dropdown-action-btn');
        requestAnimationFrame(() => {
          closeAll();
          if (btn) btn.focus();
        });
      }
    }
  });
}
