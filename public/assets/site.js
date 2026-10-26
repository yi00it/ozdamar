// Loaded at the end of <body>, before #ready, so everything here is settled
// before the first frame and page transitions see the final layout.

// One pill per capsule (header nav, Shelf and Uses switches, appearance): it
// slides to the hovered or focused item and back to the current one.
var slidingPill = (function () {
  document.documentElement.classList.add('has-pill');

  return function (container, items, getCurrent) {
    var pill = document.createElement('span');
    pill.className = 'pill is-instant';
    pill.setAttribute('aria-hidden', 'true');
    container.insertBefore(pill, container.firstChild);

    function moveTo(item) {
      if (!item || !item.offsetWidth) {
        pill.classList.remove('is-on');
        return;
      }
      pill.style.width = item.offsetWidth + 'px';
      pill.style.transform = 'translateX(' + item.offsetLeft + 'px)';
      pill.classList.add('is-on');
    }

    function settle() {
      moveTo(getCurrent());
    }

    settle();
    // Let the first placement land without animating, then enable motion
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { pill.classList.remove('is-instant'); });
    });

    items.forEach(function (item) {
      item.addEventListener('pointerenter', function () { moveTo(item); });
      item.addEventListener('focus', function () { moveTo(item); });
    });
    container.addEventListener('pointerleave', settle);
    container.addEventListener('focusout', function (e) {
      if (!container.contains(e.relatedTarget)) settle();
    });
    window.addEventListener('resize', settle);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(settle);

    return settle;
  };
})();

// Arrow keys move between the items of a single-choice capsule
function arrowKeys(buttons, choose) {
  buttons.forEach(function (b, i) {
    b.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      e.preventDefault();
      choose(buttons[(i + (e.key === 'ArrowRight' ? 1 : buttons.length - 1)) % buttons.length], true);
    });
  });
}

// Appearance: Auto follows the system, Light and Dark are remembered.
(function () {
  var root = document.documentElement;
  var group = document.querySelector('[data-theme-switch]');
  if (!group) return;

  var buttons = Array.prototype.slice.call(group.querySelectorAll('[data-value]'));
  var metas = document.querySelectorAll('meta[name="theme-color"]');
  var defaults = Array.prototype.map.call(metas, function (m) { return m.content; });

  function current() {
    return root.getAttribute('data-theme') || 'auto';
  }

  function apply(value) {
    if (value === 'auto') {
      root.removeAttribute('data-theme');
      try { localStorage.removeItem('theme'); } catch (e) {}
    } else {
      root.setAttribute('data-theme', value);
      try { localStorage.setItem('theme', value); } catch (e) {}
    }
    // The browser bar follows the page, not the system, once a theme is chosen
    Array.prototype.forEach.call(metas, function (m, i) {
      m.content = value === 'auto' ? defaults[i] : value === 'dark' ? '#121211' : '#f3f2ee';
    });
  }

  function choose(button, focus) {
    var value = button.getAttribute('data-value');
    buttons.forEach(function (b) {
      var on = b === button;
      b.setAttribute('aria-checked', String(on));
      b.tabIndex = on ? 0 : -1;
    });
    if (focus) button.focus();
    if (value !== current()) apply(value);
    settle();
  }

  buttons.forEach(function (b) {
    b.addEventListener('click', function () { choose(b); });
  });
  arrowKeys(buttons, choose);

  group.hidden = false;
  var start = current();
  buttons.forEach(function (b) {
    var on = b.getAttribute('data-value') === start;
    b.setAttribute('aria-checked', String(on));
    b.tabIndex = on ? 0 : -1;
  });
  var settle = slidingPill(group, buttons, function () {
    return group.querySelector('[aria-checked="true"]');
  });
})();

