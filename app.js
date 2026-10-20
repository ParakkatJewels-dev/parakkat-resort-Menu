(function () {
  'use strict';

  var MENUS = window.PARAKKAT_MENUS || [];
  var WORKER_SRC = 'vendor/pdfjs/pdf.worker.min.js';
  var ZOOMS = [1, 1.35, 1.75, 2.25];
  var MAX_PAGE_WIDTH = 920;

  var $ = function (id) {
    return document.getElementById(id);
  };

  var ICONS = {
    book: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 5.5C4.5 4 8 4 12 6c4-2 7.5-2 10-.5V19c-2.5-1.5-6-1.5-10 .5-4-2-7.5-2-10-.5z"/><path d="M12 6v13.5"/></svg>',
    download: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 4v11M7 10l5 5 5-5M5 20h14"/></svg>',
    arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>'
  };

  function fileUrl(path) {
    return './' + path.split('/').map(encodeURIComponent).join('/');
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function findMenu(id) {
    for (var i = 0; i < MENUS.length; i++) if (MENUS[i].id === id) return MENUS[i];
    return null;
  }

  /* ---------- Page: cards, chips, nav ---------- */

  function renderCards() {
    var grid = $('menu-grid');
    var chips = $('hero-chips');
    var nav = $('topbar-nav');

    grid.innerHTML = MENUS.map(function (m) {
      var ready = !!m.file;
      var cover = m.cover
        ? '<img src="' + escapeHtml(m.cover) + '" alt="" loading="lazy" />'
        : '<div class="menu-placeholder-art"><img src="./logo parakkat.png" alt="" /></div>';
      var meta = m.updated ? '<p class="menu-meta">Updated ' + escapeHtml(m.updated) + '</p>' : '';
      var actions = ready
        ? '<button class="btn btn-primary" type="button" data-open="' + escapeHtml(m.id) + '">' + ICONS.book + 'Read menu</button>' +
          '<a class="btn btn-ghost" href="' + fileUrl(m.file) + '" download aria-label="Download ' + escapeHtml(m.title) + ' PDF">' + ICONS.download + '</a>'
        : '<span class="btn btn-primary" aria-disabled="true">Coming soon</span>';

      return (
        '<article class="menu-card reveal' + (ready ? '' : ' is-soon') + '" id="card-' + escapeHtml(m.id) + '">' +
        '<div class="menu-card-open"' + (ready ? ' data-open="' + escapeHtml(m.id) + '" aria-hidden="true"' : '') + '>' +
        '<div class="menu-cover">' + cover + '</div>' +
        '<div class="menu-cover-fade"></div>' +
        (ready ? '' : '<span class="badge">Coming soon</span>') +
        '</div>' +
        '<div class="menu-body">' +
        '<p class="eyebrow">' + escapeHtml(m.label) + '</p>' +
        '<h3>' + escapeHtml(m.title) + '</h3>' +
        '<p>' + escapeHtml(m.description) + '</p>' +
        meta +
        '<div class="menu-actions">' + actions + '</div>' +
        '</div>' +
        '</article>'
      );
    }).join('');

    var ready = MENUS.filter(function (m) {
      return m.file;
    });
    chips.innerHTML = ready
      .map(function (m) {
        return '<a class="chip" href="#' + encodeURIComponent(m.id) + '" data-open="' + escapeHtml(m.id) + '">' + escapeHtml(m.title) + ICONS.arrow + '</a>';
      })
      .join('');
    nav.innerHTML = ready
      .map(function (m) {
        return '<a href="#' + encodeURIComponent(m.id) + '" data-open="' + escapeHtml(m.id) + '">' + escapeHtml(m.title) + '</a>';
      })
      .join('');

    document.addEventListener('click', function (e) {
      var t = e.target.closest('[data-open]');
      if (!t) return;
      e.preventDefault();
      openMenu(t.getAttribute('data-open'), true);
    });
  }

  /* ---------- Reader ---------- */

  var viewer = $('viewer');
  var pagesEl = $('viewer-pages');
  var progressEl = $('viewer-progress').firstElementChild;
  var countEl = $('viewer-count');
  var state = null; // { menu, doc, pages: [], zoom, observer, pushed }
  var lastFocus = null;

  function setProgress(fraction) {
    progressEl.style.width = fraction >= 1 ? '0' : Math.round(fraction * 100) + '%';
  }

  function showMessage(html) {
    pagesEl.innerHTML = '<div class="viewer-message">' + html + '</div>';
  }

  function openMenu(id, push) {
    var menu = findMenu(id);
    if (!menu || !menu.file) return false;
    if (state && state.menu.id === id) return true;
    if (state) teardown();

    if (push) history.pushState({ menu: id }, '', '#' + encodeURIComponent(id));

    lastFocus = document.activeElement;
    state = { menu: menu, doc: null, pages: [], zoom: 0, observer: null, pushed: !!push, loadingTask: null };

    $('viewer-title').textContent = menu.title;
    $('viewer-label').textContent = menu.label || '';
    var dl = $('viewer-download');
    dl.href = fileUrl(menu.file);
    dl.setAttribute('download', menu.file.split('/').pop());
    countEl.textContent = '';
    setProgress(0);
    showMessage('<div class="spinner"></div><p>Opening ' + escapeHtml(menu.title) + '&hellip;</p>');

    viewer.hidden = false;
    document.body.classList.add('is-reading');
    document.title = menu.title + ' — Parakkat Nature Resort';
    $('viewer-close').focus();

    loadPdf(state);
    return true;
  }

  function teardown() {
    if (!state) return;
    if (state.observer) state.observer.disconnect();
    if (state.loadingTask) state.loadingTask.destroy();
    state = null;
    pagesEl.innerHTML = '';
  }

  function closeMenu(fromHistory) {
    if (!state) return;
    var pushed = state.pushed;
    teardown();
    viewer.hidden = true;
    document.body.classList.remove('is-reading');
    document.title = 'Parakkat Nature Resort — Menus';
    if (!fromHistory) {
      if (pushed) history.back();
      else history.replaceState(null, '', location.pathname + location.search);
    }
    if (lastFocus && lastFocus.focus) lastFocus.focus();
  }

  function loadPdf(s) {
    var lib = window.pdfjsLib;
    var url = fileUrl(s.menu.file);
    var fallback =
      '<a class="btn btn-primary" href="' + url + '" target="_blank" rel="noopener">Open the PDF instead</a>';

    if (!lib) {
      showMessage('<h3>Can’t show the menu here</h3><p>Your browser couldn’t load the reader.</p>' + fallback);
      return;
    }
    lib.GlobalWorkerOptions.workerSrc = WORKER_SRC;

    s.loadingTask = lib.getDocument({ url: url, disableAutoFetch: true, disableStream: true, rangeChunkSize: 262144 });
    s.loadingTask.onProgress = function (p) {
      if (state === s && p.total) setProgress(p.loaded / p.total);
    };
    s.loadingTask.promise
      .then(function (doc) {
        if (state !== s) return;
        s.doc = doc;
        return doc.getPage(1).then(function (first) {
          if (state !== s) return;
          var vp = first.getViewport({ scale: 1 });
          buildPages(s, vp.width / vp.height);
          setProgress(1);
        });
      })
      .catch(function (err) {
        if (state !== s || (err && err.name === 'AbortException')) return;
        console.error(err);
        showMessage('<h3>Couldn’t open this menu</h3><p>Check your connection and try again.</p>' + fallback);
      });
  }

  function baseWidth() {
    var avail = pagesEl.clientWidth - 24;
    return Math.max(200, Math.min(avail, MAX_PAGE_WIDTH));
  }

  function buildPages(s, ratio) {
    pagesEl.innerHTML = '';
    s.pages = [];
    for (var i = 1; i <= s.doc.numPages; i++) {
      var el = document.createElement('div');
      el.className = 'viewer-page';
      el.setAttribute('role', 'img');
      el.setAttribute('aria-label', 'Page ' + i + ' of ' + s.doc.numPages);
      el.dataset.page = String(i);
      pagesEl.appendChild(el);
      s.pages.push({ el: el, ratio: ratio, rendered: 0, task: null });
    }
    sizePages(s);
    updateCount();

    // Render pages near the screen, free the ones far away (keeps phones from running out of memory).
    s.observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          var p = s.pages[Number(entry.target.dataset.page) - 1];
          if (entry.isIntersecting) renderPage(s, p, Number(entry.target.dataset.page));
          else releasePage(p);
        });
      },
      { root: pagesEl, rootMargin: '150% 0px' }
    );
    s.pages.forEach(function (p) {
      s.observer.observe(p.el);
    });
    pagesEl.scrollTop = 0;
    pagesEl.focus({ preventScroll: true });
  }

  function sizePages(s) {
    var w = baseWidth() * ZOOMS[s.zoom];
    s.pages.forEach(function (p) {
      p.el.style.width = w + 'px';
      p.el.style.height = w / p.ratio + 'px';
    });
  }

  function renderPage(s, p, num) {
    var cssWidth = parseFloat(p.el.style.width);
    if (p.rendered === cssWidth || p.task) return;
    s.doc.getPage(num).then(function (page) {
      if (state !== s) return;
      var unscaled = page.getViewport({ scale: 1 });
      var ratio = unscaled.width / unscaled.height;
      if (Math.abs(ratio - p.ratio) > 0.01) {
        p.ratio = ratio;
        p.el.style.height = cssWidth / ratio + 'px';
      }
      var dpr = Math.min(window.devicePixelRatio || 1, 2);
      var scale = (cssWidth * dpr) / unscaled.width;
      var vp = page.getViewport({ scale: scale });
      var canvas = document.createElement('canvas');
      canvas.width = Math.floor(vp.width);
      canvas.height = Math.floor(vp.height);
      p.task = page.render({ canvasContext: canvas.getContext('2d', { alpha: false }), viewport: vp });
      p.task.promise
        .then(function () {
          p.task = null;
          if (state !== s) return;
          var old = p.el.querySelector('canvas');
          if (old) old.width = 0;
          p.el.innerHTML = '';
          p.el.appendChild(canvas);
          p.el.classList.add('is-rendered');
          p.rendered = cssWidth;
        })
        .catch(function () {
          p.task = null;
        });
    });
  }

  function releasePage(p) {
    if (p.task) {
      p.task.cancel();
      p.task = null;
    }
    var c = p.el.querySelector('canvas');
    if (c) {
      c.width = 0;
      c.height = 0;
    }
    p.el.innerHTML = '';
    p.el.classList.remove('is-rendered');
    p.rendered = 0;
  }

  function rerenderVisible() {
    if (!state || !state.doc) return;
    var s = state;
    var top = pagesEl.scrollTop / (pagesEl.scrollHeight || 1);
    sizePages(s);
    pagesEl.scrollTop = top * pagesEl.scrollHeight;
    // Re-observing fires a fresh intersection check for every page.
    s.pages.forEach(function (p) {
      s.observer.unobserve(p.el);
      s.observer.observe(p.el);
    });
  }

  function setZoom(delta) {
    if (!state || !state.doc) return;
    var z = Math.max(0, Math.min(ZOOMS.length - 1, state.zoom + delta));
    if (z === state.zoom) return;
    state.zoom = z;
    rerenderVisible();
  }

  function updateCount() {
    if (!state || !state.pages.length) return;
    var mid = pagesEl.scrollTop + pagesEl.clientHeight / 3;
    var current = 1;
    for (var i = 0; i < state.pages.length; i++) {
      if (state.pages[i].el.offsetTop <= mid) current = i + 1;
      else break;
    }
    countEl.textContent = current + ' / ' + state.pages.length;
  }

  /* ---------- Home animations ---------- */

  var LEAF_SVG =
    '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20 3C10 3 4 9 4 17c0 1.4.2 2.7.6 4 1-5 4.4-9.6 9.4-12-4 3-6.8 7.2-7.6 12.6C15.6 20.4 20 14 20 3z"/></svg>';

  function initHomeMotion() {
    var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Split the hero title into letters so they can rise one by one.
    var title = $('hero-title');
    if (title && !reduce) {
      var text = title.textContent;
      title.setAttribute('aria-label', text);
      title.innerHTML = text
        .split('')
        .map(function (ch, i) {
          return ch === ' '
            ? ' '
            : '<span class="char" aria-hidden="true" style="--c:' + i + '">' + escapeHtml(ch) + '</span>';
        })
        .join('');
      title.classList.add('is-split');
    }

    if (reduce) return;

    // A handful of leaves drifting down through the hero.
    var leaves = $('hero-leaves');
    var count = window.innerWidth < 640 ? 7 : 12;
    var html = '';
    for (var i = 0; i < count; i++) {
      var size = 10 + Math.random() * 14;
      html +=
        '<span class="leaf" style="--x:' + (Math.random() * 100).toFixed(1) + '%;--s:' + size.toFixed(0) +
        'px;--d:' + (11 + Math.random() * 10).toFixed(1) + 's;--delay:' + (-Math.random() * 20).toFixed(1) +
        's;--drift:' + (Math.random() * 160 - 80).toFixed(0) + 'px;--o:' + (0.35 + Math.random() * 0.4).toFixed(2) +
        '">' + LEAF_SVG + '</span>';
    }
    leaves.innerHTML = html;

    // Parallax: the photo moves slower than the page and the content fades as you scroll away.
    var hero = document.querySelector('.hero');
    var bg = document.querySelector('.hero-bg');
    var content = $('hero-content');
    var ticking = false;
    function parallax() {
      ticking = false;
      var h = hero.offsetHeight;
      var y = Math.min(window.scrollY, h);
      bg.style.translate = '0 ' + (y * 0.35).toFixed(1) + 'px';
      content.style.translate = '0 ' + (y * 0.18).toFixed(1) + 'px';
      content.style.opacity = String(Math.max(0, 1 - y / (h * 0.7)));
    }
    window.addEventListener(
      'scroll',
      function () {
        if (!ticking) {
          ticking = true;
          requestAnimationFrame(parallax);
        }
      },
      { passive: true }
    );

    // Cards tilt toward the pointer (mouse and trackpad only, not touch).
    if (window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
      document.querySelectorAll('.menu-card').forEach(function (card) {
        card.addEventListener('pointermove', function (e) {
          var r = card.getBoundingClientRect();
          var px = (e.clientX - r.left) / r.width;
          var py = (e.clientY - r.top) / r.height;
          card.classList.add('is-tilting');
          card.style.transform =
            'translateY(-6px) rotateX(' + ((0.5 - py) * 7).toFixed(2) + 'deg) rotateY(' + ((px - 0.5) * 9).toFixed(2) + 'deg)';
          card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
          card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
        });
        card.addEventListener('pointerleave', function () {
          card.classList.remove('is-tilting');
          card.style.transform = '';
        });
      });
    }
  }

  /* ---------- Gallery lightbox ---------- */

  function initLightbox() {
    var box = $('lightbox');
    var img = $('lightbox-img');
    var caption = $('lightbox-caption');
    var items = Array.prototype.slice.call(document.querySelectorAll('.g-item'));
    var current = 0;
    var opener = null;
    var touchX = null;

    function show(i) {
      current = (i + items.length) % items.length;
      var src = items[current].querySelector('img');
      img.src = src.currentSrc || src.src;
      img.alt = src.alt;
      caption.textContent = src.alt;
      // Restart the fade-in for each photo.
      img.style.animation = 'none';
      void img.offsetWidth;
      img.style.animation = '';
    }

    function open(i) {
      opener = document.activeElement;
      show(i);
      box.hidden = false;
      document.body.classList.add('is-reading');
      $('lightbox-close').focus();
    }

    function close() {
      box.hidden = true;
      document.body.classList.remove('is-reading');
      if (opener && opener.focus) opener.focus();
    }

    items.forEach(function (item, i) {
      item.addEventListener('click', function () {
        open(i);
      });
    });
    $('lightbox-close').addEventListener('click', close);
    $('lightbox-prev').addEventListener('click', function () {
      show(current - 1);
    });
    $('lightbox-next').addEventListener('click', function () {
      show(current + 1);
    });
    box.addEventListener('click', function (e) {
      if (e.target === box || e.target.classList.contains('lightbox-figure')) close();
    });
    document.addEventListener('keydown', function (e) {
      if (box.hidden) return;
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowLeft') show(current - 1);
      else if (e.key === 'ArrowRight') show(current + 1);
    });
    // Swipe left/right on phones.
    box.addEventListener(
      'touchstart',
      function (e) {
        touchX = e.touches[0].clientX;
      },
      { passive: true }
    );
    box.addEventListener('touchend', function (e) {
      if (touchX === null) return;
      var dx = e.changedTouches[0].clientX - touchX;
      touchX = null;
      if (Math.abs(dx) > 40) show(current + (dx < 0 ? 1 : -1));
    });
  }

  /* ---------- Wiring ---------- */

  function syncToHash() {
    var id = decodeURIComponent(location.hash.slice(1));
    if (id && findMenu(id)) openMenu(id, false);
    else if (state) closeMenu(true);
  }

  function init() {
    renderCards();

    $('viewer-close').addEventListener('click', function () {
      closeMenu(false);
    });
    $('zoom-in').addEventListener('click', function () {
      setZoom(1);
    });
    $('zoom-out').addEventListener('click', function () {
      setZoom(-1);
    });

    var ticking = false;
    pagesEl.addEventListener(
      'scroll',
      function () {
        if (ticking) return;
        ticking = true;
        requestAnimationFrame(function () {
          ticking = false;
          updateCount();
        });
      },
      { passive: true }
    );

    var resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(rerenderVisible, 200);
    });

    document.addEventListener('keydown', function (e) {
      if (viewer.hidden) return;
      if (e.key === 'Escape') closeMenu(false);
      else if (e.key === '+' || e.key === '=') setZoom(1);
      else if (e.key === '-') setZoom(-1);
    });

    window.addEventListener('popstate', syncToHash);
    window.addEventListener('hashchange', syncToHash);

    // Top bar turns solid once you scroll past the hero.
    var topbar = document.querySelector('.topbar');
    var onScroll = function () {
      topbar.classList.toggle('is-solid', window.scrollY > window.innerHeight * 0.5);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();

    // Fade sections in as they scroll into view.
    var reveals = document.querySelectorAll('.reveal');
    if ('IntersectionObserver' in window) {
      var io = new IntersectionObserver(
        function (entries) {
          entries.forEach(function (entry) {
            if (!entry.isIntersecting) return;
            var el = entry.target;
            var siblings = Array.prototype.indexOf.call(el.parentNode.children, el);
            el.style.transitionDelay = Math.min(siblings, 4) * 80 + 'ms';
            el.classList.add('is-visible');
            io.unobserve(el);
            // Drop the stagger delay once shown so hover effects respond at once.
            setTimeout(function () {
              el.style.transitionDelay = '';
            }, 1200);
          });
        },
        { rootMargin: '0px 0px -8% 0px' }
      );
      reveals.forEach(function (el) {
        io.observe(el);
      });
    } else {
      reveals.forEach(function (el) {
        el.classList.add('is-visible');
      });
    }

    initHomeMotion();
    initLightbox();

    window.__menusReady = true;
    syncToHash();
  }

  init();
})();
