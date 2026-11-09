#!/usr/bin/env node
/* =====================================================================
   run.js - generate visitor activity on the TS test site from the command
   line, using real (usually invisible) browsers driven by Playwright.

   It plays the SAME scenarios as the in-site Activity Simulator, because
   both read ../assets/js/scenarios.js. Each fake visitor gets its own
   fresh browser, logs in through the site's real login form, plays the
   scenarios, and logs out.

   Examples (run from this folder):
     node run.js --url https://you.github.io/YOUR-REPO/
     node run.js --serve                           (serves the site locally, no hosting needed)
     node run.js --url https://you.github.io/YOUR-REPO/ --scenarios checkout,agent-chat --visitors 5 --loops 2

   Options:
     --url <address>       where the site is hosted (or set BASE_URL)
     --serve               start a tiny local web server for the site instead of using --url
     --scenarios <list>    comma-separated names, or "all"                (default: browse-session)
     --visitors <n>        how many fake visitors                         (default: 3)
     --loops <n>           how many times each visitor goes through       (default: 1)
     --first <n>           which fake people to start from (same number = same people)  (default: 0)
     --speed <s>           fast | normal | slow                           (default: normal)
     --concurrency <n>     how many visitors at the same time             (default: 2)
     --headed              show the browser windows
     --strict              exit with an error if any step had to be skipped
     --help                show this text

   The Pendo key comes from the site itself (assets/js/config.js), not from here.
   ===================================================================== */

const path = require('path');
const fs = require('fs');
const http = require('http');

const S = require(path.join(__dirname, '..', 'assets', 'js', 'scenarios.js'));


// ---------- 1. OPTIONS ----------
function parseArgs(argv) {
  const opts = {
    url: process.env.BASE_URL || '', serve: false, scenarios: 'browse-session',
    visitors: 3, loops: 1, first: 0, speed: 'normal', concurrency: 2,
    headed: false, strict: false
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = () => argv[++i];
    if (arg === '--url') opts.url = next();
    else if (arg === '--serve') opts.serve = true;
    else if (arg === '--scenarios') opts.scenarios = next();
    else if (arg === '--visitors') opts.visitors = Number(next());
    else if (arg === '--loops') opts.loops = Number(next());
    else if (arg === '--first') opts.first = Number(next());
    else if (arg === '--speed') opts.speed = next();
    else if (arg === '--concurrency') opts.concurrency = Number(next());
    else if (arg === '--headed') opts.headed = true;
    else if (arg === '--strict') opts.strict = true;
    else if (arg === '--help' || arg === '-h') { console.log(fs.readFileSync(__filename, 'utf8').split('*/')[0]); process.exit(0); }
    else { console.error('Unknown option: ' + arg + '  (try --help)'); process.exit(2); }
  }
  return opts;
}

const SPEED = { fast: 0.25, normal: 1, slow: 2 };