// Shelf and Uses: show one list at a time; the hash (#books, #software…) keeps it linkable.
(function () {
  var tabs = document.querySelector('[data-tabs]');
  if (!tabs) return;

  var buttons = Array.prototype.slice.call(tabs.querySelectorAll('[data-tab]'));
  var panels = Array.prototype.slice.call(document.querySelectorAll('[data-panel]'));
  var names = buttons.map(function (b) { return b.getAttribute('data-tab'); });
  var settle = function () {};

  function show(name, focus) {
    buttons.forEach(function (b) {
      var on = b.getAttribute('data-tab') === name;
      b.setAttribute('aria-selected', String(on));
      b.tabIndex = on ? 0 : -1;
      if (on && focus) b.focus();
    });
    panels.forEach(function (p) {
      p.hidden = p.getAttribute('data-panel') !== name;
    });
    settle();
  }

  buttons.forEach(function (b) {
    b.addEventListener('click', function () {
      var name = b.getAttribute('data-tab');
      show(name);
      history.replaceState(null, '', '#' + name);
    });
  });
  arrowKeys(buttons, function (next, focus) {
    show(next.getAttribute('data-tab'), focus);
    history.replaceState(null, '', '#' + next.getAttribute('data-tab'));
  });

  var initial = location.hash.slice(1);
  tabs.hidden = false;
  document.documentElement.classList.add('has-tabs');
  show(names.indexOf(initial) >= 0 ? initial : names[0]);
  settle = slidingPill(tabs, buttons, function () {
    return tabs.querySelector('[aria-selected="true"]');
  });
})();

// Code blocks: a quiet Copy button
(function () {
  if (!navigator.clipboard) return;
  Array.prototype.forEach.call(document.querySelectorAll('.prose pre'), function (pre) {
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'copy';
    button.textContent = 'Copy';
    var timer;
    button.addEventListener('click', function () {
      var code = pre.querySelector('code') || pre;
      navigator.clipboard.writeText(code.innerText.replace(/\n$/, '')).then(function () {
        button.textContent = 'Copied';
        button.classList.add('is-done');
        clearTimeout(timer);
        timer = setTimeout(function () {
          button.textContent = 'Copy';
          button.classList.remove('is-done');
        }, 1600);
      });
    });
    pre.appendChild(button);
  });
})();

// Download page: point the button at the newest release's installer, so it
// stays current between deploys. The built link works without this.
(function () {
  var box = document.querySelector('[data-release]');
  if (!box || !window.fetch) return;

  fetch('https://api.github.com/repos/' + box.getAttribute('data-release') + '/releases/latest')
    .then(function (response) { return response.ok ? response.json() : null; })
    .then(function (release) {
      if (!release || !release.assets) return;
      var installer = release.assets.filter(function (a) { return /-setup\.exe$/.test(a.name); })[0]
        || release.assets.filter(function (a) { return /\.exe$/.test(a.name); })[0];
      if (!installer) return;
      var sums = release.assets.filter(function (a) { return a.name === 'SHA256SUMS.txt'; })[0];
      var version = release.tag_name.replace(/^v/, '');
      var date = new Date(release.published_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });

      function each(selector, fn) {
        Array.prototype.forEach.call(document.querySelectorAll(selector), fn);
      }
      each('[data-release-link]', function (a) { a.href = installer.browser_download_url; });
      if (sums) each('[data-release-sums]', function (a) { a.href = sums.browser_download_url; });
      each('[data-release-version]', function (el) {
        el.textContent = el.getAttribute('data-release-version') + version;
      });
      each('[data-release-date]', function (el) { el.textContent = date; });
      each('[data-release-size]', function (el) {
        el.textContent = Math.round(installer.size / 1048576) + ' MB';
        el.hidden = false;
      });
    })
    .catch(function () {});
})();

// Header: the nav pill, and a frosted band once the page has scrolled.
(function () {
  var masthead = document.querySelector('.masthead');
  var nav = document.querySelector('.nav');
  if (!masthead || !nav) return;

  var current = nav.querySelector('a[aria-current]');
  slidingPill(nav, Array.prototype.slice.call(nav.querySelectorAll('a')), function () {
    return current;
  });

  var scrolled = false;
  function onScroll() {
    var now = window.scrollY > 4;
    if (now !== scrolled) {
      scrolled = now;
      masthead.classList.toggle('is-scrolled', now);
    }
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();
