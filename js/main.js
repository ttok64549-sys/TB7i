/* ============================================================
   THE BLACK STUDIO — main.js
   Now reads content saved by admin.html (localStorage)
   ============================================================ */
(function () {
  'use strict';
  console.log('%c[TBS] main.js loaded', 'color:#FF4500;font-weight:bold');

  /* ---------- SAFE RUNNER ---------- */
  function safe(name, fn) {
    try { fn(); } catch (e) { console.warn('[TBS] "' + name + '" failed:', e); }
  }

  /* ---------- SAFE STORAGE READ ---------- */
  function read(key, fallback) {
    try {
      var v = localStorage.getItem(key);
      if (!v) return fallback;
      return JSON.parse(v);
    } catch (e) { return fallback; }
  }

  /* ==========================================================
     1. PRELOADER
     ========================================================== */
  function hidePreloader() {
    var p = document.getElementById('preloader');
    if (!p || p.classList.contains('hidden')) return;
    p.classList.add('hidden');
  }
  if (document.readyState === 'complete' || document.readyState === 'interactive') setTimeout(hidePreloader, 300);
  window.addEventListener('load', function () { setTimeout(hidePreloader, 300); });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(hidePreloader, 300); });
  }
  setTimeout(hidePreloader, 1500);
  ['click', 'touchstart', 'keydown', 'scroll'].forEach(function (evt) {
    window.addEventListener(evt, hidePreloader, { once: true, passive: true });
  });

  /* ==========================================================
     2. HERO OVERRIDE (from admin)
     ========================================================== */
  safe('heroOverride', function () {
    var hero = read('tbs_hero', null);
    if (!hero) return;

    var badge = document.querySelector('.hero .badge');
    var title = document.querySelector('.hero h1');
    var lead = document.querySelector('.hero p.lead');
    var actions = document.querySelector('.hero-actions');

    if (badge && hero.badge) badge.textContent = hero.badge;

    if (title && hero.title) {
      // Last word gets the .glitch highlight
      var words = hero.title.trim().split(/\s+/);
      if (words.length > 1) {
        var last = words.pop();
        title.innerHTML = words.join(' ') + ' <span class="glitch">' + last + '</span>';
      } else {
        title.textContent = hero.title;
      }
    }

    if (lead && hero.lead) {
      // Preserve the typewriter span if it exists
      var tw = lead.querySelector('[data-typewriter]');
      if (tw) {
        lead.childNodes[0].nodeValue = hero.lead + ' ';
      } else {
        lead.textContent = hero.lead;
      }
    }

    if (actions && (hero.cta1Text || hero.cta2Text)) {
      var html = '';
      if (hero.cta1Text) html += '<a href="' + (hero.cta1Link || '#') + '" class="btn btn-primary">' + hero.cta1Text + '</a>';
      if (hero.cta2Text) html += '<a href="' + (hero.cta2Link || '#') + '" class="btn btn-ghost">' + hero.cta2Text + '</a>';
      if (html) actions.innerHTML = html;
    }
    console.log('[TBS] Hero overridden from admin');
  });

  /* ==========================================================
     3. NAV OVERRIDE (from admin)
     ========================================================== */
  safe('navOverride', function () {
    var nav = read('tbs_nav', []);
    if (!nav.length) return;
    var navEl = document.getElementById('mainNav');
    if (!navEl) return;

    var currentPath = window.location.pathname.split('/').pop() || 'index.html';
    navEl.innerHTML = nav.map(function (link, i) {
      var cls = 'nav-link' + (i === nav.length - 1 ? ' nav-cta' : '');
      var isActive = link.href === currentPath || (currentPath === '' && link.href === 'index.html');
      return '<a href="' + link.href + '" class="' + cls + (isActive ? ' active' : '') + '">' + link.label + '</a>';
    }).join('');
    console.log('[TBS] Nav overridden — ' + nav.length + ' links');
  });

  /* ==========================================================
     4. POSTS OVERRIDE (from admin)
     Looks for [data-tbs-posts] containers
     ========================================================== */
  safe('postsOverride', function () {
    var posts = read('tbs_posts', []);
    var containers = document.querySelectorAll('[data-tbs-posts]');
    if (!posts.length || !containers.length) return;

    var limit = containers[0].dataset.tbsPosts || 'all';
    var list = limit === 'all' ? posts : posts.slice(0, parseInt(limit, 10));

    var html = list.map(function (p) {
      var cat = p.category || 'devlog';
      var meta = p.meta || 'Update';
      return '<article class="news-card reveal" data-category="' + cat + '">' +
        (p.image
          ? '<div class="news-thumb"><img src="' + p.image + '" alt="" loading="lazy" onerror="this.style.display=\'none\'"></div>'
          : '') +
        '<div class="news-body">' +
          '<span class="news-date">' + meta + '</span>' +
          '<h3>' + p.title + '</h3>' +
          '<p>' + (p.excerpt || '') + '</p>' +
          (p.body ? '<button class="link-more" type="button" data-modal="post-' + p.id + '">Read More →</button>' : '') +
        '</div>' +
      '</article>';
    }).join('');

    containers.forEach(function (c) { c.innerHTML = html; });

    // Inject hidden full-post content for modal reading
    var hidden = document.getElementById('tbsHiddenPosts');
    if (!hidden) {
      hidden = document.createElement('div');
      hidden.id = 'tbsHiddenPosts';
      hidden.style.display = 'none';
      document.body.appendChild(hidden);
    }
    hidden.innerHTML = posts.map(function (p) {
      var bodyHtml = (p.body || '').split(/\n\n+/).map(function (para) {
        return '<p>' + para + '</p>';
      }).join('');
      return '<div id="post-' + p.id + '" data-title="' + (p.title || '').replace(/"/g, '&quot;') + '" data-meta="' + (p.meta || '') + '">' + bodyHtml + '</div>';
    }).join('');

    console.log('[TBS] Posts overridden — ' + list.length + ' posts injected');
  });

  /* ==========================================================
     5. GALLERY OVERRIDE (from admin)
     Looks for [data-tbs-gallery] containers
     ========================================================== */
  safe('galleryOverride', function () {
    var gallery = read('tbs_gallery', []);
    var el = document.querySelector('[data-tbs-gallery]');
    if (!gallery.length || !el) return;

    el.innerHTML = gallery.map(function (g) {
      return '<figure class="gallery-item reveal" data-category="' + (g.category || 'screenshots') + '" ' +
        'data-lightbox="' + g.src + '" data-caption="' + (g.caption || '').replace(/"/g, '&quot;') + '">' +
        '<img src="' + g.src + '" alt="' + (g.caption || '').replace(/"/g, '&quot;') + '" loading="lazy">' +
        '<figcaption>' + (g.caption || '') + '</figcaption>' +
      '</figure>';
    }).join('');
    console.log('[TBS] Gallery overridden — ' + gallery.length + ' images');
  });

  /* ==========================================================
     6. SECTIONS OVERRIDE (from admin)
     Looks for [data-tbs-sections] containers
     ========================================================== */
  safe('sectionsOverride', function () {
    var sections = read('tbs_sections', []);
    var el = document.querySelector('[data-tbs-sections]');
    if (!sections.length || !el) return;

    el.innerHTML = sections.map(function (s) {
      var cls = s.container || 'section';
      var isCta = s.type === 'cta' || s.container === 'cta-band';
      var html = '<section class="' + cls + '"><div class="container">';

      if (isCta) {
        html += '<div class="inner" style="text-align:center">';
        html += '<span class="eyebrow">// Custom</span>';
        html += '<h2>' + s.heading + '</h2>';
        if (s.body) html += '<p style="color:#9a9a9a;max-width:560px;margin:1rem auto 2rem">' + s.body + '</p>';
        if (s.btnText) html += '<a href="' + (s.btnLink || '#') + '" class="btn btn-primary">' + s.btnText + '</a>';
        html += '</div>';
      } else {
        html += '<div class="section-head">';
        html += '<span class="eyebrow">// Custom</span>';
        html += '<h2>' + s.heading + '</h2>';
        if (s.body) html += '<p>' + s.body + '</p>';
        html += '</div>';
        if (s.btnText) html += '<a href="' + (s.btnLink || '#') + '" class="btn btn-primary">' + s.btnText + '</a>';
      }

      html += '</div></section>';
      return html;
    }).join('');
    console.log('[TBS] Sections overridden — ' + sections.length + ' sections');
  });

  /* ==========================================================
     7. SCROLL PROGRESS
     ========================================================== */
  safe('scrollProgress', function () {
    var progress = document.getElementById('scrollProgress');
    if (!progress) return;
    function update() {
      var sy = window.pageYOffset || document.documentElement.scrollTop || 0;
      var max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.width = (max > 0 ? (sy / max) * 100 : 0) + '%';
    }
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);
    update();
  });

  /* ==========================================================
     8. STICKY HEADER + BACK TO TOP
     ========================================================== */
  safe('header + backTop', function () {
    var header = document.getElementById('siteHeader');
    var backTop = document.getElementById('backTop');
    function update() {
      var sy = window.pageYOffset || document.documentElement.scrollTop || 0;
      if (header) header.classList.toggle('scrolled', sy > 40);
      if (backTop) backTop.classList.toggle('show', sy > 500);
    }
    window.addEventListener('scroll', update, { passive: true });
    update();
    if (backTop) backTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  /* ==========================================================
     9. MOBILE NAV
     ========================================================== */
  safe('mobileNav', function () {
    var toggle = document.getElementById('navToggle');
    var nav = document.getElementById('mainNav');
    if (!toggle || !nav) return;
    function setOpen(open) {
      toggle.classList.toggle('open', open);
      nav.classList.toggle('open', open);
      document.body.style.overflow = open ? 'hidden' : '';
    }
    toggle.addEventListener('click', function () {
      setOpen(!nav.classList.contains('open'));
    });
    nav.addEventListener('click', function (e) {
      if (e.target.tagName === 'A') setOpen(false);
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false);
    });
  });

  /* ==========================================================
     10. REVEAL ON SCROLL — with re-scan
     ========================================================== */
  function initReveal() {
    var els = document.querySelectorAll('.reveal:not(.visible)');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('visible'); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          io.unobserve(entry.target);
        }
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -60px 0px' });
    els.forEach(function (el) { io.observe(el); });
  }
  safe('revealOnScroll', initReveal);

  /* ==========================================================
     11. COUNTERS
     ========================================================== */
  safe('counters', function () {
    var counters = document.querySelectorAll('[data-count]:not([data-done])');
    if (!counters.length) return;
    if (!('IntersectionObserver' in window)) {
      counters.forEach(function (c) {
        c.textContent = c.dataset.count + (c.dataset.suffix || '');
        c.setAttribute('data-done', '1');
      });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.setAttribute('data-done', '1');
        var target = parseFloat(el.dataset.count) || 0;
        var suffix = el.dataset.suffix || '';
        var start = null;
        function step(now) {
          if (!start) start = now;
          var p = Math.min((now - start) / 1500, 1);
          var eased = 1 - Math.pow(1 - p, 3);
          el.textContent = Math.floor(target * eased) + suffix;
          if (p < 1) requestAnimationFrame(step); else el.textContent = target + suffix;
        }
        requestAnimationFrame(step);
        io.unobserve(el);
      });
    }, { threshold: 0.5 });
    counters.forEach(function (c) { io.observe(c); });
  });

  /* ==========================================================
     12. EMBER CANVAS
     ========================================================== */
  safe('emberCanvas', function () {
    var canvas = document.getElementById('emberCanvas');
    if (!canvas) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    var ctx = canvas.getContext('2d');
    if (!ctx) return;
    var particles = [], w = 0, h = 0, rafId = null;
    function create() {
      return {
        x: Math.random() * w, y: Math.random() * h,
        r: Math.random() * 1.8 + 0.4,
        vy: -(Math.random() * 0.45 + 0.12),
        vx: (Math.random() - 0.5) * 0.25,
        a: Math.random() * 0.6 + 0.15
      };
    }
    function resize() {
      w = canvas.width = canvas.offsetWidth || window.innerWidth;
      h = canvas.height = canvas.offsetHeight || window.innerHeight;
      var count = Math.min(90, Math.max(20, Math.floor(w / 16)));
      particles = [];
      for (var i = 0; i < count; i++) particles.push(create());
    }
    function draw() {
      ctx.clearRect(0, 0, w, h);
      for (var i = 0; i < particles.length; i++) {
        var p = particles[i];
        p.x += p.vx; p.y += p.vy;
        if (p.y < -10) { p.y = h + 10; p.x = Math.random() * w; }
        var g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
        g.addColorStop(0, 'rgba(255,90,20,' + p.a + ')');
        g.addColorStop(1, 'rgba(255,90,20,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2);
        ctx.fill();
      }
      rafId = requestAnimationFrame(draw);
    }
    resize();
    draw();
    window.addEventListener('resize', resize);
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) { if (rafId) cancelAnimationFrame(rafId); rafId = null; }
      else if (!rafId) draw();
    });
  });

  /* ==========================================================
     13. TYPEWRITER
     ========================================================== */
  safe('typewriter', function () {
    var el = document.querySelector('[data-typewriter]');
    if (!el) return;
    var words;
    try { words = JSON.parse(el.dataset.typewriter); } catch (e) { words = [el.dataset.typewriter]; }
    if (!words || !words.length) return;
    var wi = 0, ci = 0, deleting = false;
    function tick() {
      var word = words[wi] || '';
      ci += deleting ? -1 : 1;
      el.textContent = word.slice(0, ci);
      var delay = deleting ? 55 : 110;
      if (!deleting && ci >= word.length) { delay = 1600; deleting = true; }
      else if (deleting && ci <= 0) { deleting = false; wi = (wi + 1) % words.length; delay = 400; }
      setTimeout(tick, delay);
    }
    tick();
  });

  /* ==========================================================
     14. GALLERY FILTERS (re-bindable)
     ========================================================== */
  function initFilters() {
    var btns = document.querySelectorAll('.filter-btn');
    var items = document.querySelectorAll('[data-category]');
    if (!btns.length || !items.length) return;
    btns.forEach(function (btn) {
      if (btn.dataset.bound) return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', function () {
        var filter = btn.dataset.filter;
        btns.forEach(function (b) { b.classList.remove('active'); });
        btn.classList.add('active');
        items.forEach(function (item) {
          var match = filter === 'all' || item.dataset.category === filter;
          item.classList.toggle('hide', !match);
        });
      });
    });
  }
  safe('filters', initFilters);

  /* ==========================================================
     15. LIGHTBOX
     ========================================================== */
  safe('lightbox', function () {
    var lightbox = document.getElementById('lightbox');
    if (!lightbox) return;
    var lbImg = lightbox.querySelector('img');
    var lbCap = lightbox.querySelector('.lightbox-caption');

    function open(src, caption) {
      if (lbImg) lbImg.src = src;
      if (lbCap) lbCap.textContent = caption || '';
      lightbox.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function close() {
      lightbox.classList.remove('open');
      document.body.style.overflow = '';
    }
    document.addEventListener('click', function (e) {
      var trigger = e.target.closest('[data-lightbox]');
      if (trigger) { e.preventDefault(); open(trigger.dataset.lightbox, trigger.dataset.caption); }
    });
    lightbox.addEventListener('click', function (e) {
      if (e.target === lightbox || e.target.classList.contains('lightbox-close')) close();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  });

  /* ==========================================================
     16. MODAL (news posts)
     ========================================================== */
  safe('modal', function () {
    var modal = document.getElementById('modal');
    if (!modal) return;
    var box = modal.querySelector('.modal-box');
    var titleEl = box.querySelector('.modal-title');
    var metaEl = box.querySelector('.modal-meta');
    var contentEl = box.querySelector('.modal-content');

    function open(id) {
      var src = document.getElementById(id);
      if (!src) { console.warn('[TBS] modal source not found:', id); return; }
      if (titleEl) titleEl.textContent = src.dataset.title || '';
      if (metaEl) metaEl.textContent = src.dataset.meta || '';
      if (contentEl) contentEl.innerHTML = src.innerHTML;
      modal.classList.add('open');
      document.body.style.overflow = 'hidden';
    }
    function close() {
      modal.classList.remove('open');
      document.body.style.overflow = '';
    }
    document.addEventListener('click', function (e) {
      var btn = e.target.closest('[data-modal]');
      if (btn) { e.preventDefault(); open(btn.dataset.modal); }
    });
    modal.addEventListener('click', function (e) {
      if (e.target === modal || e.target.classList.contains('modal-close')) close();
    });
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') close(); });
  });

  /* ==========================================================
     17. ACCORDION
     ========================================================== */
  safe('accordion', function () {
    document.addEventListener('click', function (e) {
      var head = e.target.closest('.acc-head');
      if (!head) return;
      var item = head.parentElement;
      var body = item.querySelector('.acc-body');
      var wasOpen = item.classList.contains('open');
      var siblings = item.parentElement.querySelectorAll('.acc-item');
      siblings.forEach(function (s) {
        s.classList.remove('open');
        var sb = s.querySelector('.acc-body');
        if (sb) sb.style.maxHeight = null;
      });
      if (!wasOpen && body) {
        item.classList.add('open');
        body.style.maxHeight = body.scrollHeight + 'px';
      }
    });
  });

  /* ==========================================================
     18. TOAST
     ========================================================== */
  window.showToast = function (message, isError) {
    var toast = document.getElementById('toast');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.toggle('error', !!isError);
    toast.classList.add('show');
    clearTimeout(toast._timer);
    toast._timer = setTimeout(function () { toast.classList.remove('show'); }, 4000);
  };

  /* ==========================================================
     19. FORM VALIDATION
     ========================================================== */
  safe('formValidation', function () {
    var forms = document.querySelectorAll('form[data-validate]');
    forms.forEach(function (form) {
      form.querySelectorAll('input, textarea, select').forEach(function (i) {
        i.addEventListener('input', function () {
          i.classList.remove('error');
          var err = i.parentElement.querySelector('.err-msg');
          if (err) err.classList.remove('show');
        });
      });
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var required = form.querySelectorAll('[required]');
        var allValid = true;
        required.forEach(function (input) {
          var err = input.parentElement.querySelector('.err-msg');
          var value = (input.value || '').trim();
          var ok = value !== '';
          if (ok && input.type === 'email') ok = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
          if (input.tagName === 'SELECT' && value === '') ok = false;
          input.classList.toggle('error', !ok);
          if (err) err.classList.toggle('show', !ok);
          if (!ok) allValid = false;
        });
        if (!allValid) return;
        var success = form.querySelector('.form-success');
        var btn = form.querySelector('button[type="submit"]');
        var original = btn ? btn.textContent : '';
        if (btn) { btn.disabled = true; btn.textContent = 'Sending…'; }
        setTimeout(function () {
          if (btn) { btn.disabled = false; btn.textContent = original; }
          if (success) { success.classList.add('show'); success.textContent = '✔ Message sent.'; }
          if (window.showToast) window.showToast('✔ Message sent');
          form.reset();
        }, 900);
      });
    });
  });

  /* ==========================================================
     20. NEWSLETTER
     ========================================================== */
  safe('newsletter', function () {
    document.querySelectorAll('form[data-newsletter]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var input = form.querySelector('input[type="email"]');
        var msg = form.parentElement.querySelector('.newsletter-msg');
        if (!input) return;
        var v = (input.value || '').trim();
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) {
          if (msg) { msg.textContent = 'Please enter a valid email.'; msg.style.color = '#ff6b6b'; }
          return;
        }
        if (msg) { msg.textContent = '✔ Subscribed.'; msg.style.color = '#7ee08a'; }
        form.reset();
      });
    });
  });

  /* ==========================================================
     21. YEAR
     ========================================================== */
  safe('year', function () {
    var y = new Date().getFullYear();
    document.querySelectorAll('[data-year]').forEach(function (el) { el.textContent = y; });
  });

  /* ==========================================================
     22. ACTIVE NAV
     ========================================================== */
  safe('activeNav', function () {
    var path = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('.nav-link').forEach(function (link) {
      var href = link.getAttribute('href');
      if (!href) return;
      link.classList.toggle('active', href === path || (path === '' && href === 'index.html'));
    });
  });

  /* ==========================================================
     RE-RUN reveal + filters after admin overrides inject content
     ========================================================== */
  function reinit() {
    initReveal();
    initFilters();
  }
  // Run immediately, then again after a short delay (after overrides run)
  reinit();
  setTimeout(reinit, 100);
  setTimeout(reinit, 500);

  /* ==========================================================
     LISTEN FOR ADMIN CHANGES (cross-tab sync)
     ========================================================== */
  window.addEventListener('storage', function (e) {
    if (!e.key || e.key.indexOf('tbs_') !== 0) return;
    console.log('[TBS] Admin changed: ' + e.key + ' — reloading...');
    location.reload();
  });

  console.log('%c[TBS] All systems initialized', 'color:#4CAF50;font-weight:bold');
})();