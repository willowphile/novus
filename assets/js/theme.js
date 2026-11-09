/* =====================================================================
   theme.js - light / dark mode.

   How it works:
   - The choice ("light" or "dark") is saved in localStorage under "ts.theme".
   - We put it on the <html> tag as data-theme="dark". The CSS (style.css)
     reads that attribute and swaps all the colors.
   - This file runs in the <head> so the right theme is applied BEFORE the
     page paints (otherwise you'd see a white flash in dark mode).
   ===================================================================== */

(function () {
  var KEY = 'ts.theme';

  // Use the saved choice; if none, follow the computer's own light/dark setting.
  function getTheme() {
    var saved = localStorage.getItem(KEY);
    if (saved) return saved;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  // Apply a theme to the page.
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  // Apply immediately on load.
  setTheme(getTheme());

  // Called by the toggle button in the top banner (see layout.js).
  window.toggleTheme = function () {
    var next = getTheme() === 'dark' ? 'light' : 'dark';
    localStorage.setItem(KEY, next);
    setTheme(next);
    // Keep the button label in sync, if the button exists yet.
    var btn = document.getElementById('theme-toggle');
    if (btn) btn.textContent = next === 'dark' ? '☀️ Light' : '🌙 Dark';
  };

  window.currentTheme = getTheme;
})();
