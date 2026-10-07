# Bellwether

An investing game for the phone. You get a job, a paycheck and a market, and you try to finish with more money than Dolly, a sheep who buys the index fund every payday and never sells.

Play it: open `index.html`, or the GitHub Pages address for this repo once Pages is switched on.

Hold the phone upright. It also works in a desktop browser.

## What is in here

| Path | What it is |
| --- | --- |
| `index.html` | The whole game in one file. This is the only file a player needs. It is built from `src/`, so do not edit it by hand. |
| `src/engine/` | The market, the player's money, the rules, and the progression. No screen code. Runs in plain Node, which is how the bots test it. |
| `src/ui/` | Screens, charts, sound, the casino. |
| `src/style.css`, `src/fonts.css` | The look, and the two typefaces embedded as text so there are no font files. |
| `build.js` | Glues `src/` into `index.html`. |
| `test/` | Bots that play whole runs, and a headless phone that taps through the real page. |
| `tools/` | One-off helpers: the name checker and the home-screen icon maker. |
| `licenses/` | Licences for the two embedded typefaces (both SIL Open Font License). |

## Change something and rebuild

You need Node 18 or newer. Nothing else is needed to build.

```
node build.js
```

That rewrites `index.html`. Commit and push it and GitHub Pages serves the new version.

## Run the tests

The bot tests need nothing installed:

```
node test/bots.js 20 30
node test/meta.js
node test/worlds.js
```

- `bots.js 20 30` plays 16 different strategies through 30 twenty-year markets. It checks that cash always equals the sum of its ledger, that no fraction of a cent ever appears, and that the same seed always gives the same market. It also prints how each strategy did against Dolly.
- `meta.js` checks scenarios, challenge codes, result codes, lockboxes and the end-of-run review.
- `worlds.js` prints the long-run behaviour of the Earth, Moon and Mars markets.

The phone test drives the real page with touch input in headless Chromium. It needs Playwright once:

```
npm install playwright
npx playwright install chromium
node test/ui.js
```

Set `SHOTS` to a folder if you want it to save screenshots somewhere other than `shots/`.

## Two rules that matter

1. **Money is whole cents.** Cash is an integer number of cents and every change goes through one function (`Run._cash`) that writes to a ledger. The tests fail if cash and the ledger ever disagree.

2. **Changing the market engine changes every market.** A challenge code is just a seed. Two phones get the same market because they run the same maths on the same seed. If you change anything in `src/engine/tape.js`, `tape-co.js` or the `content-*.js` files, old codes would silently produce a different market. So when you do, add one to `BW.ENGINE_VERSION` in `src/engine/core.js`. Old codes are then refused with a clear message instead of quietly being wrong, and an unfinished saved run is dropped (Bells, unlocks and collection are kept).

## Names

Every company, ticker and fund is invented. `tools/check-names.js` compares the tickers against a list of real exchange symbols; give it the list as described at the top of that file if you add companies.

## Sound

All sound is made in code with the browser's audio engine. There are no audio files.
