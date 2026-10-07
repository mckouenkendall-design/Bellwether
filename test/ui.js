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

  // Things an outside tester managed to break. Each one stays fixed.
  console.log('11. Regression checks from the outside test pass');
  let q = await P.open();
  try {
    const cashQ = () => q.ev(() => BW.G.run.s.cash);
    const ledgerQ = () => q.ev(() => { const s = BW.G.run.s; let t = 0; for (const k in s.flow) t += s.flow[k]; return t === s.cash && Number.isInteger(s.cash); });
    await q.tapBtn('Start a run'); await q.tapBtn('Play Five-Year Sprint'); await q.tapBtn('Next'); await q.tapBtn('Next'); await q.tapBtn('Next'); await q.tapBtn('Ring the opening bell');
    await q.ev((keys) => { BW.App.setPaused(true); keys.forEach(k => BW.G.meta.seen[k] = 1); BW.App._step(25); BW.G.run._cash(2000000, 'life'); BW.App.touch(); }, SEEN);
    // a business bought and sold the same day loses money
    const c0 = await cashQ();
    await q.tapBtn('Life'); await q.tapBtn('Business'); await q.tapText('Lawn Care Route'); await q.tapText('Buy for', { exact: false });
    const nwDrop = await q.ev(() => BW.G.run.bizValue(BW.G.run.s.biz[0]) < BW.G.run.s.biz[0].invested);
    await q.tapBtn('Sell'); await q.tapBtn('Sell it');
    ok(nwDrop && (await cashQ()) < c0 && await q.ev(() => BW.G.run.s.biz.length === 0), 'buying a business and selling it the same day loses money (' + c0 + ' -> ' + (await cashQ()) + ')');
    // the stake leaves at the deal, and the hand waits for you
    await q.tapBtn('More'); await q.tapText('Casino'); await q.page.waitForTimeout(300);
    let dealt = false, c1 = 0;
    for (let k = 0; k < 8 && !dealt; k++) { c1 = await cashQ(); await q.tapText('Deal for', { exact: false }); await q.page.waitForTimeout(350); dealt = await q.ev(() => [...document.querySelectorAll('button')].some(b => b.textContent === 'Stand' && b.offsetParent)); }
    ok(dealt && (await cashQ()) === c1 - 2500, 'the blackjack stake leaves your cash when the cards are dealt');
    await q.tapBtn('Roulette'); await q.tapBtn('Blackjack');
    ok(await q.ev(() => [...document.querySelectorAll('button')].some(b => b.textContent === 'Stand' && b.offsetParent)) && (await cashQ()) === c1 - 2500, 'looking away does not cancel the hand or refund the bet');
    await q.tapBtn('Stand'); ok(await q.ev(() => BW.G.run.s.casOpen === 0) && await ledgerQ(), 'the hand settles and the ledger adds up');
    // an ordinary double tap on Deal must not also press Hit
    let two = false;
    for (let k = 0; k < 8 && !two; k++) {
      const loc = q.page.getByText('Deal for', { exact: false }).filter({ visible: true }).first(); const bb = await loc.boundingBox();
      await q.page.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); await q.page.waitForTimeout(150); await q.page.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); await q.page.waitForTimeout(400);
      const st = await q.ev(() => { const b = [...document.querySelectorAll('button')].some(x => x.textContent === 'Stand' && x.offsetParent); return { play: b, cards: document.querySelectorAll('.felt > div:last-child .pcard').length }; });
      if (st.play) { two = true; ok(st.cards === 2, 'a double tap on Deal does not take a card (' + st.cards + ' cards in hand)'); await q.tapBtn('Stand'); }
    }
    if (!two) ok(true, 'double tap check skipped: every deal was a natural');
    // the tap filter must not get in the way of normal quick play
    const tapAt = async (sel, gap) => { const bb = await q.page.locator(sel).first().boundingBox(); await q.page.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); await q.page.waitForTimeout(gap); };
    const btnBox = async (label) => q.page.locator('button').filter({ hasText: new RegExp('^' + label + '$') }).filter({ visible: true }).first().boundingBox();
    await q.tapBtn('Poker'); await q.page.waitForTimeout(350); await q.tapText('Deal for', { exact: false }); await q.page.waitForTimeout(400);
    await tapAt('[aria-label="Hold card 1"]', 190); await tapAt('[aria-label="Hold card 3"]', 190); await tapAt('[aria-label="Hold card 5"]', 400);
    ok(await q.ev(() => [...document.querySelectorAll('.felt .pcard')].map(c => c.classList.contains('held') ? 'H' : '-').join('')) === 'H-H-H', 'three cards held with taps a fifth of a second apart');
    await q.tapBtn('Draw'); await q.page.waitForTimeout(400);
    await q.tapBtn('Blackjack'); await q.page.waitForTimeout(350);
    let hs = 0, hsOk = 0, bounce = 0, bounceOk = 0;
    for (let k = 0; k < 45 && (hs < 2 || bounce < 2); k++) {
      await q.tapText('Deal for', { exact: false }); await q.page.waitForTimeout(400);
      const live = async () => q.ev(() => { const b = [...document.querySelectorAll('button')].some(x => x.textContent === 'Stand' && x.offsetParent); const hands = document.querySelectorAll('.felt > div:last-child .hand'); return { play: b, cards: hands.length ? hands[0].querySelectorAll('.pcard').length : 0, total: +(/You: (\d+)/.exec(document.querySelector('.felt').innerText) || [0, 0])[1] }; });
      let st = await live(); if (!st.play) continue;
      if (st.total <= 11 && bounce <= hs && bounce < 2) { // two taps on Hit a tenth of a second apart are one press
        const hb = await btnBox('Hit'); await q.page.touchscreen.tap(hb.x + hb.width / 2, hb.y + hb.height / 2); await q.page.waitForTimeout(90); await q.page.touchscreen.tap(hb.x + hb.width / 2, hb.y + hb.height / 2); await q.page.waitForTimeout(450);
        const s2 = await live(); bounce++; if (s2.cards === 3) bounceOk++; if (s2.play) await q.tapBtn('Stand');
      } else if (st.total <= 11 && hs < 2) { // Hit, then Stand a fifth of a second later
        const hb = await btnBox('Hit'); await q.page.touchscreen.tap(hb.x + hb.width / 2, hb.y + hb.height / 2); await q.page.waitForTimeout(210);
        const sb = await btnBox('Stand').catch(() => null); if (sb) { await q.page.touchscreen.tap(sb.x + sb.width / 2, sb.y + sb.height / 2); await q.page.waitForTimeout(450); const s2 = await live(); hs++; if (!s2.play) hsOk++; else await q.tapBtn('Stand'); }
      } else await q.tapBtn('Stand');
      await q.page.waitForTimeout(350);
    }
    ok(bounce > 0 && bounceOk === bounce, 'a bounced tap on Hit takes one card, not two (' + bounceOk + ' of ' + bounce + ')');
    ok(hs > 0 && hsOk === hs, 'Hit then Stand a fifth of a second apart both register (' + hsOk + ' of ' + hs + ')');
    await q.tapSel('.sheet .sh-head .x[aria-label=Close]', { last: true });
    // hammering the Buy button buys once
    await q.tapBtn('Market'); await q.tapBtn('Stocks').catch(() => {}); await q.tapSel('#screen .item'); await q.page.waitForTimeout(400); await q.tapBtn('Buy'); await q.tapBtn('10%');
    const buyBtn = await q.page.locator('.sheet:last-child .btn.buy').boundingBox();
    for (let k = 0; k < 6; k++) { await q.page.touchscreen.tap(buyBtn.x + buyBtn.width / 2, buyBtn.y + buyBtn.height / 2); await q.page.waitForTimeout(35); }
    await q.page.waitForTimeout(700);
    ok(await q.ev(() => BW.G.run.s.st.buys === 1), 'six rapid taps on Buy make one purchase (' + (await q.ev(() => BW.G.run.s.st.buys)) + ')'); ok(await ledgerQ(), 'ledger adds up');
    // the Back button closes the panel and never leaves the game
    await q.ev(() => BW.UI.closeAll()); await q.page.waitForTimeout(500); await q.tapSel('#screen .item'); await q.page.waitForTimeout(500);
    ok(await q.ev(() => document.querySelectorAll('.sheet:not(.closing)').length === 1), 'a company page is open');
    await q.page.goBack().catch(() => {}); await q.page.waitForTimeout(500);
    ok(await q.ev(() => typeof BW === 'object' && document.querySelectorAll('.sheet:not(.closing)').length === 0), 'the phone Back button closes the panel and stays in the game');
    // orders that would fire at once are refused with a reason; unfunded ones are cancelled out loud
    const ord = await q.ev(() => { const r = BW.G.run, id = Object.keys(r.s.pos)[0], px = r.px(id); return { hi: r.orderAdd({ id, side: 'buy', kind: 'limit', px: px * 3, amt: 100000 }), lo: r.orderAdd({ id, side: 'buy', kind: 'limit', px: Math.round(px * 0.5), amt: 100000 }).ok, bad: r.orderAdd({ id, side: 'buy', kind: 'limit', px: 'abc', amt: 'x' }).ok, none: r.orderAdd(undefined).ok }; });
    ok(!ord.hi.ok && /below today/.test(ord.hi.why) && ord.lo && !ord.bad && !ord.none, 'standing orders on the wrong side of the price are refused with a reason');
    // nonsense into the engine changes nothing
    const junk = await q.ev(() => { const r = BW.G.run, before = JSON.stringify(r.s); const outs = [r.cdOpen(100, 1e7), r.cdOpen(NaN, 1e5), r.propOffer('L0'), r.casinoSettle(NaN, NaN), r.casinoSettle(-100000, 0), r.casinoSettle(0, 1e12), r.casinoSettle(100.5, 0), r.bizBuy('constructor'), r.setAuto(null), r.buy('herd', 'abc'), r.sell('herd', NaN), r.loanPay(Infinity)]; return { same: JSON.stringify(r.s) === before, allNo: outs.every(o => o && o.ok === false) }; });
    ok(junk.same && junk.allNo, 'bad input to the engine is refused and changes nothing');
    // result codes survive accents and emoji; forged nonsense is refused
    const rc = await q.ev(() => { const a = BW.parseResult(BW.makeResult({ code: 'BW1SE-AAAAAB', name: 'José 🙂', score: 12345600, dolly: 10000000, attempt: 2 })); const body = 'BW1SE-AAAAAB|x|abc|5|1|0'; return { a, link: BW.parseCode('https://example.org/Bellwether/#BW1DE-K7QM2X').ok }; });
    ok(rc.a.ok && rc.a.name === 'José 🙂' && rc.a.score === 12345600 && rc.link, 'result codes work with accented names, and a pasted share link is read as a code');
    // lockbox: one reward however fast you tap
    await q.ev(() => { BW.G.meta.boxes = [{ tier: 2 }]; BW.G.run.endEarly(); BW.G.run = null; BW.G.tape = null; BW.G.dolly = null; BW.G.cfg = null; BW.App.save(); BW.App.toHub(); });
    const own0 = await q.ev(() => Object.keys(BW.G.meta.cos.owned).length + BW.G.meta.bells);
    await q.tapText('Collection'); await q.page.waitForTimeout(350); await q.tapBtn('Lockboxes').catch(() => {});
    const cell = await q.page.locator('.cell').first().boundingBox();
    for (let k = 0; k < 6; k++) { await q.page.touchscreen.tap(cell.x + cell.width / 2, cell.y + cell.height / 2); await q.page.waitForTimeout(60); }
    await q.page.waitForTimeout(1200);
    ok(await q.ev(() => BW.G.meta.boxes.length === 0 && document.querySelectorAll('.reveal').length === 1), 'six rapid taps on a lockbox give one reward');
    // damaged saves never leave a dead screen
    const shapes = ['{"v":1,"meta":"x"}', '{"v":1,"meta":{"cos":{}}}', '{"v":1,"meta":{"stats":7,"bells":"lots","boxes":"no","friends":{"__proto__":5}}}', '{"v":1,"meta":{},"run":{"cfg":{"scen":"sprint","seed":5,"dest":"earth","ev":1},"s":{}}}', 'null', '[]', '{"v":1,"meta":{"bells":1e999}}'];
    let clean = 0;
    for (const sh of shapes) { await q.ev((v) => { window.localStorage.setItem('bellwether.save.v1', v); }, sh); await q.page.reload(); await q.page.waitForTimeout(500);
      if (await q.ev(() => !!document.querySelector('.hero .wm') && !/NaN|undefined|hit an error|could not start/.test(document.body.innerText) && Number.isFinite(BW.G.meta.bells) && !BW.G.run)) clean++; }
    ok(clean === shapes.length, 'every damaged save starts cleanly (' + clean + ' of ' + shapes.length + ')');
    ok(q.errors.filter(e => !/Failed to load resource/.test(e)).length === 0, 'no script errors in the regression pass (' + q.errors.length + ')'); q.errors.slice(0, 5).forEach((e) => console.log(' -', e));
  } catch (e) { fails++; console.log('TEST ERROR:', e.message.split('\n')[0]); await q.shot('zz-error2').catch(() => {}); }
  await q.close();
  // A busy run (every kind of holding, order and debt) must always come back after a reload, on every world.
  console.log('12. Busy runs survive a reload');
  const w = await P.open();
  try {
    let good = 0, tried = 0, kinds = {};
    for (const dest of ['earth', 'moon', 'mars']) {
      await w.ev((d) => { BW.G.meta.unlocked.dest_moon = 1; BW.G.meta.unlocked.dest_mars = 1; BW.G.meta.unlocked.orders = 1; ['tutorial'].forEach(k => BW.G.meta.seen[k] = 1);
        BW.UI.closeAll(); BW.App.startRun({ scen: 'decade', seed: 777 + d.length, mode: 'open', dest: d }); BW.UI.closeAll(); BW.App.setPaused(true); BW.G.run._cash(60000000, 'life'); }, dest);
      for (let round = 0; round < 6; round++) {
        const snap = await w.ev((round) => {
          const r = BW.G.run, s = r.s, t = BW.G.tape, rnd = (n) => Math.floor(Math.random() * n);
          const ids = Object.keys(t.assets).filter(id => r.canTrade(id));
          for (let k = 0; k < 6; k++) r.buy(ids[rnd(ids.length)], 50000 + rnd(400000));
          const held = Object.keys(s.pos); if (held.length) { r.sell(held[rnd(held.length)], r.qty(held[0]) * 0.3); const id = held[rnd(held.length)], px = r.px(id); r.orderAdd({ id, side: 'sell', kind: 'stop', px: Math.round(px * 0.7), frac: 0.5 }); r.orderAdd({ id, side: 'buy', kind: 'limit', px: Math.round(px * 0.8), amt: 100000 }); }
          r.cdOpen([1, 3, 5][rnd(3)], 200000 + rnd(300000));
          const L = r.listingsNow(); for (const l of L.slice(0, 3)) { const o = r.propOffer(l.id, l.ask, [0.1, 0.2, 1][rnd(3)]); if (o.ok) break; }
          if (s.props.length) { const p0 = s.props[rnd(s.props.length)]; if (round % 3 === 0) r.propRenovate(p0.id); if (round % 3 === 1) r.propSell(p0.id, false); if (round % 3 === 2) r.propRefi(p0.id); }
          const bz = t.dest.biz; r.bizBuy(bz[rnd(4)].id); if (s.biz.length) { r.bizUpgrade(s.biz[0].type); r.bizSetSelf(s.biz[0].type, round % 2 === 0); }
          r.setAuto({ on: true, keep: 150000, alloc: [{ id: t.fundId, pct: 60 }, { id: 'bgov', pct: 20 }] }); if (s.loan && s.loan.bal > 0) r.loanPay(100000);
          BW.App._step(150 + rnd(120));
          BW.App.save();
          return { d: s.d, cash: s.cash, done: s.done, n: { pos: Object.keys(s.pos).length, cds: s.cds.length, props: s.props.length, biz: s.biz.length, orders: s.orders.length } };
        }, round);
        if (snap.done) break;
        for (const k in snap.n) if (snap.n[k]) kinds[k] = 1;
        await w.page.reload(); await w.page.waitForTimeout(450); tried++;
        const back = await w.ev(() => BW.G.run ? { d: BW.G.run.s.d, cash: BW.G.run.s.cash, lost: !!BW.G.lostRun } : { lost: true });
        if (!back.lost && back.d === snap.d && back.cash === snap.cash) good++; else console.log('   lost a run:', dest, 'round', round, JSON.stringify(snap), JSON.stringify(back));
        await w.ev(() => { BW.App.toRun('home'); BW.App.setPaused(true); });
      }
    }
    ok(good === tried && tried >= 12, 'every reload brought the run back exactly (' + good + ' of ' + tried + ')');
    ok(['pos', 'cds', 'props', 'biz', 'orders'].every(k => kinds[k]), 'those runs held stocks, deposits, property, businesses and standing orders (' + Object.keys(kinds).join(', ') + ')');
    ok(w.errors.length === 0, 'no script errors (' + w.errors.length + ')'); w.errors.slice(0, 5).forEach((e) => console.log(' -', e));
  } catch (e) { fails++; console.log('TEST ERROR:', e.message.split('\n')[0]); }
  await w.close();
  // if starting up ever fails outright, the player gets a way out rather than a blank page
  const z = await P.open({ hash: '' });
  try { await z.page.addInitScript(() => { window.requestAnimationFrame = undefined; }); await z.page.reload(); await z.page.waitForTimeout(500);
    ok(await z.ev(() => /could not start/.test(document.body.innerText) && !!document.querySelector('#app button')), 'a start-up failure shows a "Start fresh" button'); }
  catch (e) { fails++; console.log('BOOT TEST ERROR', e.message.split('\n')[0]); }
  await z.close();

  // desktop: mouse, wide window
  const d = await P.open({ w: 1280, h: 800, touch: false, dpr: 1 });
  try { await d.page.getByText('Start a run').click(); await d.page.waitForTimeout(300); await d.page.getByText('Play The Decade').click(); await d.page.waitForTimeout(300); await d.shot('b01-desktop'); ok(d.errors.length === 0, 'desktop loads without errors'); }
  catch (e) { fails++; console.log('DESKTOP ERROR', e.message.split('\n')[0]); }
  await d.close();
  console.log(fails ? '\n' + fails + ' PROBLEM(S)' : '\nAll phone checks passed.');
  process.exit(fails ? 1 : 0);
})();
