/* Life: job, budget, debts, deposits, property, businesses. More: economy, autopilot, settings. */
(function (root) {
  'use strict';
  var BW = root.BW, U = BW.UI, h = U.h, f = U.f, T = BW.T, App = BW.App, G = BW.G, C = BW.Charts, S = BW.Screens, RULES = BW.RULES;
  var prefs = App.prefs; prefs.ltab = 'money';
  var GRADE = { A: 'Prime area', B: 'Solid area', C: 'Rough area' };
  function condWord(c) { return c >= 0.93 ? 'Excellent condition' : c >= 0.8 ? 'Good condition' : c >= 0.65 ? 'Tired, needs work' : 'A wreck. Needs everything'; }
  function amountSheet(o) { // { title, lead, max, label, chips: [[frac,label]], onGo(amt) -> result, go }
    U.sheet({ title: o.title, build: function (b, ctl) {
      var amt = 0, input = h('input', { id: 'amt-in', inputmode: 'decimal', maxlength: '14', placeholder: '0', 'aria-label': o.label || 'Amount' });
      var btn = h('button', { cls: 'btn pri', text: o.go || 'Confirm' }), note = h('div', { cls: 'mute', style: 'font-size:13px;min-height:18px' });
      function paint() { btn.disabled = !(amt > 0); if (o.note) note.textContent = o.note(amt) || ''; }
      input.addEventListener('input', function () { amt = U.parseMoney(input.value); paint(); });
      var chips = h('div', { cls: 'chips' });
      (o.chips || [[0.25, '25%'], [0.5, '50%'], [1, 'Max']]).forEach(function (c) { chips.appendChild(h('button', { cls: 'chip', text: c[1], tap: function () { amt = Math.floor(o.max() * c[0]); input.value = (amt / 100).toFixed(2); paint(); } })); });
      U.tap(btn, function () { var r = o.onGo(amt); if (r && r.ok === false) { U.toast(r.why || 'That did not go through.', { kind: 'bad' }); BW.Audio.play('error'); return; } App.touch(); ctl.close(true); });
      U.add(b, h('div', { cls: 'stack' }, o.lead ? h('p', { cls: 'lead', text: o.lead }) : null, h('label', { cls: 'amt' }, h('span', { text: '$' }), input), chips, note, btn));
      paint();
    } });
  }

  S.life = function (el, arg) {
    if (arg) prefs.ltab = arg;
    var body = h('div', { style: 'margin-top:12px' });
    el.appendChild(U.seg([['money', 'Money'], ['prop', 'Property'], ['biz', 'Business']], function () { return prefs.ltab; }, function (v) { prefs.ltab = v; reg.render(); }));
    el.appendChild(body);
    var reg = U.region(body, function (host) { ({ money: money, prop: property, biz: business })[prefs.ltab](host, function () { reg.render(); }); });
  };

  /* ---------- money ---------- */
  function money(el, redraw) {
    var r = G.run, s = r.s, M = G.tape.M;
    el.appendChild(h('h3', { text: 'Your job' }));
    var job = h('div', { cls: 'card' });
    if (s.job.salary > 0) {
      job.appendChild(U.kvLive('Salary', function () { return f.m0(s.job.salary) + ' a year'; }));
      job.appendChild(U.kvLive('Status', function () { return s.job.outUntil ? 'Out of work until about ' + f.date(s.job.outUntil - s.day0) : 'Employed'; }));
    } else job.appendChild(h('p', { cls: 'lead', text: 'You have no job in this scenario. What you start with has to last.' }));
    el.appendChild(job);

    el.appendChild(h('h3', { text: 'A typical month' }));
    var bud = h('div', { cls: 'card' }), B = function () { return S.budget(); };
    if (s.job.salary > 0) bud.appendChild(U.kvLive('Pay after 22% tax', function () { var b = B(); return b.out ? f.mp(b.pay) + ' (benefits)' : f.mp(b.pay); }));
    bud.appendChild(U.kvLive('Living costs', function () { return f.money(-B().living, { whole: true }); }));
    if (s.loan && s.loan.bal > 0) bud.appendChild(U.kvLive('Student loan payment', function () { return f.money(-B().loan, { whole: true }); }));
    bud.appendChild(U.kvLive('Property, last month', function () { return s.props.length ? f.mp(B().prop) : 'None owned'; }));
    bud.appendChild(U.kvLive('Businesses, last month', function () { return s.biz.length ? f.mp(B().biz) : 'None owned'; }));
    bud.appendChild(U.kvLive('Left to invest', function () { return f.mp(B().free); }, 'total'));
    el.appendChild(bud);
    el.appendChild(h('p', { cls: 'mute', style: 'font-size:12.5px;margin-top:8px', text: 'Living costs rise with prices every year, and a little faster.' + (s.job.salary > 0 ? ' Raises come once a year.' : ' There is no paycheck in this run: the money you started with has to do the work.') }));

    if (s.loan) {
      el.appendChild(h('h3', { text: 'Student loan' }));
      var loan = h('div', { cls: 'card stack' });
      if (s.loan.bal > 0) {
        loan.appendChild(h('div', null, U.kvLive('Still owed', function () { return f.money(s.loan.bal); }), U.kv('Interest', s.loan.rate + '% a year'), U.kv('Monthly payment', f.money(s.loan.pay))));
        loan.appendChild(h('p', { cls: 'mute', style: 'font-size:13px', text: 'Every extra dollar you pay here earns a guaranteed ' + s.loan.rate + '% by saving you the interest. No investment guarantees that. Stocks usually earn more, but not always.' }));
        loan.appendChild(h('button', { cls: 'btn', text: 'Pay extra', tap: function () { amountSheet({ title: 'Pay down the student loan', label: 'Extra payment', max: function () { return Math.min(Math.max(0, s.cash), s.loan.bal); }, go: 'Pay', chips: [[0.25, '25%'], [0.5, '50%'], [1, 'As much as I can']],
          onGo: function (a) { var o = r.loanPay(a); if (o.ok) { U.toast('Paid ' + f.money(o.paid) + ' off the loan', { kind: 'good' }); BW.Audio.play('sell'); redraw(); } return o; } }); } }));
      } else loan.appendChild(h('p', { cls: 'lead', text: 'Paid off. That monthly payment now stays in your pocket.' }));
      el.appendChild(loan);
    }

    el.appendChild(h('h3', null, U.term('Term deposits', 'cd')));
    var cd = h('div', { cls: 'card stack' }), rates = h('div');
    [1, 3, 5].forEach(function (t) { rates.appendChild(h('button', { cls: 'kv', style: 'width:100%', tap: function () { openCd(t, redraw); } }, h('span', { text: 'Lock for ' + t + (t > 1 ? ' years' : ' year') }), h('span', { cls: 'brass', live: function () { return r.cdRate(t).toFixed(2) + '% a year'; } }))); });
    cd.appendChild(rates);
    cd.appendChild(h('p', { cls: 'mute', style: 'font-size:12.5px' }, 'Your loose cash earns ', h('span', { live: function () { return M.save[s.d].toFixed(2) + '%'; } }), ' and that rate moves with the Reserve. A deposit fixes today\'s rate until it matures.'));
    if (s.cds.length) { var list = h('div', { cls: 'list', style: 'background:var(--bg3)' });
      s.cds.forEach(function (c) { list.appendChild(h('div', { cls: 'item' }, h('span', { cls: 'grow' }, h('div', { cls: 't1', live: function () { return f.money(r.cdValue(c)); } }), h('div', { cls: 't2', text: c.rate.toFixed(2) + '% until ' + f.date(c.d1 - s.day0) })),
        h('button', { cls: 'btn sm ghost', text: 'Break', tap: function () { U.confirm({ title: 'Break this deposit early?', body: 'You get your money back now but lose six months of interest.', yes: 'Break it', danger: true, onYes: function () { var o = r.cdBreak(c.id); if (o.ok) { U.toast('Deposit closed', { sub: f.money(o.p + o.interest - o.tax) + ' is back in cash.' }); App.touch(); redraw(); } } }); } }))); });
      cd.appendChild(list); }
    el.appendChild(cd);

    el.appendChild(h('h3', { text: 'Tax' }));
    var tx = h('div', { cls: 'card' });
    tx.appendChild(U.kvLive('Paid so far this run', function () { return f.ma(s.tot.tax); }));
    tx.appendChild(U.kvLive(U.term('Banked losses', 'lossbank'), function () { return f.ma(s.tax.lossBank); }));
    tx.appendChild(h('p', { cls: 'mute', style: 'font-size:12.5px;margin-top:8px', text: 'Pay, interest, rent, business profit and gains on anything sold within a year: 22%. Dividends and gains on anything held a year or more: 15%. Nothing is taxed until you sell.' }));
    el.appendChild(tx);

    el.appendChild(h('h3', { text: 'Where the money has gone this run' }));
    var fl = h('div', { cls: 'card' }), F2 = function (k) { return s.flow[k] || 0; };
    fl.appendChild(U.kvLive('Pay and benefits', function () { return f.mp(F2('pay')); }));
    fl.appendChild(U.kvLive('Living costs', function () { return f.mp(F2('living')); }));
    fl.appendChild(U.kvLive('Surprises, good and bad', function () { return f.mp(F2('life')); }));
    fl.appendChild(U.kvLive('Dividends', function () { return f.mp(F2('dividends')); }));
    fl.appendChild(U.kvLive('Interest earned', function () { return f.mp(F2('interest')); }));
    fl.appendChild(U.kvLive('Card interest', function () { return f.mp(F2('cardint')); }));
    fl.appendChild(U.kvLive('Student loan payments', function () { return f.mp(F2('loan')); }));
    fl.appendChild(U.kvLive('Tax on investments', function () { return f.mp(F2('tax')); }));
    fl.appendChild(U.kvLive('Trading costs (inside your buys and sells)', function () { return f.mp(-s.tot.fees); }));
    fl.appendChild(U.kvLive('Property, all cash in and out', function () { return f.mp(F2('realestate')); }));
    fl.appendChild(U.kvLive('Businesses, all cash in and out', function () { return f.mp(F2('business')); }));
    if (s.tot.casinoBet) fl.appendChild(U.kvLive('Casino', function () { return f.mp(F2('casino')); }));
    fl.appendChild(U.kvLive('Net put into investments', function () { return f.mp(F2('invest') + F2('cd')); }));
    el.appendChild(fl);
    el.appendChild(h('p', { cls: 'mute', style: 'font-size:12.5px;margin-top:8px', text: 'Every cent that has ever moved in or out of your cash is in one of these lines. Add them to your starting cash and you get the cash you have now.' }));

    el.appendChild(h('h3', { text: 'Autopilot' }));
    var ap = h('div', { cls: 'list' });
    ap.appendChild(h('button', { cls: 'item', tap: function () { S.autopilot(redraw); } }, h('span', { cls: 'grow' }, h('div', { cls: 't1', text: 'Auto-invest each payday' }), h('div', { cls: 't2', style: 'white-space:normal', live: function () { return s.auto.on && s.auto.alloc.length ? s.auto.alloc.map(function (a) { return a.pct + '% ' + G.tape.assets[a.id].tkr; }).join(', ') : 'Off'; } })), h('span', { html: U.icon('chev'), style: 'width:20px;color:var(--ink3)' })));
    ap.appendChild(U.switchRow('Reinvest dividends', 'Use each dividend to buy more of whatever paid it.', function () { return s.drip; }, function (v) { s.drip = v; App.touch(); }));
    el.appendChild(ap);
  }
  function openCd(term, redraw) {
    var r = G.run, s = r.s, rate = r.cdRate(term);
    amountSheet({ title: 'Lock money for ' + term + (term > 1 ? ' years' : ' year'), lead: 'Fixed at ' + rate.toFixed(2) + '% a year. Minimum $100. Taking it out early costs six months of interest.', max: function () { return Math.max(0, s.cash); }, go: 'Lock it away', label: 'Amount to lock',
      note: function (a) { return a >= 10000 ? 'At the end you get back ' + f.money(a + Math.round(a * (Math.pow(1 + rate / 100, term) - 1))) + ' before tax.' : ''; },
      onGo: function (a) { var o = r.cdOpen(term, a); if (o.ok) { U.toast('Locked away ' + f.money(a), { kind: 'good', sub: 'Earning ' + o.rate.toFixed(2) + '% until ' + f.date(s.d + term * 240 - s.day0) }); BW.Audio.play('unlock'); redraw(); } return o; } });
  }

  /* ---------- property ---------- */
  function property(el, redraw) {
    var r = G.run, s = r.s, M = G.tape.M;
    var mk = h('div', { cls: 'card' });
    mk.appendChild(U.kvLive(U.term('Mortgage rate today', 'mortgage'), function () { return M.mort[s.d].toFixed(2) + '%'; }));
    mk.appendChild(U.kvLive('Home prices, past year', function () { var p = s.d - 240 >= 0 ? M.housing[s.d] / M.housing[s.d - 240] - 1 : 0; return f.pp(p); }));
    el.appendChild(mk);
    if (s.props.length) {
      el.appendChild(h('h3', { text: 'Yours' }));
      var mine = h('div', { cls: 'stack' });
      s.props.forEach(function (p) { mine.appendChild(propCard(p, redraw)); });
      el.appendChild(mine);
    }
    el.appendChild(h('h3', { text: 'For sale now' }));
    var ls = r.listingsNow().sort(function (a, b) { return a.ask - b.ask; });
    if (!ls.length) el.appendChild(h('div', { cls: 'empty', text: 'Nothing on the market this month. New listings appear all the time.' }));
    var wrap = h('div', { cls: 'stack' });
    ls.forEach(function (L) { wrap.appendChild(listingCard(L, redraw)); });
    el.appendChild(wrap);
    var sig = ls.map(function (L) { return L.id; }).join();
    U.on(function () { if ((s.d - s.day0) % 5) return; var now = r.listingsNow().map(function (L) { return L.id; }).sort().join(); var was = sig.split(',').sort().join(); if (now !== was && !U.sheetCount()) { sig = now; redraw(); } });
    U.once('x_prop', 'Property', 'You buy with a down payment and a mortgage, collect rent, and pay the running costs. The loan multiplies your result: if the property rises 10% and you put down 20%, your stake rises about 50%. The same works in reverse. Property is slow and expensive to sell, so keep cash in reserve for empty months and repairs.');
  }
  function listingCard(L, redraw) {
    var r = G.run, s = r.s;
    var q = r.propQuote(L, L.ask, 0.2), est = r.listingEst(L), disc = L.ask / est - 1;
    return h('button', { cls: 'card tap', tap: function () { listingSheet(L, redraw); } },
      h('div', { cls: 'rowf' }, h('div', { cls: 'grow' }, h('div', { style: 'font-weight:700;font-size:16px', text: L.addr }), h('div', { cls: 'mute', style: 'font-size:13px', text: L.tname + ', ' + GRADE[L.grade].toLowerCase() })), h('div', { cls: 'right' }, h('div', { cls: 'disp', style: 'font-size:20px', text: f.ms(L.ask) }), h('div', { cls: 'mute', style: 'font-size:12px', text: 'asking' }))),
      h('div', { cls: 'rowf', style: 'flex-wrap:wrap;gap:6px;margin-top:10px' },
        h('span', { cls: 'tag', text: 'Rent ' + f.m0(q.rent) + ' a month' }), h('span', { cls: 'tag', text: 'Cap rate ' + f.pct(q.cap) }),
        h('span', { cls: 'tag ' + (disc < -0.04 ? 'up' : disc > 0.04 ? 'down' : ''), text: disc < -0.04 ? Math.round(-disc * 100) + '% under estimate' : disc > 0.04 ? Math.round(disc * 100) + '% over estimate' : 'Near estimate' }),
        L.cond < 0.75 ? h('span', { cls: 'tag', style: 'background:rgba(243,168,86,.16);color:var(--warn)', text: 'Fixer-upper' }) : null, L.motiv ? h('span', { cls: 'tag brass', text: 'Motivated seller' }) : null));
  }
  function listingSheet(L, redraw) {
    var r = G.run, s = r.s, st = { pct: 100, down: 0.2 };
    U.sheet({ title: L.addr, full: true, build: function (b, ctl) {
      var est = r.listingEst(L), days = s.d - L.d0;
      b.appendChild(h('div', { cls: 'rowf', style: 'align-items:flex-end' }, h('div', { cls: 'pxbig', text: f.ms(L.ask) }), h('div', { cls: 'mute', style: 'padding-bottom:6px', text: 'asking price' })));
      b.appendChild(h('div', { cls: 'mute', style: 'font-size:13px', text: L.tname + (L.units > 1 ? ', ' + L.units + ' units' : '') + ', ' + GRADE[L.grade].toLowerCase() }));
      var facts = h('div', { cls: 'card', style: 'margin-top:12px' });
      facts.appendChild(U.kv('Area price estimate', f.ms(est)));
      facts.appendChild(U.kv('Condition', condWord(L.cond)));
      facts.appendChild(U.kv('On the market', days < 20 ? 'Just listed' : Math.round(days / 20) + ' month' + (days >= 40 ? 's' : '')));
      facts.appendChild(U.kv('Listing ends', 'around ' + f.date(L.d1 - s.day0)));
      b.appendChild(facts);
      if (L.motiv) b.appendChild(h('p', { cls: 'note', style: 'margin-top:10px', text: L.motiv + ' Sellers like this often take less.' }));
      if (L.cond < 0.75) { var rq = r.renoQuote({ full0: L.full0, d0: L.d0, cond: L.cond, rent0: L.rent0 }); b.appendChild(h('p', { cls: 'note', style: 'margin-top:10px', text: 'It needs about ' + f.ms(rq.cost) + ' of work over ' + rq.months + ' months, with no rent while it is done. Fixed up it should be worth about ' + f.ms(rq.newValue) + ' and rent for ' + f.m0(rq.newRent) + ' a month.' })); }
      b.appendChild(h('p', { cls: 'mute', style: 'font-size:12.5px;margin-top:8px', text: 'The estimate is a guide, usually within a few percent. ' + (L.grade === 'A' ? 'Prime areas rent for less against their price but sit empty less often.' : L.grade === 'C' ? 'Rough areas pay more rent against their price, with more empty months and repairs.' : '') }));

      b.appendChild(h('h3', { text: 'Your offer' }));
      var offerLbl = h('div', { cls: 'disp', style: 'font-size:24px' }), sl = h('input', { id: 'offer-sl', type: 'range', min: '80', max: '102', step: '1', value: '100', 'aria-label': 'Offer as a percent of asking' });
      b.appendChild(h('div', { cls: 'card stack' }, h('div', { cls: 'rowf' }, h('div', { cls: 'grow' }, offerLbl), h('div', { cls: 'mute', id: 'offer-pct' })), sl,
        h('p', { cls: 'mute', style: 'font-size:12.5px', text: 'Offer too little and the seller walks away for a month. The longer a place has sat unsold, the lower they will go.' })));
      b.appendChild(h('h3', null, U.term('Down payment', 'down')));
      var opts = [[0.1, '10%'], [0.2, '20%'], [0.35, '35%'], [1, 'All cash']];
      b.appendChild(U.seg(opts, function () { return st.down; }, function (v) { st.down = v; paint(); }));
      var info = h('div', { cls: 'card', style: 'margin-top:12px' }), go = h('button', { cls: 'btn pri', style: 'margin-top:14px', text: 'Make this offer' });
      b.appendChild(info); b.appendChild(go);
      function price() { return Math.round(L.ask * st.pct / 100 / 50000) * 50000; }
      function paint() {
        var p = price(), q = r.propQuote(L, p, st.down);
        offerLbl.textContent = f.ms(p); document.getElementById('offer-pct').textContent = st.pct + '% of asking';
        U.clear(info);
        info.appendChild(U.kv('Down payment', f.ms(q.down)));
        info.appendChild(U.kv(U.term('Closing costs', 'closing'), f.ms(q.closing)));
        info.appendChild(U.kv('Cash you need today', h('span', { cls: q.need > s.cash ? 'down' : '', text: f.ms(q.need) }), 'total'));
        if (q.loan > 0) { info.appendChild(U.kv('Mortgage', f.ms(q.loan) + ' at ' + q.rate.toFixed(2) + '%')); info.appendChild(U.kv('Monthly payment', f.m0(q.pay + q.pmi) + (q.pmi ? ' incl. insurance' : ''))); }
        info.appendChild(U.kv('Rent when let', f.m0(q.rent) + ' a month'));
        info.appendChild(U.kv('Typical running costs', f.m0(q.costs) + ' a month'));
        var cf = q.rent - q.costs - q.pay - q.pmi;
        info.appendChild(U.kv('Left over in a normal month', h('span', { cls: f.sign(cf), text: f.mp(cf) }), 'total'));
        info.appendChild(U.kv(U.term('Cap rate at this price', 'caprate'), f.pct(q.cap)));
        if (q.loan > 0) info.appendChild(U.kv(U.term('Your debt-to-income', 'dti'), h('span', { cls: q.dti.ok ? '' : 'down', text: Math.round(q.dti.ratio * 100) + '% (limit 43%)' })));
        if (q.loan > 0 && q.cap < q.rate / 100) info.appendChild(h('p', { cls: 'down', style: 'font-size:13px;margin-top:8px', text: 'The cap rate is below the mortgage rate. Borrowing to buy this loses money each month unless prices rise.' }));
        var cool = s.offers[L.id] && s.d - s.offers[L.id] < 20;
        go.disabled = cool; go.textContent = cool ? 'Seller will not hear offers until next month' : 'Make this offer';
      }
      sl.addEventListener('input', function () { st.pct = +sl.value; paint(); BW.Audio.play('scrub'); });
      paint();
      U.tap(go, function () {
        var o = r.propOffer(L.id, price(), st.down);
        if (o.ok) { U.toast('Offer accepted. It is yours', { kind: 'good', sub: L.addr + ' for ' + f.ms(price()) }); BW.Audio.play('bell1'); BW.Audio.buzz([20, 60, 20]); App.touch(); ctl.close(true); redraw(); }
        else { U.toast(o.why, { kind: 'bad', ms: 4500 }); BW.Audio.play(o.rejected ? 'bad' : 'error'); App.touch(); paint(); }
      });
    } });
  }
  function propStatus(p) { return p.sale ? 'For sale. Should close around ' + f.date(p.sale.d - G.run.s.day0) : p.reno > 0 ? 'Being renovated, ' + p.reno + ' month' + (p.reno > 1 ? 's' : '') + ' left' : p.units > 1 ? 'Let' : p.vacant > 0 ? 'Empty. Looking for a tenant' : 'Let'; }
  function propCard(p, redraw) {
    var r = G.run;
    var net = h('span'); U.on(function () { var n = p.lastNet || 0; net.textContent = f.mp(n); net.className = f.sign(n); });
    return h('button', { cls: 'card tap', tap: function () { propSheet(p, redraw); } },
      h('div', { cls: 'rowf' }, h('div', { cls: 'grow' }, h('div', { style: 'font-weight:700;font-size:16px', text: p.addr }), h('div', { cls: 'mute', style: 'font-size:13px', live: function () { return p.tname + '. ' + propStatus(p); } })),
        h('div', { cls: 'right' }, h('div', { cls: 'disp', style: 'font-size:20px', live: function () { return f.ms(r.propValue(p) - (p.loan ? p.loan.bal : 0)); } }), h('div', { cls: 'mute', style: 'font-size:12px', text: 'your equity' }))),
      h('div', { cls: 'kv', style: 'margin-top:8px;border:0;padding-bottom:0' }, h('span', { text: 'Last month, after everything' }), net));
  }
  function propSheet(p, redraw) {
    var r = G.run, s = r.s;
    U.sheet({ title: p.addr, full: true, build: function (b, ctl) {
      var reg = U.region(b, function (host) {
        if (s.props.indexOf(p) < 0) { host.appendChild(h('div', { cls: 'empty', text: 'Sold.' })); return; }
        var card = h('div', { cls: 'card' });
        card.appendChild(U.kvLive('Worth today', function () { return f.ms(r.propValue(p)); }));
        card.appendChild(U.kvLive('Mortgage owed', function () { return p.loan ? f.ms(p.loan.bal) + ' at ' + p.loan.rate.toFixed(2) + '%' : 'None. Owned outright'; }));
        card.appendChild(U.kvLive(U.term('Your equity', 'equity'), function () { return f.ms(r.propValue(p) - (p.loan ? p.loan.bal : 0)); }, 'total'));
        card.appendChild(U.kv('You paid', f.ms(p.price) + ' in ' + f.date(p.buyD - s.day0)));
        card.appendChild(U.kvLive('Condition', function () { return condWord(p.cond); }));
        card.appendChild(U.kvLive('Status', function () { return propStatus(p); }));
        host.appendChild(card);
        var m = h('div', { cls: 'card', style: 'margin-top:10px' });
        m.appendChild(U.kvLive('Rent when let', function () { return f.m0(r.propRent(p)) + ' a month'; }));
        m.appendChild(U.kvLive('Mortgage payment', function () { return p.loan ? f.m0(p.loan.pay) + ' a month' : 'None'; }));
        m.appendChild(U.kvLive('Last month, after everything', function () { return f.mp(p.lastNet || 0); }));
        m.appendChild(U.kvLive('Total pocketed since you bought', function () { return f.mp(p.net); }));
        host.appendChild(m);
        host.appendChild(h('h3', { text: 'What you can do' }));
        var acts = h('div', { cls: 'stack' });
        if (!p.sale && p.reno === 0 && p.cond < 0.97) { var rq = r.renoQuote(p);
          acts.appendChild(h('button', { cls: 'btn', text: 'Renovate for ' + f.ms(rq.cost), tap: function () { U.confirm({ title: 'Renovate?', body: 'Costs ' + f.ms(rq.cost) + ' and takes ' + rq.months + ' months with no rent. Afterwards it should be worth about ' + f.ms(rq.newValue) + ' (now ' + f.ms(r.propValue(p)) + ') and rent for ' + f.m0(rq.newRent) + ' a month (now ' + f.m0(r.propRent(p)) + ').', yes: 'Start the work',
            onYes: function () { var o = r.propRenovate(p.id); if (o.ok) { U.toast('Builders are in', { kind: 'good', sub: 'Done in ' + o.months + ' months.' }); BW.Audio.play('thunk'); App.touch(); reg.render(); } else { U.toast(o.why, { kind: 'bad' }); BW.Audio.play('error'); } } }); } })); }
        if (!p.sale) { var fq = r.refiQuote(p);
          acts.appendChild(h('button', { cls: 'btn', text: fq.cashOut > 0 ? 'Refinance and take out ' + f.ms(fq.cashOut) : 'Refinance', tap: function () { var q2 = r.refiQuote(p);
            U.confirm({ title: 'Refinance?', body: h('div', { cls: 'stack' }, h('p', { cls: 'lead', text: 'A new 30-year mortgage for 75% of what the property is worth today, replacing the old one.' }),
              h('div', { cls: 'card' }, U.kv('New mortgage', f.ms(q2.loan) + ' at ' + q2.rate.toFixed(2) + '%'), U.kv('Old mortgage', p.loan ? f.ms(p.loan.bal) + ' at ' + q2.oldRate.toFixed(2) + '%' : 'None'), U.kv('Fees', f.ms(q2.closing)), U.kv(q2.cashOut >= 0 ? 'Cash to you' : 'Cash you must add', f.ms(Math.abs(q2.cashOut)), 'total'), U.kv('Payment', f.m0(q2.pay) + ' a month (was ' + f.m0(q2.oldPay) + ')'))),
              yes: 'Refinance', onYes: function () { var o = r.propRefi(p.id); if (o.ok) { U.toast('Refinanced', { kind: 'good', sub: o.cashOut > 0 ? f.ms(o.cashOut) + ' is in your cash.' : 'New rate ' + o.rate.toFixed(2) + '%' }); BW.Audio.play('sell'); App.touch(); reg.render(); } else { U.toast(o.why, { kind: 'bad', ms: 4500 }); BW.Audio.play('error'); } } }); } })); }
        if (p.loan && !p.sale) acts.appendChild(h('button', { cls: 'btn', text: 'Pay down the mortgage', tap: function () { amountSheet({ title: 'Pay down the mortgage', lead: 'Saves you ' + p.loan.rate.toFixed(2) + '% a year on every dollar, guaranteed.', max: function () { return Math.min(Math.max(0, s.cash), p.loan ? p.loan.bal : 0); }, go: 'Pay',
          onGo: function (a) { var o = r.propPaydown(p.id, a); if (o.ok) { U.toast('Paid ' + f.ms(o.paid) + ' off the mortgage', { kind: 'good' }); BW.Audio.play('sell'); reg.render(); } return o; } }); } }));
        if (p.sale) acts.appendChild(h('button', { cls: 'btn ghost', text: 'Take it off the market', tap: function () { r.propCancelSale(p.id); App.touch(); reg.render(); } }));
        else if (p.reno > 0) acts.appendChild(h('p', { cls: 'note', text: 'The builders are in for ' + p.reno + ' more month' + (p.reno > 1 ? 's' : '') + '. You can sell once the work is finished.' }));
        else {
          acts.appendChild(h('button', { cls: 'btn', text: 'Put it up for sale', tap: function () { var q3 = r.saleQuote(p, false);
            U.confirm({ title: 'Sell through an agent?', body: h('div', { cls: 'stack' }, h('p', { cls: 'lead', text: 'It takes one to four months to find a buyer, longer if the market is falling. Rent keeps coming in meanwhile.' }),
              h('div', { cls: 'card' }, U.kv('Likely price', f.ms(q3.px)), U.kv(U.term('Closing costs', 'closing'), f.ms(q3.closing)), U.kv('Mortgage to repay', f.ms(q3.bal)), U.kv('Tax on the gain', f.ms(q3.tax)), U.kv('You walk away with about', f.ms(q3.net), 'total'))),
              yes: 'List it', onYes: function () { var o = r.propSell(p.id, false); if (o.ok) { U.toast('Listed for sale', { sub: 'Expect a buyer in about ' + Math.round(o.days / 20) + ' months.' }); App.touch(); reg.render(); } else { U.toast(o.why || 'That did not go through.', { kind: 'bad', ms: 4500 }); BW.Audio.play('error'); } } }); } }));
          acts.appendChild(h('button', { cls: 'btn ghost', text: 'Sell today to a cash buyer', tap: function () { var q4 = r.saleQuote(p, true);
            U.confirm({ title: 'Take the fast offer?', body: h('div', { cls: 'stack' }, h('p', { cls: 'lead', text: 'An investor will pay cash today, at 12% under what it is worth. That discount is the price of speed.' }),
              h('div', { cls: 'card' }, U.kv('Price', f.ms(q4.px)), U.kv('Costs', f.ms(q4.closing)), U.kv('Mortgage to repay', f.ms(q4.bal)), U.kv('Tax on the gain', f.ms(q4.tax)), U.kv('You walk away with', f.ms(q4.net), 'total'))),
              yes: 'Sell now', danger: true, onYes: function () { var o = r.propSell(p.id, true); if (o.ok) { U.toast('Sold ' + p.addr, { kind: o.gain >= 0 ? 'good' : 'bad', sub: 'You walked away with ' + f.ms(o.net) }); BW.Audio.play('sell'); App.touch(); ctl.close(true); redraw(); } else { U.toast(o.why || 'That did not go through.', { kind: 'bad', ms: 4500 }); BW.Audio.play('error'); } } }); } }));
        }
        host.appendChild(acts);
      });
    }, onClose: function () { if (App.ui.tab === 'life' && prefs.ltab === 'prop') redraw(); } });
  }

  /* ---------- business ---------- */
  function business(el, redraw) {
    var r = G.run, s = r.s;
    el.appendChild(h('p', { cls: 'note', text: 'You can run ' + (s.selfSlots > 1 ? s.selfSlots + ' businesses' : 'one business') + ' yourself and keep all the profit. Any other needs a manager, whose pay is about 30% of a normal year\'s profit, good year or bad.' }));
    if (s.biz.length) {
      el.appendChild(h('h3', { text: 'Yours' }));
      var mine = h('div', { cls: 'stack' });
      s.biz.forEach(function (x) { mine.appendChild(bizCard(x, redraw)); });
      el.appendChild(mine);
    }
    el.appendChild(h('h3', { text: 'For sale' }));
    var list = h('div', { cls: 'list' });
    G.tape.dest.biz.forEach(function (b) {
      if (r._biz(b.id)) return;
      var cost = h('div', { cls: 'v1' }), row;
      U.on(function () { var c = r.bizCost(b); cost.textContent = f.ms(c); cost.className = 'v1' + (c > s.cash ? ' mute' : ''); });
      row = h('button', { cls: 'item', tap: function () { bizBuySheet(b, redraw); } }, h('span', { cls: 'logo', style: 'background:var(--bg3);color:var(--ink)', html: U.icon('shop') }),
        h('span', { cls: 'grow' }, h('div', { cls: 't1', text: b.name }), h('div', { cls: 't2', live: function () { return 'Earns about ' + f.ms(r.bizBase(b, 1)) + ' a year'; } })), h('span', { cls: 'right' }, cost));
      list.appendChild(row);
    });
    el.appendChild(list);
    U.once('x_biz', 'Owning a business', 'A business pays you its profit every month. Profit swings with the economy and with luck, and some months lose money. A buyer will always pay less than it cost to set up (about 15% less for a healthy one, far less for one that is struggling), so you cannot get your money straight back out. The upside is that a good one can out-earn the stock market.');
  }
  function bizBuySheet(b, redraw) {
    var r = G.run, s = r.s;
    U.sheet({ title: b.name, build: function (el, ctl) {
      var cost = r.bizCost(b), base = r.bizBase(b, 1), selfFree = r.selfCount() < s.selfSlots;
      el.appendChild(h('p', { cls: 'lead', text: b.desc }));
      var card = h('div', { cls: 'card', style: 'margin-top:12px' });
      card.appendChild(U.kv('Price', f.ms(cost)));
      card.appendChild(U.kv('Profit in a normal year, run by you', f.ms(base)));
      card.appendChild(U.kv('With a manager', f.ms(Math.round(base * 0.7))));
      card.appendChild(U.kv('What it would sell for tomorrow', f.ms(Math.round(cost * 0.85))));
      card.appendChild(U.kv('Feels a recession', b.cyc >= 1.4 ? 'Badly' : b.cyc >= 0.8 ? 'Yes' : 'A little'));
      card.appendChild(U.kv('Month to month', b.vol >= 0.3 ? 'Very lumpy' : b.vol >= 0.2 ? 'Lumpy' : 'Fairly steady'));
      el.appendChild(card);
      el.appendChild(h('p', { cls: 'mute', style: 'font-size:13px;margin-top:8px', text: selfFree ? 'You have time to run this one yourself.' : 'You are already running a business, so this one gets a manager unless you swap.' }));
      var go = h('button', { cls: 'btn pri', style: 'margin-top:14px', text: 'Buy for ' + f.ms(cost), tap: function () {
        var o = r.bizBuy(b.id);
        if (o.ok) { U.toast('You own a ' + b.name, { kind: 'good', sub: o.biz.self ? 'You are running it yourself.' : 'A manager is running it.' }); BW.Audio.play('bell1'); BW.Audio.buzz([20, 60, 20]); App.touch(); ctl.close(true); redraw(); }
        else { U.toast(o.why, { kind: 'bad' }); BW.Audio.play('error'); } } });
      go.disabled = cost > s.cash;
      el.appendChild(go);
      if (cost > s.cash) el.appendChild(h('p', { cls: 'mute', style: 'font-size:13px;margin-top:8px;text-align:center', text: 'You need ' + f.ms(cost - s.cash) + ' more in cash.' }));
    } });
  }
  function bizCard(x, redraw) {
    var r = G.run, b = BW.BIZ_BY[x.type];
    var last = h('span'); U.on(function () { var n = x.last || 0; last.textContent = x.ttm.length ? f.mp(n) : 'First month pending'; last.className = x.ttm.length ? f.sign(n) : 'mute'; });
    var card = h('div', { cls: 'card stack' });
    card.appendChild(h('div', { cls: 'rowf' }, h('div', { cls: 'grow' }, h('div', { style: 'font-weight:700;font-size:16px', text: b.name }), h('div', { cls: 'mute', style: 'font-size:13px', text: 'Level ' + x.lvl + '. ' + (x.self ? 'You run it.' : 'A manager runs it.') })),
      h('div', { cls: 'right' }, h('div', { cls: 'disp', style: 'font-size:20px', live: function () { return f.ms(r.bizValue(x)); } }), h('div', { cls: 'mute', style: 'font-size:12px', text: 'what it would sell for' }))));
    card.appendChild(h('div', null, h('div', { cls: 'kv' }, h('span', { text: 'Profit last month' }), last), U.kvLive('Kept so far, after tax', function () { return f.mp(x.net); })));
    var up = r.bizUpCost(b, x.lvl), btns = h('div', { cls: 'btns', style: 'flex-wrap:wrap' });
    if (x.lvl < 10) btns.appendChild(h('button', { cls: 'btn sm', style: 'flex:1 1 100%', text: 'Expand for ' + f.ms(up), tap: function () {
      U.confirm({ title: 'Expand the ' + b.name + '?', body: 'Costs ' + f.ms(up) + ' and lifts normal yearly profit from ' + f.ms(r.bizBase(b, x.lvl)) + ' to ' + f.ms(r.bizBase(b, x.lvl + 1)) + '. Each expansion costs more than the last for the same boost.', yes: 'Expand',
        onYes: function () { var o = r.bizUpgrade(x.type); if (o.ok) { U.toast(b.name + ' is now level ' + o.lvl, { kind: 'good' }); BW.Audio.play('unlock'); App.touch(); redraw(); } else { U.toast(o.why, { kind: 'bad' }); BW.Audio.play('error'); } } }); } }));
    btns.appendChild(h('button', { cls: 'btn sm', style: 'flex:1', text: x.self ? 'Hire a manager' : 'Run it myself', tap: function () { var o = r.bizSetSelf(x.type, !x.self); if (o.ok) { App.touch(); redraw(); } else { U.toast(o.why, { kind: 'bad', ms: 4200 }); BW.Audio.play('error'); } } }));
    btns.appendChild(h('button', { cls: 'btn sm ghost', style: 'flex:1', text: 'Sell', tap: function () { var q = r.bizSellQuote(x);
      U.confirm({ title: 'Sell the ' + b.name + '?', body: h('div', { cls: 'card' }, U.kv('A buyer pays', f.ms(q.px)), U.kv('You put in', f.ms(x.invested)), U.kv('Tax', f.ms(q.tax)), U.kv('You receive', f.ms(q.net), 'total')), yes: 'Sell it', danger: true,
        onYes: function () { var o = r.bizSell(x.type); if (o.ok) { U.toast('Sold the ' + b.name, { kind: o.gain >= 0 ? 'good' : 'bad', sub: 'You received ' + f.ms(o.net) }); BW.Audio.play('sell'); App.touch(); redraw(); } } }); } }));
    card.appendChild(btns);
    return card;
  }

  /* ======================= AUTOPILOT ======================= */
  S.autopilot = function (after) {
    var r = G.run, s = r.s, tape = G.tape;
    var st = { on: s.auto.on, keep: s.auto.keep, alloc: s.auto.alloc.map(function (a) { return { id: a.id, pct: a.pct }; }) };
    U.sheet({ title: 'Auto-invest', full: true, build: function (b, ctl) {
      b.appendChild(h('p', { cls: 'lead', text: 'Each payday, any cash above your cushion is split across the things you pick. No fee beyond the usual trading cost. It runs at any speed, so you can set it and watch.' }));
      var body = h('div', { style: 'margin-top:12px' }); b.appendChild(body);
      var reg = U.region(body, function (host) {
        var list = h('div', { cls: 'list' });
        list.appendChild(U.switchRow('Auto-invest is ' + (st.on ? 'on' : 'off'), null, function () { return st.on; }, function (v) { st.on = v; reg.render(); }));
        host.appendChild(list);
        host.appendChild(h('h3', { text: 'Cash cushion to keep' }));
        var keeps = [[0, 'None'], [100000, '$1,000'], [500000, '$5,000'], [2000000, '$20,000'], [10000000, '$100,000']];
        host.appendChild(U.chips(keeps, function () { return st.keep; }, function (v) { st.keep = v; }, true));
        host.appendChild(h('p', { cls: 'mute', style: 'font-size:12.5px;margin-top:6px', text: 'A cushion covers surprise bills so you never need the 24% card.' }));
        host.appendChild(h('h3', { text: 'Split each payday' }));
        var tot = 0; st.alloc.forEach(function (a) { tot += a.pct; });
        if (st.alloc.length) { var al = h('div', { cls: 'card stack' });
          st.alloc.forEach(function (a, i) { var asset = tape.assets[a.id], lbl = h('b', { cls: 'num', text: a.pct + '%' });
            var sl = h('input', { id: 'ap-sl-' + i, type: 'range', min: '0', max: '100', step: '5', value: String(a.pct), 'aria-label': 'Share for ' + asset.name });
            sl.addEventListener('input', function () { a.pct = +sl.value; lbl.textContent = a.pct + '%'; sum(); });
            al.appendChild(h('div', null, h('div', { cls: 'rowf' }, U.logo(asset, 'sm'), h('span', { cls: 'grow t1', style: 'font-weight:600', text: asset.name }), lbl, h('button', { cls: 'chip sm', text: 'Remove', tap: function () { st.alloc.splice(i, 1); reg.render(); } })), sl)); });
          host.appendChild(al); }
        var sumEl = h('p', { style: 'font-size:13.5px;margin-top:8px' }); host.appendChild(sumEl);
        function sum() { var t = 0; st.alloc.forEach(function (a) { t += a.pct; }); sumEl.textContent = !st.alloc.length ? 'Nothing chosen yet.' : t === 100 ? 'Adds up to 100%.' : t < 100 ? 'Adds up to ' + t + '%. The other ' + (100 - t) + '% stays in cash.' : 'Adds up to ' + t + '%. Bring it down to 100% or less.'; sumEl.className = t > 100 ? 'down' : 'mute'; save.disabled = t > 100; }
        host.appendChild(h('div', { cls: 'btns', style: 'margin-top:10px;flex-wrap:wrap' },
          h('button', { cls: 'btn sm', text: 'Add something', tap: function () { pick(function (id) { if (!st.alloc.some(function (a) { return a.id === id; })) st.alloc.push({ id: id, pct: st.alloc.length ? 0 : 100 }); reg.render(); }); } }),
          h('button', { cls: 'btn sm ghost', text: 'Copy Dolly', tap: function () { st.alloc = [{ id: 'herd', pct: 100 }]; st.on = true; st.keep = 100000; reg.render(); } }),
          h('button', { cls: 'btn sm ghost', text: '60% stocks, 40% bonds', tap: function () { st.alloc = [{ id: 'herd', pct: 60 }, { id: 'bgov', pct: 40 }]; st.on = true; reg.render(); } })));
        var save = h('button', { cls: 'btn pri', style: 'margin-top:18px', text: 'Save', tap: function () {
          r.setAuto({ on: st.on && st.alloc.length > 0, keep: st.keep, alloc: st.alloc.filter(function (a) { return a.pct > 0; }) });
          App.touch(); U.toast(s.auto.on ? 'Auto-invest is on' : 'Auto-invest is off', { kind: s.auto.on ? 'good' : '' }); BW.Audio.play('unlock'); ctl.close(true); if (after) after(); } });
        host.appendChild(save); sum();
      });
    } });
    function pick(cb) {
      U.sheet({ title: 'Add to auto-invest', full: true, build: function (b, ctl) {
        var list = h('div', { cls: 'list' });
        tape.order.map(function (id) { return tape.assets[id]; }).filter(function (a) { return T.alive(a, s.d) && (a.kind !== 'crypto' || App.tool('coin')) && (a.kind !== 'sfund' || App.tool('sectorfunds')); })
          .sort(function (a, c) { var o = { fund: 0, bond: 1, sfund: 2, cmdty: 3, crypto: 4, stock: 5 }; return o[a.kind] - o[c.kind] || (a.name < c.name ? -1 : 1); })
          .forEach(function (a) { list.appendChild(h('button', { cls: 'item', style: 'min-height:52px', tap: function () { ctl.close(true); cb(a.id); } }, U.logo(a, 'sm'), h('span', { cls: 'grow t1', text: a.name }), h('span', { cls: 't2', text: a.tkr }))); });
        b.appendChild(list);
      } });
    }
  };

  /* ======================= MORE ======================= */
  S.more = function (el) {
    var r = G.run, s = r.s;
    function row(icon, title, sub2, fn) { return h('button', { cls: 'item', tap: fn }, h('span', { cls: 'logo', style: 'background:var(--bg3);color:var(--brass)', html: U.icon(icon) }), h('span', { cls: 'grow' }, h('div', { cls: 't1', text: title }), h('div', { cls: 't2', style: 'white-space:normal', text: sub2 })), h('span', { html: U.icon('chev'), style: 'width:20px;color:var(--ink3)' })); }
    var l1 = h('div', { cls: 'list' });
    l1.appendChild(row('globe', 'Economy', 'Growth, inflation, interest rates, jobs, housing', S.economy));
    l1.appendChild(row('book', 'Glossary', 'Every money word, in plain English', S.glossary));
    l1.appendChild(row('dice', 'Casino', s.fair ? 'Closed during challenges, to keep them fair' : 'A small side attraction. The house wins', function () { if (s.fair) { U.toast('The casino is closed during challenges and the Daily Tape.', { sub: 'Everyone has to play the same game.' }); return; } BW.Casino.open(); }));
    el.appendChild(l1);
    el.appendChild(h('h3', { text: 'This run' }));
    var c = h('div', { cls: 'card' });
    c.appendChild(U.kv('Scenario', G.scen.name));
    c.appendChild(U.kvLive('Time left', function () { var left = s.endD - s.d; return left > 240 ? (left / 240).toFixed(1) + ' years' : Math.round(left / 20) + ' months'; }));
    c.appendChild(h('button', { cls: 'kv', style: 'width:100%', tap: function () { S.shareCode(G.cfg.code); } }, h('span', { text: 'Challenge code for this market' }), h('span', { cls: 'brass num nowrap', text: G.cfg.code })));
    el.appendChild(c);
    var l2 = h('div', { cls: 'list', style: 'margin-top:10px' });
    l2.appendChild(row('gear', 'Settings', 'Sound, pausing, look', function () { S.settings(); }));
    l2.appendChild(row('home', 'Save and go to the hub', 'Your run waits for you', function () { App.setPaused(true); App.save(); App.toHub(); }));
    l2.appendChild(row('flag', 'Cash in now', 'End this run early and collect what you have earned', function () {
      var yrs = (s.d - s.day0) / 240;
      U.confirm({ title: 'End the run here?', body: yrs < 1 ? 'You have played less than a year, so this run earns no Bells and no lockbox.' : 'You will be scored on ' + yrs.toFixed(1) + ' years. Shorter runs earn fewer Bells, and a run ended before halfway earns no lockbox.', yes: 'Cash in', danger: true, onYes: function () { r.endEarly(); App.touch(); S.finish(); } }); }));
    el.appendChild(l2);
    el.appendChild(h('p', { cls: 'mute', style: 'font-size:12px;margin-top:16px;text-align:center', text: 'Bellwether build ' + (window.BW_BUILD || 'dev') + '. Play money only.' }));
  };

  S.glossary = function () {
    U.sheet({ title: 'Glossary', full: true, build: function (b) {
      var keys = Object.keys(U.GLOSS).sort(function (a, c) { return U.GLOSS[a][0].toLowerCase() < U.GLOSS[c][0].toLowerCase() ? -1 : 1; });
      var list = h('div', { cls: 'news' });
      keys.forEach(function (k) { var g = U.GLOSS[k], it = h('button', { cls: 'nitem' }, h('div', { cls: 'nh', style: 'margin:0', text: g[0] }), h('div', { cls: 'nb', text: g[1] })); U.tap(it, function () { it.classList.toggle('open'); }); list.appendChild(it); });
      b.appendChild(list);
    } });
  };

  S.economy = function () {
    var r = G.run, s = r.s, M = G.tape.M, d0 = 0;
    U.sheet({ title: 'The economy', full: true, build: function (b) {
      var charts = [];
      function panel(title, key, blurb, series, fmt, extra) {
        b.appendChild(h('h3', null, key ? U.term(title, key) : title));
        var now = h('div', { cls: 'disp', style: 'font-size:24px' }); b.appendChild(h('div', { cls: 'rowf', style: 'align-items:baseline' }, now, extra || null));
        var box = h('div');
        var ch = C.lines(box, { height: 150, n: function () { return Math.floor((s.d - d0) / 5) + 1; }, from: function () { return Math.max(0, Math.floor((s.d - d0) / 5) + 1 - (prefs.erange || 480)); },
          x: function (i, long) { var rel = d0 + i * 5 - s.day0; return long ? (rel < 0 ? (-rel / 240).toFixed(1) + ' years before you started' : f.dateLong(rel)) : (rel < 0 ? Math.ceil(-rel / 240) + 'y before' : 'Y' + BW.dateParts(rel).year); }, series: series, fmt: fmt, fmtTip: fmt, zero: false });
        b.appendChild(box); b.appendChild(h('p', { cls: 'mute', style: 'font-size:12.5px;margin-top:4px', text: blurb }));
        charts.push(ch); return now;
      }
      var pc = function (v) { return v.toFixed(1) + '%'; };
      b.appendChild(U.chips([[240, '5 years'], [480, '10 years'], [99999, 'Everything']], function () { return prefs.erange || 480; }, function (v) { prefs.erange = v; charts.forEach(function (c) { c.draw(); }); }, true));
      var e1 = panel('Economic growth', 'gdp', 'Around 2 to 3% is normal. Below zero for half a year is a recession. Official figures arrive a couple of months late.', [{ get: function (i) { return M.gdp[Math.max(0, d0 + i * 5 - 40)]; }, color: '--brass', fill: true }], pc);
      var e2 = panel('Inflation', 'inflation', 'How fast prices are rising. The Reserve aims for about 2%.', [{ get: function (i) { return M.infl[d0 + i * 5]; }, color: '--warn' }], pc);
      var e3 = panel('Interest rates', 'rate', 'Solid line: the Reserve\'s rate, which sets what savings pay. Dashed: what lenders charge for ten years.', [{ get: function (i) { return M.y10[d0 + i * 5]; }, color: '--ink3', dash: [5, 4], name: '10-year' }, { get: function (i) { return M.rate[d0 + i * 5]; }, color: '--info', name: 'Reserve' }], pc);
      var e4 = panel('Unemployment', 'unemp', 'Rises late in a downturn and falls late in a recovery.', [{ get: function (i) { return M.unemp[d0 + i * 5]; }, color: '--down' }], pc);
      var e5 = panel('Home prices', null, 'Yearly change in what homes sell for. Rising mortgage rates cool it.', [{ get: function (i) { var d = d0 + i * 5; return d >= 240 ? (M.housing[d] / M.housing[d - 240] - 1) * 100 : null; }, color: '--brass2', fill: true }], pc);
      var e6 = null, e7 = null, e8 = null;
      if (App.tool('econlab')) {
        b.appendChild(h('h2', { style: 'margin-top:26px', text: 'Economy Lab' }));
        e6 = panel('Market P/E', 'mktpe', 'What investors pay for each dollar of profit across the whole market. High means optimism is already in the price.', [{ get: function (i) { return M.pe[d0 + i * 5]; }, color: '--brass' }], function (v) { return v.toFixed(1); });
        e7 = panel('Long rates minus short rates', 'curve', 'Below zero means short-term rates are above long-term ones. That has come before most recessions.', [{ get: function (i) { var d = d0 + i * 5; return M.y10[d] - M.rate[d]; }, color: '--info', fill: true }], function (v) { return v.toFixed(2) + ' pts'; });
        e8 = panel('Lending stress', 'stress', 'Extra interest that shaky borrowers pay over the government. Spikes when lenders get scared.', [{ get: function (i) { return M.hys[d0 + i * 5]; }, color: '--down', fill: true }], pc);
      } else b.appendChild(h('p', { cls: 'note', style: 'margin-top:18px', text: 'The Economy Lab adds the gauges professionals watch: how expensive the market is, long against short interest rates, and stress in lending. Unlock it in the hub.' }));
      var last = -1;
      U.on(function () {
        var d = s.d; if (d === last) return; last = d;
        e1.textContent = M.gdp[Math.max(0, d - 40)].toFixed(1) + '%'; e2.textContent = M.infl[d].toFixed(1) + '%'; e3.textContent = M.rate[d].toFixed(2) + '%'; e4.textContent = M.unemp[d].toFixed(1) + '%';
        e5.textContent = d >= 240 ? f.pp(M.housing[d] / M.housing[d - 240] - 1) : 'n/a';
        if (e6) { e6.textContent = M.pe[d].toFixed(1); e7.textContent = (M.y10[d] - M.rate[d]).toFixed(2) + ' pts'; e8.textContent = M.hys[d].toFixed(1) + '%'; }
        if ((d - s.day0) % 5 === 0 || last < 0) charts.forEach(function (c) { c.draw(); });
      });
      charts.forEach(function (c) { c.draw(); });
    } });
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
