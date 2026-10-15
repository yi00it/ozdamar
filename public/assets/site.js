// Light by default; the footer toggle switches to dark and remembers it.
(function () {
  var root = document.documentElement;
  var toggles = document.querySelectorAll('[data-theme-toggle]');

  function isDark() {
    return root.getAttribute('data-theme') === 'dark';
  }

  function sync() {
    var dark = isDark();
    Array.prototype.forEach.call(toggles, function (el) {
      el.setAttribute('aria-pressed', String(dark));
      el.textContent = dark ? 'Light mode' : 'Dark mode';
    });
  }

  Array.prototype.forEach.call(toggles, function (el) {
    el.addEventListener('click', function () {
      var next = isDark() ? 'light' : 'dark';
      root.setAttribute('data-theme', next);
      try { localStorage.setItem('theme', next); } catch (e) {}
      sync();
    });
  });

  sync();
})();

// One pill per capsule (header nav, Shelf and Uses switches): it slides to the
// hovered or focused item and back to the current one.
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

  buttons.forEach(function (b, i) {
    b.addEventListener('click', function () {
      var name = b.getAttribute('data-tab');
      show(name);
      history.replaceState(null, '', '#' + name);
    });
    b.addEventListener('keydown', function (e) {
      if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
      var next = buttons[(i + (e.key === 'ArrowRight' ? 1 : buttons.length - 1)) % buttons.length];
      show(next.getAttribute('data-tab'), true);
      history.replaceState(null, '', '#' + next.getAttribute('data-tab'));
    });
  });

  var initial = location.hash.slice(1);
  tabs.hidden = false;
  document.documentElement.classList.add('has-tabs');
  show(names.indexOf(initial) >= 0 ? initial : names[0]);
  settle = slidingPill(tabs, buttons, function () {
    return tabs.querySelector('[aria-selected="true"]');
  });
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
