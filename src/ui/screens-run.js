/* In-run screens: Home, Market, the detail page for anything you can buy, the trade ticket, News. */
(function (root) {
  'use strict';
  var BW = root.BW, U = BW.UI, h = U.h, f = U.f, T = BW.T, App = BW.App, G = BW.G, C = BW.Charts, S = BW.Screens;
  var ui = App.ui;
  var KIND_NAME = { stock: 'Stock', fund: 'Index fund', sfund: 'Sector fund', bond: 'Bond fund', cmdty: 'Commodity', crypto: 'Coin' };
  var CAT_COL = { cash: '--ink3', stocks: '--info', herd: '--brass', sector: '--warn', bonds: '--up', cmdty: '--down', crypto: '--ink2', cds: '--ink', realestate: '--brass2', business: '--cUp' };
  var CAT_NAME = { cash: 'Cash', stocks: 'Stocks', herd: 'Index fund', sector: 'Sector funds', bonds: 'Bonds', cmdty: 'Commodities', crypto: 'Coin', cds: 'Term deposits', realestate: 'Property', business: 'Businesses' };
  var prefs = App.prefs = { range: 240, mode: null, mcat: 'stock', msort: 'size', mfilter: 'all', nfilter: 'you', hrange: 0, ma: false, vol: false, cmp: false };

  function secName(id) { var s = G.tape.sectors.filter(function (x) { return x.id === id; })[0]; return s ? s.name : ''; }
  function chg(a, d, back) { var p0 = d - back >= a.start ? a.pc[d - back] : a.pc[a.start]; return p0 ? a.pc[d] / p0 - 1 : 0; }
  function sub(a) { return a.kind === 'stock' ? a.tkr + '  ' + secName(a.sector) : a.tkr + '  ' + KIND_NAME[a.kind]; }
  function visible(a) { return a.kind !== 'crypto' ? (a.kind !== 'sfund' || App.tool('sectorfunds')) : App.tool('coin'); }

  /* ======================= HOME ======================= */
  S.home = function (el) {
    var r = G.run, s = r.s, d = G.dolly;
    el.appendChild(h('h3', { text: 'You and Dolly' }));
    var cbox = h('div');
    var chart = C.lines(cbox, { height: 180, n: function () { return s.hist.nw.length; },
      from: function () { return prefs.hrange ? s.hist.nw.length - prefs.hrange : 0; },
      x: function (i, long) { return long ? f.dateLong((i + 1) * 5) : f.date((i + 1) * 5); },
      series: [{ get: function (i) { return d.s.hist.nw[i] / 100; }, color: '--ink3', dash: [5, 4], name: 'Dolly', width: 1.6 }, { get: function (i) { return s.hist.nw[i] / 100; }, color: '--brass', name: 'You', fill: true, width: 2.4 }],
      fmt: C.fmtUsd, fmtTip: function (v) { return f.m0(Math.round(v * 100)); }, zero: false, emptyText: 'Press play. Your line and Dolly\'s start here.' });
    el.appendChild(cbox);
    var lastN = -1; U.on(function () { var n = s.hist.nw.length; if (n !== lastN || App.resized !== chart._rz) { lastN = n; chart._rz = App.resized; chart.draw(); } });
    el.appendChild(U.chips([[0, 'Whole run'], [240, '5 years'], [48, '1 year']], function () { return prefs.hrange; }, function (v) { prefs.hrange = v; chart.draw(); }, true));

    // allocation
    el.appendChild(h('h3', { text: 'Where your money is' }));
    var bar = h('div', { cls: 'alloc' }), leg = h('div', { cls: 'legend', style: 'margin-top:10px' });
    el.appendChild(h('div', { cls: 'card' }, bar, leg));
    var lastSig = '';
    U.on(function () {
      var b = r.breakdown(), tot = 0, k, parts = [];
      for (k in CAT_NAME) if (b[k] > 0) { tot += b[k]; parts.push([k, b[k]]); }
      var sig = parts.map(function (p) { return p[0] + Math.round(1000 * p[1] / (tot || 1)); }).join(',');
      if (sig === lastSig) return; lastSig = sig;
      U.clear(bar); U.clear(leg);
      parts.sort(function (a, b2) { return b2[1] - a[1]; });
      parts.forEach(function (p) { bar.appendChild(h('i', { style: 'width:' + (100 * p[1] / tot).toFixed(2) + '%;background:var(' + CAT_COL[p[0]] + ')' })); leg.appendChild(h('span', { style: '--c:var(' + CAT_COL[p[0]] + ')', text: CAT_NAME[p[0]] + ' ' + Math.round(100 * p[1] / tot) + '%' })); });
      if (!parts.length) leg.appendChild(h('span', { text: 'Nothing yet.' }));
    });

    // holdings
    el.appendChild(h('h3', { text: 'What you own' }));
    var listEl = h('div');
    el.appendChild(listEl);
    var reg = U.region(listEl, function (host) {
      var ids = Object.keys(s.pos).sort(function (a, b) { return r.posValue(b) - r.posValue(a); });
      var list = h('div', { cls: 'list' });
      ids.forEach(function (id) { list.appendChild(holdingRow(id)); });
      if (s.cds.length) list.appendChild(h('button', { cls: 'item', tap: function () { App.go('life', 'money'); } }, h('span', { cls: 'logo', style: 'background:var(--bg3);color:var(--ink)', text: 'TD' }), h('span', { cls: 'grow' }, h('div', { cls: 't1', text: 'Term deposits' }), h('div', { cls: 't2', text: s.cds.length + ' locked away' })), h('span', { cls: 'right' }, h('div', { cls: 'v1', live: function () { return f.ma(r.cdTotal()); } }))));
      if (s.props.length) list.appendChild(h('button', { cls: 'item', tap: function () { App.go('life', 'prop'); } }, h('span', { cls: 'logo', style: 'background:var(--brass2)', html: U.icon('house') }), h('span', { cls: 'grow' }, h('div', { cls: 't1', text: s.props.length + (s.props.length > 1 ? ' properties' : ' property') }), h('div', { cls: 't2', text: 'Your share after mortgages' })), h('span', { cls: 'right' }, h('div', { cls: 'v1', live: function () { return f.ma(r.propEquity()); } }))));
      if (s.biz.length) list.appendChild(h('button', { cls: 'item', tap: function () { App.go('life', 'biz'); } }, h('span', { cls: 'logo', style: 'background:var(--cUp);color:#04150E', html: U.icon('shop') }), h('span', { cls: 'grow' }, h('div', { cls: 't1', text: s.biz.length + (s.biz.length > 1 ? ' businesses' : ' business') }), h('div', { cls: 't2', text: 'What a buyer would pay' })), h('span', { cls: 'right' }, h('div', { cls: 'v1', live: function () { return f.ma(r.bizTotal()); } }))));
      if (s.loan && s.loan.bal > 0) list.appendChild(h('button', { cls: 'item', tap: function () { App.go('life', 'money'); } }, h('span', { cls: 'logo', style: 'background:var(--downBg);color:var(--down)', text: 'SL' }), h('span', { cls: 'grow' }, h('div', { cls: 't1', text: 'Student loan' }), h('div', { cls: 't2', text: s.loan.rate + '% interest' })), h('span', { cls: 'right' }, h('div', { cls: 'v1 down', live: function () { return f.ma(-s.loan.bal); } }))));
      if (s.cash < 0) list.appendChild(h('button', { cls: 'item', tap: function () { U.explain('card'); } }, h('span', { cls: 'logo', style: 'background:var(--down);color:#1E0603', text: '!' }), h('span', { cls: 'grow' }, h('div', { cls: 't1', text: 'Credit card debt' }), h('div', { cls: 't2', text: '24% interest. Clear this first.' })), h('span', { cls: 'right' }, h('div', { cls: 'v1 down', live: function () { return f.ma(s.cash); } }))));
      if (list.children.length) host.appendChild(list);
      if (!ids.length && !s.props.length && !s.biz.length && !s.cds.length) {
        host.appendChild(h('div', { cls: 'card stack', style: 'margin-top:10px' }, h('p', { cls: 'lead', text: 'All your money is in cash, earning savings interest. Dolly has already bought the index fund.' }),
          h('div', { cls: 'btns' }, h('button', { cls: 'btn pri', text: 'Open the market', tap: function () { App.go('market'); } }), h('button', { cls: 'btn ghost', text: 'Auto-invest', tap: function () { S.autopilot(); } }))));
      }
    });
    var lastKey = null;
    U.on(function () { var key = Object.keys(s.pos).join() + '|' + s.cds.length + '|' + s.props.length + '|' + s.biz.length + '|' + (s.loan && s.loan.bal > 0) + '|' + (s.cash < 0); if (lastKey === null) lastKey = key; else if (key !== lastKey) { lastKey = key; reg.render(); } });

    // coming up
    el.appendChild(h('h3', { text: 'Coming up' }));
    var up = h('div', { cls: 'card' });
    up.appendChild(U.kvLive('Next paycheck', function () { var left = 20 - (r.rel() % 20); return 'in ' + left + ' day' + (left > 1 ? 's' : ''); }));
    up.appendChild(U.kvLive('Spare after bills each month', function () { var b = S.budget(); return f.mp(b.free); }));
    up.appendChild(U.kvLive(U.term('Interest on your cash', 'rate'), function () { return s.cash >= 0 ? G.tape.M.save[s.d].toFixed(2) + '% a year' : 'Card: 24% a year'; }));
    up.appendChild(h('button', { cls: 'kv', style: 'width:100%', tap: function () { S.autopilot(); } }, U.term('Auto-invest', 'auto'), h('span', { cls: 'brass', live: function () { return s.auto.on && s.auto.alloc.length ? 'On' : 'Off. Set up'; } })));
    if (App.tool('orders')) up.appendChild(h('button', { cls: 'kv', style: 'width:100%', tap: function () { S.orders(); } }, h('span', { text: 'Standing orders' }), h('span', { cls: 'brass', live: function () { return s.orders.length ? s.orders.length + ' waiting' : 'None'; } })));
    el.appendChild(up);
    if (s.fair) el.appendChild(h('p', { cls: 'mute', style: 'font-size:12.5px;margin-top:14px', text: (G.cfg.mode === 'daily' ? 'Daily Tape ' + G.cfg.date : 'Challenge ' + G.cfg.code) + '. Same market for everyone, full toolkit, no perks.' }));
  };

  function holdingRow(id) {
    var r = G.run, a = G.tape.assets[id];
    var gain = h('div', { cls: 'v2' });
    U.on(function () { var v = r.posValue(id), c = r.posCost(id), g = v - c; gain.textContent = f.mp(g) + '  ' + f.pp(c ? g / c : 0); gain.className = 'v2 ' + f.sign(g); });
    return h('button', { cls: 'item', tap: function () { S.asset(id); } }, U.logo(a),
      h('span', { cls: 'grow' }, h('div', { cls: 't1', text: a.name }), h('div', { cls: 't2', live: function () { return f.qty(r.qty(id)) + (a.kind === 'cmdty' ? ' ' + a.unit + 's' : ' shares') + ' at ' + f.px(r.px(id)); } })),
      h('span', { cls: 'right' }, h('div', { cls: 'v1', live: function () { return f.ma(r.posValue(id)); } }), gain));
  }

  // monthly budget, shared by Home and Life
  S.budget = function () {
    var r = G.run, s = r.s, gross = Math.round(s.job.salary / 12), out = !!s.job.outUntil;
    var pay = s.job.salary > 0 ? (out ? Math.round(gross * 0.4) : gross - Math.round(gross * BW.RULES.taxPay)) : 0;
    var living = r.livingNow(), loan = s.loan && s.loan.bal > 0 ? Math.min(s.loan.pay, s.loan.bal) : 0, prop = 0, biz = 0;
    s.props.forEach(function (p) { prop += p.lastNet || 0; }); s.biz.forEach(function (x) { biz += x.last || 0; });
    return { gross: gross, tax: out ? 0 : Math.round(gross * BW.RULES.taxPay), pay: pay, living: living, loan: loan, prop: prop, biz: biz, free: pay - living - loan + prop + biz, out: out };
  };

  /* ======================= MARKET ======================= */
  S.market = function (el) {
    var r = G.run, s = r.s, tape = G.tape;
    var cats = [['stock', 'Stocks'], ['fund', 'Funds'], ['bond', 'Bonds'], ['cmdty', 'Other']];
    var listEl = h('div', { style: 'margin-top:12px' }), sortEl = h('div', { style: 'margin-top:10px' });
    el.appendChild(U.seg(cats, function () { return prefs.mcat; }, function (v) { prefs.mcat = v; paintSort(); reg.render(); }));
    el.appendChild(sortEl); el.appendChild(listEl);
    function paintSort() {
      U.clear(sortEl);
      if (prefs.mcat !== 'stock') return;
      var sorts = [['size', 'Biggest'], ['day', 'Today'], ['year', 'This year'], ['name', 'A to Z']];
      if (App.tool('screener')) sorts = sorts.concat([['pe', 'Cheapest P/E'], ['yield', 'Top dividend'], ['growth', 'Fastest growth'], ['debt', 'Least debt']]);
      sortEl.appendChild(U.chips(sorts, function () { return prefs.msort; }, function (v) { prefs.msort = v; reg.render(); }, true));
      var fl = [['all', 'All'], ['own', 'Owned'], ['watch', 'Watching']].concat(tape.sectors.map(function (x) { return [x.id, x.name]; }));
      var c2 = U.chips(fl, function () { return prefs.mfilter; }, function (v) { prefs.mfilter = v; reg.render(); }, true); c2.style.marginTop = '6px';
      sortEl.appendChild(c2);
      if (!App.tool('screener')) sortEl.appendChild(h('p', { cls: 'mute', style: 'font-size:12px;margin-top:8px', text: 'Sorting by P/E, dividend, growth and debt unlocks with the Screener.' }));
    }
    paintSort();
    var reg = U.region(listEl, function (host) {
      var d = s.d, items = tape.order.map(function (id) { return tape.assets[id]; }).filter(function (a) {
        if (!T.alive(a, d) || !visible(a)) return false;
        if (prefs.mcat === 'stock') return a.kind === 'stock'; if (prefs.mcat === 'fund') return a.kind === 'fund' || a.kind === 'sfund';
        if (prefs.mcat === 'bond') return a.kind === 'bond'; return a.kind === 'cmdty' || a.kind === 'crypto';
      });
      var back = 20, st = {};
      if (prefs.mcat === 'stock') {
        var fl = prefs.mfilter;
        items = items.filter(function (a) { return fl === 'all' ? true : fl === 'own' ? !!s.pos[a.id] : fl === 'watch' ? s.watch.indexOf(a.id) >= 0 : a.sector === fl; });
        items.forEach(function (a) { st[a.id] = T.coStats(tape, a, d); });
        var k = prefs.msort; back = k === 'day' ? 1 : k === 'year' ? 240 : 20;
        var key = { size: function (a) { return -st[a.id].mcap; }, day: function (a) { return -chg(a, d, 1); }, year: function (a) { return -chg(a, d, 240); }, name: function (a) { return a.name; },
          pe: function (a) { return st[a.id].pe == null ? 1e9 : st[a.id].pe; }, yield: function (a) { return -st[a.id].yield; }, growth: function (a) { return -(st[a.id].growth || -9); }, debt: function (a) { return st[a.id].debtToProfit == null ? (st[a.id].debt <= 0 ? -1 : 1e9) : st[a.id].debtToProfit; } }[k];
        items.sort(function (a, b) { var x = key(a), y = key(b); return x < y ? -1 : x > y ? 1 : 0; });
      }
      if (prefs.mcat === 'fund' && !App.tool('sectorfunds')) host.appendChild(h('p', { cls: 'note', style: 'margin-bottom:10px', text: ({ 5: 'Five', 10: 'Ten' }[G.tape.sectors.length] || G.tape.sectors.length) + ' sector funds unlock with Sector Funds, in the hub.' }));
      if (prefs.mcat === 'cmdty' && !App.tool('coin')) host.appendChild(h('p', { cls: 'note', style: 'margin-bottom:10px', text: 'The Coin Exchange unlocks in the hub.' }));
      if (!items.length) { host.appendChild(h('div', { cls: 'empty', text: prefs.mfilter === 'watch' ? 'Nothing on your watchlist. Open a company and tap the star.' : 'Nothing here.' })); return; }
      var list = h('div', { cls: 'list' });
      items.forEach(function (a) { list.appendChild(marketRow(a, back, st[a.id])); });
      host.appendChild(list);
      host.appendChild(h('p', { cls: 'mute', style: 'font-size:12px;margin-top:8px', text: 'Change shown: ' + (back === 1 ? 'today' : back === 240 ? 'past year' : 'past month') + '.' }));
    });
    var lastAlive = -1; U.on(function () { var n = 0; for (var i = 0; i < tape.companies.length; i++) if (T.alive(tape.assets[tape.companies[i].id], s.d)) n++; if (lastAlive < 0) lastAlive = n; else if (n !== lastAlive) { lastAlive = n; reg.render(); } });
  };
  function marketRow(a, back, st) {
    var r = G.run, s = r.s, cv = h('canvas', { cls: 'spark' }), lastD = -1;
    var ch = h('div', { cls: 'v2' });
    U.on(function () { var d = s.d; var c = chg(a, d, back); ch.textContent = f.pp(c); ch.className = 'v2 ' + f.sign(c); if (lastD < 0 || d - lastD >= 5) { lastD = d; C.spark(cv, a.pc, Math.max(a.start, d - (back >= 240 ? 240 : 60)), d, 56, 30, c); } });
    var extra = '';
    if (st && prefs.msort === 'pe') extra = st.pe ? 'P/E ' + st.pe.toFixed(0) : 'No profit'; else if (st && prefs.msort === 'yield') extra = 'Pays ' + f.pct(st.yield); else if (st && prefs.msort === 'growth') extra = 'Sales ' + f.pp(st.growth, 0); else if (st && prefs.msort === 'debt') extra = st.debtToProfit == null ? (st.debt <= 0 ? 'No debt' : 'No profit') : 'Debt ' + st.debtToProfit.toFixed(1) + 'x';
    return h('button', { cls: 'item', tap: function () { S.asset(a.id); } }, U.logo(a),
      h('span', { cls: 'grow' }, h('div', { cls: 't1', text: a.name }), h('div', { cls: 't2', text: extra ? a.tkr + '  ' + extra : sub(a) })), cv,
      h('span', { cls: 'right', style: 'min-width:66px' }, h('div', { cls: 'v1', live: function () { return f.px(a.pc[s.d]); } }), ch));
  }

  /* ======================= ASSET DETAIL ======================= */
  S.asset = function (id) {
    var r = G.run, s = r.s, tape = G.tape, a = tape.assets[id], M = tape.M;
    if (!a) return;
    var live = function () { return T.alive(a, s.d); };
    var curD = function () { return a.end >= 0 ? Math.min(s.d, a.end) : s.d; };
    var star = h('button', { cls: 'x', 'aria-label': 'Watch', tap: function () { var i = s.watch.indexOf(id); if (i >= 0) s.watch.splice(i, 1); else s.watch.push(id); paintStar(); App.touch(); BW.Audio.play('tick'); } });
    function paintStar() { var on = s.watch.indexOf(id) >= 0; star.innerHTML = U.icon('star'); star.style.color = on ? 'var(--brass)' : 'var(--ink3)'; if (on) star.firstChild.setAttribute('fill', 'currentColor'); }
    paintStar();
    U.sheet({ title: a.name, full: true, head: U.logo(a),
      foot: function (ft) {
        var sell = h('button', { cls: 'btn sell', text: 'Sell', tap: function () { S.trade(id, 'sell'); } });
        var buy = h('button', { cls: 'btn buy', text: 'Buy', tap: function () { S.trade(id, 'buy'); } });
        U.on(function () { sell.disabled = !(r.qty(id) > 0) || !live(); buy.disabled = !live(); });
        ft.appendChild(h('div', { cls: 'btns' }, sell, buy));
      },
      build: function (b, ctl) {
        ctl.el.querySelector('.sh-head').insertBefore(star, ctl.el.querySelector('.sh-head .x'));
        // price
        var c1 = h('span', { cls: 'tag' }), c2 = h('span', { cls: 'tag' });
        U.on(function () { var d = curD(), x = chg(a, d, 1), y = chg(a, d, 240); c1.textContent = 'Today ' + f.pp(x); c1.className = 'tag ' + f.sign(x); c2.textContent = 'Past year ' + f.pp(y); c2.className = 'tag ' + f.sign(y); });
        b.appendChild(h('div', { cls: 'rowf', style: 'align-items:flex-end;flex-wrap:wrap' }, h('div', { cls: 'pxbig', live: function () { return f.px(a.pc[curD()]); } }), h('div', { cls: 'rowf', style: 'gap:6px;padding-bottom:5px' }, c1, c2)));
        b.appendChild(h('div', { cls: 'mute', style: 'font-size:13px;margin-top:2px', text: a.kind === 'stock' ? a.tkr + '  ' + secName(a.sector) : a.kind === 'cmdty' ? a.tkr + '  price per ' + a.unit : a.tkr + '  ' + KIND_NAME[a.kind] }));
        if (a.end >= 0 && a.end <= s.d) b.appendChild(h('p', { cls: 'note bad', style: 'margin-top:10px', text: a.endWhy === 'bankrupt' ? 'This company went bankrupt in ' + f.date(a.end - s.day0) + '. Its shares are worthless and no longer trade.' : 'This company was bought out in ' + f.date(a.end - s.day0) + ' at ' + f.px(a.endPx) + ' a share. It no longer trades.' }));

        // chart
        var cbox = h('div', { style: 'margin-top:8px' }), nl = a.newsIdx.map(function (i) { return tape.news[i]; });
        var what = h('div');
        var chart = C.price(cbox, { asset: a, day: curD, day0: s.day0, range: prefs.range, mode: prefs.mode || (G.meta.set.line ? 'line' : 'candle'), news: nl,
          ma: prefs.ma && App.tool('studio'), vol: prefs.vol && App.tool('studio'), compare: prefs.cmp && App.tool('studio') && id !== 'herd' ? tape.assets.herd : null,
          cost: 0, onInspect: function (bar) {
            U.clear(what);
            if (!bar) return;
            var hits = nl.filter(function (n) { return n.d >= bar.d0 && n.d <= bar.d1 && n.d <= s.d; });
            if (!hits.length) return;
            what.appendChild(h('div', { cls: 'mute', style: 'font-size:12.5px;margin:6px 0', text: 'In the news then' }));
            hits.slice(0, 4).forEach(function (n) { what.appendChild(newsItem(n, true)); });
          } });
        b.appendChild(cbox);
        var lastD = -1, lastQ = -1;
        U.on(function () { var q = r.qty(id); chart.o.cost = q > 0 ? Math.round(r.posCost(id) / q) : 0; if (s.d !== lastD || q !== lastQ || App.resized !== chart._rz) { lastD = s.d; lastQ = q; chart._rz = App.resized; chart.draw(); } });
        var ranges = [[60, '3M'], [240, '1Y'], [1200, '5Y'], [99999, 'All']];
        b.appendChild(h('div', { cls: 'rowf', style: 'margin-top:4px' },
          h('div', { cls: 'grow' }, U.chips(ranges, function () { return prefs.range; }, function (v) { prefs.range = v; chart.o.range = v; chart.clearHover(); }, true)),
          h('button', { cls: 'chip sm', live: function () { return chart.o.mode === 'candle' ? 'Candles' : 'Line'; }, tap: function () { chart.o.mode = chart.o.mode === 'candle' ? 'line' : 'candle'; prefs.mode = chart.o.mode; chart.draw(); ui.dirty = true; U.once('candle', U.GLOSS.candle[0], U.GLOSS.candle[1]); } })));
        if (App.tool('studio')) {
          var tg = function (label, key, apply) { var bt = h('button', { cls: 'chip sm' + (prefs[key] ? ' on' : ''), text: label, tap: function () { prefs[key] = !prefs[key]; bt.className = 'chip sm' + (prefs[key] ? ' on' : ''); apply(prefs[key]); chart.draw(); } }); return bt; };
          var row = h('div', { cls: 'chips', style: 'margin-top:6px' }, tg('Averages', 'ma', function (v) { chart.o.ma = v; }), tg('Volume', 'vol', function (v) { chart.o.vol = v; }));
          if (id !== 'herd') row.appendChild(tg('vs ' + tape.dest.indexName, 'cmp', function (v) { chart.o.compare = v ? tape.assets.herd : null; }));
          b.appendChild(row);
        }
        b.appendChild(h('p', { cls: 'mute', style: 'font-size:12px;margin-top:6px', text: 'Drag across the chart to read any point. Dots along the bottom mark news.' }));
        b.appendChild(what);

        // your position
        var posEl = h('div'); b.appendChild(posEl);
        var preg = U.region(posEl, function (host) {
          var q = r.qty(id); if (!(q > 0)) return;
          host.appendChild(h('h3', { text: 'Your position' }));
          var card = h('div', { cls: 'card' });
          card.appendChild(U.kvLive('You own', function () { return f.qty(r.qty(id)) + (a.kind === 'cmdty' ? ' ' + a.unit + 's' : ' shares'); }));
          card.appendChild(U.kvLive('Worth today', function () { return f.money(r.posValue(id)); }));
          card.appendChild(U.kvLive('You paid', function () { return f.money(r.posCost(id)); }));
          var g = h('span'); U.on(function () { var v = r.posValue(id), c = r.posCost(id); g.textContent = f.mp(v - c) + '  ' + f.pp(c ? (v - c) / c : 0); g.className = f.sign(v - c); });
          card.appendChild(h('div', { cls: 'kv' }, h('span', { text: 'Gain so far' }), g));
          var al = h('span'); U.on(function () { var p = s.pme[id]; if (!p) return; var x = r.posValue(id) - p.u * M.tr[s.d]; al.textContent = f.mp(x); al.className = f.sign(x); });
          card.appendChild(h('div', { cls: 'kv' }, U.term('Versus the index', 'pme'), al));
          host.appendChild(card);
        });
        var hadPos = r.qty(id) > 0; U.on(function () { var has = r.qty(id) > 0; if (has !== hadPos) { hadPos = has; preg.render(); } });

        // numbers
        if (a.kind === 'stock') stockSections(b, a);
        else otherSections(b, a);

        // news about it
        var nEl = h('div'); b.appendChild(nEl);
        var nreg = U.region(nEl, function (host) {
          var items = nl.filter(function (n) { return n.d <= s.d; }).slice(-12).reverse();
          if (!items.length) return;
          host.appendChild(h('h3', { text: 'News about ' + (a.kind === 'stock' ? a.name : 'this') }));
          var w = h('div', { cls: 'news' }); items.forEach(function (n) { w.appendChild(newsItem(n, true)); }); host.appendChild(w);
        });
        var lastNC = -1; U.on(function () { var c = 0; for (var i = nl.length - 1; i >= 0; i--) if (nl[i].d <= s.d) { c = i + 1; break; } if (lastNC < 0) lastNC = c; else if (c !== lastNC) { lastNC = c; nreg.render(); } });
      } });
    if (a.kind === 'stock') U.once('x_stock', U.GLOSS.stock[0], U.GLOSS.stock[1]);
    else if (a.kind === 'fund') U.once('x_index', U.GLOSS.index[0], U.GLOSS.index[1]);
    else if (a.kind === 'bond') U.once('x_bond', U.GLOSS.bond[0], U.GLOSS.bond[1]);
    else if (a.kind === 'cmdty') U.once('x_cmdty', U.GLOSS.cmdty[0], U.GLOSS.cmdty[1]);
  };

  function stat(k, key, vfn, sfn) {
    var v = h('div', { cls: 'v', live: vfn }), sEl = sfn ? h('div', { cls: 's', live: sfn }) : null;
    return h('button', { cls: 'stat', tap: function () { U.explain(key); } }, h('div', { cls: 'k' }, k, h('i', { text: '?' })), v, sEl);
  }
  function stockSections(b, a) {
    var r = G.run, s = r.s, tape = G.tape;
    var st = null, stD = -1;
    function S2() { var d = Math.min(s.d, a.end >= 0 ? a.end : s.d); if (d !== stD) { stD = d; st = T.coStats(tape, a, d); } return st; }
    b.appendChild(h('h3', { text: 'The numbers' }));
    b.appendChild(h('div', { cls: 'stats' },
      stat('Price to earnings', 'pe', function () { var x = S2(); return x.pe ? x.pe.toFixed(1) : 'No profit'; }, function () { return 'Market average ' + tape.M.pe[s.d].toFixed(0); }),
      stat('Dividend yield', 'yield', function () { var x = S2(); return x.yield > 0 ? f.pct(x.yield) : 'None'; }, function () { var x = S2(); return x.dpsYr > 0 ? '$' + x.dpsYr.toFixed(2) + ' a share each year' : 'Pays no dividend'; }),
      stat('Sales growth', 'growth', function () { return f.pp(S2().growth, 0); }, function () { return 'Sales ' + f.big(S2().rev) + ' a year'; }),
      stat('Profit margin', 'margin', function () { return f.pct(S2().margin, 0); }, function () { return 'Before interest and tax'; }),
      stat('Debt load', 'debt', function () { var x = S2(); return x.debt <= 0 ? 'No debt' : x.debtToProfit == null ? 'Heavy' : x.debtToProfit.toFixed(1) + ' years'; }, function () { var x = S2(); return x.debt <= 0 ? f.big(-x.debt) + ' cash in the bank' : f.big(x.debt) + ' owed'; }),
      stat('Interest cover', 'cover', function () { var x = S2(); return x.debt <= 0 ? 'n/a' : x.cover == null ? 'n/a' : x.cover < 0 ? 'Losing money' : x.cover.toFixed(1) + 'x'; }, function () { var x = S2(); return x.cover != null && x.cover < 2 && x.debt > 0 ? 'Dangerously thin' : x.cover != null && x.cover < 4 && x.debt > 0 ? 'Getting tight' : 'Comfortable'; }),
      stat('Company value', 'mcap', function () { return f.big(S2().mcap); }, function () { return f.big(S2().ni) + ' profit a year'; }),
      stat('Earnings per share', 'eps', function () { var e = S2().eps; return (e < 0 ? '-$' : '$') + Math.abs(e).toFixed(2); }, function () { var x = S2(); return x.payout != null && x.dpsYr > 0 ? f.pct(x.payout, 0) + ' paid as dividends' : 'Last four quarters'; })));
    b.appendChild(h('h3', { text: 'The business' }));
    var sec = tape.sectors.filter(function (x) { return x.id === a.sector; })[0];
    b.appendChild(h('div', { cls: 'card stack' }, h('p', { text: a.desc }), h('div', { cls: 'sep' }), h('div', null, h('div', { cls: 'mute', style: 'font-size:12.5px;margin-bottom:3px', text: 'What moves ' + sec.name + ' companies' }), h('p', { cls: 'soft', style: 'font-size:14px', text: sec.moves })), exposureNote(a)));

    // earnings history
    b.appendChild(h('h3', { text: 'Profit each quarter: actual against what analysts expected' }));
    var ebox = h('div'), elist = h('div', { cls: 'card', style: 'margin-top:8px' });
    var bars = C.bars(ebox, { height: 120, items: function () { var n = T.quarters(a, s.d), q = a.q.slice(Math.max(0, n - 12), n); return q.map(function (x) { return { a: x.eps, b: x.est, label: f.date(x.d - s.day0).slice(0, 3) }; }); } });
    b.appendChild(ebox); b.appendChild(elist);
    var ereg = U.region(elist, function (host) {
      var n = T.quarters(a, s.d), q = a.q.slice(Math.max(0, n - 4), n).reverse();
      q.forEach(function (x) { var a2 = Math.round(x.eps * 100), e2 = Math.round(x.est * 100), w = a2 > e2 ? ' beat ' : a2 < e2 ? ' missed ' : ' matched ', us = function (c) { return (c < 0 ? '-$' : '$') + (Math.abs(c) / 100).toFixed(2); };
        host.appendChild(h('div', { cls: 'kv' }, h('span', { text: f.date(x.d - s.day0) }), h('span', { cls: a2 > e2 ? 'up' : a2 < e2 ? 'down' : '', text: us(a2) + w + us(e2) }))); });
      host.appendChild(h('p', { cls: 'mute', style: 'font-size:12px;margin-top:8px', text: 'Dark bars are the forecast, coloured bars the result. Prices jump on the surprise, not on the profit itself.' }));
    });
    var lastQn = -1; U.on(function () { var n = T.quarters(a, s.d); if (n !== lastQn || App.resized !== bars._rz) { var first = lastQn < 0; lastQn = n; bars._rz = App.resized; bars.draw(); if (!first) ereg.render(); } });

    if (App.tool('analyst')) {
      b.appendChild(h('h3', { text: 'Analyst desk' }));
      var tg = h('span'), card = h('div', { cls: 'card' });
      U.on(function () { var d = Math.min(s.d, a.end >= 0 ? a.end : s.d), t = T.target(tape, a, d); if (!t) return; var upx = t * 100 / a.pc[d] - 1; tg.textContent = '$' + t.toFixed(2) + '  ' + f.pp(upx, 0); tg.className = f.sign(upx); });
      card.appendChild(h('div', { cls: 'kv' }, U.term('Average price target', 'target'), tg));
      card.appendChild(h('p', { cls: 'mute', style: 'font-size:12.5px;margin-top:8px', text: 'Analysts see the business more clearly than the share price does, but not clearly. Treat this as one opinion.' }));
      b.appendChild(card);
    }
  }
  function exposureNote(a) {
    var t = a.tpl, bits = [], ex = t.ex || {};
    if (t.cyc >= 1.4) bits.push('Hit hard by recessions.'); else if (t.cyc <= 0.25) bits.push('Barely notices recessions.');
    var A = G.tape.assets, nm = function (k) { return A[k].name.toLowerCase(); };
    if (ex.oil > 0) bits.push('Earns more when ' + nm('oil') + ' is expensive.'); if (ex.oil < 0) bits.push('Costs rise when ' + nm('oil') + ' is expensive.');
    if (ex.gold) bits.push('Profit follows the price of ' + nm('gold') + '.'); if (ex.copper > 0) bits.push('Profit follows the price of ' + nm('copper') + '.'); if (ex.copper < 0) bits.push('Pays more when ' + nm('copper') + ' is expensive.');
    if (ex.wheat > 0) bits.push('Earns more when ' + nm('wheat') + ' is expensive.'); if (ex.wheat < 0) bits.push('Pays more when ' + nm('wheat') + ' is expensive.'); if (ex.rate > 0) bits.push('Earns more when interest rates are high.'); if (ex.rate < 0) bits.push('Squeezed when interest rates are high.');
    if (t.dx >= 4) bits.push('Carries heavy debt.'); if (t.omMature != null) bits.push('Priced on profits it has not made yet.');
    if (t.trials) bits.push('Lives or dies on trial results.'); if (t.hits) bits.push('Depends on hits.');
    if (!bits.length) return null;
    return h('div', null, h('div', { cls: 'sep' }), h('div', { cls: 'mute', style: 'font-size:12.5px;margin:6px 0 3px', text: 'Specific to this company' }), h('p', { cls: 'soft', style: 'font-size:14px', text: bits.join(' ') }));
  }
  function otherSections(b, a) {
    var r = G.run, s = r.s, tape = G.tape, M = tape.M;
    b.appendChild(h('h3', { text: 'What it is' }));
    b.appendChild(h('div', { cls: 'card' }, h('p', { text: a.desc })));
    var card = h('div', { cls: 'card', style: 'margin-top:10px' });
    if (a.kind === 'fund' || a.kind === 'sfund') {
      card.appendChild(U.kvLive(U.term('Dividend yield', 'yield'), function () { var t = 0, n = 0; for (var i = a.divs.length - 1; i >= 0 && n < 4; i--) if (a.divs[i].d <= s.d) { t += a.divs[i].amt; n++; } return f.pct(t * 100 / a.pc[s.d]); }));
      card.appendChild(U.kv('Yearly fee', (a.fee * 100).toFixed(2) + '%'));
      if (a.kind === 'fund') card.appendChild(U.kvLive(U.term('Market P/E', 'mktpe'), function () { return M.pe[s.d].toFixed(1); }));
      b.appendChild(card);
      b.appendChild(h('h3', { text: 'Biggest holdings inside' }));
      var top = h('div'); b.appendChild(top);
      var reg = U.region(top, function (host) {
        var cos = tape.companies.filter(function (c) { return T.alive(tape.assets[c.id], s.d) && (a.kind === 'fund' || c.sector === a.sector); }).map(function (c) { var x = tape.assets[c.id]; return [x, x.pc[s.d] * x.sh[s.d]]; });
        var tot = 0; cos.forEach(function (c) { tot += c[1]; }); cos.sort(function (x, y) { return y[1] - x[1]; });
        var list = h('div', { cls: 'list' });
        cos.slice(0, 6).forEach(function (c) { list.appendChild(h('button', { cls: 'item', style: 'min-height:50px', tap: function () { S.asset(c[0].id); } }, U.logo(c[0], 'sm'), h('span', { cls: 'grow t1', text: c[0].name }), h('span', { cls: 'v1', text: f.pct(c[1] / tot) }))); });
        host.appendChild(list);
      });
      var ld = s.d; U.on(function () { if (s.d - ld >= 60) { ld = s.d; reg.render(); } });
    } else if (a.kind === 'bond') {
      var yf = { bgov: function (d) { return 0.3 * M.y2[d] + 0.7 * M.y10[d]; }, blng: function (d) { return M.y10[d] + 0.35; }, bcrp: function (d) { return 0.3 * M.y2[d] + 0.7 * M.y10[d] + M.igs[d]; }, bjnk: function (d) { return 0.5 * M.y2[d] + 0.5 * M.y10[d] + M.hys[d]; } }[a.id];
      card.appendChild(U.kvLive(U.term('Interest it is earning now', 'bond'), function () { return yf(s.d).toFixed(2) + '% a year'; }));
      card.appendChild(U.kv('Sensitivity to interest rates', a.dur >= 12 ? 'Very high' : a.dur >= 6 ? 'Medium' : 'Lower'));
      card.appendChild(U.kvLive(U.term('The Reserve\'s rate', 'rate'), function () { return M.rate[s.d].toFixed(2) + '%'; }));
      card.appendChild(h('p', { cls: 'mute', style: 'font-size:12.5px;margin-top:8px', text: 'Interest is added into the price each day, so the price drifts up over time. A one point rise in interest rates knocks roughly ' + a.dur + '% off the price straight away.' }));
      b.appendChild(card);
    } else if (a.kind === 'cmdty') {
      card.appendChild(U.kv('Pays you', 'Nothing. No interest, no dividend.'));
      card.appendChild(U.kvLive(U.term('Inflation', 'inflation'), function () { return M.infl[s.d].toFixed(1) + '%'; }));
      b.appendChild(card);
    } else { card.appendChild(U.kv('Backed by', 'Nothing')); card.appendChild(U.kv('Pays you', 'Nothing')); b.appendChild(card); }
  }

  /* ======================= TRADE TICKET ======================= */
  S.trade = function (id, side) {
    var r = G.run, s = r.s, a = G.tape.assets[id];
    var st = { side: side, kind: 'market', amt: 0, frac: 0, px: a.pc[s.d] };
    var explainKey = { stock: null, fund: null, bond: null, cmdty: null }[a.kind];
    U.sheet({ title: (side === 'buy' ? 'Buy ' : 'Sell ') + a.tkr, build: function (b, ctl) {
      var body = h('div', { cls: 'stack' }); b.appendChild(body);
      var reg = U.region(body, function (host) {
        var isBuy = st.side === 'buy', q = r.qty(id);
        if (App.tool('orders')) host.appendChild(U.seg([['market', 'Now'], ['limit', isBuy ? 'If it drops to' : 'If it rises to'], ['stop', isBuy ? 'If it rises to' : 'If it falls to']], function () { return st.kind; }, function (v) { st.kind = v; st.px = Math.round(a.pc[s.d] * (v === 'market' ? 1 : (isBuy ? (v === 'limit' ? 0.95 : 1.05) : (v === 'limit' ? 1.1 : 0.9)))); reg.render(); }));
        if (st.kind !== 'market') {
          var pin = h('input', { id: 'tr-px', inputmode: 'decimal', value: (st.px / 100).toFixed(2), 'aria-label': 'Trigger price' });
          pin.addEventListener('input', function () { st.px = Math.round(parseFloat(pin.value.replace(/[^0-9.]/g, '')) * 100) || 0; paint(); });
          host.appendChild(h('div', null, h('div', { cls: 'mute', style: 'font-size:12.5px;margin-bottom:4px' }, 'Trigger price. Now ', h('span', { live: function () { return f.px(a.pc[s.d]); } }), '. ', U.term(st.kind === 'limit' ? 'How limit orders work' : 'How stop orders work', st.kind)), h('label', { cls: 'amt' }, h('span', { text: '$' }), pin)));
        }
        var input = h('input', { id: 'tr-amt', inputmode: 'decimal', placeholder: '0', 'aria-label': isBuy ? 'Dollars to spend' : 'Dollars to sell' });
        host.appendChild(h('div', null, h('div', { cls: 'mute', style: 'font-size:12.5px;margin-bottom:4px', text: isBuy ? 'How much to spend' : 'How much to sell, in dollars' }), h('label', { cls: 'amt' }, h('span', { text: '$' }), input)));
        var info = h('div', { cls: 'card' });
        var go = h('button', { cls: 'btn ' + (isBuy ? 'buy' : 'sell') });
        var chipsEl = h('div', { cls: 'chips' });
        (isBuy ? [[0.1, '10%'], [0.25, '25%'], [0.5, '50%'], [1, 'All my cash']] : [[0.25, '25%'], [0.5, '50%'], [0.75, '75%'], [1, 'All of it']]).forEach(function (c) {
          chipsEl.appendChild(h('button', { cls: 'chip', text: c[1], tap: function () {
            if (isBuy) { st.amt = Math.floor(Math.max(0, s.cash) * c[0]); st.frac = 0; } else { st.frac = c[0]; st.amt = Math.round(r.posValue(id) * c[0]); }
            input.value = (st.amt / 100).toFixed(2); paint(); BW.Audio.play('tick');
          } }));
        });
        host.appendChild(chipsEl); host.appendChild(info); host.appendChild(go);
        input.addEventListener('input', function () { st.amt = Math.round(parseFloat(input.value.replace(/[^0-9.]/g, '')) * 100) || 0; st.frac = 0; paint(); });
        if (st.amt) input.value = (st.amt / 100).toFixed(2);
        var res = null;
        function sellQty() { if (st.frac >= 0.999) return 'all'; if (st.frac > 0) return r.qty(id) * st.frac; var v = r.posValue(id); return v > 0 ? (st.amt >= v ? 'all' : r.qty(id) * st.amt / v) : 0; }
        function paint() {
          U.clear(info);
          var px = a.pc[s.d], ok = false, why = '';
          if (st.kind !== 'market') {
            info.appendChild(U.kv('Waits until the price is', f.px(st.px)));
            info.appendChild(U.kv(isBuy ? 'Then spends up to' : 'Then sells', isBuy ? f.money(st.amt) : (st.frac >= 0.999 || st.amt >= r.posValue(id) ? 'everything you hold' : f.money(st.amt) + ' worth')));
            ok = st.px > 0 && st.amt > 0; go.textContent = 'Place order';
          } else if (isBuy) {
            res = r.buy(id, st.amt, { dry: true });
            info.appendChild(U.kv('Price', f.px(px)));
            if (res.ok) { info.appendChild(U.kv('You get', f.qty(res.q) + (a.kind === 'cmdty' ? ' ' + a.unit + 's' : ' shares'))); info.appendChild(U.kv(U.term('Trading cost', 'fee'), f.money(res.fee))); info.appendChild(U.kv('Cash left', f.money(s.cash - res.total), 'total')); ok = true; }
            else why = st.amt ? res.why : '';
            go.textContent = 'Buy ' + (st.amt ? f.money(st.amt) + ' of ' : '') + a.tkr;
          } else {
            var qv = sellQty(); res = qv ? r.sell(id, qv, { dry: true }) : { ok: false, why: '' };
            info.appendChild(U.kv('Price', f.px(px)));
            if (res.ok) {
              info.appendChild(U.kv('Selling', f.qty(res.q) + ' of ' + f.qty(q)));
              info.appendChild(U.kv(U.term('Trading cost', 'fee'), f.money(res.fee)));
              info.appendChild(U.kv('Your gain on these', h('span', { cls: f.sign(res.gain), text: f.mp(res.gain) })));
              info.appendChild(U.kv(U.term('Tax', 'tax'), res.tax ? f.money(res.tax) + (res.st > 0 && res.lt <= 0 ? ' at 22%' : res.lt > 0 && res.st <= 0 ? ' at 15%' : '') : (res.gain > 0 ? 'None: covered by banked losses' : 'None')));
              if (res.st > 0 && res.tax > 0) info.appendChild(h('p', { cls: 'mute', style: 'font-size:12.5px;margin:6px 0', text: 'Some of this was bought under a year ago, so its gain is taxed at 22% instead of 15%.' }));
              info.appendChild(U.kv('You receive', f.money(res.net), 'total')); ok = true;
            } else why = res.why;
            go.textContent = 'Sell ' + a.tkr;
          }
          if (why) info.appendChild(h('p', { cls: 'down', style: 'font-size:13.5px;margin-top:6px', text: why }));
          go.disabled = !ok;
        }
        paint();
        var lastPx = a.pc[s.d]; U.on(function () { if (a.pc[s.d] !== lastPx) { lastPx = a.pc[s.d]; paint(); } });
        U.tap(go, function () {
          var out;
          if (st.kind !== 'market') {
            out = r.orderAdd({ id: id, side: st.side, kind: st.kind, px: st.px, amt: st.amt, frac: isBuy ? 0 : (st.frac >= 0.999 || st.amt >= r.posValue(id) ? 1 : st.amt / Math.max(1, r.posValue(id))) });
            if (out.ok) { U.toast('Order placed', { kind: 'brass', sub: 'It will fire if ' + a.tkr + ' reaches ' + f.px(st.px) + '.' }); BW.Audio.play('unlock'); }
          } else if (isBuy) {
            out = r.buy(id, st.amt);
            if (out.ok) { U.toast('Bought ' + f.qty(out.q) + ' ' + a.tkr, { kind: 'good', sub: 'For ' + f.money(out.total) }); BW.Audio.play('buy'); BW.Audio.buzz(12); }
          } else {
            out = r.sell(id, sellQty());
            if (out.ok) { U.toast('Sold ' + f.qty(out.q) + ' ' + a.tkr, { kind: out.gain >= 0 ? 'good' : '', sub: 'You received ' + f.money(out.net) + (out.tax ? ' after ' + f.money(out.tax) + ' tax' : '') }); BW.Audio.play('sell'); BW.Audio.buzz([10, 40, 10]); }
          }
          if (!out.ok) { U.toast(out.why || 'That did not go through.', { kind: 'bad' }); BW.Audio.play('error'); return; }
          App.touch(); ctl.close(true);
        });
      });
    } });
    if (side === 'buy') { if (a.kind === 'crypto') U.once('x_coin', 'Before you buy this', a.desc); }
  };

  S.orders = function () {
    var r = G.run, s = r.s;
    U.sheet({ title: 'Standing orders', build: function (b) {
      var reg = U.region(b, function (host) {
        if (!s.orders.length) { host.appendChild(h('div', { cls: 'empty', text: 'No orders waiting. Open anything in the Market, tap Buy or Sell, and choose a trigger price.' })); return; }
        var list = h('div', { cls: 'list' });
        s.orders.forEach(function (o) { var a = G.tape.assets[o.id];
          list.appendChild(h('div', { cls: 'item' }, U.logo(a, 'sm'), h('span', { cls: 'grow' }, h('div', { cls: 't1', text: (o.side === 'buy' ? 'Buy ' : 'Sell ') + a.tkr + (o.side === 'buy' ? ' ' + f.m0(o.amt) : ' ' + Math.round(o.frac * 100) + '%') }), h('div', { cls: 't2', text: (o.side === 'buy' ? (o.kind === 'limit' ? 'if it drops to ' : 'if it rises to ') : (o.kind === 'limit' ? 'if it rises to ' : 'if it falls to ')) + f.px(o.px) })),
            h('button', { cls: 'btn sm ghost', text: 'Cancel', tap: function () { r.orderCancel(o.n); App.touch(); reg.render(); } }))); });
        host.appendChild(list);
      });
    } });
  };

  /* ======================= NEWS ======================= */
  function newsItem(n, compact) {
    var r = G.run, s = r.s, tape = G.tape, a = n.co ? tape.assets[n.co] : null;
    var el = h('button', { cls: 'nitem s' + n.sev });
    var meta = h('div', { cls: 'nm' }, h('span', { cls: 'src ' + n.src, text: App.SRC_NAME[n.src] }), h('span', { text: f.date(n.d - s.day0) }));
    if (n.tk && !compact) meta.appendChild(h('span', { cls: 'tk', text: n.tk }));
    var body = h('div', { cls: 'nb' });
    U.add(el, [meta, h('div', { cls: 'nh', text: n.h }), body]);
    var built = false;
    U.tap(el, function () {
      el.classList.toggle('open');
      if (built) return; built = true;
      body.appendChild(h('p', { text: n.b }));
      var mv = h('div', { cls: 'mv' });
      var ref = a || tape.assets.herd, d = Math.min(s.d, ref.end >= 0 ? ref.end : s.d);
      if (n.d > ref.start && n.d <= d && ref.pc[n.d - 1] > 0) {
        var day = ref.pc[n.d] / ref.pc[n.d - 1] - 1, since = ref.pc[d] / ref.pc[n.d] - 1;
        mv.appendChild(h('span', { cls: 'tag ' + f.sign(day), text: (a ? a.tkr : tape.dest.indexName) + ' that day ' + f.pp(day) }));
        if (d - n.d >= 5) mv.appendChild(h('span', { cls: 'tag ' + f.sign(since), text: 'Since then ' + f.pp(since) }));
      }
      if (a && !compact) mv.appendChild(h('span', { cls: 'tag brass', role: 'button', text: 'Open ' + a.tkr, tap: function (e) { e.stopPropagation(); S.asset(a.id); } }));
      body.appendChild(mv);
      BW.Audio.play('tick');
    });
    return el;
  }
  S.newsItem = newsItem;

  S.news = function (el) {
    var r = G.run, s = r.s, tape = G.tape, limit = 40;
    var fl = [['you', 'For you'], ['big', 'Big stories'], ['econ', 'Economy'], ['co', 'Companies'], ['all', 'Everything']];
    if (App.tool('newsdesk')) fl = fl.concat([['FILING', 'Filings'], ['RUMOR', 'Rumors'], ['OPINION', 'Opinion']]);
    el.appendChild(U.chips(fl, function () { return prefs.nfilter; }, function (v) { prefs.nfilter = v; limit = 40; reg.render(); }));
    if (App.tool('newsdesk')) el.appendChild(h('button', { cls: 'btn sm ghost', style: 'margin-top:10px', text: 'How reliable has each source been?', tap: S.sources }));
    var listEl = h('div', { style: 'margin-top:12px' }); el.appendChild(listEl);
    function match(n) {
      if ((n.k === 'coinup' || n.k === 'coindown') && !App.tool('coin')) return false;
      switch (prefs.nfilter) {
        case 'you': return n.sev >= 3 || App.relevant(n) || (n.sc === 'm' && n.sev >= 2);
        case 'big': return n.sev >= 3;
        case 'econ': return n.sc === 'm';
        case 'co': return n.sc === 'c';
        case 'all': return true;
        default: return n.src === prefs.nfilter;
      }
    }
    var reg = U.region(listEl, function (host) {
      var cnt = T.newsCount(tape, s.d), items = [], first = T.newsCount(tape, s.day0 - 240);
      for (var i = cnt - 1; i >= first && items.length < limit; i--) if (match(tape.news[i])) items.push(tape.news[i]);
      if (!items.length) { host.appendChild(h('div', { cls: 'empty', text: prefs.nfilter === 'you' ? 'Nothing that touches you yet. Stories about things you own or watch land here, along with the big ones.' : 'Nothing yet.' })); return; }
      var w = h('div', { cls: 'news' }); items.forEach(function (n) { w.appendChild(newsItem(n)); }); host.appendChild(w);
      if (items.length >= limit) host.appendChild(h('button', { cls: 'btn ghost', style: 'margin-top:12px', text: 'Show older', tap: function () { limit += 40; reg.render(); } }));
    });
    var seen = ui.newsSeen;
    U.on(function () { if (ui.newsSeen !== seen) { seen = ui.newsSeen; ui.unread = 0; if (document.getElementById('screen').scrollTop < 60 && !listEl.querySelector('.nitem.open')) reg.render(); } });
    U.once('x_news', 'Reading the news', 'Every story carries a tag for where it came from. Filings and official numbers are facts. Wire stories are reported events. Rumors are right maybe one time in three. Opinion is somebody talking. Tap a story to see what the price did that day, and what it has done since. Learning which kinds of story last is most of the skill.');
  };

  S.sources = function () {
    var r = G.run, s = r.s, tape = G.tape, M = tape.M;
    U.sheet({ title: 'Source track record', build: function (b) {
      var agg = {}, cnt = T.newsCount(tape, s.d - 60);
      for (var i = 0; i < cnt; i++) {
        var n = tape.news[i]; if (!n.co || n.d < tape.W - 480) continue;
        var a = tape.assets[n.co]; if (n.d <= a.start || (a.end >= 0 && a.end < n.d + 60)) continue;
        var day = a.pc[n.d] / a.pc[n.d - 1] - M.idx[n.d] / M.idx[n.d - 1];
        if (Math.abs(day) < 0.01) continue;
        var later = a.pc[n.d + 60] / a.pc[n.d - 1] - M.idx[n.d + 60] / M.idx[n.d - 1];
        var g = agg[n.src] || (agg[n.src] = { n: 0, stuck: 0, kept: 0, mv: 0 });
        g.n++; g.mv += Math.abs(day); if ((later > 0) === (day > 0)) g.stuck++; g.kept += Math.max(-1, Math.min(2, later / day));
      }
      b.appendChild(h('p', { cls: 'lead', text: 'For every company story so far that moved the share price by 1% or more, this checks where the price stood three months later, compared with the market.' }));
      var list = h('div', { cls: 'card', style: 'margin-top:12px' });
      ['FILING', 'WIRE', 'RUMOR', 'OPINION'].forEach(function (k) { var g = agg[k]; if (!g || g.n < 5) return;
        list.appendChild(h('div', { cls: 'kv' }, h('span', null, h('span', { cls: 'src ' + k, text: App.SRC_NAME[k] }), '  ' + g.n + ' stories'), h('span', { text: Math.round(100 * g.stuck / g.n) + '% lasted' }))); });
      if (!list.children.length) list.appendChild(h('div', { cls: 'empty', text: 'Not enough stories yet. Check back in a year or two.' }));
      b.appendChild(list);
      b.appendChild(h('p', { cls: 'mute', style: 'font-size:12.5px;margin-top:10px', text: '"Lasted" means the price was still on the same side of the market three months later. 50% is a coin flip: the story told you nothing lasting. The further above 50%, the more that kind of story is worth acting on. With only a few stories the number is mostly luck.' }));
    } });
  };

  /* ======================= YOU VS DOLLY ======================= */
  S.versus = function () {
    var r = G.run, d = G.dolly;
    U.sheet({ title: 'You against Dolly', build: function (b) {
      var w = App.worth();
      b.appendChild(h('p', { cls: 'lead', text: 'Dolly gets the same paychecks, bills and surprises as you. She keeps $1,000 spare and puts every other dollar into the ' + G.tape.dest.indexName + ' fund on payday. She never sells unless an emergency forces her to.' }));
      var a = h('div', { cls: 'side' }), c = h('div', { cls: 'side' });
      U.add(a, [h('div', { cls: 'who', text: 'You' }), h('div', { cls: 'amt2', live: function () { return f.ms(App.worth().liq); } })]);
      U.add(c, [h('div', { cls: 'who', text: 'Dolly' }), h('div', { cls: 'amt2', live: function () { return f.ms(App.worth().dliq); } })]);
      U.on(function () { var w2 = App.worth(); a.className = 'side' + (w2.liq >= w2.dliq ? ' win' : ''); c.className = 'side' + (w2.liq < w2.dliq ? ' win' : ''); });
      b.appendChild(h('div', { cls: 'versus', style: 'margin-top:14px' }, a, c));
      b.appendChild(h('p', { cls: 'mute', style: 'font-size:12.5px;margin-top:8px' }, 'These are ', U.term('walk-away values', 'liq'), ': what each of you would keep after selling everything and paying tax.'));
      var card = h('div', { cls: 'card', style: 'margin-top:12px' });
      card.appendChild(U.kvLive('Dolly\'s fund shares', function () { return f.qty(d.qty('herd')); }));
      card.appendChild(U.kvLive('Tax you have paid', function () { return f.ma(r.s.tot.tax); }));
      card.appendChild(U.kvLive('Tax Dolly has paid', function () { return f.ma(d.s.tot.tax); }));
      card.appendChild(U.kvLive('Trading costs you have paid', function () { return f.ma(r.s.tot.fees); }));
      card.appendChild(U.kvLive('Your trades', function () { return String(r.s.st.trades); }));
      b.appendChild(card);
      if (w.d === undefined) return;
    } });
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
