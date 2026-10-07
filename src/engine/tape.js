/* The Tape: one whole market, start to finish, generated from a seed.
 * The player cannot change it (your trades are too small to move prices), so
 * everyone holding the same challenge code faces exactly the same market.
 */
(function (root) {
  'use strict';
  var BW = root.BW, dexp = BW.dexp, dlog = BW.dlog, clamp = BW.clamp, RNG = BW.RNG, mix = BW.mix;
  var DPY = 240, DT = 1 / 240, SQDT = Math.sqrt(DT);
  var REG = BW.REG = { EXP: 0, BOOM: 1, SLOW: 2, REC: 3, RECOV: 4 };
  BW.REG_NAMES = ['Expansion', 'Boom', 'Slowdown', 'Recession', 'Recovery'];
  BW.WARMUP = 720;

  function r2(x) { return Math.round(x * 100) / 100; }
  function f1(x) { return x.toFixed(1); }

  BW.genTape = function (cfg) {
    var dest = BW.DEST[cfg.dest || 'earth'];
    var mods = cfg.mods || {};
    var W = BW.WARMUP, years = cfg.years, N = W + years * DPY + 1;
    var seed = cfg.seed >>> 0;
    function rng(name) { return new RNG(mix(seed, name, BW.ENGINE_VERSION, dest.id)); }
    var rM = rng('macro'), rS = rng('sent'), rSec = rng('sectors'), rC = rng('cmdty'), rB = rng('bonds'), rNw = rng('macro-news');
    // One random draw per headline, but never the same wording twice running for the same kind of story.
    var cmLast = {};
    function cmHead(kind) { var arr = dest.cmNews[kind][0], i = Math.floor(rNw.next() * arr.length); if (arr.length > 1 && cmLast[kind] === i) i = (i + 1) % arr.length; cmLast[kind] = i; return arr[i]; }
    var vm = (mods.volMult || 1) * dest.volMult, gb = (mods.growthBias || 0) + dest.growthAdd * 100;

    var F = function () { return new Float32Array(N); };
    var M = { gdp: F(), infl: F(), rate: F(), y2: F(), y10: F(), unemp: F(), sent: F(), mort: F(), igs: F(), hys: F(), gap: F(), save: F(), hg: F(),
      regime: new Uint8Array(N), cpi: new Float64Array(N), housing: new Float64Array(N), rent: new Float64Array(N), pe: F(), idx: new Float64Array(N), tr: new Float64Array(N), dd: F() };

    var news = [];
    function post(d, o) { o.d = d; o.i = news.length; news.push(o); }
    var schedMap = {};
    function sched(d, fn) { if (d >= N) return; (schedMap[d] = schedMap[d] || []).push(fn); }

    /* ---------- macro state ---------- */
    var startReg = mods.startRegime != null ? mods.startRegime : rM.wpick([REG.EXP, REG.EXP, REG.EXP, REG.BOOM, REG.RECOV, REG.SLOW], function () { return 1; });
    var st = { reg: startReg, regDays: rM.int(0, 300), pend: null, pendIn: 0, depth: 2, gdp: 2.5, gap: rM.range(-0.5, 0.8), infl: 2.2 + 0.4 * rM.n(), z: 0,
      rate: 2.5, rstar: 2.7, rLong: 2.9, tp: 0.8, n2: 0, S: 0, vsh: 0, crash: null, unemp: 5, yAvg: 4.0, stress: 0, sn: 0,
      hg: 3, hb: null, lastInflPost: 2.2, lastUnempPost: 5, negQ: 0, inverted: false, idxPeak: 1000, bear: 0, lastHighPost: -999, holdRun: 0, lastMove: 0 };
    if (startReg === REG.BOOM) st.S = 0.15; else if (startReg === REG.RECOV) st.S = -0.08; else if (startReg === REG.SLOW) st.S = -0.04;
    st.S += mods.sentAdd || 0;
    var startS = mods.startS, calmUntil = mods.calm ? W + Math.round(mods.calm * DPY) : -1;
    st.rate = clamp(Math.round((0.5 + st.infl + 0.5 * (st.infl - 2.2) + 0.5 * st.gap) * 4) / 4, 0.25, 8);
    st.rLong = st.rate * 0.5 + 1.45;
    var forced = (mods.force || []).map(function (f) { return { d: W + Math.round(f.y * DPY), reg: f.reg, depth: f.depth, bust: f.bust, done: false }; });
    var inflPath0 = mods.inflBias || null, sentPath = mods.sentPath || null;
    function inflBias(ry) { return pathVal(inflPath0, ry); }
    function pathVal(path, ry) {
      if (!path) return 0;
      var inflPath = path;
      if (ry <= inflPath[0][0]) return inflPath[0][1];
      for (var i = 1; i < inflPath.length; i++) if (ry <= inflPath[i][0]) {
        var a = inflPath[i - 1], b = inflPath[i];
        return a[1] + (b[1] - a[1]) * (ry - a[0]) / (b[0] - a[0]);
      }
      return inflPath[inflPath.length - 1][1];
    }

    function enter(reg, d, opts) {
      st.reg = reg; st.regDays = 0;
      if (reg === REG.REC) st.depth = (opts && opts.depth) || rM.range(1.0, 3.2);
    }
    function planNext(d) {
      var realRate = st.rate - st.infl, yrs = st.regDays / DPY, h = 0, next = null, lead = rM.int(40, 90);
      switch (st.reg) {
        case REG.EXP: if (yrs > 1.5) { h = DT / 2.8; next = (realRate > 1.5 ? rM.chance(0.2) : rM.chance(0.55)) ? REG.BOOM : REG.SLOW; } break;
        case REG.BOOM: if (yrs > 0.8) { h = DT / 1.2 * (1 + 0.6 * Math.max(0, realRate - 0.8));
          next = rM.chance(clamp(0.3 + 1.2 * Math.max(0, st.S - 0.2), 0.3, 0.7)) ? 'bust' : REG.SLOW; } break;
        case REG.SLOW: if (yrs > 0.4) { h = DT / 0.6; next = rM.chance(0.55 + (realRate > 1.5 ? 0.2 : 0)) ? REG.REC : REG.EXP; } break;
        case REG.REC: if (yrs > 0.5) { h = DT / (0.5 * st.depth / 2.2); next = REG.RECOV; } break;
        case REG.RECOV: if (yrs > 0.8) { h = DT / 0.8; next = REG.EXP; } break;
      }
      if (next != null && d < calmUntil && (next === 'bust' || next === REG.REC || next === REG.SLOW)) return;
      if (next != null && rM.chance(h)) {
        if (next === 'bust') startBust(d, null);
        else { st.pend = { reg: next }; st.pendIn = lead; }
      }
    }
    function startBust(d, depth) {
      st.crash = { left: rS.int(20, 45), total: rS.range(0.16, 0.28), n: 0 };
      st.crash.per = st.crash.total / st.crash.left;
      st.pend = { reg: REG.REC, depth: depth || rM.range(2.4, 4.2) }; st.pendIn = 30;
      post(d, { sc: 'm', k: 'bust', src: 'WIRE', sev: 3, tr: 'real', h: rNw.pick(['Markets plunge as the boom cracks', 'Panic selling hits every sector', 'Stocks in freefall as lenders pull back']),
        b: 'After a long run of easy gains, buyers have vanished. Banks are tightening lending. Falls like this tend to come in waves over weeks, and the economy usually follows.' });
    }
    var SCARES = [
      ['Trade dispute rattles markets', 'Two big economies are threatening tariffs on each other. Nothing has been imposed yet.'],
      ['Stocks slide on fears of a slowdown abroad', 'One weak factory report overseas set it off. The data at home has not changed.'],
      ['Budget standoff spooks investors', 'Politicians are fighting over the national budget again. These fights have always ended in a deal.'],
      ['Sell-off spreads after a large fund collapses', 'One overstretched fund was forced to dump its holdings. The selling says more about that fund than about the economy.'],
      ['Markets tumble on a virus scare', 'A new outbreak is in the headlines. So far there is no sign it is hurting business.'],
      ['Sharp drop after a currency wobble', 'A sudden move in exchange rates triggered automatic selling. Company profits are unaffected for now.']
    ];

    /* ---------- sectors ---------- */
    var sec = {}, secList = dest.sectors;
    secList.forEach(function (s) { sec[s.id] = { id: s.id, dem: 1.5 * rSec.n(), mar: 0.04 * rSec.n(), sen: 0.06 * rSec.n(), bub: 0, bubPhase: 0, bubLeft: 0, bubRate: 0 }; });
    var manias = (mods.sectorMania || []).map(function (m) { return { d: W + Math.round(m.y * DPY), sector: m.sector, dur: m.dur || 2 }; });
    function startMania(s, d, durY) {
      if (s.bubPhase) return;
      s.bubPhase = 1; s.bubLeft = Math.round(durY * DPY); s.bubRate = rSec.range(0.12, 0.22);
      var def = secList.filter(function (x) { return x.id === s.id; })[0];
      post(d, { sc: 's', sec: s.id, k: 'mania', src: 'WIRE', sev: 2, tr: 'mixed', h: 'Investors pile into ' + def.name + ' stocks',
        b: 'Money is pouring into the sector and prices are rising faster than profits. That can go on for years. It has never gone on forever.' });
    }
    var SECEV = JSON.parse(JSON.stringify(dest.secEvents || {}));

    // centre each sector's events so that no sector is doomed or blessed on average
    Object.keys(SECEV).forEach(function (k) {
      var a = SECEV[k], m2 = 0, m3 = 0, m4 = 0;
      a.forEach(function (e) { m2 += e[2]; m3 += e[3]; m4 += e[4]; });
      a.forEach(function (e) { e[2] -= m2 / a.length; e[3] -= m3 / a.length; e[4] -= m4 / a.length; });
    });

    /* ---------- other assets ---------- */
    var assets = {}, order = [];
    function mkAsset(id, tkr, name, kind, extra) {
      var a = { id: id, tkr: tkr, name: name, kind: kind, pc: new Int32Array(N), start: 0, end: -1, endPx: 0, divs: [], newsIdx: [] };
      if (extra) for (var k in extra) a[k] = extra[k];
      assets[id] = a; order.push(id); return a;
    }
    var fund = mkAsset('herd', dest.fundTkr, dest.fundName, 'fund', { desc: 'One purchase buys a slice of all ' + dest.companies.length + ' companies on the exchange, weighted by size. Costs almost nothing to hold. This is the only thing Dolly buys.', fee: 0.0004, cost: 2 });
    var bonds = [
      mkAsset('bgov', 'BGOV', 'Government Bond Fund', 'bond', { dur: 6, desc: 'Loans to the government, repaid in about seven years. The safest borrower there is. The price still dips when interest rates rise and climbs when they fall.', cost: 3 }),
      mkAsset('blng', 'BLNG', 'Long Government Bond Fund', 'bond', { dur: 15, desc: 'Loans to the government for 20 to 30 years. Because the money is tied up so long, the price swings hard when interest rates move. Often jumps when stocks crash.', cost: 3 }),
      mkAsset('bcrp', 'BCRP', 'Corporate Bond Fund', 'bond', { dur: 6, desc: 'Loans to large, healthy companies. Pays more interest than government bonds because a company can fail. Sags in recessions.', cost: 5 }),
      mkAsset('bjnk', 'BJNK', 'High-Yield Bond Fund', 'bond', { dur: 4, desc: 'Loans to shaky companies at high interest. Pays well in good times. In a recession some borrowers go bust and the fund falls almost like a stock.', cost: 8 })
    ];
    var cmd = dest.commodities.map(function (c) { return mkAsset(c.id, c.tkr, c.name, 'cmdty', { desc: c.desc, unit: c.unit, p0: c.p0, cost: 25 }); }); // ids are always oil, gold, copper, wheat: the roles they play in the economy
    var crypto = mkAsset(dest.crypto.id, dest.crypto.tkr, dest.crypto.name, 'crypto', { desc: dest.crypto.desc, cost: 75 });
    var secFunds = {};
    secList.forEach(function (s) {
      secFunds[s.id] = mkAsset('sf_' + s.id, 'S' + s.id.slice(0, 4).toUpperCase(), s.name + ' Sector Fund', 'sfund', { sector: s.id, desc: 'Owns every ' + s.name + ' company on the exchange. A way to bet on the sector without picking a winner inside it.', fee: 0.0035, cost: 5, f: 50, acc: 0 });
    });

    var cm = { oil: 0.1 * rC.n(), gold: 0.08 * rC.n(), copper: 0.1 * rC.n(), wheat: 0.1 * rC.n() };
    var cmP = { oil: 0, gold: 0, copper: 0, wheat: 0 };
    var cr = { mode: 0, left: 0, lp: dlog(dest.crypto.p0) };
    var bf = { bgov: 100, blng: 100, bcrp: 100, bjnk: 100 };
    var prevY = null;
    var fundF = 100, fundAcc = 0;

    var ctx = { seed: seed, dest: dest, M: M, st: st, sec: sec, post: post, sched: sched, rng: rng, cm: cm, N: N, W: W };
    var coE = BW._coEngine(ctx);

    /* ============================ main loop ============================ */
    for (var d = 0; d < N; d++) {
      var ry = (d - W) / DPY, i, n;
      // ----- regime
      st.regDays++;
      for (i = 0; i < forced.length; i++) {
        var f = forced[i];
        if (!f.done && d >= f.d - 60) {
          f.done = true;
          if (f.bust) startBust(d, f.depth); else { st.pend = { reg: f.reg, depth: f.depth }; st.pendIn = Math.max(1, f.d - d); }
        }
      }
      if (st.pend) { st.pendIn--; if (st.pendIn <= 0) { enter(st.pend.reg, d, st.pend); st.pend = null; } }
      else if (!mods.scripted) planNext(d);
      if (d === W && startS != null) st.S = startS;
      var regS = st.pend ? st.pend.reg : st.reg; // what the stock market is already pricing
      M.regime[d] = st.reg;

      // ----- real economy
      var gT = [2.6, 3.9, 0.9, -st.depth, 3.6][st.reg] + gb;
      st.gdp += 2.2 * (gT - st.gdp) * DT + 0.8 * SQDT * rM.n();
      st.gap += ((st.gdp - 2.3 - gb) - 0.22 * st.gap) * DT;
      st.unemp = clamp(st.unemp + 1.5 * ((4.8 - 0.8 * st.gap) - st.unemp) * DT + 0.25 * SQDT * rM.n(), 2.4, 16);
      st.z += -0.35 * st.z * DT + 0.55 * SQDT * rM.n();
      var oilPass = d > 241 ? clamp(dlog(cmP.oilHist[d - 1] / cmP.oilHist[d - 241]), -0.6, 0.6) * 1.8 : 0;
      var inflT = 2.2 + 0.28 * st.gap + oilPass + st.z + inflBias(ry);
      st.infl = clamp(st.infl + 1.1 * (inflT - st.infl) * DT + 0.35 * SQDT * rM.n(), -1.5, 18);
      M.cpi[d] = d === 0 ? 1 : M.cpi[d - 1] * dexp(st.infl / 100 * DT);
      M.gdp[d] = st.gdp; M.gap[d] = st.gap; M.unemp[d] = st.unemp; M.infl[d] = st.infl;

      // ----- the Reserve
      st.rstar = clamp(0.5 + st.infl + 0.5 * (st.infl - 2.2) + 0.5 * st.gap - ((regS === REG.REC) ? 1.0 : 0), 0.25, 14);
      if (d % 30 === 10) {
        var diff = st.rstar - st.rate, stepR = 0;
        if (Math.abs(diff) >= 0.3) {
          stepR = clamp(Math.round(diff * 0.45 / 0.25) * 0.25, st.reg === REG.REC || st.crash ? -1 : -0.75, 0.5);
          if (stepR === 0) stepR = diff > 0 ? 0.25 : -0.25;
        }
        var newRate = Math.max(0.25, st.rate + stepR);
        stepR = newRate - st.rate; st.rate = newRate;
        if (stepR !== 0) {
          var big = Math.abs(stepR) >= 0.5, turn = st.lastMove !== 0 && (stepR > 0) !== (st.lastMove > 0);
          post(d, { sc: 'm', k: 'rate', src: 'DATA', sev: big || turn ? 3 : 2, tr: 'real', stop: turn,
            h: cap(dest.reserve) + (stepR > 0 ? ' raises' : ' cuts') + ' interest rates to ' + st.rate.toFixed(2) + '%',
            b: (stepR > 0 ? 'Borrowing gets more expensive, which cools spending and inflation. Higher rates usually weigh on stock and bond prices, and savings accounts pay more.'
              : 'Borrowing gets cheaper to encourage spending. Lower rates usually lift stock and bond prices, and savings accounts pay less.') +
              (turn ? ' This is its first move in this direction after a run the other way.' : '') });
          st.lastMove = stepR; st.holdRun = 0;
        } else {
          st.holdRun++;
          if (st.holdRun === 1 && st.lastMove !== 0) post(d, { sc: 'm', k: 'hold', src: 'DATA', sev: 1, tr: 'real', h: cap(dest.reserve) + ' leaves rates at ' + st.rate.toFixed(2) + '%', b: 'After a run of ' + (st.lastMove > 0 ? 'rises' : 'cuts') + ', it paused. It says the next move depends on inflation and jobs.' });
        }
      }
      var rexp = st.rate + 0.65 * (st.rstar - st.rate);
      st.rLong += (st.rstar + 0.2 - st.rLong) * DT / 3.5;
      st.tp += 0.5 * (0.8 - st.tp) * DT + 0.35 * SQDT * rB.n();
      st.n2 += -2 * st.n2 * DT + 0.25 * SQDT * rB.n();
      var y2 = Math.max(0.1, 0.45 * st.rate + 0.55 * rexp + 0.1 + st.n2);
      var y10 = Math.max(0.3, 0.25 * rexp + 0.75 * st.rLong + st.tp);
      st.yAvg += (y10 - st.yAvg) * DT / 8;
      M.rate[d] = st.rate; M.y2[d] = y2; M.y10[d] = y10; M.mort[d] = y10 + 1.7; M.save[d] = Math.max(0.05, st.rate - 0.4);
      if (!st.inverted && y10 < st.rate - 0.15) {
        st.inverted = true;
        post(d, { sc: 'm', k: 'invert', src: 'DATA', sev: 2, tr: 'real', h: 'Short-term interest rates rise above long-term rates',
          b: 'Normally lending for longer pays more. When that flips, bond investors are betting rates will have to be cut later because the economy will weaken. It has come before most recessions, often a year or more early, and it has also given false alarms.' });
      } else if (st.inverted && y10 > st.rate + 0.4) st.inverted = false;

      // ----- market mood
      var yrsIn = st.regDays / DPY;
      var sT = (regS === REG.EXP ? 0.03 : regS === REG.BOOM ? 0.1 + 0.13 * Math.min(1, (st.reg === REG.BOOM ? yrsIn : 0) / 1.5) : regS === REG.SLOW ? -0.06 :
        regS === REG.REC ? -0.12 - 0.045 * (st.pend && st.pend.depth ? st.pend.depth : st.depth) : -0.1 + 0.12 * Math.min(1, (st.reg === REG.RECOV ? yrsIn : 0) / 1.2)) + (mods.sentAdd || 0) + pathVal(sentPath, ry);
      st.vsh *= 1 - 4 * DT;
      var volM = (1 + st.vsh) * (st.reg === REG.REC ? 1.45 : st.reg === REG.BOOM ? 0.85 : 1) * vm;
      var eps = rS.n();
      st.S += 1.5 * (sT - st.S) * DT + 0.105 * volM * SQDT * eps;
      if (Math.abs(eps) > 2) st.vsh = Math.min(2, st.vsh + 0.25 * (Math.abs(eps) - 2));
      if (st.crash) {
        st.S -= st.crash.per * (0.4 + 1.2 * rS.next()); st.vsh = Math.max(st.vsh, st.crash.total > 0.14 ? 1.2 : 0.6);
        if (--st.crash.left <= 0) st.crash = null;
      } else if (st.reg !== REG.REC && !st.pend && rS.chance(DT / 4.5)) {
        st.crash = { left: rS.int(4, 14), total: rS.range(0.06, 0.12) }; st.crash.per = st.crash.total / st.crash.left;
        var sc = rNw.pick(SCARES);
        post(d, { sc: 'm', k: 'scare', src: 'WIRE', sev: 2, tr: 'noise', h: sc[0], b: sc[1] });
      }
      M.sent[d] = st.S;

      // ----- sectors
      for (i = 0; i < secList.length; i++) {
        var s = sec[secList[i].id];
        s.dem += -0.45 * s.dem * DT + 2.2 * SQDT * rSec.n();
        s.mar += -0.7 * s.mar * DT + 0.07 * SQDT * rSec.n();
        s.sen += -0.7 * s.sen * DT + 0.06 * SQDT * rSec.n();
        if (s.bubPhase === 1) { s.bub += s.bubRate * DT; if (--s.bubLeft <= 0) { s.bubPhase = 2; s.bubRate = rSec.range(1.5, 2.6); s.bub -= rSec.range(0.07, 0.13);
          post(d, { sc: 's', sec: s.id, k: 'maniaend', src: 'WIRE', sev: 3, tr: 'real', h: secList[i].name + ' stocks crack after a long run-up', b: 'The sector had run far ahead of its profits. Buyers have turned sellers all at once.' }); } }
        else if (s.bubPhase === 2) { s.bub -= s.bubRate * DT; if (s.bub <= -0.05) s.bubPhase = 3; }
        else if (s.bubPhase === 3) { s.bub += 0.05 * DT; if (s.bub >= 0) { s.bub = 0; s.bubPhase = 0; } }
        else if (d > 300 && (st.reg === REG.EXP || st.reg === REG.BOOM) && rSec.chance(DT / 22)) startMania(s, d, rSec.range(1.3, 2.8));
        if (d > 5 && rSec.chance(DT * 0.45) && SECEV[s.id]) {
          var e = rSec.pick(SECEV[s.id]), k = rSec.range(0.6, 1.3);
          s.dem += e[2] * k; s.mar += e[3] * k; s.sen += e[4] * k * rSec.range(0.5, 1.6);
          post(d, { sc: 's', sec: s.id, k: 'sector', src: 'WIRE', sev: 2, tr: 'real', h: e[0], b: e[1] + ' Affects every ' + secList[i].name + ' company to some degree.' });
        }
      }
      for (i = 0; i < manias.length; i++) if (manias[i].d === d) { var ms = sec[manias[i].sector] || sec[dest.maniaSector]; if (ms) startMania(ms, d, manias[i].dur); }

      // ----- commodities
      cm.oil += 0.35 * (0.05 * st.gap - cm.oil) * DT + 0.27 * SQDT * rC.n();
      if (d > 20 && rC.chance(DT / 6)) { var jo = rC.range(0.2, 0.45); cm.oil += jo;
        post(d, { sc: 'm', k: 'oilup', src: 'WIRE', sev: 3, tr: 'real', h: cmHead('oilup'), b: dest.cmNews.oilup[1] }); }
      if (d > 20 && rC.chance(DT / 9)) { var jd = rC.range(0.15, 0.35); cm.oil -= jd;
        post(d, { sc: 'm', k: 'oildown', src: 'WIRE', sev: 2, tr: 'real', h: cmHead('oildown'), b: dest.cmNews.oildown[1] }); }
      var realY = y10 - st.infl;
      cm.gold += 0.5 * ((-0.05 * (realY - 0.8) - 0.45 * st.S + 0.05 * (st.infl - 2.2)) - cm.gold) * DT + 0.13 * SQDT * rC.n();
      cm.copper += 0.5 * (0.07 * st.gap - cm.copper) * DT + 0.21 * SQDT * rC.n();
      cm.wheat += 0.9 * (0 - cm.wheat) * DT + 0.22 * SQDT * rC.n();
      if (d > 20 && rC.chance(DT / 5)) { cm.wheat += rC.range(0.2, 0.4);
        post(d, { sc: 'm', k: 'wheat', src: 'WIRE', sev: 1, tr: 'real', h: cmHead('wheat'), b: dest.cmNews.wheat[1] }); }
      var cpiR = M.cpi[d], drag = dexp(-0.004 * d * DT);
      if (!cmP.oilHist) cmP.oilHist = new Float64Array(N);
      for (i = 0; i < cmd.length; i++) {
        var ca = cmd[i], px = ca.p0 * dpowS(cpiR, ca.id === 'gold' ? 1.15 : 1) * dexp(cm[ca.id]) * drag;
        if (ca.id === 'oil') cmP.oilHist[d] = px;
        ca.pc[d] = Math.max(1, Math.round(px * 100));
      }

      // ----- scheduled company follow-ups, then companies
      if (d === 0) coE.init(0);
      if (schedMap[d]) { var q = schedMap[d]; for (i = 0; i < q.length; i++) q[i](d); delete schedMap[d]; }
      coE.step(d);

      // ----- index and funds
      var sumPrev = 0, sumNow = 0, divs = 0, secAgg = {}, capNow = 0, niNow = 0;
      for (i = 0; i < coE.cos.length; i++) {
        var co = coE.cos[i];
        if (co.dp == null) co.dp = 0;
        var ag = secAgg[co.sector] || (secAgg[co.sector] = { p: 0, n: 0, dv: 0 });
        if (d > 0 && co.start <= d - 1 && (co.end < 0 || co.end >= d)) {
          var cp = co.pc[d - 1] * co.shA[d - 1];
          var cn = cp * (co.pc[d] / co.pc[d - 1]);
          sumPrev += cp; sumNow += cn; ag.p += cp; ag.n += cn;
          while (co.dp < co.divs.length && co.divs[co.dp].d < d) co.dp++;
          if (co.dp < co.divs.length && co.divs[co.dp].d === d && (co.end < 0 || co.end > d)) { var dv = co.divs[co.dp].amt * 100 * co.shA[d]; divs += dv; ag.dv += dv; }
        }
        if (d % 5 === 0 && co.end < 0 && co.q.length) { var t4 = coE.ttm(co); capNow += co.pc[d] / 100 * co.sh; niNow += t4.ni; }
      }
      var ratio = sumPrev > 0 ? sumNow / sumPrev : 1;
      M.idx[d] = d === 0 ? 1000 : M.idx[d - 1] * ratio;
      M.tr[d] = d === 0 ? 1000 : M.tr[d - 1] * (ratio + (sumPrev > 0 ? divs / sumPrev : 0));
      if (d > 0) { fundAcc += fundF * (sumPrev > 0 ? divs / sumPrev : 0); fundF *= ratio * (1 - fund.fee * DT); }
      fund.pc[d] = Math.round(fundF * 100);
      if (d % 60 === 59 && fundAcc > 0.0001) { fund.divs.push({ d: d, amt: Math.round(fundAcc * 10000) / 10000 }); fundAcc = 0; }
      for (i = 0; i < secList.length; i++) {
        var sf = secFunds[secList[i].id], a2 = secAgg[secList[i].id];
        if (d > 0 && a2 && a2.p > 0) { sf.acc += sf.f * a2.dv / a2.p; sf.f *= a2.n / a2.p * (1 - sf.fee * DT); }
        sf.pc[d] = Math.max(1, Math.round(sf.f * 100));
        if (d % 60 === 59 && sf.acc > 0.0001) { sf.divs.push({ d: d, amt: Math.round(sf.acc * 10000) / 10000 }); sf.acc = 0; }
      }
      M.pe[d] = d % 5 === 0 ? (niNow > 0 ? clamp(capNow / niNow, 4, 80) : 80) : (d > 0 ? M.pe[d - 1] : 16);

      // ----- bonds
      st.sn += -1.5 * st.sn * DT + 0.25 * SQDT * rB.n();
      var stressT = clamp(-2.0 * st.S + (st.reg === REG.REC ? 0.25 : 0) + st.sn, 0, 1.7);
      st.stress += 6 * (stressT - st.stress) * DT;
      var igs = 1.0 + 2.0 * st.stress, hys = 3.2 + 6.5 * st.stress;
      M.igs[d] = igs; M.hys[d] = hys;
      var y7 = 0.3 * y2 + 0.7 * y10, y5 = 0.5 * y2 + 0.5 * y10;
      if (prevY) {
        bf.bgov *= 1 + prevY.y7 / 100 * DT - 6 * (y7 - prevY.y7) / 100 - 0.001 * DT;
        bf.blng *= 1 + (prevY.y10 + 0.35) / 100 * DT - 15 * (y10 - prevY.y10) / 100 - 0.001 * DT;
        bf.bcrp *= 1 + (prevY.y7 + prevY.igs) / 100 * DT - 6 * (y7 - prevY.y7) / 100 - 5.5 * (igs - prevY.igs) / 100 - 0.0015 * (1 + 3 * st.stress) * DT - 0.001 * DT;
        bf.bjnk *= 1 + (prevY.y5 + prevY.hys) / 100 * DT - 3.8 * (y5 - prevY.y5) / 100 - 3.6 * (hys - prevY.hys) / 100 - (0.02 + 0.06 * Math.max(0, st.stress - 0.3)) * DT - 0.002 * DT;
      }
      prevY = { y7: y7, y10: y10, y5: y5, igs: igs, hys: hys };
      for (i = 0; i < bonds.length; i++) bonds[i].pc[d] = Math.round(bf[bonds[i].id] * 100);

      // ----- housing
      var mortChg = d >= 240 ? M.mort[d] - M.mort[d - 240] : 0;
      var hbAdj = 0;
      if (st.hb) { st.hb.left--; hbAdj = st.hb.phase === 1 ? 6.5 : -11; if (st.hb.left <= 0) { if (st.hb.phase === 1) { st.hb.phase = 2; st.hb.left = st.hb.bustLen;
          post(d, { sc: 'm', k: 'housebust', src: 'WIRE', sev: 3, tr: 'real', h: 'Housing boom turns to bust', b: 'After years of rapid gains, home sales have stalled and prices are slipping. Owners with large mortgages can end up owing more than the property is worth.' }); } else st.hb = null; } }
      else if (d > 480 && (st.reg === REG.EXP || st.reg === REG.BOOM) && rM.chance(DT / 24)) st.hb = { phase: 1, left: rM.int(480, 900), bustLen: rM.int(360, 600) };
      (mods.housing || []).forEach(function (h) { if (W + Math.round(h.y * DPY) === d) st.hb = { phase: 1, left: Math.round(h.boom * DPY), bustLen: Math.round(h.bust * DPY) }; });
      var hgT = st.infl + 0.7 + 0.6 * (st.gdp - 2.3) - 2.2 * mortChg + hbAdj;
      st.hg = clamp(st.hg + 1.2 * (hgT - st.hg) * DT + 1.2 * SQDT * rM.n(), -16, 18);
      M.hg[d] = st.hg;
      M.housing[d] = d === 0 ? 1 : M.housing[d - 1] * dexp(st.hg / 100 * DT);
      M.rent[d] = d === 0 ? 1 : M.rent[d - 1] * dexp((st.infl + 0.4 + 0.15 * st.gap) / 100 * DT);

      // ----- crypto
      if (cr.mode === 0) { cr.lp += (0.1 - 0.125) * DT + 0.5 * SQDT * rC.n();
        if (d > 200 && rC.chance(DT / 3.5 * (st.S > 0 ? 1.3 : 0.6))) { cr.mode = 1; cr.left = rC.int(120, 290);
          post(d, { sc: 'm', k: 'coinup', src: 'OPINION', sev: 2, tr: 'noise', co: null, tk: crypto.tkr, h: rNw.pick([crypto.name + ' is suddenly everywhere', 'Celebrities pile into ' + crypto.name, '"' + crypto.name + ' to the moon," says the internet']), b: 'The price is climbing because people are buying, and people are buying because the price is climbing. Nothing else has changed.' }); } }
      else if (cr.mode === 1) { cr.lp += (2.2 - 0.4) * DT + 0.9 * SQDT * rC.n(); if (--cr.left <= 0) { cr.mode = 2; cr.left = rC.int(120, 240);
          post(d, { sc: 'm', k: 'coindown', src: 'WIRE', sev: 2, tr: 'real', tk: crypto.tkr, h: rNw.pick([crypto.name + ' exchange freezes withdrawals', 'Regulators move against ' + crypto.name, crypto.name + ' plunges as early holders cash out']), b: 'With nothing underneath the price, there is no level at which it becomes a bargain.' }); } }
      else { cr.lp += (-1.9 - 0.5) * DT + 1.0 * SQDT * rC.n(); if (--cr.left <= 0) cr.mode = 0; }
      crypto.pc[d] = Math.max(1, Math.round(dexp(cr.lp) * 100));

      // ----- headline economy data
      if (d > 30 && d % 20 === 5 && Math.abs(st.infl - st.lastInflPost) >= 0.5) {
        var up = st.infl > st.lastInflPost; st.lastInflPost = st.infl;
        post(d, { sc: 'm', k: 'cpi', src: 'DATA', sev: st.infl > 4.5 || st.infl < 0.5 ? 2 : 1, tr: 'real', h: 'Inflation ' + (up ? 'rises' : 'falls') + ' to ' + f1(st.infl) + '%',
          b: 'Prices are ' + f1(st.infl) + '% higher than a year ago. ' + (st.infl > 3.2 ? cap(dest.reserve) + ' aims for about 2%, so expect pressure to raise interest rates.' : st.infl < 1.2 ? 'That is below the 2% ' + dest.reserve + ' aims for, which leaves room to cut interest rates.' : 'That is close to the 2% ' + dest.reserve + ' aims for.') });
      }
      if (d > 30 && d % 20 === 8 && Math.abs(st.unemp - st.lastUnempPost) >= 0.5) {
        var upU = st.unemp > st.lastUnempPost; st.lastUnempPost = st.unemp;
        post(d, { sc: 'm', k: 'jobs', src: 'DATA', sev: upU && st.unemp > 6 ? 2 : 1, tr: 'real', h: 'Unemployment ' + (upU ? 'climbs' : 'drops') + ' to ' + f1(st.unemp) + '%',
          b: upU ? 'More people are out of work. Jobs data arrives late: by the time unemployment is rising, the stock market has usually already reacted.' : 'More people are finding work, which means more spending.' });
      }
      if (d > 90 && d % 60 === 25) {
        var gq = 0; for (n = d - 85; n < d - 25; n++) gq += M.gdp[n]; gq /= 60;
        if (gq < 0) { st.negQ++;
          post(d, { sc: 'm', k: 'gdp', src: 'DATA', sev: st.negQ === 2 ? 3 : 2, tr: 'real', h: st.negQ >= 2 ? (st.negQ === 2 ? 'It\'s official: the economy is in recession' : 'Economy shrinks again') : 'The economy shrank last quarter',
            b: 'Output fell at a ' + f1(-gq) + '% yearly pace. ' + (st.negQ === 2 ? 'Two shrinking quarters in a row is the usual definition of a recession. Note the date: this report describes months that are already over.' : 'This number looks backward. It tells you where the economy was two months ago.') });
        } else { if (st.negQ >= 2) post(d, { sc: 'm', k: 'gdp', src: 'DATA', sev: 2, tr: 'real', h: 'The economy is growing again', b: 'Output rose at a ' + f1(gq) + '% yearly pace, ending the recession. Stocks typically turn up months before this headline appears.' });
          else if (gq > 3.6) post(d, { sc: 'm', k: 'gdp', src: 'DATA', sev: 1, tr: 'real', h: 'Economy grows at a hot ' + f1(gq) + '% pace', b: 'Strong growth is good for profits. If it pushes prices up, higher interest rates tend to follow.' });
          st.negQ = 0; }
      }
      // ----- market milestones
      var L = M.idx[d];
      if (L > st.idxPeak) { st.idxPeak = L; if (st.bear) st.bear = 0;
        if (d - st.lastHighPost > 480 && d > 60) { st.lastHighPost = d; post(d, { sc: 'm', k: 'high', src: 'DATA', sev: 1, tr: 'noise', h: 'The ' + dest.indexName + ' closes at a record high', b: 'Record highs sound dramatic. In a market that rises over time they are common, and most are followed by more of them.' }); } }
      var ddn = L / st.idxPeak - 1; M.dd[d] = ddn;
      if (ddn < -0.1 && st.bear < 1) { st.bear = 1; post(d, { sc: 'm', k: 'corr', src: 'DATA', sev: 2, tr: 'mixed', h: 'The ' + dest.indexName + ' is down 10% from its peak', b: 'Traders call this a correction. Drops this size happen every couple of years. Most stop here. A few are the start of something worse.' }); }
      if (ddn < -0.2 && st.bear < 2) { st.bear = 2; post(d, { sc: 'm', k: 'bear', src: 'DATA', sev: 3, tr: 'real', h: 'Bear market: stocks are down 20% from their peak', b: 'Falls this deep usually come with a recession. Nobody knows where the bottom is. Historically, people who kept buying through bear markets did better than people who sold.' }); }
      if (ddn < -0.35 && st.bear < 3) { st.bear = 3; post(d, { sc: 'm', k: 'bear2', src: 'DATA', sev: 3, tr: 'real', h: 'Stocks have now lost more than a third of their value', b: 'One of the worst declines in a generation. Fear is everywhere.' }); }
      if (d > 0) { var dr = M.idx[d] / M.idx[d - 1] - 1; if (dr < -0.045) post(d, { sc: 'm', k: 'crashday', src: 'DATA', sev: 3, tr: 'real', h: 'Stocks fall ' + f1(-dr * 100) + '% in a single day', b: 'One of the worst days on record. Big down days and big up days tend to cluster together.' }); }
      // pundit noise about the whole market
      if (d > 60 && rNw.chance(DT * 0.7)) {
        var rich = M.pe[d] > 21, honest = rNw.chance(0.5);
        var bearish = honest ? rich : rNw.chance(0.5);
        post(d, { sc: 'm', k: 'mktpundit', src: 'OPINION', sev: 1, tr: honest ? 'mixed' : 'noise',
          h: bearish ? rNw.pick(['Veteran investor warns a crash is coming', '"Stocks are priced for perfection," strategist says', 'Famous bear: "This ends badly"']) : rNw.pick(['Strategist: "This rally has years left to run"', 'Bank tells clients to buy every dip', '"New era" for stocks, says popular fund manager']),
          b: 'Somebody is always predicting a crash, and somebody is always predicting a boom. One of them is right each time, which makes both of them famous eventually.' });
      }
    }

    function dpowS(x, y) { return y === 1 ? x : dexp(y * dlog(x)); }
    function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

    /* ---------- assemble company assets ---------- */
    var companies = coE.cos;
    companies.forEach(function (co) {
      var a = { id: co.id, tkr: co.tkr, name: co.name, kind: 'stock', pc: co.pc, start: co.start, end: co.end, endPx: Math.round(co.endPx * 100), endWhy: co.endWhy,
        divs: co.divs, newsIdx: co.newsIdx, desc: co.desc, sector: co.sector, arche: co.arche, q: co.q, fv: co.fvA, sh: co.shA, cost: 10, tpl: co.tpl };
      assets[co.id] = a; order.push(co.id);
    });

    // attach each story to the things it is about, for chart markers and detail pages
    var byTkr = {};
    order.forEach(function (id) { byTkr[assets[id].tkr] = assets[id]; });
    news.forEach(function (o) {
      if (o.co && assets[o.co]) assets[o.co].newsIdx.push(o.i);
      else if (o.tk && byTkr[o.tk]) byTkr[o.tk].newsIdx.push(o.i);
      else if (o.sc === 's' && secFunds[o.sec]) secFunds[o.sec].newsIdx.push(o.i);
      else if (o.sc === 'm') {
        if (o.sev >= 2 && o.k !== 'coinup' && o.k !== 'coindown') fund.newsIdx.push(o.i);
        if (o.k === 'oilup' || o.k === 'oildown') assets.oil && assets.oil.newsIdx.push(o.i);
        if (o.k === 'wheat') assets.wheat && assets.wheat.newsIdx.push(o.i);
        if (o.k === 'rate' || o.k === 'invert') bonds.forEach(function (b) { b.newsIdx.push(o.i); });
      }
    });

    /* ---------- life events (same for everyone on this tape) ---------- */
    var rL = rng('life'), life = { raises: [], jobLoss: [], shocks: [] };
    for (var y = 1; y < years; y++) {
      var dd0 = W + y * DPY, rec = M.regime[dd0] === REG.REC;
      var promo = rL.chance(0.1);
      life.raises.push({ d: dd0, pct: r2(Math.max(0, M.infl[dd0]) + (rec ? rL.range(0, 0.6) : rL.range(0.2, 2.2)) + (promo ? rL.range(6, 12) : 0)), promo: promo });
    }
    var recStart = -1;
    for (d = W + 1; d < N; d++) {
      if (M.regime[d] === REG.REC && M.regime[d - 1] !== REG.REC && rL.chance(0.4)) life.jobLoss.push({ d: d + rL.int(20, 120), len: rL.int(3, 7) });
    }
    var SHOCKS = dest.shocks, WIND = dest.windfalls;
    for (d = W + 30; d < N - 10; d++) {
      if (rL.chance(DT * 0.55)) { var sh = rL.pick(SHOCKS); life.shocks.push({ d: d, kind: sh[0], text: sh[1], amt: -Math.round(rL.range(sh[2], sh[3]) * M.cpi[d] / M.cpi[W]) * 100 }); }
      if (rL.chance(DT * 0.2)) { var wn = rL.pick(WIND); life.shocks.push({ d: d, kind: wn[0], text: wn[1], amt: Math.round(rL.range(wn[2], wn[3]) * M.cpi[d] / M.cpi[W]) * 100 }); }
    }
    life.shocks.sort(function (a, b) { return a.d - b.d; });

    /* ---------- property listings ---------- */
    var rP = rng('listings'), listings = [], lid = 0;
    var MOTIV = ['Seller is relocating for work and wants it gone.', 'Estate sale. The heirs want a quick, clean deal.', 'Owner is behind on payments.', 'Landlord is retiring and selling everything.', 'Second time on the market after a buyer pulled out.'];
    var STREETS = dest.streets;
    var types = dest.propTypes;
    for (d = W - 60; d < N - 20; d += 5) {
      for (i = 0; i < types.length; i++) {
        var pt = types[i];
        if (!rP.chance(pt.n / 16)) continue; // n active on average, about 80 trading days each
        var gr = rP.wpick(['A', 'B', 'B', 'C'], function () { return 1; });
        var gv = gr === 'A' ? 1.35 : gr === 'C' ? 0.72 : 1, gy = gr === 'A' ? 0.82 : gr === 'C' ? 1.2 : 1;
        var cond = rP.chance(0.28) ? rP.range(0.42, 0.7) : rP.range(0.78, 1);
        var full = rP.range(pt.v[0], pt.v[1]) * 1000 * gv * M.housing[Math.max(0, d)]; // value in perfect condition
        var val = full * (0.6 + 0.4 * cond);
        var rent = 0.9 * full * rP.range(pt.y[0], pt.y[1]) * gy / 12 * (M.rent[Math.max(0, d)] / M.housing[Math.max(0, d)]) * (0.7 + 0.3 * cond);
        var mis = clamp(0.07 * rP.n(), -0.18, 0.16);
        var motivated = rP.chance(0.16);
        if (motivated) mis -= 0.03;
        var dur = Math.round((40 + 120 * rP.next()) * (mis < -0.06 ? 0.45 : 1));
        listings.push({ id: 'L' + (lid++), d0: Math.max(d, 0), d1: Math.min(N - 1, d + dur), type: pt.id, tname: pt.name, grade: gr, com: !!pt.com, units: pt.units,
          addr: rP.int(2, 180) + ' ' + rP.pick(STREETS), full0: Math.round(full), cond: r2(cond), ask: Math.round(val * dexp(mis) / 500) * 50000,
          rent0: Math.round(rent / (0.7 + 0.3 * cond)), est: Math.round(val * (1 + 0.03 * rP.n()) / 1000) * 100000,
          reserve: motivated ? rP.range(0.82, 0.9) : rP.range(0.9, 0.99), motiv: motivated ? rP.pick(MOTIV) : null, sellDays: rP.int(20, 80) });
      }
    }

    var tape = { v: BW.ENGINE_VERSION, cfg: cfg, dest: dest, seed: seed, N: N, W: W, years: years, M: M, assets: assets, order: order, companies: companies, news: news,
      life: life, listings: listings, sectors: secList, fundId: 'herd' };
    return tape;
  };

  /* ====================== reading the tape ====================== */
  var T = BW.T = {};
  T.px = function (tape, id, d) { return tape.assets[id].pc[d]; };
  T.alive = function (a, d) { return a.start <= d && (a.end < 0 || d < a.end); };
  T.listed = function (a, d) { return a.start <= d && (a.end < 0 || d <= a.end); };
  // number of news items with day <= d
  T.newsCount = function (tape, d) {
    var lo = 0, hi = tape.news.length;
    while (lo < hi) { var m = (lo + hi) >> 1; if (tape.news[m].d <= d) lo = m + 1; else hi = m; }
    return lo;
  };
  T.quarters = function (a, d) { // reports published on or before d
    var q = a.q, n = q.length;
    while (n > 0 && q[n - 1].d > d) n--;
    return n;
  };
  T.coStats = function (tape, a, d) {
    var n = T.quarters(a, d), q = a.q, i, k = 0, eps = 0, rev = 0, ni = 0, ebit = 0, intr = 0, dps = 0;
    for (i = n - 1; i >= 0 && k < 4; i--, k++) { eps += q[i].eps; rev += q[i].rev; ni += q[i].ni; ebit += q[i].ebit; intr += q[i].int; dps += q[i].dps; }
    if (k > 0 && k < 4) { var m = 4 / k; eps *= m; rev *= m; ni *= m; ebit *= m; intr *= m; dps *= m; }
    var last = n ? q[n - 1] : null, price = a.pc[Math.min(d, a.end >= 0 ? a.end : d)] / 100;
    var rev0 = 0, k0 = 0;
    for (i = n - 5; i >= 0 && k0 < 4; i--, k0++) rev0 += q[i].rev;
    var sh = last ? last.sh : a.sh[d];
    return { n: n, eps: eps, rev: rev, ni: ni, ebit: ebit, interest: intr, dpsYr: last ? last.dps * 4 : 0, price: price,
      pe: eps > 0.005 ? price / eps : null, yield: last && price > 0 ? last.dps * 4 / price : 0,
      growth: k0 === 4 && rev0 > 0 ? rev / rev0 - 1 : (last && last.g != null ? last.g : null),
      margin: rev > 0 ? ebit / rev : 0, netMargin: rev > 0 ? ni / rev : 0, debt: last ? last.debt : 0, debtToProfit: last && ebit > 0 ? last.debt / ebit : null,
      cover: intr > 0 ? ebit / intr : null, payout: eps > 0 && last ? last.dps * 4 / eps : null, shares: sh, mcap: price * sh, last: last };
  };
  // synthetic open/high/low for a day, derived from closes so nothing extra is stored
  T.ohlc = function (a, d) {
    var c = a.pc[d], p = d > a.start ? a.pc[d - 1] : c;
    if (!p) p = c;
    var h1 = BW.hrand(a.id, d, 1), h2 = BW.hrand(a.id, d, 2), h3 = BW.hrand(a.id, d, 3);
    var o = p + (c - p) * (h1 * 0.5 - 0.1);
    var rng = Math.abs(c - p) + c * 0.004;
    var hi = Math.max(o, c) + rng * h2 * 0.7, lo = Math.max(1, Math.min(o, c) - rng * h3 * 0.7);
    return [o, hi, lo, c];
  };
  T.volume = function (a, d) { // relative activity 0..~4
    var c = a.pc[d], p = d > a.start ? a.pc[d - 1] : c;
    var mv = p ? Math.abs(c / p - 1) : 0;
    return 0.6 + BW.hrand(a.id, d, 9) * 0.5 + mv * 45;
  };
  // analysts' price target: fair value seen through noise, and tugged by recent momentum
  T.target = function (tape, a, d) {
    if (!a.fv) return null;
    var qd = Math.floor(d / 40);
    var noise = 0.16 * BW.hnorm(tape.seed, a.id, qd, 'tgt');
    var back = d - 60 >= a.start && a.pc[d - 60] ? a.pc[d] / a.pc[d - 60] - 1 : 0;
    return a.fv[d] * BW.dexp(noise) * (1 + 0.3 * BW.clamp(back, -0.4, 0.4));
  };
  // value of a listing's property on day d
  T.propValue = function (tape, L, d, cond) {
    return L.full0 * (tape.M.housing[d] / tape.M.housing[L.d0]) * (0.6 + 0.4 * cond);
  };
  T.propRent = function (tape, L, d, cond) {
    return L.rent0 * (tape.M.rent[d] / tape.M.rent[L.d0]) * (0.7 + 0.3 * cond);
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
