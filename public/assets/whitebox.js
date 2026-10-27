// Whitebox's page at /whitebox/: point the download buttons at the newest
// release's installer, so they stay current between deploys. The built
// links work without this.
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
