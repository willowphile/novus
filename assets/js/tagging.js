/* =====================================================================
   tagging.js - small behaviors for the Tagging page.
   Most of the tagging page is plain HTML (see index.html). This file only
   handles the few elements that need to MOVE, CHANGE or APPEAR so they're
   more interesting to tag. Each block below says what it does.
   ===================================================================== */

(function () {

  // Small helper: run a function when a clicked element matches an id.
  function onClick(id, fn) {
    var el = document.getElementById(id);
    if (el) el.addEventListener('click', fn);
  }

  // Small helper: send a custom event to Pendo (only if Pendo has loaded).
  function track(name, props) {
    if (window.pendo && pendo.track) pendo.track(name, props);
    console.log('[track]', name, props);
  }


  // ---------- DYNAMIC IDs ----------
  // These buttons get a NEW random id every time the page loads, so you
  // can't tag them by id. Right-click > Inspect to see the id change on refresh.
  document.querySelectorAll('.dynamic-id').forEach(function (btn) {
    btn.id = 'btn-' + Math.random().toString(36).slice(2, 8);
  });


  // ---------- SHOW / HIDE ----------
  // Clicking toggles a message. Great for "the element isn't always there".
  onClick('toggle-secret', function () {
    document.getElementById('secret-box').classList.toggle('hidden');
  });

  // This button is added to the page 4 seconds after load (it doesn't exist
  // in the HTML at first). Tag it by waiting for it, or by using Pendo's
  // Designer after it shows up.
  setTimeout(function () {
    var holder = document.getElementById('late-holder');
    if (!holder) return;
    holder.innerHTML = '<button class="btn" id="late-button">I showed up late</button>';
  }, 4000);

  // Clicking this one REMOVES itself from the page after the click.
  onClick('vanishing-button', function () {
    document.getElementById('vanishing-button').remove();
  });


  // ---------- TABS ----------
  // Click a tab button -> show the panel with the matching data-tab name.
  document.querySelectorAll('.tab').forEach(function (tab) {
    tab.addEventListener('click', function () {
      var name = tab.getAttribute('data-tab');
      document.querySelectorAll('.tab').forEach(function (t) { t.classList.toggle('active', t === tab); });
      document.querySelectorAll('.tab-panel').forEach(function (p) {
        p.classList.toggle('active', p.getAttribute('data-panel') === name);
      });
    });
  });


  // ---------- CLICK COUNTER ----------
  // Shows that one element can be clicked many times.
  var count = 0;
  onClick('counter-btn', function () {
    count++;
    document.getElementById('counter-value').textContent = count;
  });


  // ---------- SHADOW DOM ----------
  // Elements inside a "shadow root" are hidden from normal page queries.
  // This builds one so you can practice tagging inside it.
  var host = document.getElementById('shadow-host');
  if (host && host.attachShadow) {
    var shadow = host.attachShadow({ mode: 'open' });
    shadow.innerHTML =
      '<style>button{font:inherit;font-weight:600;padding:.5rem 1rem;border-radius:8px;' +
      'border:1px solid #7c3aed;background:#7c3aed;color:#fff;cursor:pointer}</style>' +
      '<button class="shadow-btn">I live in the Shadow DOM</button>';
    shadow.querySelector('button').addEventListener('click', function () {
      track('Shadow Button Clicked', {});
    });
  }


  // ---------- REPEATED TABLE ROWS ----------
  // Every "Delete" button removes its own row. Edit just logs which row.
  document.querySelectorAll('.row-delete').forEach(function (btn) {
    btn.addEventListener('click', function () { btn.closest('tr').remove(); });
  });
  document.querySelectorAll('.row-edit').forEach(function (btn) {
    btn.addEventListener('click', function () {
      console.log('[edit]', btn.closest('tr').firstElementChild.textContent);
    });
  });


  // ---------- NESTED CLICKS ----------
  // Prints what was ACTUALLY clicked (event.target), even if it was a small
  // element inside the button. Pendo has to work out which element to credit.
  ['nested-btn', 'nested-card'].forEach(function (id) {
    document.getElementById(id).addEventListener('click', function (event) {
      var t = event.target;
      document.getElementById('nested-log').textContent =
        '<' + t.tagName.toLowerCase() + (t.className ? ' class="' + t.className + '"' : '') + '>';
    });
  });


  // ---------- SLIDER ----------
  // Updates the number next to the slider as it moves.
  var slider = document.getElementById('slider');
  if (slider) {
    slider.addEventListener('input', function () {
      document.getElementById('slider-value').textContent = slider.value;
    });
  }


  // ---------- TRACK EVENTS (things that aren't clicks) ----------
  // Pressing Enter in the search box sends a custom event with what was typed.
  var search = document.getElementById('search-input');
  if (search) {
    search.addEventListener('keydown', function (event) {
      if (event.key === 'Enter') {
        track('Search Term', { term: search.value });
        search.value = '';
      }
    });
  }

  // Changing the dropdown sends a custom event with the chosen value.
  var flavor = document.getElementById('flavor-select');
  if (flavor) {
    flavor.addEventListener('change', function () {
      track('Flavor Chosen', { flavor: flavor.value });
    });
  }

})();
