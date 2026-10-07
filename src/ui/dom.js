/* UI kit: element builder, live bindings, sheets, toasts, formatting, icons, glossary. */
(function (root) {
  'use strict';
  var BW = root.BW, U = BW.UI = {};

  U.h = function (tag, props) {
    var el = document.createElement(tag), i, k;
    if (props) for (k in props) {
      var v = props[k];
      if (v == null || v === false) continue;
      if (k === 'cls') el.className = v;
      else if (k === 'text') el.textContent = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k === 'on') { for (var e in v) el.addEventListener(e, v[e]); }
      else if (k === 'tap') U.tap(el, v);
      else if (k === 'style') el.style.cssText = v;
      else if (k === 'live') U.live(el, v);
      else el.setAttribute(k, v === true ? '' : v);
    }
    for (i = 2; i < arguments.length; i++) U.add(el, arguments[i]);
    return el;
  };
  U.add = function (el, c) {
    if (c == null || c === false) return el;
    if (Array.isArray(c)) { for (var i = 0; i < c.length; i++) U.add(el, c[i]); return el; }
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
    return el;
  };
  U.clear = function (el) { while (el.firstChild) el.removeChild(el.firstChild); return el; };
  U.tap = function (el, fn) {
    el.addEventListener('click', function (e) {
      if (el.disabled) return;
      if (BW.Audio) BW.Audio.unlock();
      fn(e);
    });
  };

  /* ---------- live bindings ---------- */
  var scopes = [[]]; // scope 0: always-on chrome
  U.scopeTop = scopes[0];
  U.cur = scopes[0];
  U.newScope = function (parent) { var s = []; s.kids = []; scopes.push(s); if (parent) (parent.kids = parent.kids || []).push(s); return s; };
  U.dropScope = function (s) {
    if (s.kids) { s.kids.forEach(U.dropScope); s.kids = []; }
    var i = scopes.indexOf(s); if (i > 0) scopes.splice(i, 1);
  };
  U.on = function (fn) { U.cur.push(fn); try { fn(); } catch (e) { console.error(e); } return fn; };
  U.live = function (el, fn) {
    var last = null;
    U.on(function () { var v = fn(); if (v !== last) { last = v; el.textContent = v == null ? '' : v; } });
    return el;
  };
  U.liveCls = function (el, base, fn) {
    var last = null;
    U.on(function () { var v = fn(); if (v !== last) { last = v; el.className = base + (v ? ' ' + v : ''); } });
    return el;
  };
  U.refresh = function () {
    for (var i = 0; i < scopes.length; i++) { var s = scopes[i]; for (var j = 0; j < s.length; j++) { try { s[j](); } catch (e) { console.error(e); } } }
  };

  /* ---------- formatting ---------- */
  var F = U.f = {};
  F.money = function (c, o) { return BW.fmtMoney(c, o); };
  F.m0 = function (c) { return BW.fmtMoney(c, { whole: true }); };              // whole dollars
  F.ma = function (c) { return BW.fmtMoney(c, { auto: true }); };               // cents only under $1,000
  F.ms = function (c) { return Math.abs(c) >= 1e9 ? BW.fmtMoney(c, { short: true }) : BW.fmtMoney(c, { whole: true }); }; // short once it gets silly
  F.mp = function (c) { return BW.fmtMoney(c, { whole: Math.abs(c) >= 100000, plus: c > 0 }); };
  F.px = function (c) { return BW.fmtMoney(c); };
  F.pct = function (x, dp, plus) { if (x == null || !isFinite(x)) return 'n/a'; return (plus && x > 0 ? '+' : '') + (x * 100).toFixed(dp == null ? 1 : dp) + '%'; };
  F.pp = function (x, dp) { return F.pct(x, dp, true); };
  F.num = function (x, dp) { if (x == null || !isFinite(x)) return 'n/a'; return x.toFixed(dp == null ? 1 : dp); };
  F.big = function (m) { // $ millions to words
    var a = Math.abs(m); return (m < 0 ? '-' : '') + '$' + (a >= 1000 ? (a / 1000).toFixed(a >= 10000 ? 0 : 1) + 'B' : a >= 10 ? Math.round(a) + 'M' : a.toFixed(1) + 'M');
  };
  F.qty = function (q) { return q >= 1000 ? Math.round(q).toLocaleString('en-US') : q >= 10 ? q.toFixed(2) : q.toFixed(4); };
  F.date = function (rel) { var p = BW.dateParts(rel); return p.mname + ' Y' + p.year; };
  F.dateLong = function (rel) { var p = BW.dateParts(rel); return p.mname + ' ' + p.day + ', Year ' + p.year; };
  F.ago = function (days) { if (days <= 0) return 'today'; if (days < 5) return days + 'd ago'; if (days < 20) return Math.round(days / 5) + 'w ago'; if (days < 240) return Math.round(days / 20) + 'mo ago'; return (days / 240).toFixed(1) + 'y ago'; };
  F.sign = function (x) { return x > 0 ? 'up' : x < 0 ? 'down' : ''; };

  /* ---------- icons ---------- */
  var IC = {
    home: '<path d="M4 11.5 12 4l8 7.5V20h-5.5v-5.5h-5V20H4z"/>',
    market: '<path d="M6 4v3M6 15v5M18 4v6M18 17v3M12 3v4M12 13v8"/><rect x="4" y="7" width="4" height="8" rx="1"/><rect x="10" y="7" width="4" height="6" rx="1"/><rect x="16" y="10" width="4" height="7" rx="1"/>',
    news: '<path d="M5 5h11v14H7a2 2 0 0 1-2-2zM16 9h3v8a2 2 0 0 1-2 2M8 9h5M8 12.5h5M8 16h3"/>',
    life: '<path d="M4 9h16v10H4zM9 9V6h6v3M4 13.5h16M11 13.5v2h2v-2"/>',
    more: '<circle cx="6" cy="6" r="1.6"/><circle cx="12" cy="6" r="1.6"/><circle cx="18" cy="6" r="1.6"/><circle cx="6" cy="12" r="1.6"/><circle cx="12" cy="12" r="1.6"/><circle cx="18" cy="12" r="1.6"/><circle cx="6" cy="18" r="1.6"/><circle cx="12" cy="18" r="1.6"/><circle cx="18" cy="18" r="1.6"/>',
    play: '<path d="M7 4.5v15l12-7.5z" fill="currentColor"/>', pause: '<path d="M7 5h3.5v14H7zM13.5 5H17v14h-3.5z" fill="currentColor" stroke="none"/>',
    x: '<path d="M5 5l14 14M19 5 5 19"/>', chev: '<path d="m9 5 7 7-7 7"/>', back: '<path d="m15 5-7 7 7 7"/>',
    bell: '<path d="M12 3.5c-3.3 0-5.2 2.5-5.2 5.6 0 4.4-1.8 5.6-2.3 6.9h15c-.5-1.3-2.3-2.5-2.3-6.9 0-3.1-1.9-5.6-5.2-5.6zM10 19a2 2 0 0 0 4 0M12 2v1.5" />',
    star: '<path d="m12 3.6 2.6 5.4 5.9.8-4.3 4.1 1 5.9L12 17l-5.2 2.8 1-5.9L3.500 9.800l5.900-.800z"/>',
    lock: '<rect x="5.500" y="10.500" width="13" height="9.500" rx="2"/><path d="M8.500 10.500V8a3.500 3.500 0 0 1 7 0v2.500"/>',
    check: '<path d="m5 12.5 4.500 4.500L19 7"/>', info: '<circle cx="12" cy="12" r="8.500"/><path d="M12 11v5.500M12 7.600v.300"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0zM8 6H4.500c0 3 1.500 4.500 3.800 4.800M16 6h3.500c0 3-1.500 4.500-3.800 4.800M12 13v4M8.500 20h7M10 17h4"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M12 3v2.500M12 18.500V21M3 12h2.500M18.500 12H21M5.600 5.600l1.800 1.800M16.600 16.600l1.800 1.800M5.600 18.400l1.800-1.800M16.600 7.400l1.800-1.800"/>',
    share: '<path d="M12 15V4M8 7.500 12 4l4 3.500M5 12v7h14v-7"/>', copy: '<rect x="8" y="8" width="11" height="12" rx="2"/><path d="M5 16V6a2 2 0 0 1 2-2h8"/>',
    dice: '<rect x="4" y="4" width="16" height="16" rx="3.500"/><circle cx="8.500" cy="8.500" r="1" fill="currentColor"/><circle cx="15.500" cy="15.500" r="1" fill="currentColor"/><circle cx="12" cy="12" r="1" fill="currentColor"/>',
    globe: '<circle cx="12" cy="12" r="8.500"/><path d="M3.500 12h17M12 3.500c3 3 3 14 0 17M12 3.500c-3 3-3 14 0 17"/>',
    book: '<path d="M5 5.500c2.500-1 5-1 7 .500v13c-2-1.500-4.500-1.500-7-.500zM19 5.500c-2.500-1-5-1-7 .500v13c2-1.500 4.500-1.500 7-.500z"/>',
    box: '<path d="M4 9h16v10H4zM4 9l2-4h12l2 4M10.500 12.500h3"/>', flag: '<path d="M6 21V4M6 5h11l-2 3.500 2 3.500H6"/>',
    house: '<path d="M4 11.500 12 5l8 6.500M6 10.500V19h12v-8.500M10 19v-5h4v5"/>', shop: '<path d="M4 9.500 5.500 5h13L20 9.500M5 9.500V19h14V9.500M4 9.500h16M9.500 19v-5h5v5"/>',
    wallet: '<path d="M4 7.500A2.500 2.500 0 0 1 6.500 5H18v3M4 7.500V17a2 2 0 0 0 2 2h14V8H6.500A2.500 2.500 0 0 1 4 7.500zM16 13.500h1"/>',
    people: '<circle cx="9" cy="9" r="3"/><path d="M3.500 19c.500-3 2.700-4.500 5.500-4.500s5 1.500 5.500 4.500M15.500 6.500a3 3 0 0 1 0 5.500M17 14.800c2 .600 3.200 2 3.500 4.200"/>',
    clock: '<circle cx="12" cy="12" r="8.500"/><path d="M12 7v5l3.500 2"/>', sound: '<path d="M4 10v4h3.500L12 18V6l-4.500 4zM15.500 9a4 4 0 0 1 0 6M18 6.500a7.500 7.500 0 0 1 0 11"/>'
  };
  U.icon = function (name) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.800" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (IC[name] || '') + '</svg>'; };
  U.ic = function (name) { var s = U.h('span', { html: U.icon(name), style: 'display:inline-grid;place-items:center' }); return s; };

  /* ---------- sheets ---------- */
  var stack = [];
  U.sheetCount = function () { return stack.length; };
  // opts: { title, full, build(body, ctl), foot(el, ctl), onClose }
  U.sheet = function (opts) {
    var host = document.getElementById('sheets');
    var scope = U.newScope();
    U.cur = scope;
    var scrim = U.h('div', { cls: 'scrim' });
    var body = U.h('div', { cls: 'sh-body' });
    var title = U.h('div', { cls: 'ttl', text: opts.title || '' });
    var ctl = { el: null, body: body, scope: scope, closed: false, setTitle: function (t) { title.textContent = t; } };
    var el = U.h('div', { cls: 'sheet' + (opts.full ? ' full' : ''), role: 'dialog' },
      U.h('div', { cls: 'sh-head' }, opts.head || null, title, U.h('button', { cls: 'x', 'aria-label': 'Close', html: U.icon('x'), tap: function () { ctl.close(); } })), body);
    ctl.el = el;
    if (opts.foot) { var foot = U.h('div', { cls: 'sh-foot' }); opts.foot(foot, ctl); el.appendChild(foot); }
    ctl.close = function (silent) {
      if (ctl.closed) return; ctl.closed = true;
      var i = stack.indexOf(ctl); if (i >= 0) stack.splice(i, 1);
      U.dropScope(scope);
      if (U.cur === scope) U.cur = stack.length ? stack[stack.length - 1].scope : U.baseScope || scopes[0];
      el.classList.remove('in'); scrim.classList.remove('in');
      setTimeout(function () { if (el.parentNode) host.removeChild(el); if (scrim.parentNode) host.removeChild(scrim); }, 260);
      if (opts.onClose) opts.onClose();
      if (!silent && BW.Audio) BW.Audio.play('close');
    };
    U.tap(scrim, function () { ctl.close(); });
    host.appendChild(scrim); host.appendChild(el);
    opts.build(body, ctl);
    stack.push(ctl);
    U.cur = scope; // while this sheet is on top, new bindings attach to it
    requestAnimationFrame(function () { requestAnimationFrame(function () { el.classList.add('in'); scrim.classList.add('in'); }); });
    if (BW.Audio) BW.Audio.play('open');
    return ctl;
  };
  U.closeTop = function () { if (stack.length) { stack[stack.length - 1].close(); return true; } return false; };
  U.closeAll = function () { while (stack.length) stack[stack.length - 1].close(true); };
  // run a render function with bindings attached to a given scope (used when a sheet re-renders part of itself)
  U.inScope = function (scope, fn) { var p = U.cur; U.cur = scope; try { fn(); } finally { U.cur = p; } };
  U.resetScope = function (scope) { if (scope.kids) { scope.kids.forEach(U.dropScope); scope.kids = []; } scope.length = 0; };
  // a part of the page that can be redrawn on its own without leaking old bindings
  U.region = function (el, render) {
    var scope = U.newScope(U.cur);
    var api = { el: el, scope: scope, render: function () { U.clear(el); U.resetScope(scope); U.inScope(scope, function () { render(el); }); return api; } };
    return api.render();
  };

  U.confirm = function (o) { // { title, body, yes, no, danger, onYes }
    U.sheet({ title: o.title, build: function (b, ctl) {
      if (o.body) b.appendChild(typeof o.body === 'string' ? U.h('p', { cls: 'lead', text: o.body }) : o.body);
      b.appendChild(U.h('div', { cls: 'btns', style: 'margin-top:18px' },
        U.h('button', { cls: 'btn ghost', text: o.no || 'Cancel', tap: function () { ctl.close(); } }),
        U.h('button', { cls: 'btn ' + (o.danger ? 'sell' : 'pri'), text: o.yes || 'OK', tap: function () { ctl.close(true); o.onYes(); } })));
    } });
  };

  /* ---------- toasts ---------- */
  U.toast = function (text, o) {
    o = o || {};
    var host = document.getElementById('toasts');
    while (host.children.length >= 3) host.removeChild(host.firstChild);
    var t = U.h('button', { cls: 'toast ' + (o.kind || '') }, U.h('span', { cls: 'grow' }, text, o.sub ? U.h('small', { text: o.sub }) : null));
    var gone = false;
    function out() { if (gone) return; gone = true; t.classList.add('out'); setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 260); }
    U.tap(t, function () { out(); if (o.onTap) o.onTap(); });
    host.appendChild(t);
    setTimeout(out, o.ms || 3200);
    return t;
  };

  /* ---------- small widgets ---------- */
  U.seg = function (opts, get, set) { // opts: [[value, label], ...]
    var el = U.h('div', { cls: 'seg', role: 'tablist' }), btns = [];
    opts.forEach(function (o) {
      var b = U.h('button', { text: o[1], role: 'tab', tap: function () { set(o[0]); paint(); if (BW.Audio) BW.Audio.play('tick'); } });
      btns.push([o[0], b]); el.appendChild(b);
    });
    function paint() { var v = get(); btns.forEach(function (x) { x[1].className = x[0] === v ? 'on' : ''; }); }
    paint(); el.paint = paint;
    return el;
  };
  U.chips = function (opts, get, set, sm) {
    var el = U.h('div', { cls: 'chips' }), btns = [];
    opts.forEach(function (o) {
      var b = U.h('button', { text: o[1], tap: function () { set(o[0]); paint(); if (BW.Audio) BW.Audio.play('tick'); } });
      btns.push([o[0], b]); el.appendChild(b);
    });
    function paint() { var v = get(); btns.forEach(function (x) { x[1].className = 'chip' + (sm ? ' sm' : '') + (x[0] === v ? ' on' : ''); }); }
    paint(); el.paint = paint;
    return el;
  };
  U.kv = function (k, v, cls) { return U.h('div', { cls: 'kv' + (cls ? ' ' + cls : '') }, typeof k === 'string' ? U.h('span', { text: k }) : k, typeof v === 'string' ? U.h('span', { text: v }) : v); };
  U.kvLive = function (k, fn, cls) { return U.h('div', { cls: 'kv' + (cls ? ' ' + cls : '') }, typeof k === 'string' ? U.h('span', { text: k }) : k, U.h('span', { live: fn })); };
  U.switchRow = function (label, sub, get, set) {
    var sw = U.h('span', { cls: 'sw' + (get() ? ' on' : '') });
    return U.h('button', { cls: 'item', role: 'switch', tap: function () { set(!get()); sw.className = 'sw' + (get() ? ' on' : ''); if (BW.Audio) BW.Audio.play('tick'); } },
      U.h('span', { cls: 'grow' }, U.h('div', { cls: 't1', text: label }), sub ? U.h('div', { cls: 't2', style: 'white-space:normal', text: sub }) : null), sw);
  };
  var LOGO_SHAPES = ['', 'round', 'cut', 'leaf'];
  U.logo = function (a, size) {
    var tape = BW.G && BW.G.tape, hue = 210, shape = '', txt = a.tkr.slice(0, 2), sat = 48, lum = 36;
    if (a.kind === 'stock') {
      var s = tape.sectors.filter(function (x) { return x.id === a.sector; })[0];
      var k = BW.hashStr(a.id); hue = (s ? s.hue : 200) + (k % 31) - 15; shape = LOGO_SHAPES[k % 4];
    } else if (a.kind === 'fund') { hue = 44; sat = 70; lum = 38; shape = 'round'; txt = a.tkr.slice(0, 1); }
    else if (a.kind === 'sfund') { var s2 = tape.sectors.filter(function (x) { return x.id === a.sector; })[0]; hue = s2 ? s2.hue : 200; sat = 30; shape = 'round'; }
    else if (a.kind === 'bond') { hue = 205; sat = 22; lum = 40; txt = a.tkr.slice(1, 3); }
    else if (a.kind === 'cmdty') { hue = { gold: 45, oil: 20, copper: 18, wheat: 52 }[a.id] || 30; sat = a.id === 'oil' ? 12 : 62; lum = a.id === 'oil' ? 22 : 40; shape = 'leaf'; var w = a.name.split(' '); txt = w.length > 1 ? w[0].charAt(0) + w[1].charAt(0) : a.name.slice(0, 2); }
    else if (a.kind === 'crypto') { hue = 285; sat = 60; lum = 48; shape = 'round'; txt = a.tkr.slice(0, 1); }
    return U.h('span', { cls: 'logo ' + shape + (size ? ' ' + size : ''), style: 'background:hsl(' + hue + ' ' + sat + '% ' + lum + '%)', text: txt });
  };

  /* ---------- glossary ---------- */
  var G = U.GLOSS = {
    networth: ['Net worth', 'Everything you own minus everything you owe. Cash, investments, property and businesses, less loans and card debt. It is the single number that says how you are doing.'],
    liq: ['Walk-away value', 'What you would have left if you sold everything today, paid the selling costs and the tax, and cleared every debt. This is the number your run is scored on, so that you and Dolly are compared fairly.'],
    stock: ['Stock (share)', 'A small slice of a company. If the company earns more, the slice is worth more, and you may be paid part of the profit as dividends. If the company fails, the slice can go to zero.'],
    index: ['Index fund', 'A fund that owns every company on the exchange, in proportion to its size. You get the average of the whole market, for almost no fee. Because the average includes all the big winners automatically, it is surprisingly hard to beat.'],
    dividend: ['Dividend', 'Cash a company pays its shareholders out of its profits, usually every three months. Steady, slow-growing companies tend to pay more. Dividends are taxed at 15%.'],
    yield: ['Dividend yield', 'A year of dividends divided by the share price. A 4% yield means $100 of shares pays about $4 a year. A very high yield can be a warning that the market expects the dividend to be cut.'],
    pe: ['Price-to-earnings (P/E)', 'The share price divided by one year of profit per share. A P/E of 15 means you pay $15 for each $1 the company earns in a year. High usually means investors expect fast growth. Low can mean a bargain, or a business in trouble.'],
    eps: ['Earnings per share', 'The company\'s profit for the last year divided by the number of shares. It is your slice of the profit.'],
    mcap: ['Company value', 'The share price times the number of shares: what it would cost to buy the whole company at today\'s price. Bigger companies carry more weight in the index.'],
    growth: ['Sales growth', 'How much more the company sold over the last year than the year before. Fast growers earn high prices, and fall hard when the growth slows.'],
    margin: ['Profit margin', 'How many cents of each dollar of sales are left as profit before interest and tax. Thin margins mean a small problem can wipe out the profit.'],
    debt: ['Debt load', 'Total debt divided by one year of operating profit: how many years of profit it would take to repay everything. Under 2 is comfortable. Over 4 is heavy. Heavy debt is what turns a bad year into a bankruptcy.'],
    cover: ['Interest cover', 'Operating profit divided by the interest bill. At 5, profit covers the interest five times over. Near 1, nearly all the profit goes to lenders and nothing is left if business dips.'],
    payout: ['Payout share', 'The part of profit paid out as dividends. Above 100% the company is paying out more than it earns, which cannot last.'],
    bond: ['Bond', 'A loan you make to a government or company. They pay you interest and return the money at the end. Safer than stocks. A bond fund\'s price falls when interest rates rise, because new bonds pay more than the old ones it holds.'],
    rate: ['Interest rate', 'The price of borrowing money, set at its base by the Reserve. Higher rates slow borrowing and spending, which cools inflation and usually pushes stock and bond prices down. Lower rates do the opposite.'],
    reserve: ['The Reserve', 'The central bank. It raises interest rates when prices are rising too fast and cuts them when the economy is weak.'],
    inflation: ['Inflation', 'How fast prices are rising. At 3% inflation, something that costs $100 today costs $103 next year, so cash that earns less than 3% is losing value.'],
    recession: ['Recession', 'A stretch when the whole economy shrinks: sales fall, people lose jobs, profits drop. They happen every several years and they end. The stock market usually falls before one is announced and recovers before it is declared over.'],
    gdp: ['Economic growth', 'How fast everything the country produces is growing. Around 2 to 3% a year is normal. Below zero is a recession.'],
    unemp: ['Unemployment', 'The share of people who want a job and cannot find one. It rises late in a downturn, so it tells you where the economy has been more than where it is going.'],
    curve: ['Long vs short rates', 'Normally a 10-year loan pays more interest than a short one. When short rates climb above long rates, lenders are betting rates will be cut because trouble is coming. It has come before most recessions, sometimes years early.'],
    mood: ['Market mood', 'How much investors will pay for the same dollar of profit. In booms they pay more, in panics less. Mood explains most short-term moves. Profits explain most long-term ones.'],
    mktpe: ['Market P/E', 'The price of the whole market divided by the profits of every company in it. Well above its usual level means stocks are expensive and future returns tend to be lower. It is a poor timing tool: expensive markets can stay expensive for years.'],
    stress: ['Lending stress', 'The extra interest that risky borrowers must pay over safe ones. It jumps when lenders are afraid of not being repaid, which usually happens just before or during a recession.'],
    tax: ['Tax on gains', 'When you sell something for more than you paid, the profit is taxed: 22% if you held it under a year, 15% if longer. Nothing is taxed until you sell, which is one reason patient investors keep more.'],
    lossbank: ['Banked losses', 'When you sell at a loss, the loss is saved up and cancels out future gains, so you pay no tax on those gains until the bank is used up.'],
    fee: ['Trading cost', 'A small slice lost on every trade, to the broker and to the gap between buying and selling prices. Tiny each time, large if you trade a lot.'],
    mortgage: ['Mortgage', 'A loan to buy property, repaid monthly over 30 years. The interest rate is fixed on the day you borrow. Early payments are mostly interest. Later ones mostly pay off the loan itself.'],
    down: ['Down payment', 'The part of the price you pay from your own cash. The bank lends the rest. Putting down less than 20% costs a higher rate plus a monthly insurance fee.'],
    equity: ['Equity', 'The part of a property that is really yours: what it is worth minus what you still owe on it.'],
    caprate: ['Cap rate', 'A year of rent minus running costs, divided by the price. It is the return you would earn buying with cash. Compare it with the mortgage rate: if the cap rate is higher, borrowing helps you. If lower, borrowing hurts.'],
    closing: ['Closing costs', 'Fees for lawyers, agents and paperwork: about 3% when you buy and 6% when you sell. They are why flipping a property quickly rarely pays.'],
    refi: ['Refinance', 'Replacing your mortgage with a new one at today\'s rate. You can borrow up to 75% of what the property is now worth and take the difference out as cash to spend elsewhere. The clock restarts at 30 years.'],
    dti: ['Debt-to-income', 'Your monthly debt payments divided by your monthly income (counting three-quarters of any rent you collect). Banks refuse a new loan if it would push this above 43%.'],
    vacancy: ['Vacancy', 'Months with no tenant and no rent. The mortgage and taxes still have to be paid, which is why landlords need cash in reserve.'],
    cd: ['Term deposit', 'You lock money away for 1, 3 or 5 years at a fixed interest rate. Safe, and a good way to lock in a high rate. Take it out early and you lose six months of interest.'],
    card: ['Credit card debt', 'If your cash goes below zero, the shortfall goes on a card at 24% interest a year. If it grows past your limit, your investments are sold off to pay it.'],
    auto: ['Auto-invest', 'A standing instruction: every payday, put spare cash into the things you choose. It removes the temptation to wait for a better moment. This is all Dolly does.'],
    drip: ['Reinvesting dividends', 'Using each dividend to buy more of whatever paid it, automatically. Over decades this is a large part of the total return.'],
    limit: ['Limit order', 'An instruction to buy if the price drops to a level you set, or to sell if it rises to your target. It waits until the price gets there.'],
    stop: ['Stop order', 'An instruction to sell if the price falls to a floor you set, to cap your loss. The catch: sharp dips trigger it, and prices often bounce back after you are out.'],
    candle: ['Candlestick', 'Each candle shows one stretch of time. The thick body runs from the opening price to the closing price. The thin lines show the highest and lowest prices reached. Colour shows whether it closed higher or lower than it opened.'],
    ma: ['Moving average', 'The average price over the last so many days, drawn as a smooth line. It shows the trend with the day-to-day noise removed.'],
    sector: ['Sector', 'A group of companies in the same kind of business. They tend to rise and fall together, because the same things help or hurt all of them.'],
    takeover: ['Takeover', 'One company buys another, usually paying well above the market price. Shareholders are paid cash and the stock disappears.'],
    bankrupt: ['Bankruptcy', 'A company that cannot pay its debts is handed to its lenders. Shareholders come last and usually get nothing.'],
    dilution: ['Dilution', 'A company creating and selling new shares to raise money. The company is the same size, cut into more slices, so each old slice is worth less.'],
    buyback: ['Buyback', 'A company using its cash to buy its own shares and cancel them. Fewer slices, so each remaining one is a bigger piece.'],
    cmdty: ['Commodity', 'A raw material such as gold, oil or wheat. It earns no profit and pays nothing. You only make money if the price goes up.'],
    target: ['Price target', 'An analyst\'s estimate of what the shares are really worth. Useful, but often wrong, and analysts tend to raise targets after a stock has already risen.'],
    diversify: ['Spreading your bets', 'Owning many different things so that one disaster cannot sink you. It is the only free protection in investing.'],
    pme: ['Ahead of or behind the index', 'For every dollar you put into something, we work out what that same dollar would be worth today if you had put it in the index fund on the same day instead. The difference is how much your choice helped or hurt.'],
    herd: ['The index', 'All the companies on the exchange, weighted by size. On Earth it is called the Herd 30. When people say "the market went up", this is the number they mean.'],
    bells: ['Bells', 'What you earn for finishing runs. More years, harder scenarios and beating Dolly all earn more. Spend them on permanent unlocks.']
  };
  U.explain = function (key) {
    var g = G[key]; if (!g) return;
    U.sheet({ title: g[0], build: function (b) { b.appendChild(U.h('p', { cls: 'lead', style: 'font-size:16px;line-height:1.5', text: g[1] })); } });
  };
  U.term = function (text, key) { return U.h('span', { cls: 'term', role: 'button', text: text, tap: function (e) { e.stopPropagation(); U.explain(key); } }); };
  // show an explanation the first time something comes up, then never again
  U.once = function (key, title, text, then) {
    var m = BW.G && BW.G.meta;
    if (!m || m.seen[key]) { if (then) then(); return false; }
    m.seen[key] = 1; BW.App.saveSoon();
    U.sheet({ title: title, build: function (b, ctl) {
      b.appendChild(U.h('p', { cls: 'lead', style: 'font-size:16px;line-height:1.5', text: text }));
      b.appendChild(U.h('button', { cls: 'btn pri', style: 'margin-top:18px', text: 'Got it', tap: function () { ctl.close(); } }));
    }, onClose: function () { if (then) then(); } });
    return true;
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
