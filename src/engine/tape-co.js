/* Company engine: fundamentals, valuation, quarterly reports, company news.
 *
 * Price = (value of the business - debt) / shares, times mood.
 *   value of the business = normal yearly profit x a multiple that depends on
 *                           growth, interest rates and risk
 *   mood = market mood x sector mood x this stock's own over/under-pricing
 * Roughly half of each surprise in sales and margins is hidden from the market
 * until the next quarterly report, which is why prices jump on earnings.
 */
(function (root) {
  'use strict';
  var BW = root.BW, dexp = BW.dexp, dlog = BW.dlog, clamp = BW.clamp;
  var DT = 1 / 240, SQDT = Math.sqrt(DT), TAX = 0.22, GT = 0.034;

  function pct(x, dp) { return (x * 100).toFixed(dp == null ? 0 : dp) + '%'; }
  function money(m) { // m in $ millions
    var a = Math.abs(m);
    if (a >= 1000) return '$' + (m / 1000).toFixed(a >= 10000 ? 0 : 1) + ' billion';
    return '$' + Math.round(m) + ' million';
  }
  BW._fmtM = money;

  BW._coEngine = function (ctx) {
    // ctx: { seed, dest, M (macro arrays), st (macro state), sec (sector states by id), post, sched, rng(name), cm (commodity log states) }
    var rEv = ctx.rng('co-events'), rQ = ctx.rng('co-quarters'), rN = ctx.rng('co-noise');
    var cos = [], active = [], poolLeft = ctx.dest.pool.slice(), slotsWaiting = [];
    var E = {};

    function kBase(d) { return (0.5 * ctx.M.y10[d] + 0.5 * ctx.st.yAvg) / 100 + 0.056; }

    // What the market pays per dollar of yearly profit. It assumes growth fades the
    // way growth really does fade in this world, so no type of company is a free lunch.
    var FA = [], FB = [];
    (function () { for (var t = 1; t <= 20; t++) { FA.push(dexp(-0.6 * (t - 0.5))); FB.push(dexp(-0.13 * (t - 0.5))); } })();
    function mult(co, k, om) {
      var omx = Math.max(om, 0.02) * (1 - TAX), ci = co.ci;
      var g = clamp(co.g, -0.08, 0.5), gl = co.gLong, y = co.gBar - gl;
      // near-term growth the market can already see coming: sector demand and the business cycle
      var x = g - co.gBar + ctx.sec[co.sector].dem / 100 + 0.8 * co.cyc * (ctx.gdpDev || 0);
      var sum = 0, grow = 1, disc = 1, t, gt;
      for (t = 0; t < 20; t++) {
        gt = gl + y * FB[t] + x * FA[t];
        grow *= 1 + gt; disc *= 1 + k;
        sum += grow * clamp(1 - gt * ci / omx, 0.05, 1) / disc;
      }
      var gT = Math.min(gl, k - 0.025);
      return sum + grow * (1 + gT) * clamp(1 - gT * ci / omx, 0.2, 1) / (k - gT) / disc;
    }

    function structOm(co) {
      var c = ctx.cm, ex = co.ex, s = ctx.sec[co.sector];
      return co.omBar * (1 + 0.5 * s.mar) + 0.25 * ((ex.oil || 0) * c.oil + (ex.gold || 0) * c.gold + (ex.copper || 0) * c.copper + (ex.wheat || 0) * c.wheat) +
        (ex.rate || 0) * (ctx.st.rate - 2.7);
    }

    // value the company from what the market can see
    function value(co, d) {
      var rev = co.rev * dexp(-co.hidR);
      var om = co.om - co.hidM;
      var omN;
      if (co.omMature != null) omN = co.omMature * co.bel; // judged on where its margins are expected to settle
      else omN = 0.25 * om + 0.15 * (co.omT == null ? om : co.omT) + 0.6 * structOm(co);
      var nopat = Math.max(rev * omN * (1 - TAX), rev * 0.008);
      // Shareholders of every company should expect about the same return. Debt is cheaper
      // than shares, so a company carrying debt is valued at a blended, lower rate.
      var kE = kBase(d) + co.risk, lv = clamp(co.levS || 0, 0, 0.7);
      var k = kE * (1 - lv) + (co.dRate / 100) * (1 - TAX) * lv;
      if (k < 0.045) k = 0.045;
      var ev = nopat * mult(co, k, Math.max(omN, 0.02));
      var eq = Math.max(ev - co.debt, 0.04 * ev);
      co.lev = co.debt / ev;
      co.ev = ev;
      return eq / co.sh;
    }

    function mood(co) {
      var s = ctx.sec[co.sector];
      return co.beta * 0.92 * ctx.st.S + (s.sen + s.bub) * (0.7 + 0.3 * co.beta) + co.u + co.rx + co.hype;
    }

    function priceOf(co, d) {
      var fv = value(co, d);
      co.fv = fv;
      if (co.deal) { // agreed takeover: price sits just under the offer
        var left = co.deal.end - d;
        return co.deal.px * (1 - 0.0006 * left - 0.004 * Math.abs(co.dealN));
      }
      return Math.max(0.05, fv * dexp(mood(co)));
    }

    function mkCo(tpl, d, isIPO) {
      var r = ctx.rng('co-init-' + tpl.id);
      var secDef = null, i;
      for (i = 0; i < ctx.dest.sectors.length; i++) if (ctx.dest.sectors[i].id === tpl.sector) secDef = ctx.dest.sectors[i];
      var co = {
        id: tpl.id, tkr: tpl.tkr, name: tpl.name, sector: tpl.sector, like: secDef.like || secDef.id, arche: tpl.arche, desc: tpl.desc, tpl: tpl,
        start: d, end: -1, endPx: 0, endWhy: null,
        rev: tpl.rev * dexp(0.22 * r.n()),
        omBar: tpl.om * (1 + 0.1 * r.n()), om: 0, omMature: tpl.omMature == null ? null : tpl.omMature,
        succ: clamp(0.78 + 0.28 * r.n(), 0.15, 1.3), bel: 0.72,
        g: tpl.g + 0.015 * r.n(), gBar: tpl.g, gLong: secDef.gLong + ctx.dest.growthAdd + 0.008 * r.n(),
        sg: 0.012 + 0.03 * Math.abs(tpl.g),
        cyc: tpl.cyc, beta: tpl.beta, pay: tpl.pay, ci: tpl.ci, sr: tpl.sr, sm: tpl.sm, risk: ({ spec: -0.01, growth: -0.008, cyclical: 0, steady: 0.002, income: 0.003 })[tpl.arche] || 0, ex: tpl.ex,
        su: 0.045 + 0.009 * tpl.beta,
        u: isIPO ? 0.16 : 0.1 * r.n(), rx: 0, hype: 0, hidR: 0, hidM: 0, post: 0,
        debt: 0, dRate: ctx.M.y10[Math.max(0, d - 1)] + 2, sh: 1, dps: 0, strain: 0, lev: 0, ev: 0, fv: 0,
        omSum: 0, revSum: 0, qDays: 0, oneOff: 0, q: [], qOff: 0,
        evRate: 1.2, deal: null, dealN: 0, distressed: 0, flags: {},
        divs: [], newsIdx: [], pc: null, fvA: null, shA: null
      };
      co.om = co.omBar;
      var ebit = co.rev * Math.max(co.omBar, 0.04);
      co.debt = tpl.dx * ebit * dexp(0.15 * r.n());
      if (tpl.dx === 0) co.debt = -0.15 * co.rev;

      // choose the share count so the first price lands somewhere sensible
      var fv1 = value(co, Math.max(0, d - 1));
      var target = dexp(r.range(dlog(14), dlog(150)));
      co.sh = fv1 / target; // fv1 was computed with sh = 1
      co.levT = clamp(co.lev + 0.03, 0.05, 0.6); co.levS = co.lev; co.omRef = co.omBar;
      co.dps = 0;
      co.qOff = r.int(0, 59);
      co.nextEv = d + 5 + Math.floor(-dlog(1 - rEv.next()) / (co.evRate * DT));
      return co;
    }

    function ttm(co) {
      var n = co.q.length, eps = 0, rev = 0, ni = 0, k = 0;
      for (var i = n - 1; i >= 0 && k < 4; i--, k++) { eps += co.q[i].eps; rev += co.q[i].rev; ni += co.q[i].ni; }
      if (k < 4 && k > 0) { eps *= 4 / k; rev *= 4 / k; ni *= 4 / k; }
      return { eps: eps, rev: rev, ni: ni, n: k };
    }

    /* ---------- news helpers ---------- */
    function postCo(co, d, o) {
      o.sc = 'c'; o.co = co.id; o.sec = co.sector; o.tk = co.tkr;
      ctx.post(d, o);
    }
    // apply a change to fundamentals, let the market over- or under-react
    function shock(co, d, fn, lo, hi) {
      var before = value(co, d);
      fn(co);
      var after = value(co, d);
      var dl = dlog(after / before);
      var phi = rEv.range(lo == null ? 0.6 : lo, hi == null ? 1.15 : hi);
      co.rx += (phi - 1) * dl; // over- or under-reaction, which wears off over a few months
      return dl;
    }
    function sevOf(dl) { var a = Math.abs(dl); return a > 0.09 ? 3 : a > 0.035 ? 2 : 1; }

    /* ---------- the quarterly report ---------- */
    function report(co, d) {
      var M = ctx.M;
      var price = co.pc[d - 1] / 100;
      var revQ = co.revSum / co.qDays / 4, omQ = co.omSum / co.qDays;
      var ebit = revQ * omQ;
      var interest = co.debt > 0 ? co.debt * co.dRate / 100 / 4 : co.debt * Math.max(0, M.rate[d] - 0.5) / 100 / 4;
      var pre = ebit - interest - co.oneOff;
      var ni = pre > 0 ? pre * (1 - TAX) : pre;
      var eps = ni / co.sh;
      var preE = revQ * dexp(-co.hidR) * (omQ - co.hidM) - interest - co.oneOff;
      var est = (preE > 0 ? preE * (1 - TAX) : preE) / co.sh;
      var sur = (eps - est) / Math.max(Math.abs(est), price * 0.004);
      sur = clamp(sur, -0.95, 2);
      // the hidden half becomes public
      var dl = shock(co, d, function (c) { c.hidR *= 0.1; c.hidM *= 0.1; }, 0.7, 1.2);
      co.post = 30;

      // cash
      var vBooks0 = value(co, d); // worth of a share just before the quarter's cash reaches the balance sheet
      var reinvest = Math.max(0, co.g) * co.ci * revQ;
      var fcf = ni - reinvest;
      var prev = co.q.length ? co.q[co.q.length - 1] : null;
      var kq = 0, sumE = eps, qi;
      for (qi = co.q.length - 1; qi >= 0 && kq < 3; qi--, kq++) sumE += co.q[qi].eps;
      var epsTTM = sumE * 4 / (kq + 1);
      var divNote = null, qn = co.q.length;
      if (co.pay > 0) {
        var tgt = Math.max(0, co.pay * epsTTM / 4);
        if (co.dps === 0 && tgt > 0 && qn >= 1) { co.dps = tgt; }
        else if (qn % 4 === 3 && tgt > co.dps * 1.03) {
          var old = co.dps; co.dps += 0.6 * (tgt - co.dps);
          if (old > 0) divNote = { up: co.dps / old - 1 };
        }
        if (co.dps > 0 && (epsTTM <= 0 || co.dps * 4 > 1.15 * epsTTM)) co.strain++; else co.strain = Math.max(0, co.strain - 1);
        if (co.strain >= 3 && co.dps > 0) {
          var cutTo = epsTTM <= 0 ? 0 : co.dps * 0.5;
          divNote = { cut: 1 - cutTo / co.dps, zero: cutTo === 0 };
          co.dps = cutTo; co.strain = 0; co.rx -= rQ.range(0.03, 0.09);
        }
      }
      if (co.deal) co.dps = 0; // a company that has agreed to be bought stops declaring dividends
      var divTotal = co.dps * co.sh;
      var after = fcf - divTotal;
      var bought = 0;
      if (after >= 0) {
        if (co.lev > co.levT || co.debt > 0 && co.omMature != null) co.debt -= after;
        else { bought = after * 0.7; co.sh -= bought / Math.max(price, 0.5); co.debt -= after * 0.3; }
      } else co.debt -= after;

      // steady companies keep their debt in check by selling a few new shares when it drifts too high
      if (!co.deal && co.lev > co.levT + 0.1 && (co.arche !== 'spec' || ctx.st.S > 0)) {
        var amtI = (co.lev - co.levT - 0.04) * co.ev * (co.arche === 'spec' ? 0.3 : 0.55);
        amtI = Math.min(amtI, 0.25 * price * co.sh);
        if (amtI > 0) {
          co.sh += amtI / (0.97 * Math.max(price, 0.2)); co.debt -= amtI;
          if (amtI > 0.04 * price * co.sh) postCo(co, d, { k: 'raise', src: 'FILING', sev: 2, tr: 'real', h: co.name + ' sells ' + money(amtI) + ' of new shares to trim its debt',
            b: 'A safer balance sheet, paid for by existing shareholders: profits are now split across more shares.' });
        }
      }
      var revYoY = (qn >= 4) ? revQ / co.q[qn - 4].rev - 1 : null;
      var rec = { d: d, rev: revQ, om: omQ, ni: ni, eps: eps, est: est, sur: sur, dps: co.dps, debt: co.debt, sh: co.sh, g: revYoY, int: interest, ebit: ebit, one: co.oneOff };
      co.q.push(rec);
      co.omSum = 0; co.revSum = 0; co.qDays = 0; co.oneOff = 0;
      // The dividend is declared today and paid in ten trading days. See divAcc below for how it sits in the price.
      var payD = Math.min(d + 10, ctx.N - 1), dAmt = co.dps > 0 ? Math.round(co.dps * 10000) / 10000 : 0, accNow = divAcc(co, d);
      if (dAmt > 0) { co.divs.push({ d: payD, amt: dAmt }); co.divPend = payD; }
      co.dT0 = d; co.dA0 = accNow; co.dT1 = payD; co.dA1 = dAmt;
      co.repFrom = d; co.repTo = d + 60;
      co.bookStep = value(co, d) - vBooks0; co.bookDay = d; // exactly how much the books moved a share today

      // headline
      var epsS = (eps < 0 ? '-$' : '$') + Math.abs(eps).toFixed(2);
      var verb, sev = 1;
      if (sur > 0.12) { verb = rQ.pick(['smashes forecasts', 'blows past expectations', 'crushes its quarter']); sev = 2; }
      else if (sur > 0.035) verb = rQ.pick(['beats forecasts', 'tops expectations', 'has a better quarter than expected']);
      else if (sur > -0.035) verb = rQ.pick(['reports in line with forecasts', 'meets expectations', 'delivers the quarter analysts expected']);
      else if (sur > -0.12) verb = rQ.pick(['misses forecasts', 'falls short of expectations', 'disappoints']);
      else { verb = rQ.pick(['badly misses forecasts', 'stuns investors with a weak quarter', 'falls well short']); sev = 2; }
      if (Math.abs(dl) > 0.09) sev = 3;
      var body = co.name + (eps >= 0 ? ' earned ' + epsS : ' lost $' + Math.abs(eps).toFixed(2)) + ' a share for the quarter. Analysts expected ' +
        (est < 0 ? 'a loss of $' + Math.abs(est).toFixed(2) : '$' + est.toFixed(2)) + '.';
      if (revYoY != null) body += ' Sales ' + (revYoY >= 0 ? 'grew ' : 'fell ') + pct(Math.abs(revYoY)) + ' from a year ago.';
      if (divNote && divNote.up) body += ' It raised its dividend ' + pct(divNote.up) + '.';
      if (divNote && divNote.cut) body += divNote.zero ? ' It suspended its dividend to save cash.' : ' It cut its dividend by ' + pct(divNote.cut) + '.';
      if (bought > 0 && co.q.length % 4 === 0 && bought * 4 > 0.01 * co.sh * price) body += ' It spent ' + money(bought) + ' buying back its own shares.';
      postCo(co, d, { k: 'earn', src: 'FILING', sev: sev, h: co.name + ' ' + verb, b: body, tr: 'real', sur: sur });
      if (divNote && divNote.cut) postCo(co, d, { k: 'divcut', src: 'FILING', sev: 3, tr: 'real',
        h: co.name + (divNote.zero ? ' suspends its dividend' : ' cuts its dividend ' + pct(divNote.cut)),
        b: 'The payout had grown larger than the profits behind it. Companies treat a dividend cut as a last resort, so it usually means management expects trouble to last.' });
    }

    /* ---------- distress, bankruptcy, takeover, IPO ---------- */
    function delist(co, d, px, why) {
      co.end = d; co.endPx = px; co.endWhy = why;
      var i = active.indexOf(co); if (i >= 0) active.splice(i, 1);
      slotsWaiting.push({ at: d + rEv.int(100, 260), sector: co.sector });
    }
    function bankrupt(co, d, why) {
      postCo(co, d, { k: 'bust', src: 'FILING', sev: 3, tr: 'real', h: co.name + ' files for bankruptcy',
        b: (why || 'It could not pay its debts.') + ' Lenders take what is left. The shares are now worth nothing and have stopped trading.' });
      delist(co, d, 0, 'bankrupt');
    }
    function checkDistress(co, d) {
      if (co.deal) return;
      if (co.lev > 0.62 && !co.flags.warned) {
        co.flags.warned = d;
        postCo(co, d, { k: 'debtwarn', src: 'WIRE', sev: 2, tr: 'real', h: 'Lenders grow nervous about ' + co.name,
          b: 'Its debt is now large next to what the business is worth. Rating agencies have cut its credit score, which makes new loans cost more.' });
      }
      if (co.lev < 0.5) co.flags.warned = 0;
      co.levS += (co.lev - co.levS) * 0.03;
      var dng = ctx.dest.danger || 1, thr = 0.78 - 0.05 * (dng - 1);
      if (co.levS > thr) {
        var h = Math.min(0.02, dng * 0.004 * (co.levS - thr) / 0.15 + (co.levS > 1.2 ? 0.02 : 0));
        if (rEv.chance(h)) {
          var pRescue = clamp(0.55 + 1.2 * ctx.st.S - 0.2 * co.distressed - 0.1 * (dng - 1), 0.1, 0.85);
          var price = Math.max(0.05, co.pc[d - 1] / 100), mcap = price * co.sh;
          if (d <= ctx.W) {
            // before the game starts nobody is allowed to vanish: lenders swap debt for shares instead
            co.debt = 0.45 * co.ev; co.sh *= 2.5; co.distressed = 0; co.levS = 0.45;
          } else if (co.distressed < 2 && rEv.chance(pRescue)) {
            var raise = Math.min(0.45 * co.debt, 0.8 * mcap);
            shock(co, d, function (c) { c.sh += raise / (0.72 * price); c.debt -= raise; }, 0.9, 1.3);
            co.distressed++;
            postCo(co, d, { k: 'dilute', src: 'FILING', sev: 3, tr: 'real', h: co.name + ' sells new shares to pay down debt',
              b: 'It raised ' + money(raise) + ' by issuing new stock at a steep discount. The company survives for now, but every existing share owns a smaller slice of it.' });
          } else bankrupt(co, d);
        }
      }
      // cash-burning growth companies top up by selling shares while the market lets them
      if (co.omMature != null && co.lev > 0.3 && co.levS <= thr && ctx.st.S > -0.1 && rEv.chance(0.02)) {
        var p2 = Math.max(0.2, co.pc[d - 1] / 100), amt = 0.6 * Math.max(co.debt, 0.05 * co.rev);
        shock(co, d, function (c) { c.sh += amt / (0.93 * p2); c.debt -= amt; }, 0.9, 1.2);
        postCo(co, d, { k: 'raise', src: 'FILING', sev: 2, tr: 'real', h: co.name + ' raises ' + money(amt) + ' selling new shares',
          b: 'The money funds growth it cannot yet pay for from profits. Existing shareholders are diluted: the same company is now split into more shares.' });
      }
    }

    function ipo(d) {
      for (var i = slotsWaiting.length - 1; i >= 0; i--) {
        var w = slotsWaiting[i];
        if (w.at > d) continue;
        slotsWaiting.splice(i, 1);
        if (!poolLeft.length) continue;
        var j, pick = -1;
        for (j = 0; j < poolLeft.length; j++) if (poolLeft[j].sector === w.sector) { pick = j; break; }
        if (pick < 0) pick = rEv.int(0, poolLeft.length - 1);
        var tpl = poolLeft.splice(pick, 1)[0];
        var co = mkCo(tpl, d, true);
        co.pc = new Int32Array(ctx.N); co.fvA = new Float32Array(ctx.N); co.shA = new Float32Array(ctx.N);
        cos.push(co); active.push(co);
        postCo(co, d, { k: 'ipo', src: 'WIRE', sev: 2, tr: 'mixed', h: co.name + ' joins the ' + ctx.dest.indexName,
          b: 'New on the exchange today. ' + tpl.desc + ' New listings often arrive with a lot of excitement already in the price.' });
      }
    }

    /* ---------- company events ---------- */
    var EV = [];
    function ev(id, w, fn) { EV.push({ id: id, w: w, fn: fn }); }
    var P = function (a) { return rEv.pick(a); };

    ev('contract', function (co) { return co.arche === 'income' ? 0.5 : 1.2; }, function (co, d) {
      var x = rEv.range(0.01, 0.035);
      var dl = shock(co, d, function (c) { c.g += x; });
      postCo(co, d, { k: 'contract', src: 'WIRE', sev: sevOf(dl), tr: 'real', h: co.name + ' ' + P(['wins a major contract', 'signs its biggest customer yet', 'lands a multi-year deal']),
        b: 'The signed deal should lift sales over the next two years. Analysts are adding roughly ' + pct(x * 1.6) + ' to their sales forecasts.' });
    });
    ev('costcut', function (co) { return co.om < co.omBar ? 1.0 : 0.5; }, function (co, d) {
      var x = rEv.range(0.04, 0.1);
      var dl = shock(co, d, function (c) { c.omBar += Math.abs(c.omBar) * x + 0.002; c.oneOff += 0.012 * c.rev; });
      postCo(co, d, { k: 'costcut', src: 'FILING', sev: sevOf(dl), tr: 'real', h: co.name + ' ' + P(['to cut costs and close sites', 'announces a restructuring', 'trims its workforce']),
        b: 'A one-time charge this quarter, then lower running costs after. If it works, more of each dollar of sales becomes profit.' });
    });
    ev('pricewar', function (co) { return co.om < co.omBar ? 0.5 : 1.0; }, function (co, d) {
      var x = rEv.range(0.04, 0.1);
      var dl = shock(co, d, function (c) { c.omBar -= Math.abs(c.omBar) * x; });
      postCo(co, d, { k: 'pricewar', src: 'WIRE', sev: sevOf(dl), tr: 'real', h: P(['A rival undercuts ', 'New competition squeezes ', 'Price war hits ']) + co.name,
        b: 'To keep customers it is matching lower prices. Sales may hold, but less of each sale is profit.' });
    });
    ev('recall', function (co) { return co.like === 'bank' || co.like === 'util' ? 0.2 : 0.7; }, function (co, d) {
      var c1 = rEv.range(0.01, 0.03), x = rEv.range(0.003, 0.012);
      var dl = shock(co, d, function (c) { c.oneOff += c1 * c.rev; c.debt += c1 * c.rev * 0.5; c.g -= x; });
      postCo(co, d, { k: 'recall', src: 'WIRE', sev: sevOf(dl), tr: 'real', h: co.name + ' ' + P(['recalls a faulty product', 'pulls a product from sale', 'halts shipments over a defect']),
        b: 'The fix will cost about ' + money(c1 * co.rev) + '. The bigger question is whether customers come back. The cost is certain. The lasting damage is a guess.' });
    });
    ev('ceo', function () { return 0.6; }, function (co, d) {
      var abrupt = rEv.chance(0.45), x = 0.012 * rEv.n() - (abrupt ? 0.008 : 0);
      co.rx -= abrupt ? rEv.range(0.03, 0.08) : rEv.range(-0.01, 0.02);
      co.gBar += x;
      postCo(co, d, { k: 'ceo', src: 'WIRE', sev: abrupt ? 2 : 1, tr: 'mixed', h: abrupt ? 'The boss of ' + co.name + ' quits without warning' : co.name + ' names a new chief executive',
        b: abrupt ? 'No reason was given. Sudden exits make investors wonder what they have not been told. Sometimes it is nothing.' : 'The outgoing chief retires after a long run. A planned handover like this rarely changes much.' });
    });
    ev('acquire', function (co) { return co.lev < 0.45 && co.arche !== 'spec' ? 0.7 : 0.1; }, function (co, d) {
      var size = rEv.range(0.1, 0.25), good = rEv.next();
      var paid = size * co.ev * rEv.range(0.8, 1.25);
      var dl = shock(co, d, function (c) { c.debt += paid; c.rev *= 1 + size; c.omBar *= 0.9 + 0.2 * good; });
      postCo(co, d, { k: 'acquire', src: 'FILING', sev: sevOf(dl), tr: 'mixed', h: co.name + ' buys a rival for ' + money(paid),
        b: 'Paid for with borrowed money. It gets bigger overnight. Whether it got better depends on the price paid, and buyers overpay more often than not.' });
    });
    ev('buyback', function (co) { return co.lev < 0.3 && co.u < 0 && co.omMature == null ? 0.9 : 0.05; }, function (co, d) {
      var f = rEv.range(0.03, 0.07), price = Math.max(0.5, co.pc[d - 1] / 100);
      shock(co, d, function (c) { c.debt += f * c.sh * price; c.sh *= 1 - f; }, 0.9, 1.2);
      co.u += 0.01;
      postCo(co, d, { k: 'buyback', src: 'FILING', sev: 1, tr: 'real', h: co.name + ' to buy back ' + pct(f) + ' of its shares',
        b: 'Fewer shares means each one owns more of the company. Managers tend to do this when they think the stock is cheap.' });
    });
    ev('expand', function (co) { return co.lev < 0.5 ? 0.6 : 0.1; }, function (co, d) {
      var b = rEv.range(0.05, 0.12), x = b * 0.6 * rEv.range(0.55, 1.5);
      var dl = shock(co, d, function (c) { c.debt += b * c.ev; c.g += x; });
      postCo(co, d, { k: 'expand', src: 'FILING', sev: sevOf(dl), tr: 'mixed', h: co.name + ' borrows ' + money(b * co.ev) + ' to expand',
        b: 'More debt now for more sales later. It pays off if the demand shows up, and hurts twice as much if a recession arrives first.' });
    });
    ev('outage', function () { return 0.5; }, function (co, d) {
      var c1 = rEv.range(0.006, 0.022);
      var dl = shock(co, d, function (c) { c.oneOff += c1 * c.rev; c.debt += c1 * c.rev * 0.5; }, 1.2, 2.4);
      var what = { tech: 'a three-day outage', health: 'a plant shutdown', energy: 'a refinery fire', bank: 'a costly systems failure', staples: 'a factory fire', retail: 'storm damage across its sites',
        indust: 'a strike at its main plant', util: 'storm damage to its network', mater: 'a flooded mine', media: 'a costly outage' }[co.like] || 'an accident';
      postCo(co, d, { k: 'outage', src: 'WIRE', sev: sevOf(dl), tr: 'noise', h: co.name + ' hit by ' + what,
        b: 'A one-time cost of about ' + money(c1 * co.rev) + '. Painful this quarter, but it does not change what the business earns in a normal year.' });
    });
    ev('guide', function (co) { return Math.abs(co.hidR) + 5 * Math.abs(co.hidM) > 0.05 ? 2.5 : 0; }, function (co, d) {
      var up = co.hidR + 5 * co.hidM > 0;
      var dl = shock(co, d, function (c) { c.hidR *= 0.4; c.hidM *= 0.4; }, 0.8, 1.2);
      postCo(co, d, { k: 'guide', src: 'FILING', sev: sevOf(dl), tr: 'real', h: co.name + (up ? ' raises its forecast for the year' : ' warns profit will fall short'),
        b: up ? 'Business is running ahead of what it told investors. Companies only say this when they are confident.' : 'Business is running behind what it told investors. Better to hear it now than on results day, but it is still bad news.' });
    });
    ev('lawsuit', function () { return 0.5; }, function (co, d) {
      co.u -= rEv.range(0.03, 0.09);
      var odds = rEv.range(0.15, 0.35), exposure = rEv.range(0.05, 0.12);
      postCo(co, d, { k: 'lawsuit', src: 'WIRE', sev: 2, tr: 'pending', h: P(['Regulators sue ', 'Customers bring a class action against ', 'Government opens a probe into ']) + co.name,
        b: 'If it loses, the bill could reach ' + money(exposure * co.rev) + '. Lawyers put the chance of a large penalty at about ' + pct(odds) + '. Cases like this take a year or more.' });
      ctx.sched(d + rEv.int(200, 440), function (dd) {
        if (co.end >= 0) return;
        if (rEv.chance(odds)) {
          var dl = shock(co, dd, function (c) { c.oneOff += exposure * c.rev; c.debt += exposure * c.rev; }, 0.7, 1.2);
          postCo(co, dd, { k: 'lawlose', src: 'WIRE', sev: sevOf(dl) + 1 > 3 ? 3 : sevOf(dl) + 1, tr: 'real', h: co.name + ' loses its case and must pay ' + money(exposure * co.rev), b: 'The penalty comes straight out of the company, mostly as new debt.' });
        } else {
          co.u += rEv.range(0.02, 0.06);
          postCo(co, dd, { k: 'lawwin', src: 'WIRE', sev: 2, tr: 'real', h: 'Case against ' + co.name + ' ' + P(['is dropped', 'settles for a small sum', 'is thrown out']), b: 'The cloud over the shares lifts. Investors who sold on the first headline sold for nothing.' });
        }
      });
    });
    ev('books', function (co) { return co.arche === 'spec' ? 0.35 : 0.12; }, function (co, d) {
      var drop = rEv.range(0.2, 0.36);
      co.u -= drop;
      postCo(co, d, { k: 'books', src: 'WIRE', sev: 3, tr: 'pending', h: 'Auditors question the accounts at ' + co.name,
        b: 'The company says its numbers are sound. Until an outside review reports, nobody can be sure the reported profits are real. About half the time they turn out fine.' });
      ctx.sched(d + rEv.int(110, 280), function (dd) {
        if (co.end >= 0) return;
        var r = rEv.next();
        if (r < 0.58) { co.u += drop * 0.9; postCo(co, dd, { k: 'booksok', src: 'FILING', sev: 3, tr: 'real', h: 'Review clears ' + co.name + ' of wrongdoing', b: 'The accounts stand as reported. The fear came out of the price about as fast as it went in.' }); }
        else if (r < 0.94) {
          co.u += drop * 0.45;
          var dl = shock(co, dd, function (c) { c.omBar *= 0.8; c.rev *= 0.92; });
          postCo(co, dd, { k: 'booksbad', src: 'FILING', sev: 3, tr: 'real', h: co.name + ' restates two years of profit', b: 'Past profits were overstated. The business is real but smaller and less profitable than investors were told.' });
        } else if (dd > ctx.W) bankrupt(co, dd, 'The review found the profits were invented.');
      });
    });
    ev('trial', function (co) { return co.tpl.trials ? 2.2 : co.like === 'health' ? 0.8 : 0; }, function (co, d) {
      var tw = co.tpl.trial || { due: 'trial results', what: null, win: 'drug succeeds in final trial', fail: 'drug fails in final trial', winB: 'Approval should follow, and with it years of new sales.', failB: 'Years of research written off. The sales investors were counting on will not arrive.' };
      var big = !!co.tpl.trials, odds = rEv.range(0.35, 0.65), when = rEv.int(60, 150);
      postCo(co, d, { k: 'trialset', src: 'WIRE', sev: big ? 2 : 1, tr: 'pending', h: co.name + ' ' + tw.due + ' due in about ' + Math.round(when / 20) + ' months',
        b: (tw.what || 'Its ' + P(['heart', 'cancer', 'diabetes', 'migraine', 'arthritis']) + ' treatment is in final testing.') + ' Analysts put the odds of success near ' + pct(clamp(odds + 0.08 * rEv.n(), 0.1, 0.9)) + '.' + (big ? ' For a company this size, the result decides its future.' : '') });
      ctx.sched(d + when, function (dd) {
        if (co.end >= 0) return;
        // sized so the average outcome is worth nothing: a fair coin with big faces
        var U = Math.min(big ? rEv.range(0.25, 0.5) : rEv.range(0.03, 0.07), dlog(1 + 0.8 * (1 - odds) / odds));
        if (rEv.chance(odds)) {
          shock(co, dd, function (c) { c.g += U * 0.6; if (c.omMature != null) { c.bel += 0.08; c.succ += 0.08; } }, 0.85, 1.2);
          postCo(co, dd, { k: 'trialwin', src: 'WIRE', sev: big ? 3 : 2, tr: 'real', h: co.name + ' ' + tw.win, b: tw.winB });
        } else {
          var D = -dlog(1 - odds * (dexp(U) - 1) / (1 - odds));
          shock(co, dd, function (c) { c.g -= D * 0.6; if (c.omMature != null) { c.bel -= 0.08; c.succ -= 0.08; } c.oneOff += 0.02 * c.rev; }, 0.85, 1.2);
          postCo(co, dd, { k: 'trialfail', src: 'WIRE', sev: big ? 3 : 2, tr: 'real', h: co.name + ' ' + tw.fail, b: tw.failB });
        }
      });
    });
    ev('hit', function (co) { return co.tpl.hits ? 3 : 0; }, function (co, d) {
      var good = rEv.chance(0.42), x = rEv.range(0.02, 0.06);
      var dl = shock(co, d, function (c) { if (good) { c.g += x * 1.4; c.hidR += x * 0.5; } else { c.g -= x; c.oneOff += 0.02 * c.rev; } });
      postCo(co, d, { k: 'hit', src: 'WIRE', sev: sevOf(dl), tr: 'real', h: good ? co.name + ' has a runaway hit' : 'Big release from ' + co.name + ' flops',
        b: good ? 'Its latest release is breaking records. Hits like this pay for years of misses.' : 'It cost a fortune and nobody came. One flop is normal in this business. A string of them is not.' });
    });
    ev('patent', function (co) { return co.like === 'health' && !co.tpl.trials ? 0.7 : co.like === 'tech' ? 0.3 : 0; }, function (co, d) {
      var x = rEv.range(0.015, 0.04);
      var dl = shock(co, d, function (c) { c.g -= x; c.gBar -= x * 0.3; });
      postCo(co, d, { k: 'patent', src: 'WIRE', sev: sevOf(dl), tr: 'real', h: 'Key patent at ' + co.name + ' is about to run out',
        b: 'Once it expires, rivals can sell cheap copies. Sales of that product usually fall fast.' });
    });
    ev('breach', function (co) { return co.like === 'tech' || co.like === 'bank' || co.like === 'retail' ? 0.5 : 0.1; }, function (co, d) {
      co.hype -= rEv.range(0.03, 0.07);
      var c1 = rEv.range(0.003, 0.01);
      shock(co, d, function (c) { c.oneOff += c1 * c.rev; }, 1, 1.5);
      postCo(co, d, { k: 'breach', src: 'WIRE', sev: 2, tr: 'noise', h: 'Hackers steal customer data from ' + co.name,
        b: 'Embarrassing, and there will be a fine. History says customers mostly forget within a few months.' });
    });
    // --- noise: things that move the price without changing the business
    ev('pundit', function () { return 1.3; }, function (co, d) {
      var up = rEv.chance(0.55), x = rEv.range(0.03, 0.075);
      co.hype += up ? x : -x;
      postCo(co, d, { k: 'pundit', src: 'OPINION', sev: 1, tr: 'noise',
        h: up ? P(['TV host calls ' + co.name + ' "the buy of the decade"', 'Popular newsletter tips ' + co.name, co.name + ' is trending with small investors']) : P(['Famous investor says he is betting against ' + co.name, 'Columnist: "' + co.name + ' is yesterday\'s story"', 'Online forum turns on ' + co.name]),
        b: 'No new facts about the business, only an opinion and a crowd reacting to it.' });
    });
    ev('analyst', function () { return 1.3; }, function (co, d) {
      var back = d >= 60 ? co.pc[d - 1] / co.pc[Math.max(co.start, d - 60)] - 1 : 0;
      var smart = rEv.chance(0.3);
      var up = smart ? co.u < 0 : back > 0;
      co.hype += (up ? 1 : -1) * rEv.range(0.015, 0.04);
      postCo(co, d, { k: 'analyst', src: 'OPINION', sev: 1, tr: smart ? 'mixed' : 'noise',
        h: P(['Broker ', 'Bank analyst ', 'Research house ']) + (up ? 'upgrades ' : 'downgrades ') + co.name + (up ? ' to "buy"' : ' to "sell"'),
        b: up ? (smart ? 'The note argues the shares are cheap next to what the business earns.' : 'The note points to how well the shares have done lately.') : (smart ? 'The note argues the price has run ahead of what the business earns.' : 'The note points to how badly the shares have done lately.') });
    });
    ev('insider', function (co) { return co.u < -0.12 ? 1.6 : 0.15; }, function (co, d) {
      co.hype += 0.01;
      postCo(co, d, { k: 'insider', src: 'FILING', sev: 1, tr: 'real', h: 'Directors of ' + co.name + ' buy shares with their own money',
        b: 'Insiders sell for many reasons: a house, a divorce, a tax bill. They buy for one: they think the price is too low.' });
    });
    ev('insidersell', function () { return 0.4; }, function (co, d) {
      co.hype -= 0.01;
      postCo(co, d, { k: 'insidersell', src: 'FILING', sev: 1, tr: 'noise', h: 'Chief executive of ' + co.name + ' sells some shares',
        b: 'The sale was scheduled months ago. Executives are paid largely in stock and sell regularly.' });
    });
    ev('rumor', function (co) { return co.arche === 'income' ? 0.2 : 0.45; }, function (co, d) {
      var real = d > ctx.W && rEv.chance(0.1), x = rEv.range(0.06, 0.12);
      co.hype += x;
      postCo(co, d, { k: 'rumor', src: 'RUMOR', sev: 2, tr: real ? 'real' : 'noise', h: 'Talk of a takeover bid for ' + co.name,
        b: 'Unnamed sources say a buyer is circling. The company will not comment. Most takeover rumors come to nothing.' });
      if (real) ctx.sched(d + rEv.int(15, 60), function (dd) { if (co.end < 0 && !co.deal) takeover(co, dd); });
    });
    ev('short', function (co) { return co.u > 0.1 || co.arche === 'spec' ? 0.7 : 0.2; }, function (co, d) {
      var x = rEv.range(0.08, 0.18), right = rEv.chance(0.4);
      co.u -= x;
      postCo(co, d, { k: 'short', src: 'OPINION', sev: 2, tr: right ? 'real' : 'noise', h: 'Short seller publishes attack on ' + co.name,
        b: 'A fund that profits if the shares fall says the business is weaker than it looks. Such reports are right some of the time and self-serving all of the time.' });
      ctx.sched(d + rEv.int(40, 120), function (dd) {
        if (co.end >= 0) return;
        if (right) { var dl = shock(co, dd, function (c) { c.omBar *= 0.88; c.g -= 0.02; }); co.u += x * 0.4;
          postCo(co, dd, { k: 'shortright', src: 'WIRE', sev: 2, tr: 'real', h: co.name + ' admits some of the short seller\'s claims', b: 'Margins were flattered by one-time gains. The critics had a point.' }); }
        else { co.u += x * 0.9; postCo(co, dd, { k: 'shortwrong', src: 'WIRE', sev: 1, tr: 'real', h: co.name + ' rebuts short seller point by point', b: 'Customers and auditors back the company. The attack fades.' }); }
      });
    });
    ev('chatter', function (co) { return Math.abs(co.hidR) > 0.02 ? 1.5 : 0.3; }, function (co, d) {
      var truth = co.hidR + 5 * co.hidM > 0, says = rEv.chance(0.7) ? truth : !truth;
      co.hype += (says ? 1 : -1) * rEv.range(0.01, 0.03);
      postCo(co, d, { k: 'chatter', src: 'RUMOR', sev: 1, tr: says === truth ? 'real' : 'noise', h: says ? 'Suppliers say orders from ' + co.name + ' are picking up' : 'Word is that business at ' + co.name + ' has slowed',
        b: 'Second-hand talk ahead of the next results. This kind of chatter is right more often than not, and wrong often enough to hurt.' });
    });

    function takeover(co, d) {
      if (co.deal || co.end >= 0) return;
      var price = co.pc[d - 1] / 100, prem = rEv.range(0.25, 0.45);
      var px = Math.round(price * (1 + prem) * 100) / 100, end = Math.min(ctx.N - 1, d + rEv.int(40, 90));
      co.deal = { px: px, end: end }; co.dealN = rEv.n();
      postCo(co, d, { k: 'takeover', src: 'FILING', sev: 3, tr: 'real', h: co.name + ' agrees to be bought for $' + px.toFixed(2) + ' a share',
        b: 'A buyer is paying ' + pct(prem) + ' above yesterday\'s price, in cash. When the deal closes in a few months, shareholders are paid out and the stock stops trading.' });
    }

    function fireEvent(co, d) {
      var e = rEv.wpick(EV, function (x) { return x.w(co); });
      e.fn(co, d);
    }

    /* ---------- no steps you can see coming ----------
     * Two things would otherwise move a share price by a known amount on a known day, and anything like that can be
     * traded for free money (buy the day before, sell the day after):
     *   1. A dividend. The price has to fall by the dividend on the day it is paid, or collecting it costs nothing.
     *      So the next payout builds up in the price a little each day and drops out on pay day. Hold for a tenth of
     *      the quarter and you earn about a tenth of the dividend, whichever days you pick.
     *   2. The books. Profit a company keeps (or cash it burns) reaches its balance sheet once a quarter, on report
     *      day. The price leans into that gradually over the quarter, so report day only moves on the surprise.
     * Both wash out to nothing over a full quarter: long-term returns are unchanged. */
    var LEAN_MAX = 0.08;
    function divAcc(co, d) { // dollars per share of the next dividend already in the price
      if (co.dT1 == null) return 0;
      if (co.deal && !co.dealSeen) { co.dealSeen = 1; if (!(co.divPend > d)) { co.dT0 = d; co.dA0 = 0; co.dT1 = ctx.N + 1; co.dA1 = 0; } }
      if (d >= co.dT1) { co.dT0 = co.dT1; co.dA0 = 0; co.dT1 = co.dT0 + 60; co.dA1 = co.deal ? 0 : Math.max(0, co.dps); } // paid: start building towards the next one
      var span = co.dT1 - co.dT0;
      return span > 0 ? co.dA0 + (co.dA1 - co.dA0) * (d - co.dT0) / span : co.dA1;
    }
    function retAcc(co, d) { // dollars per share of this quarter's kept profit (or burnt cash) already in the price
      if (co.deal || !(co.qDays > 0) || !(co.sh > 0)) return 0;
      if (co.repTo == null || d > co.repTo) { // first quarter after listing: work out when the first report falls
        var first = co.start + 21; co.repFrom = co.start; co.repTo = first + (((co.qOff - first % 60) % 60) + 60) % 60;
      }
      // the same sums the report will do, on the figures the public can see so far this quarter
      var M = ctx.M, revQ = co.revSum / co.qDays / 4 * dexp(-co.hidR), omQ = co.omSum / co.qDays - co.hidM;
      var interest = co.debt > 0 ? co.debt * co.dRate / 100 / 4 : co.debt * Math.max(0, M.rate[d] - 0.5) / 100 / 4;
      var pre = revQ * omQ - interest - co.oneOff, ni = pre > 0 ? pre * (1 - TAX) : pre;
      var after = ni - Math.max(0, co.g) * co.ci * revQ - Math.max(0, co.dps) * co.sh;
      return after / co.sh * clamp((d - co.repFrom) / Math.max(1, co.repTo - co.repFrom), 0, 1);
    }

    /* ---------- daily step ---------- */
    E.step = function (d) {
      var M = ctx.M, st = ctx.st, i, co;
      ipo(d);
      if (d > ctx.W && rEv.chance(DT / 14) && active.length) { // an out-of-the-blue takeover somewhere
        co = active[rEv.int(0, active.length - 1)];
        if (!co.deal && co.lev < 0.7 && d - co.start > 300) takeover(co, d);
      }
      var gdpDev = (M.gdp[d] - 2.3) / 100, inflDev = (M.infl[d] - 2.2) / 100, c = ctx.cm;
      ctx.gdpDev = gdpDev;
      for (i = active.length - 1; i >= 0; i--) {
        co = active[i];
        var s = ctx.sec[co.sector];
        if (co.deal) {
          if (d >= co.deal.end) { co.pc[d] = Math.round(co.deal.px * 100); co.fvA[d] = co.deal.px; co.shA[d] = co.sh;
            postCo(co, d, { k: 'dealdone', src: 'FILING', sev: 2, tr: 'real', h: 'Takeover of ' + co.name + ' completes', b: 'Shareholders receive $' + co.deal.px.toFixed(2) + ' a share in cash. The stock no longer trades.' });
            delist(co, d, co.deal.px, 'bought'); continue; }
        }
        co.gBar += 0.13 * (co.gLong - co.gBar) * DT;
        co.g += 0.6 * (co.gBar - co.g) * DT + co.sg * SQDT * rN.n();
        var er = co.sr * SQDT * rN.n();
        co.rev *= dexp((co.g + co.cyc * 1.3 * gdpDev + 0.8 * inflDev + s.dem / 100) * DT + er);
        co.hidR += 0.5 * er;
        var ex = co.ex;
        if (co.omMature == null) co.omBar += 0.07 * (co.omRef - co.omBar) * DT;
        var omT = co.omBar * (1 + clamp(0.055 * co.cyc * st.gap, -0.9, 0.5) + s.mar) + (ex.oil || 0) * c.oil + (ex.gold || 0) * c.gold + (ex.copper || 0) * c.copper + (ex.wheat || 0) * c.wheat + (ex.rate || 0) * (st.rate - 2.7);
        if (co.arche !== 'spec' && omT < 0.15 * co.omBar) omT = 0.15 * co.omBar;
        co.omT = omT;
        var em = co.sm * SQDT * rN.n();
        co.om += 2.2 * (omT - co.om) * DT + em;
        co.hidM += 0.5 * em;
        var leak = co.post > 0 ? 0.95 : 0.9995;
        if (co.post > 0) co.post--;
        co.hidR *= leak; co.hidM *= leak;
        if (co.omMature != null) {
          co.succ = clamp(co.succ + 0.14 * SQDT * rN.n(), 0.1, 1.35);
          co.omBar += 0.2 * (co.omMature * co.succ - co.omBar) * DT;
          co.bel = clamp(co.bel + 1.2 * (co.succ - co.bel) * DT + 0.09 * SQDT * rN.n(), 0.1, 1.4);
        }
        co.u += -0.12 * co.u * DT + co.su * SQDT * rN.n();
        co.rx *= 1 - 2.8 * DT;
        co.hype *= 1 - 14 * DT;
        var spread = 1 + 7 * Math.max(0, co.lev - 0.3);
        co.dRate += 0.2 * ((M.y10[d] + spread) - co.dRate) * DT;
        co.omSum += co.om; co.revSum += co.rev; co.qDays++;

        if (d >= co.nextEv && !co.deal) {
          fireEvent(co, d);
          co.nextEv = d + 5 + Math.floor(-dlog(1 - rEv.next()) / (co.evRate * DT));
        }
        if ((d - co.start) > 20 && (d % 60) === co.qOff) report(co, d);
        var p = priceOf(co, d);
        if (co.end < 0) checkDistress(co, d);
        if (co.end >= 0) { // went bust today
          co.pc[d] = 0; co.fvA[d] = 0; co.shA[d] = co.sh; continue;
        }
        p = priceOf(co, d);
        // kept profit is valued the way the rest of the business is (so it scales with the mood of the moment); a dividend is plain cash
        var basePx = Math.max(1, Math.round(p * 100)), moodX = co.fv > 0 && !co.deal ? p / co.fv : 1;
        if (co.bookDay === d && !co.deal) { // report day: whatever the running estimate got wrong is carried forward and fades over the next quarter, instead of landing today
          co.resC = clamp((co.leanRet || 0) - co.bookStep * moodX, -LEAN_MAX * p, LEAN_MAX * p); co.resT = d;
        }
        // The lean is kept small next to the price. When a company's shares are worth little beside its debts, a quarter's
        // profit or a one-off charge can be huge per share while the share price barely answers to it, and an unbounded
        // lean would swing the price for nothing and snap back on report day.
        co.leanRet = co.deal ? 0 : clamp(retAcc(co, d) * moodX + (co.resT != null ? co.resC * Math.max(0, 1 - (d - co.resT) / 60) : 0), -LEAN_MAX * p, LEAN_MAX * p);
        // Under about a dollar a share one cent is a big step, so the lean is faded out there rather than let rounding turn it into a pattern.
        var lean = Math.round((divAcc(co, d) + co.leanRet) * 100 * clamp((basePx - 50) / 150, 0, 1));
        co.pc[d] = Math.max(1, basePx + Math.max(lean, -Math.floor(basePx / 2)));
        co.fvA[d] = co.fv; co.shA[d] = co.sh;
      }
    };

    E.init = function (d0) {
      var list = ctx.dest.companies;
      for (var i = 0; i < list.length; i++) {
        var co = mkCo(list[i], d0, false);
        co.pc = new Int32Array(ctx.N); co.fvA = new Float32Array(ctx.N); co.shA = new Float32Array(ctx.N);
        cos.push(co); active.push(co);
      }
    };
    E.cos = cos; E.active = active; E.ttm = ttm;
    return E;
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
