/* =====================================================================
   pendo-snippet.js - installs Pendo on the page.
   Loaded in the <head> of every page (including the iframe pages).

   Two jobs:
   1. Add the standard Pendo install snippet (downloads pendo.js).
   2. Call pendo.initialize() using whoever is in the saved session
      (see session.js). If nobody is logged in, Pendo starts as an
      anonymous visitor.

   Needs config.js and session.js to load BEFORE this file.
   ===================================================================== */

(function () {
  var apiKey = window.TS_CONFIG.pendoApiKey;

  // Don't try to load Pendo until a real key has been added in config.js.
  if (!window.TS_CONFIG.hasPendoKey) {
    console.warn('[TS] No Pendo API key set (add it in assets/js/config.js), so Pendo is not loading.');
    return;
  }

  // ----- The standard Pendo install snippet (from Pendo, unchanged) -----
  (function (p, e, n, d, o) {
    var v, w, x, y, z;
    o = p[d] = p[d] || {};
    o._q = o._q || [];
    v = ['initialize', 'identify', 'updateOptions', 'pageLoad', 'track'];
    for (w = 0, x = v.length; w < x; ++w) (function (m) {
      o[m] = o[m] || function () {
        o._q[m === v[0] ? 'unshift' : 'push']([m].concat([].slice.call(arguments, 0)));
      };
    })(v[w]);
    y = e.createElement(n);
    y.async = true;
    y.src = 'https://cdn.pendo.io/agent/static/' + apiKey + '/pendo.js';
    z = e.getElementsByTagName(n)[0];
    z.parentNode.insertBefore(y, z);
  })(window, document, 'script', 'pendo');

  // ----- Tell Pendo who this is, using the saved session -----
  var user = window.Session.get();   // null if logged out

  pendo.initialize({
    visitor: user
      ? { id: user.username, role: user.role }
      : {},                                    // empty = anonymous visitor
    account: user
      ? { id: user.account, plan: user.plan }
      : {}
  });
})();
