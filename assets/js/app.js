/* =====================================================================
   app.js - the "single page" part of the single-page app (index.html).

   index.html holds many <section class="page" data-page="..."> blocks.
   Only one is visible at a time. Which one is decided by the part of the
   URL after the "#":
       index.html#tagging   -> shows <section data-page="tagging">
       index.html#login     -> shows <section data-page="login">

   This file:
   1. Shows the right page when the URL changes (the "router")
   2. Sends logged-out people to the login page
   3. Handles the login form
   4. Handles the next/back buttons in the multi-step process

   Needs layout.js to load first (it provides window.highlightNav).
   ===================================================================== */

(function () {

  // ---------- 1. THE ROUTER ----------
  function showPage() {
    var id = location.hash.replace('#', '');

    // Rule: if you're not logged in, the only page you can see is login.
    if (!window.Session.isLoggedIn() && id !== 'login') {
      location.hash = 'login';     // this triggers showPage() again
      return;
    }

    // Logged in with no page chosen? Go to tagging. Logged in and on login? Show it anyway
    // (so you can see your saved info or switch user).
    if (!id) id = window.Session.isLoggedIn() ? 'tagging' : 'login';

    // Hide every page, then show the one we want.
    var found = false;
    document.querySelectorAll('.page').forEach(function (page) {
      var match = page.getAttribute('data-page') === id;
      page.classList.toggle('active', match);
      if (match) found = true;
    });

    // Unknown page name? Fall back to the login page.
    if (!found) { location.hash = 'login'; return; }

    // Starting the Project Setup wizard again? Bring back the Finish button.
    if (id === 'process-1') {
      document.getElementById('process-done').classList.add('hidden');
      document.getElementById('process-finish').classList.remove('hidden');
    }

    window.scrollTo(0, 0);
    window.highlightNav();      // update the active link in the left nav
    showSessionInfo();          // refresh the "currently logged in as" box
  }

  window.addEventListener('hashchange', showPage);   // runs whenever the # changes


  // ---------- 2 & 3. THE LOGIN FORM ----------
  var form = document.getElementById('login-form');

  form.addEventListener('submit', function (event) {
    event.preventDefault();     // stop the browser from reloading the page

    // Read the four form fields and save them as the session.
    window.Session.save({
      username: document.getElementById('login-username').value.trim(),
      account:  document.getElementById('login-account').value.trim(),
      role:     document.getElementById('login-role').value,
      plan:     document.getElementById('login-plan').value
    });

    // Reload (rather than just changing the page) so the banner, nav and
    // pendo.initialize() all pick up the new user.
    location.hash = 'tagging';
    location.reload();
  });

  // Fill the form with the saved values (handy for "switching" users).
  function prefillForm() {
    var user = window.Session.get();
    if (!user) return;
    document.getElementById('login-username').value = user.username || '';
    document.getElementById('login-account').value  = user.account  || '';
    document.getElementById('login-role').value     = user.role     || 'learner';
    document.getElementById('login-plan').value     = user.plan     || 'free';
  }

  // Show what is currently saved in localStorage, on the login page.
  function showSessionInfo() {
    var box = document.getElementById('session-info');
    var user = window.Session.get();
    box.classList.toggle('hidden', !user);
    if (user) {
      box.textContent = 'Saved in localStorage → ' + JSON.stringify(user);
    }
  }


  // ---------- 3b. "NO PENDO KEY" NOTICE ----------
  // Show the setup reminder on the login page until a key is in config.js.
  document.getElementById('no-key-notice').classList.toggle('hidden', window.TS_CONFIG.hasPendoKey);


  // ---------- 4. THE MULTI-STEP PROCESS ----------
  // Buttons marked data-goto="process-2" etc. just change the URL hash.
  // Because each step is a different URL, Pendo sees them as different
  // pages - perfect for practicing a walkthrough guide.
  document.querySelectorAll('[data-goto]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      location.hash = btn.getAttribute('data-goto');
    });
  });

  // The final step "completes" the process.
  document.getElementById('process-finish').addEventListener('click', function () {
    document.getElementById('process-done').classList.remove('hidden');
    document.getElementById('process-finish').classList.add('hidden');
  });


  // ---------- GO! ----------
  prefillForm();
  showPage();

})();
