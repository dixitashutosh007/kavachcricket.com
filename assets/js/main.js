/**
 * KAvach Cricket Club - Main JavaScript (V2 Refined)
 * Interactivity: Sub-menus, Mobile Accordion Navigation, 2-Path Journey Switcher,
 * Contact Tab Switcher, Animated Number Counters, FAQ Accordions, Lightbox,
 * and Trial Booking Slot Handler.
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
    const isOpen = drawer.classList.toggle('active');
    toggleBtn.classList.toggle('open', isOpen);
    toggleBtn.setAttribute('aria-expanded', isOpen);
    document.body.style.overflow = isOpen ? 'hidden' : '';
  };

  toggleBtn.addEventListener('click', toggleDrawer);

  // Mobile Accordion Items
  const accordionHeaders = drawer.querySelectorAll('.mobile-nav-header');
  accordionHeaders.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const parent = btn.closest('.mobile-nav-item');
      if (!parent) return;

      const wasOpen = parent.classList.contains('open');

      // Close other mobile accordion items
      drawer.querySelectorAll('.mobile-nav-item').forEach(item => {
        if (item !== parent) item.classList.remove('open');
      });

      parent.classList.toggle('open', !wasOpen);
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
   Sticky Header on Scroll
   -------------------------------------------------------------------------- */
function initHeaderScroll() {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const onScroll = () => {
    if (window.scrollY > 30) {
      header.classList.add('scrolled');
    } else {
      header.classList.remove('scrolled');
    }
  };

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
}

/* --------------------------------------------------------------------------
   Scroll Reveal with IntersectionObserver
   -------------------------------------------------------------------------- */
function initScrollReveal() {
  const reveals = document.querySelectorAll('.reveal');
  if (!reveals.length) return;

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('revealed');
          obs.unobserve(entry.target);
        }
      });
    }, {
      rootMargin: '0px 0px -40px 0px',
      threshold: 0.12
    });

    reveals.forEach(el => observer.observe(el));
  } else {
    reveals.forEach(el => el.classList.add('revealed'));
  }
}

/* --------------------------------------------------------------------------
   Animated Number Counters
   -------------------------------------------------------------------------- */
function initAnimatedCounters() {
  const statNumbers = document.querySelectorAll('.stat-number');
  if (!statNumbers.length) return;

  const animateCount = (el) => {
    const target = parseInt(el.getAttribute('data-target'), 10);
    if (isNaN(target)) return;

    // Reset to 0 only when script execution and observer confirm viewport entrance
    el.textContent = '0';

    const duration = 1800; // ms
    const stepTime = 25; // ms
    const totalSteps = duration / stepTime;
    const increment = target / totalSteps;
    let current = 0;

    const timer = setInterval(() => {
      current += increment;
      if (current >= target) {
        el.textContent = target;
        clearInterval(timer);
      } else {
        el.textContent = Math.floor(current);
      }
    }, stepTime);
  };

  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver((entries, obs) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCount(entry.target);
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });

    statNumbers.forEach(num => observer.observe(num));
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

      tabBtns.forEach(b => b.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const activePanel = document.getElementById(`path-${targetPath}`);
      if (activePanel) activePanel.classList.add('active');
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

      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanels.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const activePanel = document.getElementById(`contact-tab-${targetTab}`);
      if (activePanel) activePanel.classList.add('active');
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
    modalImg.src = src;
    modalImg.alt = alt || 'KAvach Cricket Club Gallery Photo';
    modalBackdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    modalBackdrop.classList.remove('active');
    document.body.style.overflow = '';
    modalImg.src = '';
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
   Back to Top Button
   -------------------------------------------------------------------------- */
function initBackToTop() {
  const backBtn = document.getElementById('backToTop');
  if (!backBtn) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 400) {
      backBtn.classList.add('visible');
    } else {
      backBtn.classList.remove('visible');
    }
  }, { passive: true });

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
   -------------------------------------------------------------------------- */
function initActionDropdowns() {
  const dropdowns = document.querySelectorAll('.contact-action-dropdown');
  if (!dropdowns.length) return;

  const closeAll = () => {
    dropdowns.forEach(dd => {
      dd.classList.remove('active');
      const btn = dd.querySelector('.dropdown-action-btn');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    });
  };

  dropdowns.forEach(dd => {
    const btn = dd.querySelector('.dropdown-action-btn');
    if (!btn) return;

    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const isActive = dd.classList.contains('active');
      closeAll();
      if (!isActive) {
        dd.classList.add('active');
        btn.setAttribute('aria-expanded', 'true');
      }
    });

    const items = dd.querySelectorAll('.action-dropdown-item');
    items.forEach(item => {
      item.addEventListener('click', () => {
        closeAll();
      });
    });
  });

  // Close when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.contact-action-dropdown')) {
      closeAll();
    }
  });

  // Close on Escape key press and restore focus to trigger
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const activeDd = document.querySelector('.contact-action-dropdown.active');
      if (activeDd) {
        const btn = activeDd.querySelector('.dropdown-action-btn');
        closeAll();
        if (btn) btn.focus();
      }
    }
  });
}
