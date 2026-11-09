# Unattended activity generator

Generates visitor activity on the TS test site from the command line, with no browser tab left open. It uses [Playwright](https://playwright.dev) to drive real headless browsers, and plays the **same scenarios** as the in-site Activity Simulator (both read `../assets/js/scenarios.js`).

Each fake visitor gets a fresh browser, logs in through the site's real login form (names start with `sim-`), plays the scenarios, and logs out.

## One-time setup

You need [Node.js](https://nodejs.org) 18 or newer.

```bash
cd automation
npm install
npm run setup
```

`npm run setup` downloads the Chromium browser Playwright uses (about 100 MB).

## Run it

Against your hosted site:

```bash
node run.js --url https://YOUR-NAME.github.io/YOUR-REPO/
```

Or test locally without hosting anything (it serves the site folder itself):

```bash
node run.js --serve
```

Useful options (see `node run.js --help` for all of them):

| Option | Meaning | Default |
| --- | --- | --- |
| `--scenarios checkout,agent-chat` | which scenarios (or `all`) | `browse-session` |
| `--visitors 5` | how many fake visitors | 3 |
| `--loops 2` | times each visitor goes through | 1 |
| `--first 10` | which fake people to use. The same number always gives the same people, so raise it for brand-new visitors | 0 |
| `--speed fast` | `fast`, `normal` or `slow` think time | `normal` |
| `--concurrency 4` | visitors at the same time | 2 |
| `--headed` | show the browser windows | off |

The Activity Simulator page in the site shows the exact command for whatever options you pick.

## Pendo

The Pendo key lives in the site's `assets/js/config.js` like everything else, so a hosted copy of the site must have its key set there. Make sure the site's domain is allowed in your Pendo subscription. If Pendo seems to ignore the activity, check your subscription for settings about automated or headless traffic.

## Running it on a schedule (GitHub Actions)

`.github/workflows/simulate.yml` runs this every 6 hours and can also be started by hand from the **Actions** tab ("Run workflow", where you can change the scenarios and visitor counts).

1. Publish the site (Settings > Pages).
2. If it isn't at `https://<owner>.github.io/<repo>/`, add a repository **variable** named `SITE_URL` (Settings > Secrets and variables > Actions > Variables).
3. Edit the `cron` line in the workflow to change how often it runs.

Note: GitHub pauses scheduled workflows after about 60 days with no repository activity, and the first scheduled run can take a while to start.

## Writing your own scenarios

Scenarios are plain lists of steps in `../assets/js/scenarios.js`. Add one there and it shows up in both the in-site Simulator and this runner. The step types are described at the top of that file.
