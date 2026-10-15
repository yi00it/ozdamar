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
