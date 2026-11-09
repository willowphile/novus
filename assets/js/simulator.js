/* =====================================================================
   simulator.js - the ACTIVITY SIMULATOR that runs inside the browser.

   It plays the scenarios from scenarios.js by clicking, typing and
   navigating on the real pages, one step at a time, with random "think
   time" between steps. Pendo sees it as ordinary visitor activity.

   The tricky part: logging in, logging out and opening frames.html all
   RELOAD the page, which would normally wipe out this script. So the whole
   run (who, which step we're on) is saved in sessionStorage after every
   step. When a page loads and a run is active, we pick up where we left off.

   Loaded on index.html AND frames.html (so a run can continue there).

   Sections: 1. state  2. finding + clicking elements  3. running a step
             4. the run loop  5. starting/stopping  6. the page UI
             7. start-up (including starting from a link)
   ===================================================================== */

(function () {

  var S = window.TS_SCENARIOS;
  var KEY = 'ts.sim';                                   // where the run is saved
  var SPEED = { fast: 0.25, normal: 1, slow: 2 };          // multiplies the think time
  var running = false;                                     // is THIS page's loop going?


  // ---------- 1. STATE (saved in sessionStorage) ----------
  // state = {
  //   active, finished,
  //   opts:  { scenarios:[names], visitors, loops, speed, mode, start },
  //   loop, job,         which loop / which visitor we're on
  //   steps, step,       the current visitor's flat step list + our position
  //   done, failed,      counters
  //   log:[ ...lines ]
  // }
  function load() {
    try { return JSON.parse(sessionStorage.getItem(KEY)); } catch (e) { return null; }
  }
  function save(state) { sessionStorage.setItem(KEY, JSON.stringify(state)); }

  // Load the state, let a function change it, save it. Used for every update,
  // so a "Stop" click made in between is never overwritten by stale data.
  function update(change) {
    var state = load();
    if (!state) return null;
    change(state);
    save(state);
    return state;
  }

  function log(line) {
    var stamp = new Date().toLocaleTimeString();
    console.log('[sim]', line);
    update(function (s) { s.log.push(stamp + '  ' + line); if (s.log.length > 300) s.log.shift(); });
  }


  // ---------- 2. FINDING AND CLICKING ELEMENTS ----------
  function pause(ms) { return new Promise(function (resolve) { setTimeout(resolve, ms); }); }
  function rand(min, max) { return min + Math.random() * (max - min); }

  // The document to search: the page, or an iframe's document.
  function docFor(step) {
    if (!step.frame) return document;
    var frame = document.querySelector(step.frame);
    return frame && frame.contentDocument ? frame.contentDocument : null;
  }

  // "Visible" the way Pendo counts it: not display:none, not
  // visibility:hidden, and not opacity:0 (on the element or any parent).
  function isVisible(el) {
    var win = el.ownerDocument.defaultView;
    if (!el.getClientRects().length) return false;                // display:none anywhere above
    if (win.getComputedStyle(el).visibility === 'hidden') return false;
    for (var node = el; node && node.nodeType === 1; node = node.parentElement) {
      if (win.getComputedStyle(node).opacity === '0') return false;
    }
    return true;
  }

  // Wait until a match exists (and, if asked, is visible). Gives up after the timeout.
  async function waitFor(step, selector, needVisible, timeout) {
    var end = Date.now() + (timeout || 8000);
    while (Date.now() < end) {
      var doc = docFor(step);
      var found = doc ? Array.prototype.slice.call(doc.querySelectorAll(selector)) : [];
      if (needVisible) found = found.filter(isVisible);
      if (found.length) return found;
      await pause(100);
    }
    throw new Error('not found: ' + selector);
  }

  // Click like a mouse would: press, release, click, at the element's centre.
  function clickElement(el) {
    var win = el.ownerDocument.defaultView;
    el.scrollIntoView({ block: 'center' });
    var box = el.getBoundingClientRect();
    var init = { bubbles: true, cancelable: true, view: win, button: 0,
                 clientX: box.left + box.width / 2, clientY: box.top + box.height / 2 };
    ['mousedown', 'mouseup', 'click'].forEach(function (type) {
      if (type === 'mousedown' && el.focus) el.focus();
      el.dispatchEvent(new win.MouseEvent(type, init));
    });
  }

  // Set a field's value the way the browser does (so the page's own
  // "input"/"change" listeners fire), a few characters at a time.
  async function typeInto(el, text) {
    var win = el.ownerDocument.defaultView;
    var proto = el.tagName === 'TEXTAREA' ? win.HTMLTextAreaElement.prototype : win.HTMLInputElement.prototype;
    var setValue = Object.getOwnPropertyDescriptor(proto, 'value').set;
    el.focus();
    setValue.call(el, '');
    el.dispatchEvent(new win.Event('input', { bubbles: true }));
    for (var i = 1; i <= text.length; i++) {
      setValue.call(el, text.slice(0, i));
      el.dispatchEvent(new win.Event('input', { bubbles: true }));
      await pause(20);
    }
    el.dispatchEvent(new win.Event('change', { bubbles: true }));
  }


  // ---------- 3. RUNNING ONE STEP ----------
  var onSpa = function () { return /(index\.html|\/)$/.test(location.pathname); };

  async function runStep(step, state) {
    // --- goto: a page name, or a file ---
    if (step.goto !== undefined) {
      var target = step.goto;
      if (target.indexOf('.html') !== -1) {
        var url = new URL(target, location.href);
        if (url.pathname === location.pathname) {          // same page: only the #hash changes
          location.hash = url.hash.slice(1);
          await pause(400);
          return;
        }
        location.href = url.href;                          // a real page load...
        return new Promise(function () {});                // ...so wait here for it to unload
      }
      if (onSpa()) {
        location.hash = target;
        await pause(400);
        return;
      }
      location.href = new URL('index.html', location.href).href + '#' + target;
      return new Promise(function () {});
    }

    if (step.click !== undefined) {
      var el = (await waitFor(step, step.click, true))[0];
      clickElement(el);
    } else if (step.clickRandom !== undefined) {
      var options = await waitFor(step, step.clickRandom, true);
      clickElement(options[Math.floor(Math.random() * options.length)]);
    } else if (step.fill !== undefined) {
      await typeInto((await waitFor(step, step.fill, true))[0], step.value);
    } else if (step.select !== undefined) {
      var dropdown = (await waitFor(step, step.select, true))[0];
      dropdown.value = step.value;
      dropdown.dispatchEvent(new dropdown.ownerDocument.defaultView.Event('change', { bubbles: true }));
    } else if (step.check !== undefined) {
      var box = (await waitFor(step, step.check, true))[0];
      if (box.checked !== (step.on !== false)) clickElement(box);
    } else if (step.press !== undefined) {
      var field = (await waitFor(step, step.press, true))[0];
      var win = field.ownerDocument.defaultView;
      ['keydown', 'keyup'].forEach(function (type) {
        field.dispatchEvent(new win.KeyboardEvent(type, { key: step.key, bubbles: true, cancelable: true }));
      });
    } else if (step.scroll !== undefined) {
      (await waitFor(step, step.scroll, false))[0].scrollIntoView({ block: 'center' });
      await pause(300);
    } else if (step.waitFor !== undefined) {
      await waitFor(step, step.waitFor, false, 10000);
    } else if (step.wait !== undefined) {
      await pause(step.wait);
    } else if (step.log !== undefined) {
      log(step.log);
    }
  }


  // ---------- 4. THE RUN LOOP ----------
  // Wait for Pendo to be ready (only if a key is set) so early clicks aren't missed.
  async function waitForPendo() {
    if (!window.TS_CONFIG || !window.TS_CONFIG.hasPendoKey) return;
    for (var i = 0; i < 100; i++) {                         // up to ~10 seconds
      if (window.pendo && typeof pendo.isReady === 'function' && pendo.isReady()) return;
      await pause(100);
    }
    log('Pendo did not report ready; carrying on anyway');
  }

  // Build the step list for visitor number "job" in this run.
  function buildSteps(opts, job) {
    var withLogin = opts.mode === 'generate';
    var persona = S.makePersona(opts.start + job);
    return { persona: persona, steps: S.buildJob(persona, opts.scenarios, withLogin) };
  }

  // Move to the next visitor / next loop, or finish the run.
  function nextJob(state) {
    var visitorsPerLoop = state.opts.mode === 'generate' ? state.opts.visitors : 1;
    state.job++;
    if (state.job >= visitorsPerLoop) {
      state.job = 0;
      state.loop++;
      if (state.loop >= state.opts.loops) { state.active = false; state.finished = true; return; }
    }
    var next = buildSteps(state.opts, state.job);
    state.persona = next.persona;
    state.steps = next.steps;
    state.step = 0;
  }

  async function runLoop() {
    if (running) return;                                    // never run two loops at once
    running = true;
    await waitForPendo();
    await pause(500);                                       // let the page settle after a load

    var state = load();
    while (state && state.active) {
      if (state.step >= state.steps.length) {               // this visitor is finished
        update(nextJob);
        state = load();
        if (state.finished) log('Run finished: ' + state.done + ' steps done, ' + state.failed + ' skipped');
        continue;
      }
      var step = state.steps[state.step];
      // Save "we've moved past this step" BEFORE running it. If the step
      // reloads the page (like logging in), the next page load resumes after it.
      update(function (s) { s.step++; });

      try {
        await runStep(step, state);
        update(function (s) { s.done++; });
      } catch (error) {
        log('skipped ' + S.describe(step) + ' (' + error.message + ')');
        update(function (s) { s.failed++; });
      }
      var speed = SPEED[state.opts.speed] || 1;
      await pause(rand(300, 900) * speed);                  // "think time"
      state = load();                                       // re-read: Stop may have been clicked
    }
    running = false;
  }


  // ---------- 5. STARTING AND STOPPING ----------
  function startRun(opts) {
    var first = buildSteps(opts, 0);
    save({
      active: true, finished: false, opts: opts,
      loop: 0, job: 0, persona: first.persona, steps: first.steps, step: 0,
      done: 0, failed: 0, log: []
    });
    log('Started: ' + opts.scenarios.join(', ') + ' · ' + (opts.mode === 'generate' ? opts.visitors + ' visitor(s)' : 'current login') + ' · ' + opts.loops + ' loop(s)');
    runLoop();
  }

  function stopRun() {
    update(function (s) { s.active = false; });
    log('Stopped');
  }


  // ---------- 6. THE UI ----------
  // A small floating chip (on every page) shows progress and a Stop button.
  var chip = document.createElement('div');
  chip.className = 'sim-chip hidden';
  chip.id = 'sim-chip';
  chip.innerHTML = '<span id="sim-chip-text"></span> <button class="btn btn-small" id="sim-chip-stop">Stop</button>';
  document.body.appendChild(chip);
  document.getElementById('sim-chip-stop').addEventListener('click', stopRun);

  function renderStatus() {
    var state = load();
    var text = '';
    if (state && state.active) {
      var who = state.opts.mode === 'generate' ? state.persona.username : 'current login';
      text = '🤖 ' + who + ' · loop ' + (state.loop + 1) + '/' + state.opts.loops +
             ' · step ' + Math.min(state.step, state.steps.length) + '/' + state.steps.length;
    }
    chip.classList.toggle('hidden', !text);
    document.getElementById('sim-chip-text').textContent = text;

    // The Activity Simulator page (only exists on index.html).
    var statusEl = document.getElementById('sim-status');
    if (!statusEl) return;
    if (!state)               statusEl.textContent = 'Not running.';
    else if (state.active)    statusEl.textContent = text;
    else                      statusEl.textContent = (state.finished ? 'Finished' : 'Stopped') + ' · ' + state.done + ' steps done, ' + state.failed + ' skipped';
    document.getElementById('sim-log').textContent = state ? state.log.join('\n') : '';
    document.getElementById('sim-start').disabled = !!(state && state.active);
    document.getElementById('sim-stop').disabled  = !(state && state.active);
  }

  // Read the options from the form on the Simulator page.
  function readForm() {
    var chosen = [];
    document.querySelectorAll('.sim-scenario:checked').forEach(function (box) { chosen.push(box.value); });
    return {
      scenarios: chosen,
      visitors:  Math.max(1, Number(document.getElementById('sim-visitors').value) || 1),
      loops:     Math.max(1, Number(document.getElementById('sim-loops').value) || 1),
      speed:     document.getElementById('sim-speed').value,
      mode:      document.querySelector('input[name="sim-mode"]:checked').value,
      start:     Math.max(0, Number(document.getElementById('sim-first').value) || 0)
    };
  }

  // The "share" box: a link that starts this same run, and the matching
  // command for the Node/Playwright runner (automation/run.js).
  function renderShare() {
    var o = readForm();
    var params = new URLSearchParams({
      sim: o.scenarios.join(','), visitors: o.visitors, loops: o.loops,
      speed: o.speed, mode: o.mode, first: o.start
    });
    var base = location.origin + location.pathname;
    document.getElementById('sim-link').value = base + '?' + params.toString();
    document.getElementById('sim-cli').value =
      'node run.js --url ' + base.replace(/index\.html$/, '') + ' --scenarios ' + (o.scenarios.join(',') || 'all') +
      ' --visitors ' + o.visitors + ' --loops ' + o.loops + ' --speed ' + o.speed + ' --first ' + o.start;
  }

  function buildSimulatorPage() {
    var list = document.getElementById('sim-scenarios');
    if (!list) return;                                      // not on the simulator page

    Object.keys(S.scenarios).forEach(function (name) {
      var sc = S.scenarios[name];
      list.insertAdjacentHTML('beforeend',
        '<label class="sim-option"><input type="checkbox" class="sim-scenario" value="' + name + '"' +
        (name === 'browse-session' ? ' checked' : '') + '> <strong>' + sc.title + '</strong><br>' +
        '<span class="muted">' + sc.description + '</span></label>');
    });

    document.getElementById('sim-start').addEventListener('click', function () {
      var opts = readForm();
      if (!opts.scenarios.length) { window.showToast('Pick at least one scenario'); return; }
      startRun(opts);
    });
    document.getElementById('sim-stop').addEventListener('click', stopRun);
    document.getElementById('sim-clear').addEventListener('click', function () {
      sessionStorage.removeItem(KEY);
      renderStatus();
    });

    // Keep the share box up to date as options change.
    document.getElementById('sim-form').addEventListener('input', renderShare);
    document.getElementById('sim-form').addEventListener('change', renderShare);
    document.querySelectorAll('[data-copy-from]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var field = document.getElementById(btn.getAttribute('data-copy-from'));
        field.select();
        if (navigator.clipboard) navigator.clipboard.writeText(field.value).catch(function () {});
        window.showToast('Copied');
      });
    });
    document.getElementById('sim-no-key').classList.toggle('hidden', window.TS_CONFIG.hasPendoKey);
    renderShare();
  }


  // ---------- 7. START-UP ----------
  // A link like  index.html?sim=checkout,agent-chat&visitors=3&loops=2
  // starts a run by itself. (sim=all means every scenario.)
  function startFromLink() {
    var params = new URLSearchParams(location.search);
    if (!params.has('sim')) return false;

    var names = params.get('sim') === 'all' ? Object.keys(S.scenarios) : params.get('sim').split(',').filter(function (n) { return S.scenarios[n]; });
    var opts = {
      scenarios: names.length ? names : ['browse-session'],
      visitors:  Math.max(1, Number(params.get('visitors')) || 3),
      loops:     Math.max(1, Number(params.get('loops')) || 1),
      speed:     SPEED[params.get('speed')] ? params.get('speed') : 'normal',
      mode:      params.get('mode') === 'current' ? 'current' : 'generate',
      start:     Math.max(0, Number(params.get('first')) || 0)
    };
    history.replaceState(null, '', location.pathname + location.hash);   // so a reload doesn't restart it
    startRun(opts);
    return true;
  }

  buildSimulatorPage();
  setInterval(renderStatus, 500);
  renderStatus();

  window.addEventListener('load', function () {
    if (startFromLink()) return;
    var state = load();
    if (state && state.active) runLoop();                   // continue a run after a page load
  });

})();
