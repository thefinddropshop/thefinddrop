(function () {
  function getBasePath() {
    try {
      var host = window.location.hostname || '';
      var pathname = window.location.pathname || '/';
      if (host.endsWith('github.io')) {
        var parts = pathname.split('/').filter(Boolean);
        if (parts.length > 0) {
          return '/' + parts[0] + '/';
        }
      }
    } catch (error) {
      console.warn(error);
    }
    return '/';
  }

  function toBasePath(value) {
    if (!value) return value;
    if (/^(https?:)?\/\//i.test(value) || value.indexOf('mailto:') === 0 || value.indexOf('tel:') === 0 || value.indexOf('#') === 0 || value.indexOf('data:') === 0) {
      return value;
    }
    if (value.charAt(0) === '/') {
      return (window.__FINDDROP_BASE || '/').replace(/\/$/, '') + value;
    }
    return value;
  }

  window.__FINDDROP_BASE = getBasePath();
  window.__FINDDROP_TO_BASE = toBasePath;

  function rewriteElements(selector, attribute) {
    var elements = document.querySelectorAll(selector);
    Array.prototype.forEach.call(elements, function (element) {
      var value = element.getAttribute(attribute);
      if (value) {
        element.setAttribute(attribute, toBasePath(value));
      }
    });
  }

  function apply() {
    rewriteElements('a[href^="/"]', 'href');
    rewriteElements('link[href^="/"]', 'href');
    rewriteElements('img[src^="/"]', 'src');
    rewriteElements('script[src^="/"]', 'src');
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply);
  } else {
    apply();
  }
})();
