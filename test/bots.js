// Bots play whole runs start to finish. Checks: money never appears or vanishes,
// nothing breaks, and the index-only strategy is as hard to beat as a real one.
//   node test/bots.js [years] [seeds]
const path = require('path');
for (const f of ['core', 'content-earth', 'tape-co', 'tape', 'run']) require(path.join(__dirname, '../src/engine/' + f + '.js'));
const BW = globalThis.BW, T = BW.T;
const years = +process.argv[2] || 20, seeds = +process.argv[3] || 30;
const LIFE = { salary: 4800000, cash: 300000, living: 230000, loan: { bal: 1800000, rate: 6, pay: 19984 } };

let failures = 0;
function fail(msg) { failures++; if (failures < 30) console.log('FAIL:', msg); }

function check(run, name) {
  const s = run.s;
  let sum = 0; for (const k in s.flow) sum += s.flow[k];
  if (sum !== s.cash) fail(name + ' cash ' + s.cash + ' != ledger ' + sum + ' day ' + s.d);
  if (!Number.isInteger(s.cash)) fail(name + ' cash not whole cents ' + s.cash);
  for (const id in s.pos) {
    const p = s.pos[id];
    if (!(p.q > 0) || !isFinite(p.q)) fail(name + ' bad qty ' + id + ' ' + p.q);
    let lq = 0; for (const l of p.lots) { lq += l[0]; if (!Number.isInteger(l[1]) || l[1] < 0) fail(name + ' lot cost ' + l[1]); }
    if (Math.abs(lq - p.q) > 1e-5) fail(name + ' lots ' + lq + ' vs qty ' + p.q + ' ' + id);
  }
  const nw = run.nw(); if (!isFinite(nw)) fail(name + ' nw NaN');
  for (const p of s.props) if (p.loan && (!Number.isInteger(p.loan.bal) || p.loan.bal < 0)) fail(name + ' loan bal');
}

const stocksAlive = (run) => run.tape.companies.filter(c => T.alive(run.tape.assets[c.id], run.s.d)).map(c => c.id);
const isMonth = (run) => (run.s.d - run.s.day0) % 20 === 0;
function sellAllBut(run, keep) { for (const id of Object.keys(run.s.pos)) if (!keep.includes(id) && run.canTrade(id)) run.sell(id, 'all'); }
function spread(run, ids, keepCash) { const free = run.s.cash - (keepCash || 100000); if (free < 5000 || !ids.length) return; const each = Math.floor(free / ids.length); for (const id of ids) run.buy(id, each); }

