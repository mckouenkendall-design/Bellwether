// Checks every invented company name and ticker against real US listings.
//   node tools/check-names.js <folder containing nasdaq.json, nyse.json, amex.json>
// (Lists from github.com/rreichel3/US-Stock-Symbols.)
const fs = require('fs'), path = require('path');
globalThis.BW = {};
for (const f of ['core', 'content-earth', 'content-moon', 'content-mars']) require(path.join(__dirname, '../src/engine/' + f + '.js'));
const dir = process.argv[2] || '.';
const all = []; for (const ex of ['nasdaq', 'nyse', 'amex']) all.push(...JSON.parse(fs.readFileSync(path.join(dir, ex + '.json'), 'utf8')));
const syms = new Set(all.map((x) => x.symbol.trim().toUpperCase())), names = all.map((x) => x.name.toLowerCase());
let clashes = 0, n = 0; const seen = new Set();
for (const k of Object.keys(BW.DEST)) {
  const d = BW.DEST[k], cos = [...d.companies, ...d.pool];
  const tk = [...cos.map((c) => c.tkr), d.fundTkr, ...d.commodities.map((c) => c.tkr), d.crypto.tkr, 'BGOV', 'BLNG', 'BCRP', 'BJNK', ...d.sectors.map((s) => 'S' + s.id.slice(0, 4).toUpperCase())];
  for (const t of tk) { n++; if (syms.has(t)) { clashes++; console.log('REAL TICKER', k, t); } }
  for (const c of cos) { if (seen.has(c.id)) console.log('DUPLICATE ID', c.id); seen.add(c.id); if (seen.has('T' + c.tkr)) console.log('DUPLICATE TICKER', c.tkr); seen.add('T' + c.tkr);
    const first = c.name.toLowerCase().split(' ')[0]; const hits = names.filter((x) => x.split(/[\s,]+/)[0] === first); if (hits.length) console.log('name shares a first word with a real listing:', c.name, '->', hits[0]); }
}
console.log(n + ' tickers checked against ' + syms.size + ' real symbols, ' + clashes + ' clashes');
