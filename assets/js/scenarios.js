/* =====================================================================
   scenarios.js - the SHARED list of things a simulated visitor can do.

   Two different programs read this one file:
     1. assets/js/simulator.js   (runs inside the browser, from the site)
     2. automation/run.js        (runs from Node using Playwright)
   So you write a scenario ONCE and both can play it. This file has no
   dependencies and works in a browser and in Node.

   ---------------------------------------------------------------------
   STEP VOCABULARY  (every step is a small object)

   Things a visitor does:
     { goto: 'tagging' }                  go to a page of the single-page app
     { goto: 'frames.html' }              go to a separate page (full page load)
     { click: '#some-id' }                click an element (CSS selector)
     { click: '#x', frame: 'iframe[title="Frame A"]' }
                                          ...inside an iframe on the page
     { clickRandom: '.add-to-cart' }      click ONE random match of the selector
     { fill: '#input', value: 'text' }    type into a field (value '' clears it)
     { select: '#dropdown', value: 'x' }  choose a dropdown option
     { check: '#box' }                    tick a checkbox/radio ({ on: false } unticks)
     { press: '#input', key: 'Enter' }    press a key in an element
     { scroll: '.some-element' }          scroll an element into view
     { waitFor: '#thing' }                wait until it exists (up to 10s)
     { wait: 1500 }                       just wait (milliseconds)
     { log: 'hello' }                     print a message in the run log

   Control steps (expanded BEFORE running, by flatten() below):
     { repeat: 3, steps: [ ... ] }        do the steps 3 times
     { maybe: 0.5, steps: [ ... ] }       do the steps 50% of the time
     { run: 'checkout' }                  insert another scenario here
     { runRandom: ['a','b','c'], count: 2 }  insert 2 random ones from the list

   Selectors must be plain CSS. Steps that can't find their element are
   skipped with a warning, so one broken step doesn't stop a run.
   ===================================================================== */

