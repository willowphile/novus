# TS Test Site: notes for Claude

A practice site for Pendo Technical Support: pages full of elements to tag, targets for guides, and tools that generate visitor activity. It is plain HTML, CSS and JavaScript with no framework, no build step and no backend. It gets hosted as static files (likely GitHub Pages, but assume it could be anywhere).

`README.md` has the file map and the list of pages. Read it first. Don't copy it into this file.

## Principles (please follow these)

- **Keep it simple.** New hires read and troubleshoot this code. Prefer plain, boring JavaScript over clever or compact code. No frameworks, bundlers, TypeScript or npm packages for the site itself. The only npm dependency is Playwright, and it lives in `automation/` only.
- **Comment heavily.** Every file starts with a comment saying what it does, and every section or script has a comment explaining it in plain language. Match the style already in the files.
- **Everything is fake.** No real accounts, payments or AI. Never add anything that sends data to a real service other than Pendo.
- **Works anywhere it's hosted.** Use relative links only (no leading `/`), and don't assume the site sits at a domain root. GitHub Pages serves it from `/repo-name/`.
- **Light and dark mode both work.** Use the CSS variables at the top of `assets/css/style.css`. Never hardcode a color in a component.
- **Purple is the highlight color.** Change `--accent` rather than adding new colors.

## How the pieces fit together

- `index.html` is a single-page app. Each page is a `<section class="page" data-page="NAME">`, and the URL hash picks which one shows (`index.html#tagging`). `app.js` does the switching. `frames.html` is the one real separate page.
- `assets/js/layout.js` builds the left nav and top banner on every page from the `NAV_ITEMS` list. Add pages there.
- Script load order matters: `config.js`, then `theme.js`, `session.js` and `pendo-snippet.js` in the `<head>`, then `layout.js`, `about.js`, `app.js` and the page scripts at the bottom of `<body>`.
- The pretend login saves a user in localStorage under `ts.session`. Pendo is initialized from it on every page load.
- The Pendo key lives **only** in `assets/js/config.js`. Don't add other ways to set it.
- `assets/js/scenarios.js` is the single list of simulated visitor actions. Two programs read it: the in-site simulator (`simulator.js`) and the Node and Playwright runner (`automation/run.js`). Keep it free of dependencies so it works in both.

## Common tasks

**Add a page**
1. Add a `<section class="page" data-page="my-page">` to `index.html`.
2. Add a link to `NAV_ITEMS` in `layout.js` in the right section. Include a `desc` (the About page is built from these, and a missing one shows as "undefined").
3. Multi-step pages: give the link a `prefix` so it stays highlighted on every step.
4. Add the page to the table in `README.md`.

**Add a simulated-visitor scenario**
1. Add it to `S.scenarios` in `scenarios.js`. The step types are listed at the top of that file.
2. Use plain CSS selectors. Prefer ids.
3. Reuse of existing ids matters: **renaming or removing an element id can silently break scenarios.** After changing any id, search `scenarios.js` for it.
4. If a step needs an element that has to be visible, remember that other pages of the SPA are in the HTML too, hidden. The runners pick the first *visible* match.

**Add styles or colors.** Edit `assets/css/style.css`, and put new colors in the variables at the top for both light and dark.

## Testing

There's no test framework. Verify changes like this:

1. Serve the site from the project folder:
   ```bash
   python3 -m http.server 8123
   ```
2. Open it in a browser, log in, and click through what you changed in both light and dark mode.
3. Run every scenario through the real runner. This is the best end-to-end check:
   ```bash
   cd automation
   npm install && npm run setup     # first time only
   node run.js --serve --scenarios all --visitors 2 --speed fast
   ```
   A healthy run ends with `0 skipped`. Any skipped step means a selector no longer matches something on the page.
4. Check the browser console for errors. The "No Pendo API key" warning is expected until a key is set.

Pendo only loads if a real key is in `config.js`. You can test everything else without one.

## Gotchas

- **Easter egg.** The Konami code (↑ ↑ ↓ ↓ ← → ← → B A, handled in `layout.js`) opens `eyesore.html`, an intentionally hideous MySpace-style page. The awfulness is the joke: don't "fix" its styling, and don't add it to the nav or About page, which would spoil it. It loads Pendo like every other page.

- **Stale cached pages.** The browser can keep an old copy of `frames.html` or a script. If a change doesn't show up, hard-reload or fetch with `cache: 'reload'`.
- **Page reloads during automation.** Logging in, logging out and opening `frames.html` all reload the page. The in-site simulator survives this by saving its progress in `sessionStorage` after every step. Don't break that.
- **Duplicate ids are intentional** on the Duplicate DOM page (`#dup-save-a` appears twice). Don't "fix" them.
- **Identical row buttons are intentional** on the Data Table page. They have the same class, no id and no text on purpose.
- **Fake visitors** are named `sim-...@example.com` so they can be filtered out of reports. Keep that prefix.
- **Payment form:** it's a mock. Never store card details anywhere, and use obviously fake values in scenarios.
- **Agent tracking** is a hook only: `onAgentEvent()` in `agent.js` currently just logs to the console.

## Don't

- Don't add a build step, a bundler or a framework.
- Don't hardcode a Pendo key, API token or any secret in the repo.
- Don't commit `automation/node_modules/` (it's in `.gitignore`).
- Don't add features beyond what was asked. Ask first if the request is ambiguous.
