// Shared helper: opens the built page in a headless phone-sized browser with touch input.
const path = require('path');
const { chromium } = require('playwright');
exports.open = async function (opts = {}) {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: opts.w || 390, height: opts.h || 844 }, deviceScaleFactor: opts.dpr || 2, hasTouch: opts.touch !== false, isMobile: opts.touch !== false, userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('PAGEERROR ' + e.message + '\n' + (e.stack || '').split('\n').slice(0, 4).join('\n')));
  await page.goto('file://' + path.join(__dirname, '..', 'index.html') + (opts.hash || ''));
  await page.waitForTimeout(400);
  const shotDir = opts.shots || process.env.SHOTS || path.join(__dirname, '..', 'shots');
  require('fs').mkdirSync(shotDir, { recursive: true });
  const api = {
    browser, ctx, page, errors,
    shot: async (name) => { await page.waitForTimeout(350); await page.screenshot({ path: path.join(shotDir, name + '.png') }); },
    tapText: async (text, o = {}) => { const loc = page.getByText(text, { exact: !!o.exact }).filter({ visible: true }); const el = o.last ? loc.last() : loc.first(); await el.scrollIntoViewIfNeeded(); await el.tap(); await page.waitForTimeout(o.wait || 320); },
    tapBtn: async (name, o = {}) => {
      const esc = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      let loc = page.locator('button[aria-label="' + name + '"], [role=button][aria-label="' + name + '"]').filter({ visible: true });
      if (!(await loc.count())) loc = page.locator('button, [role=button]').filter({ hasText: new RegExp('^\\s*' + esc + '\\s*$') }).filter({ visible: true });
      const el = o.last ? loc.last() : loc.first(); await el.scrollIntoViewIfNeeded(); await el.tap(); await page.waitForTimeout(o.wait || 320);
    },
    tapSel: async (sel, o = {}) => { const el = o.last ? page.locator(sel).last() : page.locator(sel).first(); await el.scrollIntoViewIfNeeded(); await el.tap(); await page.waitForTimeout(o.wait || 320); },
    step: async (days) => { await page.evaluate((n) => BW.App._step(n), days); await page.waitForTimeout(150); },
    ev: (fn, arg) => page.evaluate(fn, arg),
    close: async () => { await browser.close(); }
  };
  return api;
};
