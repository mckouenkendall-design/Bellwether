/* A Run: one player's money moving through one Tape.
 * All cash is whole cents. Every change to cash goes through _cash(), which
 * files it under a category, so "where did the money go" always adds up.
 * Dolly (the index-only rival) is just another Run with auto-invest switched on,
 * so she plays under exactly the same rules, fees and taxes as you.
 */
(function (root) {
  'use strict';
  var BW = root.BW, T = BW.T, dexp = BW.dexp, dpow = BW.dpow, clamp = BW.clamp, hrand = BW.hrand, hnorm = BW.hnorm;
  var DPY = 240, DPM = 20;

  var RULES = BW.RULES = {
    taxPay: 0.22,   // pay, interest, rent, business profit, gains on things held under a year
    taxLong: 0.15,  // dividends and gains on things held a year or more
    cardAPR: 0.24, buyClose: 0.03, sellClose: 0.06, quickClose: 0.02, quickSale: 0.88,
    dti: 0.43, mgmt: 0.08, propTaxIns: 0.016, propMaint: 0.006, pmi: 0.006, refiLTV: 0.75, refiClose: 0.015
  };

  var BIZ = BW.BIZ = [
    { id: 'lemon', name: 'Lemonade Stand', cost: 400, roc: 0.55, cyc: 0.3, vol: 0.25, desc: 'A folding table, a jug and a hand-painted sign. Everyone starts somewhere.' },
    { id: 'lawn', name: 'Lawn Care Route', cost: 2500, roc: 0.4, cyc: 0.5, vol: 0.2, desc: 'A mower, a trailer and twenty regular gardens.' },
    { id: 'vend', name: 'Vending Machines', cost: 8000, roc: 0.3, cyc: 0.4, vol: 0.15, desc: 'Six machines in office lobbies. Refill them, collect the coins.' },
    { id: 'truck', name: 'Food Truck', cost: 30000, roc: 0.24, cyc: 1.0, vol: 0.25, desc: 'Tacos at lunch, festivals at weekends. Lives and dies by foot traffic.' },
    { id: 'coffee', name: 'Coffee Shop', cost: 90000, roc: 0.2, cyc: 1.0, vol: 0.2, desc: 'A corner cafe with a loyal morning queue.' },
    { id: 'wash', name: 'Car Wash', cost: 250000, roc: 0.18, cyc: 0.8, vol: 0.15, desc: 'An automated tunnel on a busy road. Rain is your enemy.' },
    { id: 'gym', name: 'Gym', cost: 600000, roc: 0.17, cyc: 1.2, vol: 0.2, desc: 'Monthly memberships, many of them never used. Cancelled fast when money is tight.' },
    { id: 'brew', name: 'Brewery', cost: 1500000, roc: 0.16, cyc: 1.0, vol: 0.22, desc: 'A regional craft brewer with a taproom and supermarket contracts.' },
    { id: 'soft', name: 'Software Studio', cost: 4000000, roc: 0.17, cyc: 1.2, vol: 0.35, desc: 'Forty developers building apps for other companies. Lumpy, lucrative contracts.' },
    { id: 'hotel', name: 'Hotel', cost: 12000000, roc: 0.14, cyc: 1.8, vol: 0.2, desc: 'Two hundred rooms downtown. Full in booms, half-empty in busts.' },
    { id: 'factory', name: 'Factory', cost: 40000000, roc: 0.14, cyc: 1.6, vol: 0.2, desc: 'Makes parts for bigger manufacturers. Big orders, thin patience.' },
    { id: 'team', name: 'Sports Team', cost: 150000000, roc: 0.11, cyc: 0.8, vol: 0.25, desc: 'A trophy asset. The profits are modest. The bragging rights are not.' },
    { id: 'rocket', name: 'Rocket Yard', cost: 600000000, roc: 0.14, cyc: 1.2, vol: 0.5, desc: 'Launches satellites for paying customers. Most launches work.' }
  ];
  BW.BIZ_BY = {}; BIZ.forEach(function (b) { BW.BIZ_BY[b.id] = b; });
  var CAT_OF = { stock: 'stocks', fund: 'herd', sfund: 'sector', bond: 'bonds', cmdty: 'cmdty', crypto: 'crypto' };
  BW.CAT_OF = CAT_OF;

  function rq(x) { return Math.round(x * 1e6) / 1e6; }

  function Run(tape, cfg, saved) {
    this.tape = tape;
    this.ev = [];
    if (saved) { this.s = saved; return; }
    cfg = cfg || {};
    var life = cfg.life || {}, pk = cfg.perks || {};
    var s = this.s = {
      v: 1, d: tape.W, day0: tape.W, endD: tape.N - 1, done: false, bankrupt: false,
      cash: 0, flow: {}, accr: 0,
      pos: {}, cds: [], cdSeq: 1, props: [], biz: [], orders: [], ordSeq: 1,
      auto: { on: false, keep: 100000, alloc: [] }, drip: true, watch: [], offers: {},
      loan: null, job: { salary: life.salary == null ? 4800000 : life.salary, outUntil: 0, living: life.living == null ? 230000 : life.living },
      tax: { lossBank: 0 },
      tot: { fees: 0, tax: 0, cardInt: 0, loanInt: 0, mortInt: 0, interest: 0, divs: 0, salary: 0, living: 0, lifeOut: 0, lifeIn: 0, rent: 0, propCosts: 0, bizProfit: 0, realized: 0, casinoBet: 0, casinoWon: 0, casinoEV: 0 },
      pme: {}, ps: {}, hist: { nw: [], liq: [], cashW: [] }, acts: [],
      st: { trades: 0, buys: 0, sells: 0, panicSells: 0, dipBuys: 0, bustHeld: 0, dealHeld: 0, props: 0, propDeals: 0, flips: 0, bizMax: 0, cds: 0, fills: 0, cardMonths: 0, maxW: 0, peakNW: 0, maxDD: 0, bestPct: 0, worstPct: 0, forced: 0, chase: 0, heldCrash: 0, sellLog: [], buyLog: [] },
      feeMult: pk.feeMult || 1, taxMult: pk.taxMult || 1, renoMult: pk.renoMult || 1, agentMult: pk.agentMult || 1, selfSlots: pk.selfSlots || 1, salaryMult: pk.salaryMult || 1
    };
    s.job.salary = Math.round(s.job.salary * s.salaryMult);
    var start = (life.cash == null ? 300000 : life.cash) + (pk.seed || 0);
    s.startCash = start;
    this._cash(start, 'start');
    if (life.loan) { s.loan = { bal: life.loan.bal, rate: life.loan.rate, pay: life.loan.pay, orig: life.loan.bal }; }
    s.startNW = this.nw();
  }

  var P = Run.prototype;

  /* ---------- basics ---------- */
  P._cash = function (amt, cat) { this.s.cash += amt; this.s.flow[cat] = (this.s.flow[cat] || 0) + amt; };
  P._act = function () { var a = Array.prototype.slice.call(arguments); a.unshift(this.s.d); this.s.acts.push(a); };
  P._pme = function (key, cat, out) { // out > 0: cash put into this thing. out < 0: cash it returned
    var p = this.s.pme[key] || (this.s.pme[key] = { u: 0, paid: 0, got: 0, cat: cat });
    p.u += out / this.tape.M.tr[this.s.d];
    if (out > 0) p.paid += out; else p.got -= out;
  };
  P.asset = function (id) { return this.tape.assets[id]; };
  P.px = function (id) { return this.tape.assets[id].pc[this.s.d]; };
  P.qty = function (id) { var p = this.s.pos[id]; return p ? p.q : 0; };
  P.posValue = function (id) { var p = this.s.pos[id]; return p ? Math.round(p.q * this.px(id)) : 0; };
  P.posCost = function (id) { var p = this.s.pos[id], c = 0; if (p) for (var i = 0; i < p.lots.length; i++) c += p.lots[i][1]; return c; };
  P.feeBps = function (a) { return a.cost * this.s.feeMult; };
  P.cpiRel = function () { return this.tape.M.cpi[this.s.d] / this.tape.M.cpi[this.s.day0]; };
  P.rel = function () { return this.s.d - this.s.day0; };
  P.livingNow = function () { return Math.round(this.s.job.living * this.cpiRel() * dpow(1.008, this.rel() / DPY)); }; // prices, plus a little lifestyle creep
  P.cardLimit = function () { return Math.max(200000, Math.round(this.s.job.salary * 0.25)); };

  /* ---------- tax ---------- */
  // st / lt: short- and long-term gains in cents (negative = loss). Returns tax due; updates the loss bank unless dry.
  P._settle = function (st, lt, dry) {
    var s = this.s, bank = s.tax.lossBank, total = st + lt;
    if (total <= 0) { if (!dry) s.tax.lossBank = bank - total; return 0; }
    if (st < 0) { lt += st; st = 0; }
    if (lt < 0) { st += lt; lt = 0; }
    var use = Math.min(bank, st + lt), a = Math.min(use, st);
    st -= a; lt -= use - a;
    if (!dry) s.tax.lossBank = bank - use;
    return Math.round(st * RULES.taxPay * s.taxMult) + Math.round(lt * RULES.taxLong * s.taxMult);
  };

  /* ---------- buying and selling ---------- */
  P.canTrade = function (id) { var a = this.tape.assets[id]; return !!a && T.alive(a, this.s.d) && !this.s.done; };

  P.buy = function (id, amt, opts) {
    var s = this.s, a = this.tape.assets[id];
    opts = opts || {};
    if (!this.canTrade(id)) return { ok: false, why: 'This is not trading.' };
    amt = Math.floor(amt);
    if (!(amt > 0)) return { ok: false, why: 'Enter an amount.' };
    if (amt > s.cash) return { ok: false, why: 'You only have ' + BW.fmtMoney(Math.max(0, s.cash)) + ' in cash.' };
    var p = a.pc[s.d];
    var fee = opts.noFee ? 0 : Math.round(amt * this.feeBps(a) / 10000);
    var q = Math.floor((amt - fee) / p * 1e6) / 1e6;
    if (!(q > 0)) return { ok: false, why: 'That is too little to buy any.' };
    var cost = Math.round(q * p);
    if (opts.dry) return { ok: true, q: q, cost: cost, fee: fee, total: cost + fee, px: p };
    var pos = s.pos[id] || (s.pos[id] = { q: 0, lots: [], dp: 0 });
    pos.lots.push([q, cost + fee, s.d]);
    pos.q = rq(pos.q + q);
    this._cash(-(cost + fee), 'invest');
    s.tot.fees += fee;
    this._pme(id, CAT_OF[a.kind], cost + fee);
    var ps = s.ps[id] || (s.ps[id] = { paid: 0, got: 0, days: 0, first: s.d });
    ps.paid += cost + fee;
    if (!opts.auto) {
      s.st.trades++; s.st.buys++;
      this._act('buy', id, amt);
      var dd = this.tape.M.dd[s.d];
      if (dd < -0.2 && (a.kind === 'stock' || a.kind === 'fund' || a.kind === 'sfund')) s.st.dipBuys++;
      if (a.kind === 'stock' && s.d - 20 >= a.start && a.pc[s.d - 20] > 0 && p / a.pc[s.d - 20] > 1.18) s.st.chase++;
      if (s.st.buyLog.length < 400) s.st.buyLog.push([s.d, id, cost + fee]);
    }
    return { ok: true, q: q, cost: cost, fee: fee, total: cost + fee, px: p };
  };

  // qty: number of shares, or 'all'. opts: { dry, px (override, cents), noFee, forced }
  P.sell = function (id, qty, opts) {
    var s = this.s, a = this.tape.assets[id], pos = s.pos[id];
    opts = opts || {};
    if (!pos || !(pos.q > 0)) return { ok: false, why: 'You do not own any.' };
    if (opts.px == null && !this.canTrade(id)) return { ok: false, why: 'This is not trading.' };
    if (qty === 'all' || qty >= pos.q - 1e-9) qty = pos.q;
    qty = rq(qty);
    if (!(qty > 0)) return { ok: false, why: 'Enter an amount.' };
    var p = opts.px != null ? opts.px : a.pc[s.d];
    var gross = Math.round(qty * p);
    var fee = opts.noFee ? 0 : Math.round(gross * this.feeBps(a) / 10000);
    var net = gross - fee;
    var lots = opts.dry ? pos.lots.map(function (l) { return l.slice(); }) : pos.lots;
    var rem = qty, st = 0, lt = 0, costOut = 0, netLeft = net, i = 0;
    while (rem > 1e-9 && i < lots.length) {
      var l = lots[i], take = Math.min(l[0], rem);
      var whole = take >= l[0] - 1e-9;
      var c = whole ? l[1] : Math.round(l[1] * take / l[0]);
      rem = rq(rem - take);
      var part = rem <= 1e-9 ? netLeft : Math.round(net * take / qty);
      netLeft -= part;
      if (s.d - l[2] < DPY) st += part - c; else lt += part - c;
      costOut += c;
      if (whole) { lots.splice(i, 1); } else { l[0] = rq(l[0] - take); l[1] -= c; i++; }
    }
    var tax = this._settle(st, lt, !!opts.dry);
    var res = { ok: true, q: qty, gross: gross, fee: fee, tax: tax, net: net - tax, gain: net - costOut, st: st, lt: lt, px: p, cost: costOut };
    if (opts.dry) return res;
    pos.q = rq(pos.q - qty);
    if (pos.q <= 1e-9 || !pos.lots.length) delete s.pos[id];
    this._cash(net, 'invest');
    if (tax) this._cash(-tax, 'tax');
    s.tot.fees += fee; s.tot.tax += tax; s.tot.realized += net - costOut;
    this._pme(id, CAT_OF[a.kind], -(net - tax));
    var ps = s.ps[id] || (s.ps[id] = { paid: 0, got: 0, days: 0, first: s.d });
    ps.got += net;
    var pct = costOut > 0 ? (net - costOut) / costOut : 0;
    if (pct > s.st.bestPct) s.st.bestPct = pct;
    if (pct < s.st.worstPct) s.st.worstPct = pct;
    if (!opts.forced && opts.px == null) {
      s.st.trades++; s.st.sells++;
      this._act('sell', id, qty);
      if (this.tape.M.dd[s.d] < -0.15 && (a.kind === 'stock' || a.kind === 'fund' || a.kind === 'sfund')) s.st.panicSells++;
      if (s.st.sellLog.length < 400) s.st.sellLog.push([s.d, id, net, p]);
    }
    return res;
  };

  /* ---------- term deposits ---------- */
  P.cdRate = function (term) { // term in years: 1, 3 or 5. Yearly rate in %
    var M = this.tape.M, d = this.s.d;
    var r = term === 1 ? M.y2[d] - 0.3 : term === 3 ? (M.y2[d] + M.y10[d]) / 2 - 0.2 : M.y10[d] - 0.2;
    return Math.max(0.1, Math.round(r * 100) / 100);
  };
  P.cdOpen = function (term, amt) {
    var s = this.s; amt = Math.floor(amt);
    if (!(amt >= 10000)) return { ok: false, why: 'The minimum is $100.' };
    if (amt > s.cash) return { ok: false, why: 'Not enough cash.' };
    var rate = this.cdRate(term);
    var interest = Math.round(amt * (dpow(1 + rate / 100, term) - 1));
    s.cds.push({ id: s.cdSeq++, p: amt, rate: rate, term: term, d0: s.d, d1: s.d + term * DPY, int: interest });
    this._cash(-amt, 'cd'); this._pme('cd', 'cds', amt); s.st.cds++;
    this._act('cd', term, amt);
    return { ok: true, rate: rate, interest: interest };
  };
  P.cdValue = function (cd) { return cd.p + Math.round(cd.int * clamp((this.s.d - cd.d0) / (cd.d1 - cd.d0), 0, 1)); };
  P._cdClose = function (i, early) {
    var s = this.s, cd = s.cds[i];
    var interest = early ? Math.max(0, Math.round(cd.int * (s.d - cd.d0) / (cd.d1 - cd.d0)) - Math.round(cd.p * cd.rate / 100 / 2)) : cd.int;
    var tax = Math.round(interest * RULES.taxPay * s.taxMult);
    s.cds.splice(i, 1);
    this._cash(cd.p + interest, 'cd'); if (tax) this._cash(-tax, 'tax');
    s.tot.interest += interest; s.tot.tax += tax;
    this._pme('cd', 'cds', -(cd.p + interest - tax));
    return { ok: true, interest: interest, tax: tax, p: cd.p };
  };
  P.cdBreak = function (id) {
    for (var i = 0; i < this.s.cds.length; i++) if (this.s.cds[i].id === id) { this._act('cdbreak', id); return this._cdClose(i, true); }
    return { ok: false, why: 'Not found.' };
  };

  /* ---------- student loan ---------- */
  P.loanPay = function (amt) {
    var s = this.s, L = s.loan;
    if (!L || L.bal <= 0) return { ok: false, why: 'Nothing to pay.' };
    amt = Math.min(Math.floor(amt), L.bal);
    if (!(amt > 0)) return { ok: false, why: 'Enter an amount.' };
    if (amt > s.cash) return { ok: false, why: 'Not enough cash.' };
    L.bal -= amt; this._cash(-amt, 'loan'); this._act('loanpay', amt);
    return { ok: true, paid: amt };
  };

  /* ---------- real estate ---------- */
  P.listing = function (id) { var a = this.tape.listings; for (var i = 0; i < a.length; i++) if (a[i].id === id) return a[i]; return null; };
  P.listingsNow = function () {
    var s = this.s, out = [], a = this.tape.listings, owned = {};
    s.props.forEach(function (p) { owned[p.id] = 1; });
    (s.soldProps || []).forEach(function (id) { owned[id] = 1; });
    for (var i = 0; i < a.length; i++) if (a[i].d0 <= s.d && a[i].d1 > s.d && !owned[a[i].id]) out.push(a[i]);
    return out;
  };
  P.mortRate = function (L, downFrac) { return Math.round((this.tape.M.mort[this.s.d] + (downFrac < 0.2 ? 0.5 : 0) + (L.com ? 0.6 : 0)) * 100) / 100; };
  P.mortPay = function (loan, ratePct) {
    if (loan <= 0) return 0;
    var r = ratePct / 1200;
    return Math.round(loan * r / (1 - dpow(1 + r, -360)));
  };
  P.propValue = function (p) { return Math.round(T.propValue(this.tape, p, this.s.d, p.cond) * 100); };
  P.propRent = function (p) { return Math.round(T.propRent(this.tape, p, this.s.d, p.cond) * 100); };
  P.listingRent = function (L) { return Math.round(T.propRent(this.tape, L, this.s.d, L.cond) * 100); };
  P.listingEst = function (L) { return Math.round(L.est * this.tape.M.housing[this.s.d] / this.tape.M.housing[L.d0]); };
  P.debtPayments = function () { // monthly
    var s = this.s, t = s.loan && s.loan.bal > 0 ? s.loan.pay : 0;
    s.props.forEach(function (p) { if (p.loan) t += p.loan.pay; });
    return t;
  };
  P.rentRoll = function () { var self = this, t = 0; this.s.props.forEach(function (p) { t += self.propRent(p); }); return t; };
  P.dtiCheck = function (newPay, newRent) {
    var inc = Math.round(this.s.job.salary / 12) + Math.round(0.75 * (this.rentRoll() + newRent));
    var pay = this.debtPayments() + newPay;
    return { ok: pay <= RULES.dti * inc, ratio: inc > 0 ? pay / inc : 9, pay: pay, inc: inc };
  };
  // quote a purchase without doing it
  P.propQuote = function (L, price, downFrac) {
    var s = this.s;
    var down = downFrac >= 1 ? price : Math.round(price * downFrac), loan = price - down;
    var closing = Math.round(price * RULES.buyClose * s.agentMult);
    var rate = this.mortRate(L, downFrac), pay = this.mortPay(loan, rate);
    var rent = this.listingRent(L);
    var dti = loan > 0 ? this.dtiCheck(pay, rent) : { ok: true, ratio: 0 };
    var val = Math.round(T.propValue(this.tape, L, s.d, L.cond) * 100);
    var costs = Math.round(val * (RULES.propTaxIns + RULES.propMaint + 0.006) / 12) + Math.round(rent * (RULES.mgmt + 0.07));
    return { down: down, loan: loan, closing: closing, need: down + closing, rate: rate, pay: pay, rent: rent, dti: dti, costs: costs,
      pmi: downFrac < 0.2 && loan > 0 ? Math.round(loan * RULES.pmi / 12) : 0, cap: price > 0 ? (rent - costs) * 12 / price : 0 };
  };
  P.reserveNow = function (L) { return Math.max(0.8, L.reserve - 0.01 * Math.floor((this.s.d - L.d0) / DPM)); };
  P.propOffer = function (id, price, downFrac) {
    var s = this.s, L = this.listing(id);
    if (!L || L.d0 > s.d || L.d1 <= s.d) return { ok: false, why: 'That listing is gone.' };
    if (s.offers[id] && s.d - s.offers[id] < DPM) return { ok: false, why: 'The seller turned you down. They will not hear another offer until next month.' };
    price = Math.round(price);
    var q = this.propQuote(L, price, downFrac);
    if (q.need > s.cash) return { ok: false, why: 'You need ' + BW.fmtMoney(q.need) + ' in cash for the down payment and closing costs.' };
    if (!q.dti.ok) return { ok: false, why: 'The bank said no. Your monthly debt payments would be ' + Math.round(q.dti.ratio * 100) + '% of your income. The limit is ' + Math.round(RULES.dti * 100) + '%.' };
    if (price < Math.round(L.ask * this.reserveNow(L))) { s.offers[id] = s.d; this._act('offer', id, price, 0); return { ok: false, rejected: true, why: 'Offer rejected. The seller wants more.' }; }
    var val = this.propValue({ full0: L.full0, d0: L.d0, cond: L.cond });
    var p = { id: L.id, type: L.type, tname: L.tname, grade: L.grade, addr: L.addr, com: L.com, units: L.units, full0: L.full0, d0: L.d0, rent0: L.rent0, cond: L.cond,
      buyD: s.d, price: price, basis: price + q.closing, loan: q.loan > 0 ? { bal: q.loan, rate: q.rate, pay: q.pay, orig: q.loan, pmi: downFrac < 0.2 } : null,
      vacant: 1, lease: 0, reno: 0, sale: null, sellDays: L.sellDays, net: 0, renod: false };
    s.props.push(p);
    this._cash(-(q.down + q.closing), 'realestate'); this._pme('prop:' + L.id, 'realestate', q.down + q.closing);
    s.st.props++; if (price < 0.93 * val) s.st.propDeals++;
    this._act('offer', id, price, 1);
    return { ok: true, prop: p, quote: q };
  };
  P._prop = function (id) { for (var i = 0; i < this.s.props.length; i++) if (this.s.props[i].id === id) return this.s.props[i]; return null; };
  P.renoQuote = function (p) {
    var full = Math.round(T.propValue(this.tape, p, this.s.d, 1) * 100);
    return { cost: Math.round(0.32 * (1 - p.cond) * full * this.s.renoMult), months: 2 + Math.round(3 * (1 - p.cond)), newValue: full, newRent: Math.round(T.propRent(this.tape, p, this.s.d, 1) * 100) };
  };
  P.propRenovate = function (id) {
    var s = this.s, p = this._prop(id);
    if (!p || p.reno > 0 || p.sale) return { ok: false, why: 'Not possible right now.' };
    if (p.cond >= 0.97) return { ok: false, why: 'It is already in top condition.' };
    var q = this.renoQuote(p);
    if (q.cost > s.cash) return { ok: false, why: 'The work costs ' + BW.fmtMoney(q.cost) + '. You do not have that in cash.' };
    p.reno = q.months; p.basis += q.cost; p.renod = true; p.renoD = s.d;
    this._cash(-q.cost, 'realestate'); this._pme('prop:' + id, 'realestate', q.cost);
    this._act('reno', id);
    return { ok: true, cost: q.cost, months: q.months };
  };
  P.refiQuote = function (p) {
    var val = this.propValue(p), max = Math.round(val * (p.com ? 0.7 : RULES.refiLTV));
    var bal = p.loan ? p.loan.bal : 0, closing = Math.round(max * RULES.refiClose);
    var rate = Math.round((this.tape.M.mort[this.s.d] + (p.com ? 0.6 : 0)) * 100) / 100, pay = this.mortPay(max, rate);
    var oldPay = p.loan ? p.loan.pay : 0;
    var dti = this.dtiCheck(pay - oldPay, 0);
    return { loan: max, closing: closing, cashOut: max - bal - closing, rate: rate, pay: pay, oldPay: oldPay, oldRate: p.loan ? p.loan.rate : 0, dti: dti };
  };
  P.propRefi = function (id) {
    var s = this.s, p = this._prop(id);
    if (!p || p.sale) return { ok: false, why: 'Not possible right now.' };
    var q = this.refiQuote(p);
    if (!q.dti.ok) return { ok: false, why: 'The bank said no: payments would be ' + Math.round(q.dti.ratio * 100) + '% of your income.' };
    if (q.cashOut + s.cash < 0) return { ok: false, why: 'You would need to bring ' + BW.fmtMoney(-q.cashOut) + ' to closing.' };
    p.loan = { bal: q.loan, rate: q.rate, pay: q.pay, orig: q.loan, pmi: false };
    this._cash(q.cashOut, 'realestate'); this._pme('prop:' + id, 'realestate', -q.cashOut);
    this._act('refi', id);
    return { ok: true, cashOut: q.cashOut, rate: q.rate, pay: q.pay };
  };
  P.propPaydown = function (id, amt) {
    var s = this.s, p = this._prop(id);
    if (!p || !p.loan) return { ok: false, why: 'No mortgage on this.' };
    amt = Math.min(Math.floor(amt), p.loan.bal);
    if (!(amt > 0) || amt > s.cash) return { ok: false, why: 'Not enough cash.' };
    p.loan.bal -= amt; if (p.loan.bal <= 0) p.loan = null;
    this._cash(-amt, 'realestate'); this._pme('prop:' + id, 'realestate', amt);
    this._act('paydown', id, amt);
    return { ok: true, paid: amt };
  };
  P.saleQuote = function (p, quick) {
    var s = this.s, val = this.propValue(p);
    var px = quick ? Math.round(val * RULES.quickSale) : val;
    var closing = Math.round(px * (quick ? RULES.quickClose : RULES.sellClose * s.agentMult));
    var bal = p.loan ? p.loan.bal : 0, gain = px - closing - p.basis;
    var lt = s.d - p.buyD >= DPY;
    var tax = this._settle(lt ? 0 : gain, lt ? gain : 0, true);
    return { px: px, closing: closing, bal: bal, gain: gain, tax: tax, net: px - closing - bal - tax };
  };
  P._propClose = function (p, px, quick) {
    var s = this.s;
    var closing = Math.round(px * (quick ? RULES.quickClose : RULES.sellClose * s.agentMult));
    var bal = p.loan ? p.loan.bal : 0, gain = px - closing - p.basis, lt = s.d - p.buyD >= DPY;
    var tax = this._settle(lt ? 0 : gain, lt ? gain : 0, false);
    var net = px - closing - bal - tax;
    this._cash(px - closing - bal, 'realestate'); if (tax) this._cash(-tax, 'tax');
    s.tot.tax += tax; s.tot.realized += gain;
    this._pme('prop:' + p.id, 'realestate', -net);
    if (p.renod && gain > 0 && s.d - p.buyD < 2 * DPY) s.st.flips++;
    s.props.splice(s.props.indexOf(p), 1);
    (s.soldProps = s.soldProps || []).push(p.id);
    return { ok: true, px: px, closing: closing, gain: gain, tax: tax, net: net };
  };
  P.propSell = function (id, quick) {
    var s = this.s, p = this._prop(id);
    if (!p) return { ok: false, why: 'Not found.' };
    if (p.sale) return { ok: false, why: 'It is already on the market.' };
    this._act('propsell', id, quick ? 1 : 0);
    if (quick) return this._propClose(p, Math.round(this.propValue(p) * RULES.quickSale), true);
    var slow = this.tape.M.hg[s.d] < 0 ? 1.6 : 1;
    p.sale = { d: s.d + Math.round(p.sellDays * slow), f: 0.97 + 0.04 * hrand(this.tape.seed, 'sale', p.id) };
    return { ok: true, listed: true, days: p.sale.d - s.d };
  };
  P.propCancelSale = function (id) { var p = this._prop(id); if (p && p.sale) { p.sale = null; this._act('propunlist', id); return { ok: true }; } return { ok: false }; };

  P._propMonth = function (p, m) {
    var s = this.s, seed = this.tape.seed, self = this;
    if (p.sale && s.d >= p.sale.d) {
      var r = this._propClose(p, Math.round(this.propValue(p) * p.sale.f), false);
      this.ev.push({ t: 'propsold', name: p.addr, net: r.net, gain: r.gain });
      return;
    }
    var val = this.propValue(p), rent = this.propRent(p), rec = this.tape.M.regime[s.d] === BW.REG.REC;
    var rentIn = 0;
    if (p.reno > 0) {
      p.reno--;
      if (p.reno === 0) { p.cond = 1; p.vacant = 1; this.ev.push({ t: 'renodone', name: p.addr }); }
    } else if (p.units > 1) {
      var vac = (p.grade === 'A' ? 0.05 : p.grade === 'C' ? 0.13 : 0.08) + (rec ? 0.06 : 0) + (0.35 / Math.sqrt(p.units)) * 0.5 * hnorm(seed, 'occ', p.id, m);
      rentIn = Math.round(rent * clamp(1 - vac, 0.3, 1));
    } else if (p.vacant > 0) {
      p.vacant--;
      if (p.vacant === 0) { p.lease = 12; }
    } else {
      rentIn = rent; p.lease--;
      if (p.lease <= 0) {
        var pm = (p.grade === 'A' ? 0.22 : p.grade === 'C' ? 0.42 : 0.3) + (rec ? 0.12 : 0);
        if (hrand(seed, 'move', p.id, m) < pm) { p.vacant = 1 + Math.floor(hrand(seed, 'vac', p.id, m) * (p.grade === 'C' ? 3 : 2)) + (rec ? 1 : 0); this.ev.push({ t: 'vacant', name: p.addr, months: p.vacant }); }
        else p.lease = 12;
      }
    }
    var taxIns = Math.round(val * RULES.propTaxIns / 12), maint = Math.round(val * RULES.propMaint / 12), mgmt = Math.round(rentIn * RULES.mgmt), repair = 0;
    if (p.reno === 0 && hrand(seed, 'rep', p.id, m) < 0.03 * (1.5 - p.cond) * (p.grade === 'C' ? 1.3 : 1)) {
      repair = Math.round(val * (0.008 + 0.02 * hrand(seed, 'repc', p.id, m)));
      this.ev.push({ t: 'repair', name: p.addr, amt: repair });
    }
    var interest = 0, principal = 0, pmi = 0;
    if (p.loan) {
      interest = Math.round(p.loan.bal * p.loan.rate / 1200);
      var pay = Math.min(p.loan.pay, p.loan.bal + interest);
      principal = pay - interest;
      if (p.loan.pmi) { if (p.loan.bal > 0.78 * p.price) pmi = Math.round(p.loan.orig * RULES.pmi / 12); else p.loan.pmi = false; }
      p.loan.bal -= principal;
      if (p.loan.bal <= 0) { p.loan = null; this.ev.push({ t: 'mortdone', name: p.addr }); }
    }
    var opex = taxIns + maint + mgmt + repair + pmi;
    var taxable = rentIn - opex - interest;
    var tax = taxable > 0 ? Math.round(taxable * RULES.taxPay * s.taxMult) : 0;
    var net = rentIn - opex - interest - principal - tax;
    this._cash(rentIn - opex - interest - principal, 'realestate'); if (tax) this._cash(-tax, 'tax');
    s.tot.rent += rentIn; s.tot.propCosts += opex; s.tot.mortInt += interest; s.tot.tax += tax;
    this._pme('prop:' + p.id, 'realestate', -net);
    p.net += net; p.lastNet = net; p.lastRent = rentIn;
    p.cond = Math.max(0.4, p.cond - 0.01 / 12);
  };

  /* ---------- businesses ---------- */
  P.bizCost = function (b) { return Math.round(b.cost * 100 * this.cpiRel()); };
  P.bizUpCost = function (b, lvl) { return Math.round(b.cost * 100 * 0.6 * dpow(1.5, lvl - 1) * this.cpiRel()); };
  P.bizBase = function (b, lvl) { return Math.round(b.cost * 100 * b.roc * (1 + 0.55 * (lvl - 1)) * this.cpiRel()); }; // yearly profit if you run it yourself in a normal year
  P._biz = function (type) { for (var i = 0; i < this.s.biz.length; i++) if (this.s.biz[i].type === type) return this.s.biz[i]; return null; };
  P.selfCount = function () { return this.s.biz.filter(function (x) { return x.self; }).length; };
  P.bizBuy = function (type) {
    var s = this.s, b = BW.BIZ_BY[type];
    if (!b) return { ok: false, why: 'Unknown business.' };
    if (this._biz(type)) return { ok: false, why: 'You already own one. Upgrade it instead.' };
    var cost = this.bizCost(b);
    if (cost > s.cash) return { ok: false, why: 'It costs ' + BW.fmtMoney(cost) + '.' };
    var x = { type: type, lvl: 1, self: this.selfCount() < s.selfSlots, buyD: s.d, invested: cost, ttm: [], net: 0 };
    s.biz.push(x);
    this._cash(-cost, 'business'); this._pme('biz:' + type, 'business', cost);
    if (s.biz.length > s.st.bizMax) s.st.bizMax = s.biz.length;
    this._act('bizbuy', type);
    return { ok: true, biz: x, cost: cost };
  };
  P.bizUpgrade = function (type) {
    var s = this.s, x = this._biz(type), b = BW.BIZ_BY[type];
    if (!x) return { ok: false, why: 'You do not own it.' };
    if (x.lvl >= 10) return { ok: false, why: 'It is as big as it gets.' };
    var cost = this.bizUpCost(b, x.lvl);
    if (cost > s.cash) return { ok: false, why: 'The upgrade costs ' + BW.fmtMoney(cost) + '.' };
    x.lvl++; x.invested += cost;
    this._cash(-cost, 'business'); this._pme('biz:' + type, 'business', cost);
    this._act('bizup', type);
    return { ok: true, cost: cost, lvl: x.lvl };
  };
  P.bizSetSelf = function (type, self) {
    var s = this.s, x = this._biz(type);
    if (!x) return { ok: false };
    if (self && !x.self && this.selfCount() >= s.selfSlots) return { ok: false, why: 'You can only run ' + s.selfSlots + ' business' + (s.selfSlots > 1 ? 'es' : '') + ' yourself. Put a manager in another one first.' };
    x.self = !!self; this._act('bizself', type, self ? 1 : 0);
    return { ok: true };
  };
  P.bizValue = function (x) {
    var b = BW.BIZ_BY[x.type], n = x.ttm.length, sum = 0;
    for (var i = 0; i < n; i++) sum += x.ttm[i];
    var yearly = n ? sum * 12 / n : Math.round(this.bizBase(b, x.lvl) * 0.7);
    return Math.max(Math.round(x.invested * 0.3), Math.round(x.invested * 0.5) + Math.round(3 * yearly));
  };
  P.bizSellQuote = function (x) {
    var v = this.bizValue(x), gain = v - x.invested, lt = this.s.d - x.buyD >= DPY;
    var tax = this._settle(lt ? 0 : gain, lt ? gain : 0, true);
    return { px: v, gain: gain, tax: tax, net: v - tax };
  };
  P.bizSell = function (type, forced) {
    var s = this.s, x = this._biz(type);
    if (!x) return { ok: false, why: 'You do not own it.' };
    var v = this.bizValue(x); if (forced) v = Math.round(v * 0.8);
    var gain = v - x.invested, lt = s.d - x.buyD >= DPY;
    var tax = this._settle(lt ? 0 : gain, lt ? gain : 0, false);
    this._cash(v, 'business'); if (tax) this._cash(-tax, 'tax');
    s.tot.tax += tax; s.tot.realized += gain;
    this._pme('biz:' + type, 'business', -(v - tax));
    s.biz.splice(s.biz.indexOf(x), 1);
    if (!forced) this._act('bizsell', type);
    return { ok: true, px: v, gain: gain, tax: tax, net: v - tax };
  };
  P._bizMonth = function (x, m) {
    var s = this.s, b = BW.BIZ_BY[x.type], seed = this.tape.seed;
    var base = this.bizBase(b, x.lvl) / 12;
    var cycle = clamp(1 + b.cyc * 0.09 * this.tape.M.gap[s.d], 0.15, 1.7);
    var luck = dexp(b.vol * hnorm(seed, 'biz', x.type, m) - b.vol * b.vol / 2);
    var mgr = Math.round(base * 0.3);
    var gross = Math.round(base * cycle * luck);
    if (hrand(seed, 'bizd', x.type, m) < 0.006) { gross = -Math.round(base * 3); this.ev.push({ t: 'bizbad', name: b.name, amt: -gross }); }
    var profit = gross - (x.self ? 0 : mgr);
    var tax = profit > 0 ? Math.round(profit * RULES.taxPay * s.taxMult) : 0;
    this._cash(profit, 'business'); if (tax) this._cash(-tax, 'tax');
    s.tot.bizProfit += profit; s.tot.tax += tax;
    this._pme('biz:' + x.type, 'business', -(profit - tax));
    x.ttm.push(gross - mgr); if (x.ttm.length > 12) x.ttm.shift();
    x.last = profit; x.net += profit - tax;
  };

  /* ---------- orders and autopilot ---------- */
  // o: { id (asset), side: 'buy' | 'sell', kind: 'limit' | 'stop', px (cents), amt (cents, buys) or frac (0..1 of holding, sells) }
  P.orderAdd = function (o) {
    var s = this.s;
    if (!this.canTrade(o.id)) return { ok: false, why: 'This is not trading.' };
    if (!(o.px > 0)) return { ok: false, why: 'Set a trigger price.' };
    if (s.orders.length >= 30) return { ok: false, why: 'You already have 30 standing orders.' };
    var x = { n: s.ordSeq++, id: o.id, side: o.side, kind: o.kind, px: Math.round(o.px), amt: o.amt ? Math.floor(o.amt) : 0, frac: o.frac || 0, d: s.d };
    s.orders.push(x); this._act('order', o.id, o.side, o.kind, x.px, x.amt || x.frac);
    return { ok: true, order: x };
  };
  P.orderCancel = function (n) {
    var s = this.s;
    for (var i = 0; i < s.orders.length; i++) if (s.orders[i].n === n) { s.orders.splice(i, 1); this._act('ordercancel', n); return { ok: true }; }
    return { ok: false };
  };
  P._orders = function () {
    var s = this.s;
    for (var i = s.orders.length - 1; i >= 0; i--) {
      var o = s.orders[i], a = this.tape.assets[o.id];
      if (!T.alive(a, s.d)) { s.orders.splice(i, 1); continue; }
      var p = a.pc[s.d], hit = false;
      if (o.side === 'buy') hit = o.kind === 'limit' ? p <= o.px : p >= o.px;
      else hit = o.kind === 'limit' ? p >= o.px : p <= o.px;
      if (!hit) continue;
      var r;
      if (o.side === 'buy') r = this.buy(o.id, Math.min(o.amt, Math.max(0, s.cash)), { auto: true });
      else r = this.sell(o.id, o.frac >= 0.999 ? 'all' : rq(this.qty(o.id) * o.frac), { forced: true });
      s.orders.splice(i, 1);
      if (r.ok) { s.st.fills++; this.ev.push({ t: 'fill', id: o.id, side: o.side, kind: o.kind, px: p, q: r.q, net: r.net, total: r.total }); }
    }
  };
  P.setAuto = function (auto) { this.s.auto = auto; this._act('auto', JSON.stringify(auto)); };
  P.autoInvest = function () {
    var s = this.s, a = s.auto;
    if (!a.on || !a.alloc.length) return;
    var free = s.cash - a.keep;
    if (free < 1000) return;
    for (var i = 0; i < a.alloc.length; i++) {
      var al = a.alloc[i];
      if (this.canTrade(al.id)) this.buy(al.id, Math.floor(free * al.pct / 100), { auto: true });
    }
  };

  /* ---------- casino (the UI plays the hands; the money and the odds are recorded here) ---------- */
  P.casinoSettle = function (bet, payout, edge) { // payout includes the returned stake
    var s = this.s;
    if (bet > s.cash) return { ok: false, why: 'Not enough cash.' };
    this._cash(payout - bet, 'casino');
    s.tot.casinoBet += bet; s.tot.casinoWon += payout; s.tot.casinoEV += bet * (edge || 0);
    this._pme('casino', 'casino', bet - payout);
    return { ok: true };
  };

  /* ---------- worth ---------- */
  P.holdingsValue = function () { var t = 0; for (var id in this.s.pos) t += this.posValue(id); return t; };
  P.cdTotal = function () { var t = 0, self = this; this.s.cds.forEach(function (c) { t += self.cdValue(c); }); return t; };
  P.propEquity = function () { var t = 0, self = this; this.s.props.forEach(function (p) { t += self.propValue(p) - (p.loan ? p.loan.bal : 0); }); return t; };
  P.bizTotal = function () { var t = 0, self = this; this.s.biz.forEach(function (x) { t += self.bizValue(x); }); return t; };
  P.nw = function () {
    var s = this.s;
    return s.cash + this.holdingsValue() + this.cdTotal() + this.propEquity() + this.bizTotal() - (s.loan ? s.loan.bal : 0);
  };
  // what you would walk away with if you sold everything today and paid the tax and costs
  P.liq = function () {
    var s = this.s, self = this, t = s.cash - (s.loan ? s.loan.bal : 0), st = 0, lt = 0, id, i;
    for (id in s.pos) {
      var pos = s.pos[id], a = this.tape.assets[id], p = a.pc[s.d];
      var gross = Math.round(pos.q * p), fee = Math.round(gross * this.feeBps(a) / 10000), net = gross - fee;
      t += net;
      for (i = 0; i < pos.lots.length; i++) { var l = pos.lots[i], part = Math.round(net * l[0] / pos.q); if (s.d - l[2] < DPY) st += part - l[1]; else lt += part - l[1]; }
    }
    s.cds.forEach(function (c) { var v = self.cdValue(c); t += v - Math.round((v - c.p) * RULES.taxPay * s.taxMult); });
    s.props.forEach(function (p) { var v = self.propValue(p), cl = Math.round(v * RULES.sellClose * s.agentMult), g = v - cl - p.basis; t += v - cl - (p.loan ? p.loan.bal : 0); if (s.d - p.buyD < DPY) st += g; else lt += g; });
    s.biz.forEach(function (x) { var v = self.bizValue(x), g = v - x.invested; t += v; if (s.d - x.buyD < DPY) st += g; else lt += g; });
    return t - this._settle(st, lt, true);
  };
  P.breakdown = function () {
    var s = this.s, b = { cash: Math.max(0, s.cash), card: Math.min(0, s.cash), stocks: 0, herd: 0, sector: 0, bonds: 0, cmdty: 0, crypto: 0, cds: this.cdTotal(), realestate: this.propEquity(), business: this.bizTotal(), loan: s.loan ? -s.loan.bal : 0 };
    for (var id in s.pos) b[CAT_OF[this.tape.assets[id].kind]] += this.posValue(id);
    return b;
  };

  /* ---------- the day ---------- */
  P.stepDay = function () {
    var s = this.s, tape = this.tape, M = tape.M, self = this, id, i;
    this.ev = [];
    if (s.done) return this.ev;
    s.d++;
    var d = s.d, rel = d - s.day0;

    // companies that stopped trading today, and dividends
    for (id in s.pos) {
      var a = tape.assets[id], pos = s.pos[id];
      if (a.end === d) {
        var r = this.sell(id, 'all', { px: a.endPx, noFee: true, forced: true });
        if (a.endWhy === 'bankrupt') s.st.bustHeld++; else s.st.dealHeld++;
        this.ev.push({ t: 'delist', id: id, why: a.endWhy, net: r.net, gain: r.gain });
        continue;
      }
      var ps = s.ps[id]; if (ps) ps.days++;
      var dv = a.divs;
      while (pos.dp < dv.length && dv[pos.dp].d < d) pos.dp++;
      if (pos.dp < dv.length && dv[pos.dp].d === d) {
        var gross = Math.round(pos.q * dv[pos.dp].amt * 100);
        if (gross > 0) {
          var tax = Math.round(gross * RULES.taxLong * s.taxMult), net = gross - tax;
          this._cash(gross, 'dividends'); this._cash(-tax, 'tax');
          s.tot.divs += gross; s.tot.tax += tax;
          this._pme(id, CAT_OF[a.kind], -net);
          if (ps) ps.got += gross;
          var re = false;
          if (s.drip && net > 0 && s.cash >= net && T.alive(a, d)) re = this.buy(id, net, { noFee: true, auto: true }).ok;
          this.ev.push({ t: 'div', id: id, amt: net, re: re });
        }
      }
    }
    if (s.orders.length) this._orders();

    // interest builds up daily and is paid monthly
    s.accr += s.cash >= 0 ? s.cash * M.save[d] / 100 / DPY : s.cash * RULES.cardAPR / DPY;

    // term deposits maturing
    for (i = s.cds.length - 1; i >= 0; i--) if (s.cds[i].d1 <= d) { var c = this._cdClose(i, false); this.ev.push({ t: 'cd', amt: c.p + c.interest - c.tax }); }

    // surprises
    var sh = tape.life.shocks, sp = s.shp || 0;
    while (sp < sh.length && sh[sp].d < d) sp++;
    while (sp < sh.length && sh[sp].d === d) {
      this._cash(sh[sp].amt, 'life');
      if (sh[sp].amt < 0) s.tot.lifeOut -= sh[sp].amt; else s.tot.lifeIn += sh[sp].amt;
      this.ev.push({ t: 'life', text: sh[sp].text, amt: sh[sp].amt });
      sp++;
    }
    s.shp = sp;
    if (s.job.salary > 0) {
      tape.life.jobLoss.forEach(function (j) { if (j.d === d) { s.job.outUntil = d + j.len * DPM; self.ev.push({ t: 'jobloss', months: j.len }); } });
      if (s.job.outUntil && d === s.job.outUntil) { s.job.outUntil = 0; this.ev.push({ t: 'jobback' }); }
      tape.life.raises.forEach(function (rz) { if (rz.d === d) { var old = s.job.salary; s.job.salary = Math.round(old * (1 + rz.pct / 100)); self.ev.push({ t: 'raise', pct: rz.pct, promo: rz.promo, salary: s.job.salary }); } });
    }

    if (rel > 0 && rel % DPM === 0) this._month(rel / DPM);

    // weekly record
    if (rel % 5 === 0) {
      var nw = this.nw();
      s.hist.nw.push(nw); s.hist.liq.push(this.liq());
      s.hist.cashW.push(nw > 0 ? clamp(Math.max(0, s.cash) / nw, 0, 1) : 1);
      if (nw > s.st.peakNW) s.st.peakNW = nw;
      if (s.st.peakNW > 0) { var ddn = nw / s.st.peakNW - 1; if (ddn < s.st.maxDD) s.st.maxDD = ddn; }
      var top = 0; for (id in s.pos) if (tape.assets[id].kind === 'stock') top = Math.max(top, this.posValue(id));
      var gross = this.holdingsValue() + Math.max(0, s.cash) + this.cdTotal() + this.propEquity() + this.bizTotal();
      if (gross > 500000 && top / gross > s.st.maxW) s.st.maxW = top / gross;
      if (M.dd[d] < -0.3 && this.holdingsValue() > 0.5 * nw && s.st.panicSells === 0) s.st.heldCrash = 1;
    }
    if (d >= s.endD) { s.done = true; this.ev.push({ t: 'done' }); }
    return this.ev;
  };

  P._month = function (m) {
    var s = this.s, M = this.tape.M, d = s.d, i;
    // interest
    var amt = Math.round(s.accr); s.accr -= amt;
    if (amt > 0) { var tx = Math.round(amt * RULES.taxPay * s.taxMult); this._cash(amt, 'interest'); this._cash(-tx, 'tax'); s.tot.interest += amt; s.tot.tax += tx; }
    else if (amt < 0) { this._cash(amt, 'cardint'); s.tot.cardInt -= amt; s.st.cardMonths++; }
    // pay and living costs
    var living = this.livingNow();
    var gross = Math.round(s.job.salary / 12), net;
    if (s.job.salary > 0) {
      if (s.job.outUntil) { net = Math.round(gross * 0.4); }
      else net = gross - Math.round(gross * RULES.taxPay);
      this._cash(net, 'pay'); s.tot.salary += net;
    }
    this._cash(-living, 'living'); s.tot.living += living;
    // student loan
    var L = s.loan;
    if (L && L.bal > 0) {
      var int = Math.round(L.bal * L.rate / 1200), pay = Math.min(L.pay, L.bal + int);
      L.bal = L.bal + int - pay; this._cash(-pay, 'loan'); s.tot.loanInt += int;
      if (L.bal <= 0) { L.bal = 0; this.ev.push({ t: 'loandone' }); }
    }
    for (i = s.props.length - 1; i >= 0; i--) this._propMonth(s.props[i], m);
    for (i = 0; i < s.biz.length; i++) this._bizMonth(s.biz[i], m);
    this.ev.push({ t: 'pay', net: s.job.salary > 0 ? net : 0, living: living, out: !!s.job.outUntil });
    this.autoInvest();
    this._creditCheck();
  };

  // If the card is maxed out, things get sold for you, easiest first.
  P._creditCheck = function () {
    var s = this.s, self = this, limit = this.cardLimit();
    if (s.cash >= -limit) return;
    s.st.forced++;
    var sold = [];
    var ids = Object.keys(s.pos).filter(function (id) { return T.alive(self.tape.assets[id], s.d); }).sort(function (a, b) { return self.posValue(b) - self.posValue(a); });
    for (var i = 0; i < ids.length && s.cash < 0; i++) {
      var id = ids[i], v = this.posValue(id), need = -s.cash;
      var frac = v > need * 1.3 ? need * 1.3 / v : 1;
      var r = this.sell(id, frac >= 1 ? 'all' : rq(this.qty(id) * frac), { forced: true });
      if (r.ok) sold.push(this.tape.assets[id].tkr);
    }
    while (s.cash < 0 && s.cds.length) { this._cdClose(0, true); sold.push('a term deposit'); }
    while (s.cash < 0 && s.biz.length) { var x = s.biz[s.biz.length - 1]; sold.push(BW.BIZ_BY[x.type].name); this.bizSell(x.type, true); }
    while (s.cash < 0 && s.props.length) { var p = s.props[0]; sold.push(p.addr); this._propClose(p, Math.round(this.propValue(p) * RULES.quickSale), true); }
    if (s.cash < -limit) {
      var w = -s.cash; this._cash(w, 'writeoff'); s.bankrupt = true;
      this.ev.push({ t: 'bankrupt', amt: w });
    } else this.ev.push({ t: 'forced', sold: sold });
  };

  P.endEarly = function () { this.s.endD = this.s.d; this.s.done = true; this.s.early = true; };

  BW.Run = Run;

  /* ---------- Dolly ---------- */
  BW.makeDolly = function (tape, cfg) {
    var c = { life: cfg.life, perks: {} };
    if (cfg.perks && cfg.perks.seed) c.perks.seed = cfg.perks.seed; // she gets the same head start, none of the other perks
    if (cfg.perks && cfg.perks.salaryMult) c.perks.salaryMult = cfg.perks.salaryMult;
    var r = new Run(tape, c);
    r.s.auto = { on: true, keep: 100000, alloc: [{ id: tape.fundId, pct: 100 }] };
    r.s.drip = true;
    r.autoInvest();
    return r;
  };
  // Dolly never decides anything, so her whole history can be rebuilt from the tape.
  BW.dollySeries = function (tape, cfg, uptoDay) {
    var r = BW.makeDolly(tape, cfg);
    while (!r.s.done && r.s.d < uptoDay) r.stepDay();
    return r;
  };

  /* ---------- money formatting shared by engine messages and UI ---------- */
  BW.fmtMoney = function (c, opts) {
    opts = opts || {};
    var neg = c < 0, a = Math.abs(c) / 100, out;
    if (opts.short && a >= 1e12) out = (a / 1e12).toFixed(2) + 'T';
    else if (opts.short && a >= 1e9) out = (a / 1e9).toFixed(2) + 'B';
    else if (opts.short && a >= 1e6) out = (a / 1e6).toFixed(2) + 'M';
    else if (opts.short && a >= 1e4) out = (a / 1e3).toFixed(1) + 'k';
    else {
      var dp = opts.whole || (opts.auto && a >= 1000) ? 0 : 2;
      var str = a.toFixed(dp), parts = str.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      out = parts.join('.');
    }
    return (neg ? '-' : opts.plus ? '+' : '') + (opts.cur || '$') + out;
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
