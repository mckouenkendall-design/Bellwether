// Plays the built page on a simulated phone (headless Chromium, touch input) and checks behaviour.
//   NODE_PATH=/opt/npm-tools/node_modules node test/ui.js
const P = require('./phone.js');
let fails = 0;
const ok = (c, m) => { if (!c) { fails++; console.log('  FAIL: ' + m); } else console.log('  ok: ' + m); };
const SEEN = ['tutorial', 'x_stock', 'x_index', 'x_bond', 'x_cmdty', 'x_news', 'x_prop', 'x_biz', 'x_casino', 'candle', 'x_coin'];

(async () => {
  let p = await P.open();
  const body = (px) => p.ev((y) => { const b = document.querySelectorAll('.sheet .sh-body'); b[b.length - 1].scrollTop = y; }, px);
  const closeTop = () => p.tapSel('.sheet .sh-head .x[aria-label=Close]', { last: true });
  const ledgerOK = () => p.ev(() => { const s = BW.G.run.s; let t = 0; for (const k in s.flow) t += s.flow[k]; return t === s.cash && Number.isInteger(s.cash); });
  const day = () => p.ev(() => BW.G.run.s.d - BW.G.run.s.day0);
  try {
    console.log('1. First launch and tutorial');
    ok(await p.ev(() => !!document.querySelector('.hero .wm')), 'hub renders');
    await p.shot('a01-hub');
    await p.tapBtn('Start a run'); await p.tapBtn('Play The Long Game');
    await p.shot('a02-tutorial');
    await p.tapBtn('Next'); await p.tapBtn('Next'); await p.tapBtn('Next');
    await p.shot('a03-brief');
    ok(await p.ev(() => BW.App.ui.paused), 'clock is stopped until the bell rings');
    await p.tapBtn('Ring the opening bell');
    await p.page.waitForTimeout(2600);
    const d1 = await day(); ok(d1 >= 6 && d1 <= 16, 'time runs at about 4 days a second at 1x (day ' + d1 + ' after 2.6s)');
    await p.tapBtn('Pause or play'); const d2 = await day(); await p.page.waitForTimeout(700); ok((await day()) === d2, 'pause stops the clock');
    await p.tapBtn('+1 wk'); ok((await day()) === d2 + 5, 'step button moves exactly one week');
    await p.tapBtn('8×'); await p.page.waitForTimeout(1500); const d3 = await day(); ok(d3 - d2 - 5 >= 30, '8x runs about 32 days a second (' + (d3 - d2 - 5) + ' days in 1.5s)');
    await p.tapBtn('Pause or play');
    await p.ev((keys) => { keys.forEach(k => BW.G.meta.seen[k] = 1); }, SEEN);

    console.log('2. Trading with touch, exact money');
    await p.step(60);
    await p.tapBtn('Market'); await p.tapText('Quillon Systems'); await p.page.waitForTimeout(400);
    const dBefore = await day(); await p.tapBtn('1×').catch(() => {}); await p.ev(() => BW.App.setPaused(false)); await p.page.waitForTimeout(900);
    ok((await day()) === dBefore, 'time waits while a panel is open'); await p.ev(() => BW.App.setPaused(true));
    const cash0 = await p.ev(() => BW.G.run.s.cash);
    await p.tapBtn('Buy'); await p.tapBtn('50%');
    const quote = await p.ev(() => { const r = BW.G.run; return r.buy('quil', Math.floor(r.s.cash * 0.5), { dry: true }); });
    await p.tapSel('.sheet:last-child .btn.buy');
    const cash1 = await p.ev(() => BW.G.run.s.cash);
    ok(cash0 - cash1 === quote.total, 'cash fell by exactly the quoted cost (' + quote.total / 100 + ')');
    ok(await ledgerOK(), 'ledger adds up after buying');
    const box = await p.page.locator('.sheet.full canvas').first().boundingBox();
    await p.page.touchscreen.tap(box.x + box.width * 0.4, box.y + box.height * 0.5); await p.page.waitForTimeout(200);
    ok(await p.ev(() => document.querySelector('.sheet.full .tip').textContent.includes('open')), 'touching the chart shows open, high, low, close');
    await p.shot('a04-chart-crosshair');
    await p.tapBtn('Sell'); await p.tapBtn('All of it'); await p.tapSel('.sheet:last-child .btn.sell');
    ok(await p.ev(() => !BW.G.run.s.pos.quil), 'sold everything'); ok(await ledgerOK(), 'ledger adds up after selling');
    await closeTop();

    console.log('3. Save and resume');
    await p.step(40); const snap = await p.ev(() => { BW.App.save(); const s = BW.G.run.s; return { d: s.d, cash: s.cash }; });
    await p.page.reload(); await p.page.waitForTimeout(500);
    ok(await p.ev(() => [...document.querySelectorAll('button')].some(b => b.textContent.includes('Continue your run'))), 'hub offers to continue after a reload');
    await p.tapText('Continue your run'); const snap2 = await p.ev(() => { const s = BW.G.run.s; return { d: s.d, cash: s.cash }; });
    ok(snap.d === snap2.d && snap.cash === snap2.cash, 'run resumes on the same day with the same cash');
    ok(await p.ev(() => BW.G.dolly.s.d === BW.G.run.s.d && BW.G.dolly.nw() !== 0), 'Dolly is rebuilt to the same day');
    await p.shot('a05-resumed-home');

    console.log('4. Life: deposit, property, business');
    await p.ev(() => { BW.G.run._cash(40000000, 'life'); BW.App.touch(); });
    await p.tapBtn('Life'); await p.tapText('Lock for 1 year'); await p.tapBtn('25%'); await p.tapBtn('Lock it away');
    ok(await p.ev(() => BW.G.run.s.cds.length === 1), 'term deposit opened'); ok(await ledgerOK(), 'ledger adds up');
    await p.tapBtn('Property'); await p.tapSel('#screen .card.tap'); await p.page.waitForTimeout(400);
    const sl = await p.page.locator('#offer-sl').boundingBox(); await body(500); await p.page.waitForTimeout(200);
    const sl2 = await p.page.locator('#offer-sl').boundingBox();
    await p.page.touchscreen.tap(sl2.x + sl2.width * 0.98, sl2.y + sl2.height / 2); await p.page.waitForTimeout(200);
    await body(1200); await p.tapBtn('Make this offer');
    ok(await p.ev(() => BW.G.run.s.props.length === 1), 'bought a property with a mortgage'); ok(await ledgerOK(), 'ledger adds up');
    await p.step(60); await p.shot('a06-property');
    await p.tapBtn('Business'); await p.tapText('Food Truck'); await p.tapText('Buy for', { exact: false });
    ok(await p.ev(() => BW.G.run.s.biz.length === 1), 'bought a business'); await p.step(60);
    ok(await p.ev(() => BW.G.run.s.biz[0].ttm.length >= 2), 'business pays monthly'); ok(await ledgerOK(), 'ledger adds up');

    console.log('5. Casino');
    await p.tapBtn('More'); await p.tapText('Casino'); await p.page.waitForTimeout(300);
    await p.tapText('Deal for', { exact: false }); await p.page.waitForTimeout(300);
    if (await p.ev(() => [...document.querySelectorAll('button')].some(b => b.textContent === 'Stand' && b.offsetParent))) await p.tapBtn('Stand');
    await p.shot('a07-blackjack');
    await p.tapBtn('Roulette'); await p.tapBtn('Red'); await p.tapText('Spin with', { exact: false }); await p.page.waitForTimeout(4200); await p.shot('a08-roulette');
    await p.tapBtn('Slots'); await p.tapText('Spin for', { exact: false }); await p.page.waitForTimeout(2300);
    await p.tapBtn('Poker'); await p.tapText('Deal for', { exact: false }); await p.tapSel('.pcard'); await p.tapBtn('Draw'); await p.shot('a09-poker');
    ok(await p.ev(() => BW.G.run.s.tot.casinoBet > 0), 'casino bets recorded'); ok(await ledgerOK(), 'ledger adds up after the casino');
    await closeTop();

    console.log('6. Light theme, then finish the run');
    await p.ev(() => { BW.G.meta.cos.theme = 'th_ledger'; BW.App.applyLook(); BW.App.go('home'); }); await p.shot('a10-home-ledger');
    await p.tapBtn('Market'); await p.shot('a11-market-ledger'); await p.tapText('Lumenar'); await p.page.waitForTimeout(400); await p.shot('a12-asset-ledger'); await closeTop();
    await p.ev(() => { BW.G.meta.cos.theme = 'th_floor'; BW.App.applyLook(); });
    await p.ev(() => BW.App._step(6000)); await p.page.waitForTimeout(1200);
    ok(await p.ev(() => !!document.querySelector('.versus')), 'results screen appears at the end');
    ok(await ledgerOK(), 'ledger adds up at the end of the run');
    await p.shot('a13-results');
    const meta = await p.ev(() => ({ bells: BW.G.meta.bells, boxes: BW.G.meta.boxes.length, runs: BW.G.meta.runs.length, badges: Object.keys(BW.G.meta.badges).length }));
    ok(meta.bells > 0 && meta.boxes === 1 && meta.runs === 1 && meta.badges > 0, 'rewards granted: ' + JSON.stringify(meta));
    await body(99999); await p.tapBtn('Back to the hub');
    await p.tapText('Collection'); await p.page.waitForTimeout(300); await p.tapSel('.cell'); await p.page.waitForTimeout(1300); await p.shot('a14-lockbox');
    ok(await p.ev(() => BW.G.meta.boxes.length === 0), 'lockbox opened'); await p.tapBtn('Nice'); await closeTop();
    ok(p.errors.length === 0, 'no script errors so far (' + p.errors.length + ')');
    p.errors.forEach((e) => console.log('   ', e));

    console.log('7. Challenge code: two separate phones get the identical market, and results can be swapped');
    const code = await p.ev(() => BW.makeCode('sprint', 'earth', 123456));
    const play = async (q, name) => {
      await q.ev((n) => { BW.G.meta.name = n; }, name);
      await q.tapText('Challenge friends'); await q.page.waitForTimeout(300);
      await q.page.locator('#join-code').fill(code); await q.tapBtn('Play this code');
      if (await q.ev(() => [...document.querySelectorAll('button')].some(b => b.textContent === 'Abandon it' && b.offsetParent))) await q.tapBtn('Abandon it');
      await q.ev((keys) => { keys.forEach(k => BW.G.meta.seen[k] = 1); }, SEEN);
      if (await q.ev(() => [...document.querySelectorAll('button')].some(b => b.textContent === 'Next' && b.offsetParent))) { await q.tapBtn('Next'); await q.tapBtn('Next'); await q.tapBtn('Next'); }
      const sig = await q.ev(() => { const t = BW.G.tape; let h = 0; for (const id of t.order) { const a = t.assets[id].pc; for (let i = 0; i < a.length; i += 7) h = (Math.imul(h, 31) + a[i]) | 0; } return h + ':' + t.news.length + ':' + t.listings.length; });
      await q.tapBtn('Ring the opening bell');
      await q.ev(() => { BW.App.setPaused(true); });
      return sig;
    };
    const sigA = await play(p, 'Kendall');
    ok(await p.ev(() => BW.App.tool('orders') && BW.App.tool('coin') && BW.App.tool('fast')), 'challenges give the full toolkit');
    ok(await p.ev(() => BW.G.run.s.feeMult === 1 && BW.G.run.s.startCash === 500000), 'challenges ignore perks');
    const p2 = await P.open(); const sigB = await play(p2, 'Tanner');
    ok(sigA === sigB, 'both phones generated the same market (' + sigA + ')');
    // same actions on both -> identical result; different actions -> different result
    const script = async (q, alt) => {
      await q.ev((alt2) => { const r = BW.G.run; BW.App._step(30); r.buy(alt2 ? 'lume' : 'herd', Math.floor(r.s.cash * 0.9)); BW.App._step(600); r.buy('quil', Math.floor(Math.max(0, r.s.cash) * 0.5)); BW.App._step(5000); }, alt);
      await q.page.waitForTimeout(900);
      return q.ev(() => ({ liq: BW.G.lastOut.res.score, dolly: BW.G.lastOut.res.dolly, code: BW.G.lastOut.resultCode }));
    };
    const rA = await script(p, false), rB = await script(p2, true);
    ok(rA.dolly === rB.dolly, 'Dolly finished identically on both phones (' + rA.dolly / 100 + ')');
    ok(rA.liq !== rB.liq, 'different choices gave different results');
    ok(!!rA.code && !!rB.code, 'both got result codes');
    await p.page.waitForTimeout(900); await p.shot('a15-challenge-results');
    await body(99999); await p.tapBtn('Back to the hub');
    await p.tapText('Challenge friends'); await p.page.waitForTimeout(300); await body(900); await p.tapBtn('Add a friend\'s result code');
    await p.page.locator('#res-code').fill('Tanner says hi ' + rB.code); await p.tapBtn('Add to scoreboard'); await p.page.waitForTimeout(500);
    ok(await p.ev((c) => (BW.G.meta.friends[c] || []).length === 2, code), 'friend\'s result added to the scoreboard');
    await p.shot('a16-scoreboard');
    await closeTop(); await closeTop().catch(() => {});
    await p2.close();

    console.log('8. A whole five-year run in real time at top speed, with every tool switched on');
    await p.ev(() => { BW.U = BW.UI; BW.UI.closeAll(); });
    await p.tapText('Daily Tape'); await p.tapText('Play today', { exact: false });
    await p.ev((keys) => { keys.forEach(k => BW.G.meta.seen[k] = 1); }, SEEN);
    await p.tapBtn('Ring the opening bell');
    await p.ev(() => { const r = BW.G.run; r.setAuto({ on: true, keep: 100000, alloc: [{ id: 'herd', pct: 50 }, { id: 'quil', pct: 30 }, { id: 'bgov', pct: 20 }] }); r.orderAdd({ id: 'lume', side: 'buy', kind: 'limit', px: Math.round(r.px('lume') * 0.97), amt: 50000 }); BW.G.meta.set.autoPause = false; });
    await p.tapBtn('16×');
    const tabs = ['Market', 'News', 'Life', 'More', 'Home'];
    let t = 0, lastDay = -1, stuck = 0;
    while (!(await p.ev(() => BW.G.run && BW.G.run.s.done)) && t < 80) {
      await p.tapBtn(tabs[t % tabs.length]).catch(() => {});
      if (t % 7 === 3) { await p.tapBtn('Market').catch(() => {}); await p.tapSel('#screen .item').catch(() => {}); await p.page.waitForTimeout(300); await closeTop().catch(() => {}); }
      await p.page.waitForTimeout(700);
      const dn = await p.ev(() => BW.G.run ? BW.G.run.s.d : -1); if (dn === lastDay) stuck++; else stuck = 0; lastDay = dn; t++;
      if (stuck > 6) { await p.ev(() => BW.App.setPaused(false)); }
    }
    ok(await p.ev(() => BW.G.run && BW.G.run.s.done), 'ten-year Daily Tape finished in real time at 16x after ' + t + ' checks');
    ok(await ledgerOK(), 'ledger adds up after a real-time run');
    ok(await p.ev(() => BW.G.run.s.st.fills >= 0 && Object.keys(BW.G.run.s.pos).length >= 2), 'auto-invest bought things along the way');
    await p.page.waitForTimeout(900); await p.shot('a17-daily-results');
    await body(99999); await p.tapBtn('Back to the hub'); await p.shot('a18-hub-end');

    console.log('9. Tools in a challenge: screener, chart studio, analyst desk, orders, economy lab, news desk');
    await p.tapText('Challenge friends'); await p.page.waitForTimeout(300); await p.page.locator('#join-code').fill(await p.ev(() => BW.makeCode('decade', 'earth', 777))); await p.tapBtn('Play this code'); await p.tapBtn('Ring the opening bell');
    await p.ev(() => { BW.App.setPaused(true); BW.App._step(500); });
    await p.tapBtn('Market'); await p.tapBtn('Cheapest P/E'); await p.shot('a19-screener');
    await p.tapSel('#screen .item'); await p.page.waitForTimeout(400); await p.tapBtn('Averages'); await p.tapBtn('Volume'); await p.tapBtn('vs Herd 30'); await p.tapBtn('5Y'); await p.shot('a20-studio');
    ok(await p.ev(() => [...document.querySelectorAll('.sheet h3')].some(h => h.textContent === 'Analyst desk')), 'analyst desk shows');
    await p.tapBtn('Buy'); await p.tapText('If it drops to'); await p.tapBtn('25%'); await p.shot('a21-limit-order'); await p.tapBtn('Place order');
    ok(await p.ev(() => BW.G.run.s.orders.length === 1), 'limit order placed'); await closeTop();
    await p.tapBtn('Other'); await p.shot('a22-other-coin'); ok(await p.ev(() => [...document.querySelectorAll('#screen .item')].some(i => i.textContent.includes('Fleececoin'))), 'Fleececoin listed');
    await p.tapBtn('Funds'); ok(await p.ev(() => document.querySelectorAll('#screen .item').length === 11), 'sector funds listed');
    await p.tapBtn('More'); await p.tapText('Economy'); await p.page.waitForTimeout(400); await body(2400); await p.shot('a23-econ-lab'); await closeTop();
    await p.tapBtn('News'); await p.tapBtn('How reliable has each source been?'); await p.shot('a24-sources'); await closeTop();
    await p.tapBtn('More'); await p.tapText('Cash in now'); await p.tapBtn('Cash in'); await p.page.waitForTimeout(900); await p.shot('a25-early-results');
    await body(99999); await p.tapBtn('Back to the hub');

    console.log('10. The Moon and Mars');
    await p.ev(() => { BW.G.meta.unlocked.dest_moon = 1; BW.G.meta.unlocked.dest_mars = 1; BW.App.toHub(); });
    await p.tapBtn('Start a run'); await p.tapBtn('The Moon'); await p.shot('a26-newrun-moon'); await p.tapBtn('Play Five-Year Sprint'); await p.tapBtn('Ring the opening bell');
    await p.ev(() => { BW.App.setPaused(true); BW.App._step(200); BW.G.run._cash(20000000, 'life'); BW.App.touch(); });
    ok(await p.ev(() => BW.G.tape.dest.id === 'moon' && BW.G.tape.dest.companies.length === 15 && BW.G.tape.fundId && BW.G.tape.assets[BW.G.tape.fundId].tkr === 'LUNA'), 'run is on the Moon with 15 companies');
    await p.tapBtn('Market'); await p.shot('a27-moon-market'); await p.tapSel('#screen .item'); await p.page.waitForTimeout(400); await body(700); await p.shot('a28-moon-company'); await closeTop();
    await p.tapBtn('Other'); await p.shot('a29-moon-commodities');
    await p.tapBtn('Life'); await p.tapBtn('Business'); await p.shot('a30-moon-business');
    ok(await p.ev(() => [...document.querySelectorAll('#screen .item')].some(i => i.textContent.includes('Moon Rock Stall'))), 'lunar businesses listed');
    await p.tapText('Noodle Rover'); await p.tapText('Buy for', { exact: false }); ok(await p.ev(() => BW.G.run.s.biz.length === 1), 'bought a lunar business');
    await p.tapBtn('Property'); await p.shot('a31-moon-property');
    await p.ev(() => BW.App._step(5000)); await p.page.waitForTimeout(1200);
    ok(await p.ev(() => !!BW.G.meta.badges.moonrun), 'Moon badge earned'); ok(await ledgerOK(), 'ledger adds up on the Moon');
    await p.shot('a32-moon-results'); await body(99999); await p.tapBtn('Back to the hub');
    const mcode = await p.ev(() => BW.makeCode('sprint', 'mars', 4242));
    await p.tapText('Challenge friends'); await p.page.waitForTimeout(300); await p.page.locator('#join-code').fill(mcode); await p.tapBtn('Play this code'); await p.tapBtn('Ring the opening bell');
    await p.ev(() => { BW.App.setPaused(true); BW.App._step(300); });
    ok(await p.ev(() => BW.G.tape.dest.id === 'mars'), 'a Mars challenge code opens a Mars market (' + mcode + ')');
    await p.tapBtn('Market'); await p.shot('a33-mars-market');
    await p.ev(() => BW.App._step(5000)); await p.page.waitForTimeout(1200); ok(await ledgerOK(), 'ledger adds up on Mars'); await body(99999); await p.tapBtn('Back to the hub');
  } catch (e) { fails++; console.log('TEST ERROR:', e.message.split('\n')[0]); await p.shot('zz-error').catch(() => {}); }
  console.log('script errors:', p.errors.length); p.errors.slice(0, 10).forEach((e) => console.log(' -', e));
  if (p.errors.length) fails++;
  await p.close();

  // desktop: mouse, wide window
  const d = await P.open({ w: 1280, h: 800, touch: false, dpr: 1 });
  try { await d.page.getByText('Start a run').click(); await d.page.waitForTimeout(300); await d.page.getByText('Play The Decade').click(); await d.page.waitForTimeout(300); await d.shot('b01-desktop'); ok(d.errors.length === 0, 'desktop loads without errors'); }
  catch (e) { fails++; console.log('DESKTOP ERROR', e.message.split('\n')[0]); }
  await d.close();
  console.log(fails ? '\n' + fails + ' PROBLEM(S)' : '\nAll phone checks passed.');
  process.exit(fails ? 1 : 0);
})();
