# TS Training Site

A small practice site for learning Pendo tagging and guides. Plain HTML, CSS and JavaScript: no build step, no frameworks, no backend.

## Run it

Open a terminal in this folder and start a tiny web server (localStorage is shared between pages more reliably this way than by double-clicking the files):

```bash
python3 -m http.server 8000
```

Then visit <http://localhost:8000>.

## Set your Pendo key

Edit `assets/js/config.js` and replace `YOUR-PENDO-API-KEY`. Until you do, Pendo does not load (the site still works, and the login page shows a reminder). The domain you host the site on also needs to be allowed in your Pendo subscription.

## What's where

| File | What it does |
| --- | --- |
| `index.html` | The single-page app: login, tagging, guides, multi-step process |
| `frames.html` | A separate page with two iframes (`frame-a.html`, `frame-b.html`) |
| `assets/css/style.css` | All styling, including light and dark colors |
| `assets/js/config.js` | Settings: Pendo key, site name |
| `assets/js/theme.js` | Light/dark toggle |
| `assets/js/session.js` | Fake login: saves the user in localStorage |
| `assets/js/pendo-snippet.js` | Installs Pendo and identifies the saved user |
| `assets/js/layout.js` | Builds the left nav and top banner on every page |
| `assets/js/app.js` | Page switching (by URL `#`) and the login form |
| `assets/js/tagging.js` / `guides.js` | Behaviors for the tagging and guides pages |
| `assets/js/about.js` | Builds the page list on the "About this site" page from the nav |
| `assets/js/scenarios.js` / `simulator.js` | The shared list of simulated visitor actions, and the in-site simulator that plays them |
| `automation/` | Unattended Node + Playwright runner (see its README) |
| `.github/workflows/simulate.yml` | Scheduled GitHub Action that runs the runner |

## Pages at a glance

The same list is shown inside the site on the **About this site** page (pinned to the bottom of the left nav). That page is built from the `desc` lines in `NAV_ITEMS` in `assets/js/layout.js`, so keep those up to date when you change a page.

The left nav has Login and the Activity Simulator on their own, then four collapsible sections:

| Section | Page | What's on it |
| --- | --- | --- |
| Tagging | Page Elements | Tagging practice: ids, custom attributes, identical twins, dynamic ids, appearing/vanishing elements, forms, tabs, shadow DOM, repeated table rows, nested clicks, SVG icons, links, track events |
| Tagging | Modals & Banners | Two regular modals that swap with Next/Back, a native `<dialog>` in the top layer, a banner slot, a toast |
| Multi-step Processes | Project Setup | 3-step wizard with a URL per step |
| Multi-step Processes | Checkout | Mock shop, cart, promo code `PURPLE10`, shipping, fake payment, review, thank-you. Cart is kept in localStorage; card details are never stored |
| Frames | Frames | A separate page with two iframes and a button outside them |
| Guide Targeting | Tooltip Targets | Elements around the page for tooltips, notification badge |
| Guide Targeting | Scroll Targets | Targets far down the page, in a scrolling box, and far off to the right |
| Guide Targeting | Scroll to Reveal | Targets hidden by `visibility`, `opacity` or `display` until scrolled into view |
| Guide Targeting | Duplicate DOM | Two copies of an element with the first hidden; Switch swaps them |
| Guide Targeting | Widgets & Feedback | Floating help launcher, consent bar, star rating, "What's new" list, long scroll area |
| Guide Targeting | Data Table | Sortable, reorderable and hideable columns, search, edit modal, identical icon-only row buttons |
| Guide Targeting | AI Agent | Mock chat assistant. `agent.js` has an `onAgentEvent()` hook where tracking can be added |

## Generating activity

Two ways, both playing the scenarios in `assets/js/scenarios.js`:

- **Activity Simulator (in the site):** open *Activity Simulator* in the left nav, pick scenarios, how many fake visitors and how fast, and press Start. It clicks through the real pages in your browser, so keep the tab open. It can also be started from a link, e.g. `index.html?sim=checkout,agent-chat&visitors=3` (`sim=all` runs everything). The page generates the link and the matching command for you.
- **Unattended runner (`automation/`):** a Node + Playwright script that runs headless browsers from the command line or on a schedule with GitHub Actions. See `automation/README.md`.

Fake visitors are named `sim-...@example.com` so they are easy to filter out of reports.

## Common tweaks

- **Add a page to the menu:** add a line to `NAV_ITEMS` in `layout.js`, inside the section it belongs to, including a `desc` (it appears on the About page automatically). Add `prefix` to the link if the page has several steps (like `checkout-`).
- **Add a new SPA page:** add a `<section class="page" data-page="my-page">` in `index.html`, then link to `index.html#my-page`.
- **Change the purple:** edit `--accent` in `style.css`.
- **Reset everything:** run `Session.clear()` in the browser console, or click Logout.

## Updating the site with Claude Code

This folder includes a `CLAUDE.md` with the project's conventions, how the pieces fit together, and how to test changes. If you open Claude Code in this folder, it reads that file automatically, so you can ask it to add a page, a scenario or a feature and it will follow the same style.
