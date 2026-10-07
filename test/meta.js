// Sanity checks for codes, scenarios and the review.
const path = require('path');
for (const f of ['core', 'content-earth', 'tape-co', 'tape', 'run', 'meta']) require(path.join(__dirname, '../src/engine/' + f + '.js'));
const BW = globalThis.BW; let bad = 0; const ok = (c, m) => { if (!c) { bad++; console.log('FAIL', m); } };
// challenge codes
for (const s of BW.SCENARIOS) { const code = BW.makeCode(s.id, 'earth', 123456789 + s.years); const p = BW.parseCode(code.toLowerCase().replace('-', '')); ok(p.ok && p.scen === s.id && p.seed === (123456789 + s.years) % 1073741824 && p.code === code, 'code ' + code); }
ok(!BW.parseCode('hello').ok, 'bad code rejected');
const rc = BW.makeResult({ code: 'BW1CE-K7QM2X', name: 'Kendall', score: 81234567, dolly: 70120000, attempt: 2, bankrupt: false });
const pr = BW.parseResult('here you go ' + rc); ok(pr.ok && pr.name === 'Kendall' && pr.score === 81234600 && pr.attempt === 2, 'result roundtrip ' + JSON.stringify(pr));
ok(!BW.parseResult(rc.slice(0, -2) + 'zz').ok, 'tampered result rejected');
ok(/^\d{4}-\d{2}-\d{2}$/.test(BW.todayStr()), 'today ' + BW.todayStr());
// every scenario generates and Dolly finishes it
for (const sc of BW.SCENARIOS) {
  const t0 = Date.now();
  const tape = BW.genTape({ seed: 4242, years: sc.years, dest: 'earth', mods: sc.mods });
  const cfg = { life: sc.life };
  const dolly = BW.makeDolly(tape, cfg); while (!dolly.s.done) dolly.stepDay();
  const run = new BW.Run(tape, cfg); let m = 0;
  while (!run.s.done) { if ((run.s.d - run.s.day0) % 20 === 1 && run.s.cash > 50000) { const ids = ['herd', 'quil', 'bgov', 'gold']; run.buy(ids[m++ % 4], Math.floor(run.s.cash * 0.5)); } run.stepDay(); }
  const res = BW.analyze(run, dolly, sc);
  ok(isFinite(res.ratio) && res.lessons.length > 0, sc.id + ' analysis');
  const M = tape.M, N = tape.N, W = tape.W;
  let peak = 0, mdd = 0, infl = 0; for (let d = W; d < N; d++) { peak = Math.max(peak, M.idx[d]); mdd = Math.min(mdd, M.idx[d] / peak - 1); infl += M.infl[d]; }
  console.log(sc.id.padEnd(9), (sc.years + 'y').padStart(4), 'index x' + (M.tr[N - 1] / M.tr[W]).toFixed(2).padStart(6), 'worst fall ' + (mdd * 100).toFixed(0) + '%', 'avg inflation ' + (infl / (N - W)).toFixed(1) + '%', 'houses x' + (M.housing[N - 1] / M.housing[W]).toFixed(2),
    '| Dolly $' + Math.round(res.dolly / 100).toLocaleString().padStart(11), 'you/Dolly ' + res.ratio.toFixed(2), 'bells ' + BW.bellsFor(res, sc, sc.years), (Date.now() - t0) + 'ms');
  if (sc.id === 'classic') { console.log(JSON.stringify(res.cats.map(c => [c.cat, Math.round(c.alpha / 100)]))); console.log(res.lessons.map(l => ' - ' + l.h + ': ' + l.b).join('\n')); console.log('gap', res.gap / 100, 'explained', Math.round(res.explained / 100), 'idle', Math.round(res.idle / 100)); }
}
console.log(bad ? bad + ' FAILURES' : 'meta checks passed'); process.exit(bad ? 1 : 0);