const BOTS = {
  cash: () => () => {},
  random1: (rng) => (run) => { if (isMonth(run)) { const ids = stocksAlive(run); spread(run, [ids[rng.int(0, ids.length - 1)]]); } },
  hold5: (rng) => { let picks = null; return (run) => { if (!picks) { const ids = stocksAlive(run); picks = []; while (picks.length < 5) { const x = ids[rng.int(0, ids.length - 1)]; if (!picks.includes(x)) picks.push(x); } }
    if (isMonth(run)) spread(run, picks.filter(id => run.canTrade(id))); }; },
  churn: (rng) => (run) => { if ((run.s.d - run.s.day0) % 60 === 0) { sellAllBut(run, []); const ids = stocksAlive(run), picks = []; while (picks.length < 5) { const x = ids[rng.int(0, ids.length - 1)]; if (!picks.includes(x)) picks.push(x); } spread(run, picks); } },
  momentum: () => (run) => { if ((run.s.d - run.s.day0) % 60 === 0) { const d = run.s.d; const ids = stocksAlive(run).filter(id => run.asset(id).start < d - 60).sort((a, b) => run.asset(b).pc[d] / run.asset(b).pc[d - 60] - run.asset(a).pc[d] / run.asset(a).pc[d - 60]).slice(0, 5); sellAllBut(run, ids); spread(run, ids); } else if (isMonth(run)) spread(run, Object.keys(run.s.pos).filter(id => run.canTrade(id))); },
  lowPE: () => (run) => { if ((run.s.d - run.s.day0) % 240 === 0) { const d = run.s.d; const ids = stocksAlive(run).map(id => [id, T.coStats(run.tape, run.asset(id), d).pe]).filter(x => x[1] && x[1] > 0).sort((a, b) => a[1] - b[1]).slice(0, 6).map(x => x[0]); sellAllBut(run, ids); spread(run, ids); } else if (isMonth(run)) spread(run, Object.keys(run.s.pos).filter(id => run.canTrade(id))); },
  quality: () => (run) => { // low debt, growing, not absurdly priced: what a careful reader of the company pages might do
    if ((run.s.d - run.s.day0) % 240 === 0) { const d = run.s.d; const ids = stocksAlive(run).map(id => [id, T.coStats(run.tape, run.asset(id), d)]).filter(x => x[1].pe && x[1].pe < 30 && (x[1].debtToProfit == null || x[1].debtToProfit < 2.5) && x[1].growth != null)
      .sort((a, b) => (b[1].growth / b[1].pe) - (a[1].growth / a[1].pe)).slice(0, 6).map(x => x[0]); sellAllBut(run, ids); spread(run, ids); } else if (isMonth(run)) spread(run, Object.keys(run.s.pos).filter(id => run.canTrade(id))); },
  oracle: () => (run) => { // cheats: can see true fair value
    if ((run.s.d - run.s.day0) % 240 === 0) { const d = run.s.d; const ids = stocksAlive(run).map(id => [id, run.asset(id).fv[d] / (run.asset(id).pc[d] / 100)]).sort((a, b) => b[1] - a[1]).slice(0, 6).map(x => x[0]); sellAllBut(run, ids); spread(run, ids); } else if (isMonth(run)) spread(run, Object.keys(run.s.pos).filter(id => run.canTrade(id))); },
  panic: () => { let out = false; return (run) => { const dd = run.tape.M.dd[run.s.d]; if (!out && dd < -0.2) { sellAllBut(run, []); out = true; } if (out && dd > -0.05) out = false; if (!out && isMonth(run)) spread(run, ['herd']); }; },
  bonds6040: () => (run) => { if (isMonth(run)) { const free = run.s.cash - 100000; if (free > 5000) { run.buy('herd', Math.floor(free * 0.6)); run.buy('bgov', Math.floor(free * 0.4)); } } },
  gold: () => (run) => { if (isMonth(run)) spread(run, ['gold']); },
  coin: () => (run) => { if (isMonth(run)) spread(run, ['fleece']); },
  landlord: () => (run) => { if (isMonth(run)) { // buys any listing it can get near asking, rest into the index
      for (const L of run.listingsNow()) { const q = run.propQuote(L, L.ask, 0.2); if (q.need < run.s.cash - 300000 && q.cap > 0.055) { run.propOffer(L.id, L.ask, 0.2); break; } }
      const free = run.s.cash - 2000000; if (free > 10000) run.buy('herd', free); } },
  dealer: () => (run) => { if (isMonth(run)) { // only buys below the area estimate, offers low, fixes up tired places
      for (const L of run.listingsNow()) { const est = run.listingEst(L); if (L.ask < est * 0.97) { const offer = Math.round(L.ask * 0.93); const q = run.propQuote(L, offer, 0.2); if (q.need < run.s.cash - 300000) { if (run.propOffer(L.id, offer, 0.2).ok) break; } } }
      for (const p of run.s.props) if (p.cond < 0.75 && p.reno === 0 && !p.sale && run.renoQuote(p).cost < run.s.cash - 300000) run.propRenovate(p.id);
      const free = run.s.cash - 2000000; if (free > 10000) run.buy('herd', free); } },
  boss: () => (run) => { if (isMonth(run)) { for (const b of BW.BIZ) { if (!run._biz(b.id) && run.bizCost(b) < run.s.cash - 200000) run.bizBuy(b.id); }
      for (const x of run.s.biz) if (x.lvl < 2 && run.bizUpCost(BW.BIZ_BY[x.type], x.lvl) < run.s.cash - 200000) run.bizUpgrade(x.type);
      const free = run.s.cash - 500000; if (free > 10000) run.buy('herd', free); } },
  chaos: (rng) => (run) => { // hammers every action at random, to shake out crashes and leaks
    const ids = run.tape.order.filter(id => run.canTrade(id));
    const k = rng.int(0, 40);
    if (k === 0 && run.s.cash > 0) run.buy(ids[rng.int(0, ids.length - 1)], Math.floor(run.s.cash * rng.next()));
    if (k === 1) { const h = Object.keys(run.s.pos); if (h.length) { const id = h[rng.int(0, h.length - 1)]; if (run.canTrade(id)) run.sell(id, rng.chance(0.5) ? 'all' : run.qty(id) * rng.next()); } }
    if (k === 2 && run.s.cash > 20000) run.cdOpen([1, 3, 5][rng.int(0, 2)], Math.floor(run.s.cash * 0.3));
    if (k === 3 && run.s.cds.length && rng.chance(0.3)) run.cdBreak(run.s.cds[0].id);
    if (k === 4) { const Ls = run.listingsNow(); if (Ls.length) { const L = Ls[rng.int(0, Ls.length - 1)]; run.propOffer(L.id, Math.round(L.ask * rng.range(0.85, 1.02)), [0.1, 0.2, 1][rng.int(0, 2)]); } }
    if (k === 5 && run.s.props.length) { const p = run.s.props[rng.int(0, run.s.props.length - 1)]; const z = rng.int(0, 4); if (z === 0) run.propRenovate(p.id); if (z === 1) run.propRefi(p.id); if (z === 2) run.propSell(p.id, false); if (z === 3) run.propSell(p.id, true); if (z === 4) run.propPaydown(p.id, Math.floor(Math.max(0, run.s.cash) * 0.2)); }
    if (k === 6) { const b = BW.BIZ[rng.int(0, 5)]; run.bizBuy(b.id); }
    if (k === 7 && run.s.biz.length) { const x = run.s.biz[rng.int(0, run.s.biz.length - 1)]; const z = rng.int(0, 2); if (z === 0) run.bizUpgrade(x.type); if (z === 1) run.bizSell(x.type); if (z === 2) run.bizSetSelf(x.type, rng.chance(0.5)); }
    if (k === 8) { const id = ids[rng.int(0, ids.length - 1)], p = run.px(id); run.orderAdd({ id, side: rng.chance(0.5) ? 'buy' : 'sell', kind: rng.chance(0.5) ? 'limit' : 'stop', px: Math.round(p * rng.range(0.9, 1.1)), amt: 50000, frac: 1 }); }
    if (k === 9 && run.s.loan) run.loanPay(Math.floor(Math.max(0, run.s.cash) * 0.1));
    if (k === 10 && run.s.cash > 1000) { const bet = Math.floor(run.s.cash * 0.05); run.casinoSettle(bet, rng.chance(0.47) ? bet * 2 : 0, 0.027); }
    if (k === 11) run.setAuto({ on: rng.chance(0.7), keep: 50000, alloc: [{ id: 'herd', pct: 50 }, { id: ids[rng.int(0, ids.length - 1)], pct: 50 }] });
  }
};

