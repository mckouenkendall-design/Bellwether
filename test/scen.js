// How each scenario's market behaves across many seeds.
const path = require('path');
for (const f of ['core', 'content-earth', 'content-moon', 'content-mars', 'tape-co', 'tape', 'run', 'meta']) require(path.join(__dirname, '../src/engine/' + f + '.js'));
const BW = globalThis.BW; const n = +process.argv[2] || 14;
const med = a => [...a].sort((x, y) => x - y)[a.length >> 1], lo = a => [...a].sort((x, y) => x - y)[Math.floor(a.length * 0.1)], hi = a => [...a].sort((x, y) => x - y)[Math.floor(a.length * 0.9)];
for (const sc of BW.SCENARIOS) {
  const cg = [], dd = [], inf = [], hs = [], gv = [], gd = [], y5 = [];
  for (let s = 1; s <= n; s++) {
    const t = BW.genTape({ seed: s * 7717, years: sc.years, dest: 'earth', mods: sc.mods }); const M = t.M, N = t.N, W = t.W;
    let peak = 0, mdd = 0, i = 0; for (let d = W; d < N; d++) { peak = Math.max(peak, M.idx[d]); mdd = Math.min(mdd, M.idx[d] / peak - 1); i += M.infl[d]; }
    cg.push(Math.pow(M.tr[N - 1] / M.tr[W], 1 / sc.years) - 1); dd.push(mdd); inf.push(i / (N - W)); hs.push(Math.pow(M.housing[N - 1] / M.housing[W], 1 / sc.years) - 1);
    gv.push(Math.pow(t.assets.bgov.pc[N - 1] / t.assets.bgov.pc[W], 1 / sc.years) - 1); gd.push(Math.pow(t.assets.gold.pc[N - 1] / t.assets.gold.pc[W], 1 / sc.years) - 1);
    const e = Math.min(N - 1, W + 1200); y5.push(M.tr[e] / M.tr[W]);
  }
  const p = x => (x * 100).toFixed(1) + '%';
  console.log(sc.id.padEnd(9), 'stocks/yr', p(lo(cg)), p(med(cg)), p(hi(cg)), '| after 5y x' + med(y5).toFixed(2), '| worst fall', p(med(dd)), '| infl', med(inf).toFixed(1), '| houses/yr', p(med(hs)), '| gov bonds/yr', p(med(gv)), '| gold/yr', p(med(gd)));
}
