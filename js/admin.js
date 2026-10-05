/* ============================================================
   THE BLACK STUDIO — admin.js
   Full CMS: auth, CRUD for posts/gallery/nav/sections, settings
   ============================================================ */
(function () {
  'use strict';

  /* ==========================================================
     STORAGE KEYS
     ========================================================== */
  var KEYS = {
    AUTH: 'tbs_auth',
    LOGGED: 'tbs_loggedin',
    CONTENT: 'tbs_content',
    POSTS: 'tbs_posts',
    GALLERY: 'tbs_gallery',
    NAV: 'tbs_nav',
    SECTIONS: 'tbs_sections',
    ACTIVITY: 'tbs_activity'
  };
  var DEFAULT_PWD = 'tbs-admin';

  /* ==========================================================
     HELPERS
     ========================================================== */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $$(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  function get(key, fallback) {
    try {
      var v = localStorage.getItem(key);
      return v ? JSON.parse(v) : fallback;
    } catch (e) { return fallback; }
  }
  function set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { toast('Storage full or blocked', true); return false; }
  }

  // Simple, works on file:// too
  function hash(str) {
    var h = 5381, i = str.length;
    while (i) h = (h * 33) ^ str.charCodeAt(--i);
    return 'h' + (h >>> 0).toString(16);
  }

  /* ==========================================================
     TOAST
     ========================================================== */
  function toast(msg, isErr) {
    var t = $('#toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.toggle('error', !!isErr);
    t.classList.add('show');
    clearTimeout(t._tm);
    t._tm = setTimeout(function () { t.classList.remove('show'); }, 3500);
  }

  /* ==========================================================
     ACTIVITY LOG
     ========================================================== */
  function logActivity(text) {
    var list = get(KEYS.ACTIVITY, []);
    list.unshift({ text: text, time: new Date().toISOString() });
    set(KEYS.ACTIVITY, list.slice(0, 20));
    renderActivity();
  }
  function renderActivity() {
    var el = $('#activityList');
    if (!el) return;
    var list = get(KEYS.ACTIVITY, []);
    if (!list.length) {
      el.innerHTML = '<li class="empty">No activity yet. Start editing to see changes here.</li>';
      return;
    }
    el.innerHTML = list.map(function (a) {
      var d = new Date(a.time);
      var ago = Math.round((Date.now() - d.getTime()) / 60000);
      var agoTxt = ago < 1 ? 'just now' : ago < 60 ? ago + 'm ago' : Math.round(ago / 60) + 'h ago';
      return '<li>' + a.text + ' <span style="color:#555;font-size:.75rem">· ' + agoTxt + '</span></li>';
    }).join('');
  }

  /* ==========================================================
     AUTH
     ========================================================== */
  function isLoggedIn() {
    return localStorage.getItem(KEYS.LOGGED) === 'true';
  }

  function setPassword(pwd) {
    set(KEYS.AUTH, { hash: hash(pwd) });
  }

  function checkPassword(pwd) {
    var auth = get(KEYS.AUTH, null);
    if (!auth) {
      // First run — set default
      setPassword(DEFAULT_PWD);
      auth = get(KEYS.AUTH, null);
    }
    return auth && auth.hash === hash(pwd);
  }

  function login(pwd) {
    if (checkPassword(pwd)) {
      localStorage.setItem(KEYS.LOGGED, 'true');
      return true;
    }
    return false;
  }

  function logout() {
    localStorage.removeItem(KEYS.LOGGED);
    location.reload();
  }

  /* ==========================================================
     UI: SHOW LOGIN OR DASHBOARD
     ========================================================== */
  function showLogin() {
    $('#loginView').hidden = false;
    $('#dashView').hidden = true;
  }
  function showDash() {
    $('#loginView').hidden = true;
    $('#dashView').hidden = false;
    initDash();
  }

  /* ==========================================================
     INIT DASHBOARD
     ========================================================== */
  function initDash() {
    bindTabs();
    bindSidebarToggle();
    renderOverview();
    renderHero();
    renderPosts();
    renderGallery();
    renderNav();
    renderSections();
    renderSettings();
    renderActivity();
    bindLogout();
  }

  function bindLogout() {
    var b = $('#logoutBtn');
    if (b) b.onclick = logout;
  }

  /* ==========================================================
     TABS
     ========================================================== */
  function bindTabs() {
    $$('.dash-nav a').forEach(function (a) {
      a.addEventListener('click', function () {
        var tab = a.dataset.tab;
        $$('.dash-nav a').forEach(function (x) { x.classList.remove('active'); });
        a.classList.add('active');
        $$('[data-tab-content]').forEach(function (s) {
          s.classList.toggle('active', s.dataset.tabContent === tab);
        });
        $$('.dash-sidebar').forEach(function (s) { s.classList.remove('open'); });
      });
    });
    $$('[data-goto-tab]').forEach(function (b) {
      b.addEventListener('click', function () {
        var t = b.dataset.gotoTab;
        var link = $('.dash-nav a[data-tab="' + t + '"]');
        if (link) link.click();
      });
    });
  }

  function bindSidebarToggle() {
    document.addEventListener('click', function (e) {
      if (window.innerWidth > 860) return;
      var sidebar = $('.dash-sidebar');
      if (!sidebar) return;
      if (e.target.closest('.dash-sidebar') || e.target.closest('.dash-nav')) return;
      if (e.clientX < 120 && e.clientY < 60) {
        sidebar.classList.toggle('open');
      } else if (sidebar.classList.contains('open')) {
        sidebar.classList.remove('open');
      }
    });
  }

  /* ==========================================================
     OVERVIEW
     ========================================================== */
  function renderOverview() {
    var posts = get(KEYS.POSTS, []);
    var gallery = get(KEYS.GALLERY, []);
    var nav = get(KEYS.NAV, []);
    var sections = get(KEYS.SECTIONS, []);
    if ($('#statPosts')) $('#statPosts').textContent = posts.length;
    if ($('#statImages')) $('#statImages').textContent = gallery.length;
    if ($('#statNav')) $('#statNav').textContent = nav.length;
    if ($('#statSections')) $('#statSections').textContent = sections.length;

    var expBtn = $('#exportAllBtn');
    if (expBtn) expBtn.onclick = exportAll;
  }

  /* ==========================================================
     HERO FORM
     ========================================================== */
  var HERO_DEFAULTS = {
    badge: 'Under Development — Coming Soon',
    title: 'The Black Studio',
    lead: "From the ruins of Rawalpindi, a new nightmare rises.",
    cta1Text: 'Explore Sector Zero',
    cta1Link: 'game.html',
    cta2Text: 'About the Studio',
    cta2Link: 'about.html'
  };

  function renderHero() {
    var form = $('#heroForm');
    if (!form) return;
    var content = get(KEYS.CONTENT, {});
    var hero = Object.assign({}, HERO_DEFAULTS, content.hero || {});
    Object.keys(hero).forEach(function (k) {
      if (form.elements[k]) form.elements[k].value = hero[k];
    });
    form.onsubmit = function (e) {
      e.preventDefault();
      var data = {};
      Object.keys(HERO_DEFAULTS).forEach(function (k) {
        data[k] = form.elements[k] ? form.elements[k].value : '';
      });
      var c = get(KEYS.CONTENT, {});
      c.hero = data;
      set(KEYS.CONTENT, c);
      toast('✔ Hero updated');
      logActivity('Updated hero section');
    };
  }

  /* ==========================================================
     POSTS
     ========================================================== */
  function renderPosts() {
    var list = $('#postsList');
    if (!list) return;
    var posts = get(KEYS.POSTS, []);
    if (!posts.length) {
      list.innerHTML = '<p style="color:#666;text-align:center;padding:2rem">No posts yet. Click <strong>+ New Post</strong> to add one.</p>';
    } else {
      list.innerHTML = posts.map(function (p) {
        return '<div class="item-row">' +
          (p.image ? '<img class="item-thumb" src="' + esc(p.image) + '" alt="">' : '') +
          '<div class="item-info">' +
            '<strong>' + esc(p.title || 'Untitled') + '</strong>' +
            '<small>' + esc(p.meta || 'No category') + ' · ' + (p.category || 'devlog') + '</small>' +
          '</div>' +
          '<div class="item-actions">' +
            '<button class="icon-btn" data-edit-post="' + p.id + '" title="Edit">✎</button>' +
            '<button class="icon-btn danger" data-del-post="' + p.id + '" title="Delete">🗑</button>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    var newBtn = $('#newPostBtn');
    if (newBtn) newBtn.onclick = function () { openPostModal(null); };

    list.querySelectorAll('[data-edit-post]').forEach(function (b) {
      b.onclick = function () { openPostModal(b.dataset.editPost); };
    });
    list.querySelectorAll('[data-del-post]').forEach(function (b) {
      b.onclick = function () {
        if (!confirm('Delete this post?')) return;
        var posts = get(KEYS.POSTS, []).filter(function (p) { return p.id !== b.dataset.delPost; });
        set(KEYS.POSTS, posts);
        toast('Post deleted');
        logActivity('Deleted a post');
        renderPosts(); renderOverview();
      };
    });
  }

  function openPostModal(id) {
    var posts = get(KEYS.POSTS, []);
    var p = id ? posts.filter(function (x) { return x.id === id; })[0] : null;
    var isNew = !p;
    if (isNew) p = { id: uid(), title: '', meta: '', category: 'devlog', excerpt: '', body: '', image: '' };

    openModal(isNew ? 'New Post' : 'Edit Post',
      '<div class="field"><label>Title *</label><input name="title" value="' + esc(p.title) + '" required></div>' +
      '<div class="form-row">' +
        '<div class="field"><label>Meta Label</label><input name="meta" value="' + esc(p.meta) + '" placeholder="Devlog · Update 01"></div>' +
        '<div class="field"><label>Category</label>' +
          '<select name="category">' +
            ['devlog','announcement','community'].map(function (c) {
              return '<option value="' + c + '"' + (p.category === c ? ' selected' : '') + '>' + c + '</option>';
            }).join('') +
          '</select>' +
        '</div>' +
      '</div>' +
      '<div class="field"><label>Cover Image URL</label><input name="image" value="' + esc(p.image) + '" placeholder="https://... or assets/img.jpg"></div>' +
      '<div class="field"><label>Excerpt (short text for card)</label><textarea name="excerpt" rows="2">' + esc(p.excerpt) + '</textarea></div>' +
      '<div class="field"><label>Body (full post content)</label><textarea name="body" rows="6">' + esc(p.body) + '</textarea></div>' +
      '<button type="submit" class="btn btn-primary btn-block">💾 Save Post</button>',
      function (form) {
        form.onsubmit = function (e) {
          e.preventDefault();
          var data = {
            id: p.id,
            title: form.elements.title.value.trim(),
            meta: form.elements.meta.value.trim(),
            category: form.elements.category.value,
            image: form.elements.image.value.trim(),
            excerpt: form.elements.excerpt.value.trim(),
            body: form.elements.body.value.trim()
          };
          if (!data.title) return;

          var list = get(KEYS.POSTS, []);
          var idx = list.findIndex(function (x) { return x.id === p.id; });
          if (idx > -1) list[idx] = data; else list.unshift(data);
          set(KEYS.POSTS, list);
          closeModal();
          toast(isNew ? '✔ Post created' : '✔ Post updated');
          logActivity(isNew ? 'Created a post' : 'Updated post');
          renderPosts(); renderOverview();
        };
      });
  }

  /* ==========================================================
     GALLERY
     ========================================================== */
  function renderGallery() {
    var list = $('#galleryList');
    if (!list) return;
    var items = get(KEYS.GALLERY, []);
    if (!items.length) {
      list.innerHTML = '<p style="color:#666;grid-column:1/-1;text-align:center;padding:2rem">No images yet. Click <strong>+ Add Image</strong>.</p>';
    } else {
      list.innerHTML = items.map(function (g) {
        return '<div class="gallery-admin-item">' +
          '<img src="' + esc(g.src) + '" alt="">' +
          '<div class="gai-actions">' +
            '<button data-edit-img="' + g.id + '" title="Edit">✎</button>' +
            '<button data-del-img="' + g.id + '" title="Delete">🗑</button>' +
          '</div>' +
          '<div class="gai-info">' +
            '<strong>' + esc(g.caption || 'Untitled') + '</strong>' +
            '<small>' + esc(g.category || 'screenshots') + '</small>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    var newBtn = $('#newImageBtn');
    if (newBtn) newBtn.onclick = function () { openImageModal(null); };
    list.querySelectorAll('[data-edit-img]').forEach(function (b) {
      b.onclick = function () { openImageModal(b.dataset.editImg); };
    });
    list.querySelectorAll('[data-del-img]').forEach(function (b) {
      b.onclick = function () {
        if (!confirm('Delete this image?')) return;
        var items = get(KEYS.GALLERY, []).filter(function (g) { return g.id !== b.dataset.delImg; });
        set(KEYS.GALLERY, items);
        toast('Image deleted');
        logActivity('Deleted a gallery image');
        renderGallery(); renderOverview();
      };
    });
  }

  function openImageModal(id) {
    var items = get(KEYS.GALLERY, []);
    var g = id ? items.filter(function (x) { return x.id === id; })[0] : null;
    var isNew = !g;
    if (isNew) g = { id: uid(), src: '', caption: '', category: 'screenshots' };

    openModal(isNew ? 'Add Image' : 'Edit Image',
      '<div class="field"><label>Image URL *</label><input name="src" value="' + esc(g.src) + '" required placeholder="https://... or assets/img.jpg"></div>' +
      '<div class="field"><label>Caption</label><input name="caption" value="' + esc(g.caption) + '"></div>' +
      '<div class="field"><label>Category</label>' +
        '<select name="category">' +
          ['screenshots','concept','bts'].map(function (c) {
            return '<option value="' + c + '"' + (g.category === c ? ' selected' : '') + '>' + c + '</option>';
          }).join('') +
        '</select>' +
      '</div>' +
      '<button type="submit" class="btn btn-primary btn-block">💾 Save Image</button>',
      function (form) {
        form.onsubmit = function (e) {
          e.preventDefault();
          var data = {
            id: g.id,
            src: form.elements.src.value.trim(),
            caption: form.elements.caption.value.trim(),
            category: form.elements.category.value
          };
          if (!data.src) return;
          var list = get(KEYS.GALLERY, []);
          var idx = list.findIndex(function (x) { return x.id === g.id; });
          if (idx > -1) list[idx] = data; else list.unshift(data);
          set(KEYS.GALLERY, list);
          closeModal();
          toast(isNew ? '✔ Image added' : '✔ Image updated');
          logActivity(isNew ? 'Added gallery image' : 'Updated gallery image');
          renderGallery(); renderOverview();
        };
      });
  }

  /* ==========================================================
     NAVIGATION
     ========================================================== */
  function renderNav() {
    var list = $('#navList');
    if (!list) return;
    var nav = get(KEYS.NAV, []);
    if (!nav.length) {
      list.innerHTML = '<p style="color:#666;text-align:center;padding:2rem">No custom nav links. Click <strong>+ Add Link</strong>.</p>';
    } else {
      list.innerHTML = nav.map(function (n, i) {
        return '<div class="item-row">' +
          '<div class="item-info">' +
            '<strong>' + esc(n.label) + '</strong>' +
            '<small>' + esc(n.href) + '</small>' +
          '</div>' +
          '<div class="item-actions">' +
            (i > 0 ? '<button class="icon-btn" data-move-nav="' + i + '|up" title="Move up">↑</button>' : '') +
            '<button class="icon-btn" data-edit-nav="' + i + '" title="Edit">✎</button>' +
            '<button class="icon-btn danger" data-del-nav="' + i + '" title="Delete">🗑</button>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    var newBtn = $('#newNavBtn');
    if (newBtn) newBtn.onclick = function () { openNavModal(-1); };
    list.querySelectorAll('[data-edit-nav]').forEach(function (b) {
      b.onclick = function () { openNavModal(+b.dataset.editNav); };
    });
    list.querySelectorAll('[data-del-nav]').forEach(function (b) {
      b.onclick = function () {
        if (!confirm('Delete this link?')) return;
        var nav = get(KEYS.NAV, []);
        nav.splice(+b.dataset.delNav, 1);
        set(KEYS.NAV, nav);
        toast('Link deleted');
        logActivity('Deleted nav link');
        renderNav(); renderOverview();
      };
    });
    list.querySelectorAll('[data-move-nav]').forEach(function (b) {
      b.onclick = function () {
        var parts = b.dataset.moveNav.split('|');
        var i = +parts[0];
        var nav = get(KEYS.NAV, []);
        if (parts[1] === 'up' && i > 0) {
          var t = nav[i - 1]; nav[i - 1] = nav[i]; nav[i] = t;
          set(KEYS.NAV, nav);
          renderNav();
        }
      };
    });
  }

  function openNavModal(idx) {
    var nav = get(KEYS.NAV, []);
    var isNew = idx < 0;
    var n = isNew ? { label: '', href: '' } : nav[idx];

    openModal(isNew ? 'Add Nav Link' : 'Edit Nav Link',
      '<div class="field"><label>Label *</label><input name="label" value="' + esc(n.label) + '" required placeholder="Home"></div>' +
      '<div class="field"><label>URL *</label><input name="href" value="' + esc(n.href) + '" required placeholder="index.html"></div>' +
      '<button type="submit" class="btn btn-primary btn-block">💾 Save Link</button>',
      function (form) {
        form.onsubmit = function (e) {
          e.preventDefault();
          var data = { label: form.elements.label.value.trim(), href: form.elements.href.value.trim() };
          if (!data.label || !data.href) return;
          if (isNew) nav.push(data); else nav[idx] = data;
          set(KEYS.NAV, nav);
          closeModal();
          toast(isNew ? '✔ Link added' : '✔ Link updated');
          logActivity(isNew ? 'Added nav link' : 'Updated nav link');
          renderNav(); renderOverview();
        };
      });
  }

  /* ==========================================================
     SECTIONS (custom blocks)
     ========================================================== */
  function renderSections() {
    var list = $('#sectionsList');
    if (!list) return;
    var secs = get(KEYS.SECTIONS, []);
    if (!secs.length) {
      list.innerHTML = '<p style="color:#666;text-align:center;padding:2rem">No custom sections yet. Click <strong>+ New Section</strong>.</p>';
    } else {
      list.innerHTML = secs.map(function (s, i) {
        return '<div class="item-row">' +
          '<div class="item-info">' +
            '<strong>' + esc(s.heading || 'Untitled Section') + '</strong>' +
            '<small>' + esc(s.type || 'text') + ' · order ' + (i + 1) + '</small>' +
          '</div>' +
          '<div class="item-actions">' +
            (i > 0 ? '<button class="icon-btn" data-move-sec="' + i + '|up">↑</button>' : '') +
            (i < secs.length - 1 ? '<button class="icon-btn" data-move-sec="' + i + '|down">↓</button>' : '') +
            '<button class="icon-btn" data-edit-sec="' + s.id + '">✎</button>' +
            '<button class="icon-btn danger" data-del-sec="' + s.id + '">🗑</button>' +
          '</div>' +
        '</div>';
      }).join('');
    }

    var newBtn = $('#newSectionBtn');
    if (newBtn) newBtn.onclick = function () { openSectionModal(null); };
    list.querySelectorAll('[data-edit-sec]').forEach(function (b) {
      b.onclick = function () { openSectionModal(b.dataset.editSec); };
    });
    list.querySelectorAll('[data-del-sec]').forEach(function (b) {
      b.onclick = function () {
        if (!confirm('Delete this section?')) return;
        var secs = get(KEYS.SECTIONS, []).filter(function (s) { return s.id !== b.dataset.delSec; });
        set(KEYS.SECTIONS, secs);
        toast('Section deleted');
        logActivity('Deleted section');
        renderSections(); renderOverview();
      };
    });
    list.querySelectorAll('[data-move-sec]').forEach(function (b) {
      b.onclick = function () {
        var parts = b.dataset.moveSec.split('|');
        var i = +parts[0], dir = parts[1];
        var secs = get(KEYS.SECTIONS, []);
        if (dir === 'up' && i > 0) {
          var t = secs[i - 1]; secs[i - 1] = secs[i]; secs[i] = t;
        } else if (dir === 'down' && i < secs.length - 1) {
          var t2 = secs[i + 1]; secs[i + 1] = secs[i]; secs[i] = t2;
        }
        set(KEYS.SECTIONS, secs);
        renderSections();
      };
    });
  }

  function openSectionModal(id) {
    var secs = get(KEYS.SECTIONS, []);
    var s = id ? secs.filter(function (x) { return x.id === id; })[0] : null;
    var isNew = !s;
    if (isNew) s = {
      id: uid(), type: 'text', heading: '', body: '',
      btnText: '', btnLink: '', container: 'section'
    };

    openModal(isNew ? 'New Section' : 'Edit Section',
      '<div class="field"><label>Section Type</label>' +
        '<select name="type">' +
          ['text','feature','cta','stats'].map(function (t) {
            return '<option value="' + t + '"' + (s.type === t ? ' selected' : '') + '>' + t + '</option>';
          }).join('') +
        '</select>' +
      '</div>' +
      '<div class="field"><label>Container Style</label>' +
        '<select name="container">' +
          ['section','section--alt','cta-band'].map(function (c) {
            return '<option value="' + c + '"' + (s.container === c ? ' selected' : '') + '>' + c + '</option>';
          }).join('') +
        '</select>' +
      '</div>' +
      '<div class="field"><label>Heading *</label><input name="heading" value="' + esc(s.heading) + '" required></div>' +
      '<div class="field"><label>Body Text</label><textarea name="body" rows="4">' + esc(s.body) + '</textarea></div>' +
      '<div class="form-row">' +
        '<div class="field"><label>Button Text</label><input name="btnText" value="' + esc(s.btnText) + '" placeholder="Optional"></div>' +
        '<div class="field"><label>Button Link</label><input name="btnLink" value="' + esc(s.btnLink) + '" placeholder="Optional"></div>' +
      '</div>' +
      '<button type="submit" class="btn btn-primary btn-block">💾 Save Section</button>',
      function (form) {
        form.onsubmit = function (e) {
          e.preventDefault();
          var data = {
            id: s.id,
            type: form.elements.type.value,
            container: form.elements.container.value,
            heading: form.elements.heading.value.trim(),
            body: form.elements.body.value.trim(),
            btnText: form.elements.btnText.value.trim(),
            btnLink: form.elements.btnLink.value.trim()
          };
          if (!data.heading) return;
          var list = get(KEYS.SECTIONS, []);
          var idx = list.findIndex(function (x) { return x.id === s.id; });
          if (idx > -1) list[idx] = data; else list.push(data);
          set(KEYS.SECTIONS, list);
          closeModal();
          toast(isNew ? '✔ Section created' : '✔ Section updated');
          logActivity(isNew ? 'Created section' : 'Updated section');
          renderSections(); renderOverview();
        };
      });
  }

  /* ==========================================================
     SETTINGS
     ========================================================== */
  function renderSettings() {
    // Password
    var pf = $('#passwordForm');
    if (pf) {
      pf.onsubmit = function (e) {
        e.preventDefault();
        var ok = $('#pwdSuccess'), err = $('#pwdError');
        ok.classList.remove('show'); err.classList.remove('show');
        var cur = pf.elements.current.value;
        var np = pf.elements.newPwd.value;
        var cf = pf.elements.confirm.value;
        if (!checkPassword(cur)) {
          err.textContent = 'Current password is incorrect.'; err.classList.add('show'); return;
        }
        if (np.length < 6) {
          err.textContent = 'New password must be at least 6 characters.'; err.classList.add('show'); return;
        }
        if (np !== cf) {
          err.textContent = 'Passwords do not match.'; err.classList.add('show'); return;
        }
        setPassword(np);
        pf.reset();
        ok.textContent = '✔ Password updated.'; ok.classList.add('show');
        toast('Password updated');
        logActivity('Changed admin password');
      };
    }

    // Export / Import / Reset
    var ex = $('#exportBtn2'); if (ex) ex.onclick = exportAll;
    var im = $('#importInput');
    if (im) im.onchange = function (e) {
      var file = e.target.files[0];
      if (!file) return;
      var reader = new FileReader();
      reader.onload = function () {
        try {
          var data = JSON.parse(reader.result);
          if (!confirm('This will overwrite all current content. Continue?')) return;
          if (data.content) set(KEYS.CONTENT, data.content);
          if (data.posts) set(KEYS.POSTS, data.posts);
          if (data.gallery) set(KEYS.GALLERY, data.gallery);
          if (data.nav) set(KEYS.NAV, data.nav);
          if (data.sections) set(KEYS.SECTIONS, data.sections);
          toast('✔ Data imported');
          logActivity('Imported data');
          location.reload();
        } catch (err) {
          toast('Invalid JSON file', true);
        }
      };
      reader.readAsText(file);
    };

    var rb = $('#resetBtn');
    if (rb) rb.onclick = function () {
      if (!confirm('Delete ALL custom content and reset to defaults? This cannot be undone.')) return;
      [KEYS.CONTENT, KEYS.POSTS, KEYS.GALLERY, KEYS.NAV, KEYS.SECTIONS, KEYS.ACTIVITY].forEach(function (k) {
        localStorage.removeItem(k);
      });
      toast('Reset complete');
      location.reload();
    };

    // Storage info
    var info = $('#storageInfo');
    if (info) {
      var total = 0;
      [KEYS.CONTENT, KEYS.POSTS, KEYS.GALLERY, KEYS.NAV, KEYS.SECTIONS, KEYS.ACTIVITY].forEach(function (k) {
        var v = localStorage.getItem(k);
        if (v) total += v.length;
      });
      info.innerHTML = 'Using approximately <strong style="color:#FF4500">' + (total / 1024).toFixed(1) + ' KB</strong> of localStorage. Typical limit is 5 MB per site.';
    }
  }

  function exportAll() {
    var data = {
      _exportedAt: new Date().toISOString(),
      _version: 1,
      content: get(KEYS.CONTENT, {}),
      posts: get(KEYS.POSTS, []),
      gallery: get(KEYS.GALLERY, []),
      nav: get(KEYS.NAV, []),
      sections: get(KEYS.SECTIONS, [])
    };
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'the-black-studio-backup-' + new Date().toISOString().slice(0, 10) + '.json';
    a.click();
    URL.revokeObjectURL(url);
    toast('✔ Backup downloaded');
    logActivity('Exported data');
  }

  /* ==========================================================
     MODAL HELPER
     ========================================================== */
  var modalSaveHandler = null;
  function openModal(title, html, onReady) {
    var m = $('#adminModal');
    $('#modalTitle').textContent = title;
    var form = $('#modalForm');
    form.innerHTML = html;
    form.onsubmit = null;
    m.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (onReady) onReady(form);
  }
  function closeModal() {
    $('#adminModal').classList.remove('open');
    document.body.style.overflow = '';
  }
  document.addEventListener('click', function (e) {
    var m = $('#adminModal');
    if (!m || !m.classList.contains('open')) return;
    if (e.target === m || e.target.classList.contains('admin-modal-close')) closeModal();
  });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') closeModal();
  });

  /* ==========================================================
     ESCAPE HTML
     ========================================================== */
  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ==========================================================
     BOOT
     ========================================================== */
  function boot() {
    // Ensure default password exists on first run
    if (!get(KEYS.AUTH, null)) setPassword(DEFAULT_PWD);

    var lf = $('#loginForm');
    if (lf) {
      lf.onsubmit = function (e) {
        e.preventDefault();
        var pwd = $('#password').value;
        if (login(pwd)) {
          $('#loginError').classList.remove('show');
          showDash();
          logActivity('Logged in');
        } else {
          var err = $('#loginError');
          err.textContent = 'Incorrect password. Try again.';
          err.classList.add('show');
          $('#password').value = '';
          $('#password').focus();
        }
      };
    }

    if (isLoggedIn()) showDash();
    else showLogin();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  /* Expose for debugging */
  window.TBS_ADMIN = { get: get, set: set, KEYS: KEYS };
})();