const res = {}; for (const b in BOTS) res[b] = { ratio: [], wins: 0, bank: 0 };
const dollyStats = { cagr: [], final: [] };
const t0 = Date.now();
for (let sd = 1; sd <= seeds; sd++) {
  const tape = BW.genTape({ seed: sd * 104729, years, dest: 'earth' });
  const cfg = { life: LIFE };
  const dolly = BW.makeDolly(tape, cfg);
  const runs = {};
  for (const b in BOTS) runs[b] = { run: new BW.Run(tape, cfg), pol: BOTS[b](new BW.RNG(sd * 31 + b.length)) };
  // independent re-computation for the do-nothing bot
  let ind = LIFE.cash, loan = LIFE.loan.bal, accr = 0, salary = LIFE.salary, outUntil = 0;
  while (!dolly.s.done) {
    dolly.stepDay();
    for (const b in runs) { const r = runs[b]; r.pol(r.run); r.run.stepDay(); if ((r.run.s.d % 20) === 0 || b === 'chaos') check(r.run, b); }
    // independent cash-only bookkeeping
    const d = dolly.s.d, rel = d - tape.W, M = tape.M;
    accr += ind >= 0 ? ind * M.save[d] / 100 / 240 : ind * 0.24 / 240;
    for (const s of tape.life.shocks) if (s.d === d) ind += s.amt;
    for (const j of tape.life.jobLoss) if (j.d === d) outUntil = d + j.len * 20;
    if (outUntil && d === outUntil) outUntil = 0;
    for (const z of tape.life.raises) if (z.d === d) salary = Math.round(salary * (1 + z.pct / 100));
    if (rel > 0 && rel % 20 === 0) {
      const a = Math.round(accr); accr -= a; ind += a > 0 ? a - Math.round(a * 0.22) : a;
      const g = Math.round(salary / 12); ind += outUntil ? Math.round(g * 0.4) : g - Math.round(g * 0.22);
      ind -= Math.round(LIFE.living * (M.cpi[d] / M.cpi[tape.W]) * BW.dpow(1.008, rel / 240));
      if (loan > 0) { const i = Math.round(loan * 6 / 1200), p = Math.min(LIFE.loan.pay, loan + i); loan = loan + i - p; ind -= p; }
    }
  }
  check(dolly, 'dolly');
  const cb = runs.cash.run;
  if (cb.s.st.forced === 0 && cb.s.cash !== ind) fail('seed ' + sd + ' do-nothing bot cash ' + cb.s.cash + ' but independent sum says ' + ind);
  const dl = dolly.liq();
  dollyStats.final.push(dl / 100);
  for (const b in runs) { const r = runs[b].run, v = r.liq(); res[b].ratio.push(v / dl); if (v > dl) res[b].wins++; if (r.s.bankrupt) res[b].bank++; }
  // determinism: same seed again must give the identical market and identical Dolly
  if (sd <= 3) {
    const tape2 = BW.genTape({ seed: sd * 104729, years, dest: 'earth' });
    let same = tape2.news.length === tape.news.length;
    for (const id of tape.order) { const a = tape.assets[id].pc, b = tape2.assets[id].pc; for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) { same = false; break; } }
    const d2 = BW.dollySeries(tape2, cfg, tape2.N);
    if (!same || d2.liq() !== dl) fail('seed ' + sd + ' not deterministic');
  }
}
const med = a => { const s = [...a].sort((x, y) => x - y); return s[s.length >> 1]; };
const q = (a, p) => { const s = [...a].sort((x, y) => x - y); return s[Math.floor(s.length * p)]; };
console.log(`\n${years}-year runs, ${seeds} markets, ${((Date.now() - t0) / 1000).toFixed(1)}s. Final money as a multiple of Dolly's (1.00 = tied with the index).`);
console.log('Dolly finishes with a median of $' + Math.round(med(dollyStats.final)).toLocaleString());
console.log('bot'.padEnd(11), 'median', ' worst10%', ' best10%', ' beat Dolly', ' bankrupt');
for (const b in res) { const r = res[b].ratio; console.log(b.padEnd(11), med(r).toFixed(2).padStart(6), q(r, 0.1).toFixed(2).padStart(9), q(r, 0.9).toFixed(2).padStart(8), (Math.round(100 * res[b].wins / seeds) + '%').padStart(10), String(res[b].bank).padStart(8)); }
console.log(failures ? `\n${failures} FAILURES` : '\nAll money checks passed: cash always equals the sum of its ledger, no fractional cents, lots match holdings, markets are reproducible.');
process.exit(failures ? 1 : 0);
