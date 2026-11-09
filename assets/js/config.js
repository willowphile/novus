/* =====================================================================
   config.js - the ONE place for settings you might want to change.
   Loaded first on every page.
   ===================================================================== */

window.TS_CONFIG = {
  // Your Pendo subscription's API key. Find it in Pendo under
  // Settings > Subscription Settings > App Details > Install Settings.
  // While this is still the placeholder text, Pendo will NOT load
  // (the site works fine without it, you just won't see any data).
  // Also make sure the domain you host this site on is allowed in your
  // Pendo subscription's settings.
  // If you change this key, change it in assets/js/pendo-snippet.js too.
  pendoApiKey: '5e02edf6-4111-42d4-9158-d8e18b9706d8',

  // The name shown at the top of the left nav.
  siteName: 'TS'
};

// true once a real key has been pasted in above (other scripts check this)
window.TS_CONFIG.hasPendoKey =
  !!window.TS_CONFIG.pendoApiKey && window.TS_CONFIG.pendoApiKey !== 'YOUR-PENDO-API-KEY';
