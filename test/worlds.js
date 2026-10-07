// The Moon and Mars exchanges: do their markets behave, and does Dolly survive them?
const path = require('path');
for (const f of ['core', 'content-earth', 'content-moon', 'content-mars', 'tape-co', 'tape', 'run', 'meta']) require(path.join(__dirname, '../src/engine/' + f + '.js'));
const BW = globalThis.BW; const n = +process.argv[2] || 16;
const med = a => [...a].sort((x, y) => x - y)[a.length >> 1];
for (const dest of ['earth', 'moon', 'mars']) {
  const cg = [], vol = [], mdd = [], bust = [], take = [], pe = [], dl = [], cash = [];
  for (let s = 1; s <= n; s++) {
    const t = BW.genTape({ seed: s * 7717, years: 20, dest }); const M = t.M, N = t.N, W = t.W;
    let peak = 0, dd = 0, sum = 0, sq = 0, k = 0, p = 0;
    for (let d = W + 1; d < N; d++) { peak = Math.max(peak, M.idx[d]); dd = Math.min(dd, M.idx[d] / peak - 1); const r = Math.log(M.idx[d] / M.idx[d - 1]); sum += r; sq += r * r; k++; p += M.pe[d]; }
    cg.push(Math.pow(M.tr[N - 1] / M.tr[W], 1 / 20) - 1); vol.push(Math.sqrt((sq / k - (sum / k) ** 2) * 240)); mdd.push(dd); pe.push(p / k);
    bust.push(t.companies.filter(c => c.endWhy === 'bankrupt').length); take.push(t.companies.filter(c => c.endWhy === 'bought').length);
    const cfg = { life: BW.LIFE_DEFAULT }; const dolly = BW.makeDolly(t, cfg); const saver = new BW.Run(t, cfg);
    while (!dolly.s.done) { dolly.stepDay(); saver.stepDay(); }
    dl.push(dolly.liq() / 100); cash.push(saver.liq() / 100);
  }
  const p = x => (x * 100).toFixed(1) + '%';
  console.log(dest.padEnd(6), 'stocks/yr', p(med(cg)), '| swings', p(med(vol)), '| worst fall', p(med(mdd)), '| P/E', med(pe).toFixed(1), '| bankruptcies', med(bust), '| takeovers', med(take), '| Dolly $' + Math.round(med(dl)).toLocaleString(), '| cash only $' + Math.round(med(cash)).toLocaleString());
}
