# Running the `timezone_mockup` branch locally

This branch adds an experimental "display data in its own timezone" treatment to the
**Daily** view, the **Daily Charts PDF**, and the **Trends** view. These instructions get the
forks running locally so you can see it.

> Repos (forks, public):
> - blip — https://github.com/wzeller/blip (branch `timezone_mockup`)
> - viz  — https://github.com/wzeller/viz  (branch `timezone_mockup`)

## Gotchas first (the three things that usually trip people up)

1. **You must build `viz` before/after running blip.** blip imports viz's built `dist/`, not its
   source — so a viz source change is invisible until you run `yarn build-dev` in `viz`.
2. **`blip/config/local.js` is gitignored.** You have to create it (step 4).
3. **CORS** only matters if you point at production — see "Choosing an environment" below.

## Prerequisites

- Node 20 (`node -v` → `v20.x`)
- `yarn` and `git`

## 1. Clone both forks as siblings

blip resolves viz at `../viz`, so they must sit next to each other.

```bash
mkdir tidepool && cd tidepool
git clone https://github.com/wzeller/blip.git
git clone https://github.com/wzeller/viz.git
cd blip && git checkout timezone_mockup && cd ..
cd viz  && git checkout timezone_mockup && cd ..
```

## 2. Install dependencies

```bash
cd viz  && yarn install && cd ..
cd blip && yarn install && cd ..
```

## 3. Build viz

blip uses viz's built `dist/`. **Run this now, and re-run it any time viz source changes:**

```bash
cd viz && yarn build-dev && cd ..
```

(blip's dev server auto-recompiles when `viz/dist` changes, so you just reload the browser.)

## 4. Create `blip/config/local.js`

```bash
cd blip && cp config/local.example.js config/local.js
```

Then edit `config/local.js`:

- In `linkedPackages`, keep the `'@tidepool/viz': ... '/../viz'` line so blip uses the fork.
  You can comment out the `tideline` link — this branch doesn't change tideline, so the npm
  version is fine.
- Set the API host (see next section), e.g. `const apiHost = environments.qa5;`

## 5. Run blip

```bash
cd blip && yarn start
```

Open http://localhost:3000 (port 3000).

## Choosing an environment (and CORS)

The timezone features **only show up with multi-timezone "traveler" data** — a patient whose
readings span more than one UTC offset. A normal single-timezone patient looks unchanged.

### Option A — `qa5` (recommended)

```js
const apiHost = environments.qa5; // in config/local.js
```

- The qa/dev environments allow the `localhost:3000` origin, so **no CORS workaround is needed**.
- No real patient data (PHI).
- You need a traveling test patient in qa5 — ask the engineer which login/patient to use (or to
  generate one).

### Option B — `prd` (production) + CORS workaround

```js
const apiHost = environments.prd; // https://app.tidepool.org
```

Production has real traveler data, but two extra steps:

**This is real patient health data (PHI).** Only use a prod account you're authorized to use, and
don't edit anything.

**The CORS error and the workaround.** Production does **not** allow `http://localhost:3000` as a
request origin, so the browser blocks the login call:

> Access to XMLHttpRequest at 'https://app.tidepool.org/auth/login' from origin
> 'http://localhost:3000' has been blocked by CORS policy...

This isn't a bug in the app — production's API only permits its own web origin. The standard
local-dev workaround is to run a **separate, throwaway Chrome instance with web security disabled**,
pointed at your local build:

```bash
open -na "Google Chrome" --args \
  --user-data-dir=/tmp/chrome-tidepool \
  --disable-web-security \
  --disable-site-isolation-trials \
  http://localhost:3000
```

Then log in there.

- The separate `--user-data-dir` keeps this isolated from your normal Chrome profile. Chrome will
  show a banner saying it's running with an unsupported flag — that's expected and confirms the
  flag took.
- **Only use this window for Tidepool.** With web security off, don't browse other sites or log
  into anything else in it. Close it when you're done.
- Restart blip after changing `apiHost` (it's read at build time, not via hot reload).

> Prefer Option A (qa5) if you can — it avoids the CORS workaround and the PHI entirely.

## Where the features are

- **Daily view** — a small `UTC-x` line under the "Events" label (hover it for an explanation
  popover, which has a "Hide time zone display" link). On a travel day the chart re-bases to the
  prevalent timezone.
- **Print → Daily Charts** — a **"Display time zones"** toggle (on by default). With it on, each
  day shows its UTC offset and days that span more than one timezone split into a row per offset.
- **Trends (CGM)** — a `tz by bin (device time)` debug panel at the top-right of the chart, showing
  the share of readings from each timezone offset in every 30-minute bin.

## Notes

- The `tz-in-view` yellow panels and the `tz by bin` panel are debug overlays (each has a hide/×
  control). They're part of the experiment, not final UI.
- `config/local.js` is gitignored, so your environment choice stays local.