// ---------- 2. A TINY STATIC SERVER (for --serve) ----------
// Serves the site folder (the parent of this one) so you can test without hosting.
function startServer() {
  const root = path.join(__dirname, '..');
  const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml' };
  const server = http.createServer((req, res) => {
    let file = path.join(root, decodeURIComponent(req.url.split('?')[0]));
    if (file.endsWith(path.sep)) file += 'index.html';
    if (!file.startsWith(root) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(resolve => server.listen(0, '127.0.0.1', () => resolve({ server, url: 'http://127.0.0.1:' + server.address().port + '/' })));
}


// ---------- 3. SMALL HELPERS ----------
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const rand = (min, max) => min + Math.random() * (max - min);

// Make sure the address ends in "/" and has no file name.
function normaliseBase(url) {
  const u = new URL(url);
  u.hash = ''; u.search = '';
  u.pathname = u.pathname.replace(/[^/]*\.html$/, '');
  if (!u.pathname.endsWith('/')) u.pathname += '/';
  return u.href;
}

// Same idea as the in-site simulator: wait until Pendo says it's ready, but
// only if the site actually has a key (otherwise Pendo never loads).
async function waitForPendo(page) {
  await page.waitForFunction(
    () => !window.TS_CONFIG || !window.TS_CONFIG.hasPendoKey || (window.pendo && pendo.isReady && pendo.isReady()),
    null, { timeout: 10000 }
  ).catch(() => {});
}

// Where to find an element: on the page, or inside an iframe.
const where = (page, step) => step.frame ? page.frameLocator(step.frame) : page;

// The first VISIBLE match, like the in-site simulator. (Other pages of the
// single-page app are in the HTML too, hidden, so a plain .first() could pick one of those.)
const visibleFirst = (page, step, selector) => where(page, step).locator(':is(' + selector + '):visible').first();


// ---------- 4. RUNNING ONE STEP ----------
async function runStep(page, step, base) {
  const TIMEOUT = 8000;
  await page.waitForLoadState('domcontentloaded');

  if (step.goto !== undefined) {
    const onIndex = /(index\.html|\/)$/.test(new URL(page.url()).pathname);
    if (step.goto.includes('.html')) {
      const target = new URL(step.goto, base);
      const here = new URL(page.url());
      if (target.pathname === here.pathname) await page.evaluate(h => { location.hash = h; }, target.hash.slice(1));
      else await page.goto(target.href);
    } else if (onIndex) {
      await page.evaluate(h => { location.hash = h; }, step.goto);
    } else {
      await page.goto(new URL('index.html#' + step.goto, base).href);
    }
    await waitForPendo(page);
    await sleep(300);
  } else if (step.click !== undefined) {
    await visibleFirst(page, step, step.click).click({ timeout: TIMEOUT });
  } else if (step.clickRandom !== undefined) {
    const matches = where(page, step).locator(':is(' + step.clickRandom + '):visible');
    await matches.first().waitFor({ timeout: TIMEOUT });
    const count = await matches.count();
    await matches.nth(Math.floor(Math.random() * count)).click({ timeout: TIMEOUT });
  } else if (step.fill !== undefined) {
    const field = visibleFirst(page, step, step.fill);
    await field.fill('', { timeout: TIMEOUT });
    if (step.value) await field.pressSequentially(step.value, { delay: 25 });
  } else if (step.select !== undefined) {
    await visibleFirst(page, step, step.select).selectOption(step.value, { timeout: TIMEOUT });
  } else if (step.check !== undefined) {
    await visibleFirst(page, step, step.check).setChecked(step.on !== false, { timeout: TIMEOUT });
  } else if (step.press !== undefined) {
    await visibleFirst(page, step, step.press).press(step.key, { timeout: TIMEOUT });
  } else if (step.scroll !== undefined) {
    await where(page, step).locator(step.scroll).first().scrollIntoViewIfNeeded({ timeout: TIMEOUT });
    await sleep(300);
  } else if (step.waitFor !== undefined) {
    await where(page, step).locator(step.waitFor).first().waitFor({ state: 'attached', timeout: 10000 });
  } else if (step.wait !== undefined) {
    await sleep(step.wait);
  } else if (step.log !== undefined) {
    console.log('   · ' + step.log);
  }
}


// ---------- 5. ONE VISITOR ----------
async function runVisitor(browser, opts, base, index, stats) {
  const persona = S.makePersona(opts.first + index);
  const tag = '[' + persona.username + ']';
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  page.on('pageerror', error => console.log(tag + ' page error: ' + error.message));

  try {
    await page.goto(new URL('index.html', base).href);
    await waitForPendo(page);

    for (let loop = 0; loop < opts.loops; loop++) {
      const steps = S.buildJob(persona, opts.scenarioNames, true);
      console.log(tag + ' loop ' + (loop + 1) + '/' + opts.loops + ': ' + steps.length + ' steps');
      for (const step of steps) {
        try {
          await runStep(page, step, base);
          stats.done++;
        } catch (error) {
          stats.failed++;
          console.log(tag + ' skipped ' + S.describe(step) + ' (' + error.message.split('\n')[0] + ')');
        }
        await sleep(rand(300, 900) * SPEED[opts.speed]);       // "think time"
      }
    }
  } finally {
    await context.close();
  }
  console.log(tag + ' finished');
}


// ---------- 6. MAIN ----------
async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (!SPEED[opts.speed]) { console.error('--speed must be fast, normal or slow'); process.exit(2); }

  opts.scenarioNames = opts.scenarios === 'all' ? Object.keys(S.scenarios) : opts.scenarios.split(',').map(s => s.trim()).filter(Boolean);
  const unknown = opts.scenarioNames.filter(name => !S.scenarios[name]);
  if (unknown.length) { console.error('Unknown scenario(s): ' + unknown.join(', ') + '\nAvailable: ' + Object.keys(S.scenarios).join(', ')); process.exit(2); }

  let server = null;
  if (opts.serve) { const s = await startServer(); server = s.server; opts.url = s.url; }
  if (!opts.url) { console.error('Give the site address with --url (or use --serve). See --help.'); process.exit(2); }
  const base = normaliseBase(opts.url);

  let chromium;
  try { ({ chromium } = require('playwright')); }
  catch (e) { console.error('Playwright is not installed. In this folder run:\n  npm install\n  npm run setup'); process.exit(2); }

  console.log('Site: ' + base);
  console.log('Scenarios: ' + opts.scenarioNames.join(', '));
  console.log(opts.visitors + ' visitor(s) x ' + opts.loops + ' loop(s), ' + opts.concurrency + ' at a time, speed ' + opts.speed + '\n');

  const browser = await chromium.launch({ headless: !opts.headed });
  const stats = { done: 0, failed: 0 };

  // A simple worker pool: each worker takes the next visitor number until none are left.
  let next = 0;
  const workers = Array.from({ length: Math.min(opts.concurrency, opts.visitors) }, async () => {
    while (next < opts.visitors) {
      const index = next++;
      try { await runVisitor(browser, opts, base, index, stats); }
      catch (error) { stats.failed++; console.log('[visitor ' + index + '] stopped: ' + error.message.split('\n')[0]); }
    }
  });
  await Promise.all(workers);

  await browser.close();
  if (server) server.close();
  console.log('\nDone: ' + stats.done + ' steps completed, ' + stats.failed + ' skipped.');
  if (opts.strict && stats.failed) process.exit(1);
}

main().catch(error => { console.error(error); process.exit(1); });
