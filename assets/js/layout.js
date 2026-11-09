/* =====================================================================
   layout.js - builds the LEFT NAV and TOP BANNER.

   Every page that has this markup:
       <aside class="sidebar" id="sidebar"></aside>
       <header class="topbar" id="topbar"></header>
   gets the same nav + banner filled in by this file. That way, to add a
   page to the menu you edit ONE list (NAV_ITEMS below), not every page.

   Also contains:
   - the logout button behaviour
   - the "must be logged in" check for non-SPA pages
   ===================================================================== */

(function () {

  // ---------- 1. THE MENU ----------
  // The menu has two kinds of entries:
  //   a link:     { id, label, href, desc }
  //   a section:  { section: 'Name', items: [ ...links ] }   (click to expand/collapse)
  // To add a page: add a link line in the right section.
  //   "id"     = used to highlight the link when you're on that page
  //   "prefix" = (optional) keeps the link highlighted on every page whose id
  //              STARTS with this text, e.g. all the checkout steps.
  //   "desc"   = one or two sentences about the page. The "About this site"
  //              page (about.js) is built from these, so write one for every page.
  var NAV_ITEMS = [
    { id: 'login', label: 'Login', href: 'index.html#login',
      desc: 'A pretend login with no backend. The form saves a username, account, role and plan in localStorage, and Pendo is identified with those values. Logout clears them.' },
    { id: 'simulator', label: 'Activity Simulator', href: 'index.html#simulator',
      desc: 'Generates visitor activity for you: clicks, page loads, form fills and logins from fake visitors. Pick scenarios, how many visitors and how fast, then press Start.' },

    { section: 'Tagging', items: [
      { id: 'tagging', label: 'Page Elements', href: 'index.html#tagging',
        desc: 'A lot of elements to practice tagging: ids, custom attributes, identical twins, dynamic ids, elements that appear or vanish, forms, tabs, shadow DOM, repeated table rows, nested clicks, SVG icons, links and track events.' },
      { id: 'guides-modals', label: 'Modals & Banners', href: 'index.html#guides-modals',
        desc: 'Two regular modals that swap with Next and Back, a native dialog that opens in the browser\'s top layer, a banner slot and a toast.' }
    ]},

    { section: 'Multi-step Processes', items: [
      { id: 'process-1', prefix: 'process-', label: 'Project Setup', href: 'index.html#process-1',
        desc: 'A 3-step wizard where every step has its own URL. A good base for a walkthrough guide that crosses pages.' },
      { id: 'checkout-shop', prefix: 'checkout-', label: 'Checkout', href: 'index.html#checkout-shop',
        desc: 'A mock store: add products, edit the cart, apply the promo code PURPLE10, then shipping, a fake payment form, review and a thank-you page. The cart is kept in localStorage; card details are never stored.' }
    ]},

    { section: 'Frames', items: [
      { id: 'frames', label: 'Frames (separate page)', href: 'frames.html',
        desc: 'A real separate page (not part of the single-page app) with two iframes and one button outside them. Pendo is installed in each frame separately.' }
    ]},

    { section: 'Guide Targeting', items: [
      { id: 'guides-targets', label: 'Tooltip Targets', href: 'index.html#guides-targets',
        desc: 'Elements placed around the page (corners, cards, near the bottom) for tooltips to point at, plus a notification bell with a badge.' },
      { id: 'guides-scroll', label: 'Scroll Targets', href: 'index.html#guides-scroll',
        desc: 'Targets that start off screen: far down the page, at the bottom of a scrolling box, and far off to the right in a sideways strip.' },
      { id: 'guides-reveal', label: 'Scroll to Reveal', href: 'index.html#guides-reveal',
        desc: 'Targets that are hidden until you scroll them into view, using each way Pendo treats an element as not visible: visibility hidden, opacity 0 and display none.' },
      { id: 'guides-dupes', label: 'Duplicate DOM', href: 'index.html#guides-dupes',
        desc: 'The same element exists twice and only one copy is visible, with the first one in the page hidden. A Switch button swaps which copy is live.' },
      { id: 'guides-widgets', label: 'Widgets & Feedback', href: 'index.html#guides-widgets',
        desc: 'A floating help launcher, a consent bar stuck to the bottom of the window, a star rating form, a "What\'s new" list and a long scrolling area.' },
      { id: 'guides-table', label: 'Data Table', href: 'index.html#guides-table',
        desc: 'A data grid: sort by clicking headers, drag or hide and move columns, search, and an edit modal. The icon-only buttons on every row are deliberately identical.' },
      { id: 'agent', label: 'AI Agent', href: 'index.html#agent',
        desc: 'A mock chat assistant with canned replies, a typing indicator, tool-step lines, source links and copy and thumbs buttons, for practicing tagging a chat experience.' }
    ]}
  ];

  // Pinned to the BOTTOM of the left nav, outside the sections above.
  var NAV_BOTTOM = { id: 'about', label: 'About this site', href: 'index.html#about',
    desc: 'What is on this site and how to use it.' };

  // Share the list so the About page (about.js) can build itself from it.
  window.TS_NAV = { items: NAV_ITEMS, bottom: NAV_BOTTOM };


  // ---------- 2. FIGURE OUT WHERE WE ARE ----------
  // On index.html the "page" is the part after the # (e.g. "tagging").
  // On any other file (like frames.html) it's the file name.
  var onSpa = location.pathname.endsWith('index.html') || location.pathname.endsWith('/');

  function currentPageId() {
    if (onSpa) return location.hash.replace('#', '') || 'login';
    return location.pathname.split('/').pop().replace('.html', '');
  }


  // ---------- 3. BUILD THE LEFT NAV ----------
  function linkHtml(item, extraClass) {
    return '<a class="nav-link ' + extraClass + '" data-nav="' + item.id + '"' +
           (item.prefix ? ' data-prefix="' + item.prefix + '"' : '') +
           ' href="' + item.href + '">' + item.label + '</a>';
  }

  function buildSidebar() {
    var html = '<div class="brand">' + window.TS_CONFIG.siteName + '</div>';
    NAV_ITEMS.forEach(function (item) {
      if (item.section) {
        // A collapsible section: a header button + a hidden list of links.
        html += '<div class="nav-section">' +
                  '<button class="nav-section-btn" aria-expanded="false">' + item.section + '<span class="chev">▸</span></button>' +
                  '<div class="nav-sub">';
        item.items.forEach(function (sub) { html += linkHtml(sub, 'nav-sublink'); });
        html += '</div></div>';
      } else {
        html += linkHtml(item, '');
      }
    });
    // The pinned link at the very bottom (CSS pushes it down with margin-top: auto).
    html += '<div class="nav-bottom">' + linkHtml(NAV_BOTTOM, '') + '</div>';

    var sidebar = document.getElementById('sidebar');
    sidebar.innerHTML = html;

    // Clicking a section header expands / collapses it.
    sidebar.querySelectorAll('.nav-section-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var open = btn.parentElement.classList.toggle('open');
        btn.setAttribute('aria-expanded', open);
      });
    });
  }

  // Highlight the link for the current page and expand its section.
  // app.js also calls this whenever the # in the URL changes.
  window.highlightNav = function () {
    var current = currentPageId();
    document.querySelectorAll('.nav-link').forEach(function (link) {
      var prefix = link.getAttribute('data-prefix');
      var isCurrent = link.getAttribute('data-nav') === current ||
                      (prefix && current.indexOf(prefix) === 0);
      link.classList.toggle('active', isCurrent);
      if (isCurrent && link.closest('.nav-section')) {
        link.closest('.nav-section').classList.add('open');
        link.closest('.nav-section').querySelector('.nav-section-btn').setAttribute('aria-expanded', 'true');
      }
    });
    // On small screens, close the menu after picking a page.
    document.getElementById('sidebar').classList.remove('open');
  };


  // ---------- 4. BUILD THE TOP BANNER ----------
  function buildTopbar() {
    var user = window.Session.get();
    var who = user
      ? '<span class="user-chip" id="user-chip">' + escapeHtml(user.username) + ' · ' + escapeHtml(user.account) + '</span>' +
        '<button class="btn btn-outline btn-small" id="logout-btn">Logout</button>'
      : '<span class="user-chip" id="user-chip">Not logged in</span>';

    document.getElementById('topbar').innerHTML =
      '<button class="btn btn-icon menu-btn" id="menu-btn" aria-label="Open menu">☰</button>' +
      '<strong>' + window.TS_CONFIG.siteName + ' Training Site</strong>' +
      '<span class="spacer"></span>' +
      '<button class="btn btn-icon btn-small" id="theme-toggle">' +
        (window.currentTheme() === 'dark' ? '☀️ Light' : '🌙 Dark') + '</button>' +
      who;
  }

  // Stops usernames like <b>hi</b> from being treated as real HTML.
  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }


  // ---------- 5. WIRE UP THE CLICKS ----------
  function wireEvents() {
    // Theme toggle (toggleTheme comes from theme.js)
    document.getElementById('theme-toggle').addEventListener('click', window.toggleTheme);

    // Hamburger button on small screens
    document.getElementById('menu-btn').addEventListener('click', function () {
      document.getElementById('sidebar').classList.toggle('open');
    });

    // Logout: delete the saved session, then go back to the login page.
    var logout = document.getElementById('logout-btn');
    if (logout) {
      logout.addEventListener('click', function () {
        window.Session.clear();
        if (onSpa) {
          location.hash = 'login';
          location.reload();           // reload so Pendo and the banner reset
        } else {
          location.href = 'index.html#login';
        }
      });
    }
  }


  // ---------- 6. LOGIN CHECK FOR NON-SPA PAGES ----------
  // A page can opt in with <body data-require-login>. If nobody is logged
  // in we send them to the login page. (index.html does its own check in app.js.)
  if (!onSpa && document.body.hasAttribute('data-require-login') && !window.Session.isLoggedIn()) {
    location.replace('index.html#login');
    return;
  }


  // ---------- 7. EASTER EGG ----------
  // Press  ↑ ↑ ↓ ↓ ← → ← → B A  on any page to find a secret page (eyesore.html).
  // It is left out of the nav and the About page on purpose. We ignore keys
  // typed into form fields so normal typing can't set it off by accident.
  var KONAMI = ['ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight', 'b', 'a'];
  var recentKeys = [];                             // the last few keys pressed (as many as the code is long)

  document.addEventListener('keydown', function (event) {
    var target = event.target;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName) || target.isContentEditable) return;

    // Remember this key, keeping only the most recent ones.
    recentKeys.push(event.key.length === 1 ? event.key.toLowerCase() : event.key);
    recentKeys = recentKeys.slice(-KONAMI.length);

    // If the last 10 keys are exactly the code, off we go. (Checking the
    // "last 10" means stray keys before the code don't matter.)
    if (recentKeys.join(',') === KONAMI.join(',')) {
      recentKeys = [];
      location.href = 'eyesore.html';
    }
  });


  // ---------- 8. GO! ----------
  buildSidebar();
  buildTopbar();
  wireEvents();
  window.highlightNav();

})();