(function (root) {

  var S = {};

  // ---------- VISITORS ----------
  // makePersona(0), makePersona(1)... always give the SAME people, so running
  // the simulator twice shows the same returning visitors. Start from a higher
  // number (the "first visitor #" option) to get brand new ones.
  var NAMES    = ['ada', 'grace', 'linus', 'margaret', 'alan', 'katherine', 'tim', 'radia', 'dennis', 'barbara', 'edsger', 'donald'];
  var ACCOUNTS = ['acme-corp', 'globex', 'initech', 'umbrella', 'hooli', 'stark-industries'];
  var ROLES    = ['learner', 'admin', 'manager'];
  var PLANS    = ['free', 'pro', 'enterprise'];

  S.makePersona = function (i) {
    var round = Math.floor(i / NAMES.length);                 // 2nd time through the names adds a number
    var accountIndex = i % ACCOUNTS.length;
    return {
      username: 'sim-' + NAMES[i % NAMES.length] + (round ? round + 1 : '') + '@example.com',
      account:  ACCOUNTS[accountIndex],
      role:     ROLES[(i * 7) % ROLES.length],
      plan:     PLANS[accountIndex % PLANS.length]             // the plan belongs to the account
    };
  };

  // The steps for logging in / out through the site's real login form.
  S.loginSteps = function (p) {
    return [
      { goto: 'login' },
      { fill: '#login-username', value: p.username },
      { fill: '#login-account',  value: p.account },
      { select: '#login-role',   value: p.role },
      { select: '#login-plan',   value: p.plan },
      { click: '#login-submit' }        // the site reloads after this
    ];
  };
  S.logoutSteps = function () { return [{ click: '#logout-btn' }]; };


  // ---------- THE SCENARIOS ----------
  S.scenarios = {

    'tour': {
      title: 'Quick tour',
      description: 'Visits the main pages without clicking much.',
      steps: [
        { goto: 'tagging' }, { wait: 800 },
        { goto: 'guides-modals' }, { wait: 800 },
        { goto: 'guides-targets' }, { wait: 800 },
        { goto: 'guides-table' }, { wait: 800 },
        { goto: 'agent' }, { wait: 800 },
        { goto: 'checkout-shop' }
      ]
    },

    'tagging-clicks': {
      title: 'Tagging page clicks',
      description: 'Clicks a spread of elements on the Page Elements page.',
      steps: [
        { goto: 'tagging' },
        { click: '#easy-save' }, { click: '#easy-cancel' }, { click: '#easy-export' },
        { click: '[data-pendo-id="coffee"]' },
        { clickRandom: '.twin button' },
        { clickRandom: '.dynamic-id' },
        { click: '#toggle-secret' }, { click: '#secret-button' },
        { repeat: 3, steps: [{ click: '#counter-btn' }] },
        { click: '[data-tab="two"]' }, { click: '#panel-two-btn' },
        { fill: '#form-name', value: 'Sim Visitor' },
        { check: '#form-newsletter' },
        { select: '#form-color', value: 'Violet' },
        { click: '#form-submit' },
        { fill: '#search-input', value: 'purple things' },
        { press: '#search-input', key: 'Enter' },
        { select: '#flavor-select', value: 'Lavender' },
        { clickRandom: '.row-edit' },
        { click: '#nested-btn .nested-label strong' }
      ]
    },

    'checkout': {
      title: 'Checkout',
      description: 'Adds random items to the cart and completes the whole checkout.',
      steps: [
        { goto: 'checkout-shop' },
        { repeat: 3, steps: [{ clickRandom: '.add-to-cart' }] },
        { click: '#shop-cart-btn' },
        { click: '.cart-line .qty-plus' },
        { maybe: 0.5, steps: [{ fill: '#promo-input', value: 'PURPLE10' }, { click: '#promo-apply' }] },
        { click: '#cart-checkout' },
        { fill: '#ship-name',    value: 'Sim Visitor' },
        { fill: '#ship-address', value: '1 Example Street' },
        { fill: '#ship-city',    value: 'Raleigh' },
        { fill: '#ship-zip',     value: '27601' },
        { maybe: 0.4, steps: [{ check: 'input[name="ship-method"][value="express"]' }] },
        { click: '#ship-next' },
        { fill: '#pay-name',   value: 'Sim Visitor' },
        { fill: '#pay-number', value: '0000 0000 0000 0000' },    // obviously fake
        { fill: '#pay-exp',    value: '12/30' },
        { fill: '#pay-cvc',    value: '000' },
        { click: '#pay-next' },
        { click: '#place-order' },
        { wait: 800 },
        { click: '#done-again' }
      ]
    },

    'checkout-abandon': {
      title: 'Checkout (abandoned)',
      description: 'Fills a cart, starts checkout, then gives up part-way. Good for funnels.',
      steps: [
        { goto: 'checkout-shop' },
        { repeat: 2, steps: [{ clickRandom: '.add-to-cart' }] },
        { click: '#shop-cart-btn' },
        { click: '#cart-checkout' },
        { fill: '#ship-name',    value: 'Sim Visitor' },
        { fill: '#ship-address', value: '1 Example Street' },
        { fill: '#ship-city',    value: 'Raleigh' },
        { fill: '#ship-zip',     value: '27601' },
        { click: '#ship-next' },
        { click: '#pay-back' },
        { goto: 'tagging' }
      ]
    },

    'agent-chat': {
      title: 'AI agent chat',
      description: 'Has a short conversation with the mock agent and rates an answer.',
      steps: [
        { goto: 'agent' },
        { clickRandom: '#chat-suggestions .chip' },
        { waitFor: '#chat-send:not([disabled])' },
        { clickRandom: '#chat-log > .msg:last-child .msg-action' },
        { fill: '#chat-input', value: 'How do I tag a button?' },
        { press: '#chat-input', key: 'Enter' },
        { waitFor: '#chat-send:not([disabled])' },
        { click: '#chat-log > .msg:last-child .action-up' },
        { maybe: 0.5, steps: [
          { fill: '#chat-input', value: 'thanks' },
          { click: '#chat-send' },
          { waitFor: '#chat-send:not([disabled])' }
        ]},
        { maybe: 0.3, steps: [{ click: '#agent-new-chat' }] }
      ]
    },

    'table-play': {
      title: 'Data table',
      description: 'Sorts, changes columns, searches, and edits a row.',
      steps: [
        { goto: 'guides-table' },
        { click: 'th[data-key="score"]' }, { click: 'th[data-key="score"]' },
        { click: 'th[data-key="name"]' },
        { click: '#columns-btn' },
        { click: '.col-item[data-key="email"] .col-check' },
        { click: '.col-item[data-key="email"] .col-up' },
        { click: 'h1.page-title' },                                // click away to close the menu
        { fill: '#table-search', value: 'support' },
        { fill: '#table-search', value: '' },
        { click: '#data-table tbody tr:first-child .icon-btn:nth-child(1)' },   // pencil opens the modal
        { fill: '#edit-role', value: 'Principal' },
        { click: '#row-save' },
        { maybe: 0.5, steps: [{ click: '#data-table tbody tr:first-child .icon-btn:nth-child(2)' }] },
        { click: '#table-reset' }
      ]
    },

    'guides-browse': {
      title: 'Guide pages',
      description: 'Opens modals, banners, widgets, scroll targets and the duplicate DOM page.',
      steps: [
        { goto: 'guides-modals' },
        { click: '#open-modal-1' }, { click: '#modal-1-next' }, { click: '#modal-2-confirm' },
        { click: '#open-top-layer' }, { click: '#top-layer-ok' },
        { click: '#toggle-banner' }, { click: '#banner-dismiss' }, { click: '#show-toast' },
        { goto: 'guides-widgets' },
        { click: '#launcher-btn' }, { click: '#launcher-item-1' },
        { click: '.star[data-value="4"]' },
        { fill: '#feedback-text', value: 'Nice site' }, { click: '#feedback-submit' },
        { click: '#consent-accept' },
        { goto: 'guides-dupes' }, { click: '.dup-toggle' },
        { goto: 'guides-targets' }, { click: '#bell-btn' }, { click: '#target-card-1' },
        { goto: 'guides-scroll' }, { click: '#scroll-jump-bottom' }, { wait: 1200 }, { click: '#scroll-bottom-target' },
        { goto: 'guides-reveal' }, { scroll: '.reveal-holder' }, { wait: 600 }, { click: '#reveal-visibility' }
      ]
    },

    'frames': {
      title: 'Frames page',
      description: 'Loads the separate frames page and clicks inside each iframe.',
      steps: [
        { goto: 'frames.html' },
        { click: '#not-a-frame' },
        { click: '#frame-a-primary',   frame: 'iframe[title="Frame A"]' },
        { click: '#frame-b-toggle',    frame: 'iframe[title="Frame B"]' },
        { click: 'button.btn',         frame: 'iframe[title="Frame B"]' },
        { goto: 'index.html#tagging' }
      ]
    },

    'project-setup': {
      title: 'Project setup wizard',
      description: 'Completes the 3-step Project Setup process.',
      steps: [
        { goto: 'process-1' },
        { fill: '#project-name', value: 'Sim project' },
        { fill: '#project-desc', value: 'Made by the simulator' },
        { click: '#step-1-next' },
        { click: '#setting-notify' },
        { click: '#step-2-next' },
        { click: '#process-finish' }
      ]
    },

    'browse-session': {
      title: 'Random browsing session',
      description: 'Picks two random scenarios, like a real person wandering around.',
      steps: [
        { runRandom: ['tagging-clicks', 'checkout', 'checkout-abandon', 'agent-chat', 'table-play', 'guides-browse', 'frames', 'project-setup'], count: 2 }
      ]
    }
  };


  // ---------- EXPANDING CONTROL STEPS ----------
  // Turns a nested list of steps into a flat list of plain actions.
  // (repeat / maybe / run / runRandom are resolved here, once, up front.)
  S.flatten = function (steps, rand) {
    rand = rand || Math.random;
    var out = [];
    (steps || []).forEach(function (step) {
      if (step.repeat) {
        for (var i = 0; i < step.repeat; i++) out = out.concat(S.flatten(step.steps, rand));
      } else if (step.maybe !== undefined) {
        if (rand() < step.maybe) out = out.concat(S.flatten(step.steps, rand));
      } else if (step.run) {
        var scenario = S.scenarios[step.run];
        if (scenario) out = out.concat(S.flatten(scenario.steps, rand));
      } else if (step.runRandom) {
        var pool = step.runRandom.slice();
        for (var n = 0; n < (step.count || 1) && pool.length; n++) {
          var pick = pool.splice(Math.floor(rand() * pool.length), 1)[0];
          out = out.concat(S.flatten([{ run: pick }], rand));
        }
      } else {
        out.push(step);
      }
    });
    return out;
  };

  // One visitor's whole run: log in, do the scenarios, log out.
  // (withLogin = false means "stay as whoever is logged in right now".)
  S.buildJob = function (persona, scenarioNames, withLogin, rand) {
    var steps = [];
    if (withLogin) steps = steps.concat(S.loginSteps(persona));
    scenarioNames.forEach(function (name) { steps.push({ run: name }); });
    if (withLogin) steps = steps.concat(S.logoutSteps());
    return S.flatten(steps, rand);
  };

  // A short readable description of a step (for logs).
  S.describe = function (step) {
    var verb = Object.keys(step).filter(function (k) { return k !== 'value' && k !== 'frame' && k !== 'key' && k !== 'on'; })[0];
    return verb + ' ' + JSON.stringify(step[verb]) + (step.value !== undefined ? ' = ' + JSON.stringify(step.value) : '') + (step.frame ? ' (in frame)' : '');
  };

  // Browser: window.TS_SCENARIOS    Node: require('.../scenarios.js')
  if (typeof module !== 'undefined' && module.exports) module.exports = S;
  else root.TS_SCENARIOS = S;

})(typeof window !== 'undefined' ? window : this);
