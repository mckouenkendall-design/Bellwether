/* App shell: saving, the clock, the frame around every screen, and the life of a run. */
(function (root) {
  'use strict';
  var BW = root.BW, U = BW.UI, h = U.h, f = U.f, T = BW.T;
  var App = BW.App = {}, G = BW.G = { meta: null, run: null, tape: null, dolly: null, scen: null, cfg: null };
  var KEY = 'bellwether.save.v1';
  var SPEEDS = [[0.5, '½×'], [1, '1×'], [2, '2×'], [4, '4×'], [8, '8×']];
  var ui = App.ui = { tab: 'home', speed: 1, paused: true, acc: 0, last: 0, lastRefresh: 0, dirty: true, unread: 0, newsSeen: 0, tick: null, tickAt: 0, screenScope: null, storageOK: true, saveAt: 0, needSave: false, cache: { d: -1 } };
  BW.Screens = BW.Screens || {};

  /* ---------- storage ---------- */
  function lsGet() { try { return window.localStorage.getItem(KEY); } catch (e) { ui.storageOK = false; return null; } }
  function lsSet(v) { try { window.localStorage.setItem(KEY, v); return true; } catch (e) { ui.storageOK = false; return false; } }
  App.save = function () {
    ui.needSave = false; ui.saveAt = Date.now();
    var data = { v: 1, meta: G.meta, run: null };
    if (G.run && !G.run.s.done) data.run = { cfg: G.cfg, s: G.run.s, ui: { speed: ui.speed, newsSeen: ui.newsSeen, unread: ui.unread } };
    else if (G.run && G.run.s.done && !G.resultsShown) data.run = { cfg: G.cfg, s: G.run.s, ui: { speed: ui.speed, newsSeen: ui.newsSeen, unread: 0 } };
    return lsSet(JSON.stringify(data));
  };
  App.saveSoon = function () { ui.needSave = true; };
  // Saved data can be old, half-written, or edited by hand. Anything that is not the shape the game expects is
  // replaced with a fresh default, piece by piece, so one bad field never costs the whole profile.
  function kind(x) { return Array.isArray(x) ? 'array' : x === null ? 'null' : typeof x; }
  function fin(x) { return typeof x === 'number' && isFinite(x); }
  function repair(m, fresh) {
    if (kind(m) !== 'object') return fresh;
    var k, j;
    for (k in fresh) if (kind(m[k]) !== kind(fresh[k]) || (typeof fresh[k] === 'number' && !fin(m[k]))) m[k] = fresh[k];
    ['set', 'cos', 'stats'].forEach(function (g) { for (j in fresh[g]) if (kind(m[g][j]) !== kind(fresh[g][j]) || (typeof fresh[g][j] === 'number' && !fin(m[g][j]))) m[g][j] = fresh[g][j]; });
    for (k in fresh.cos.owned) m.cos.owned[k] = 1;
    [['theme', 'th_floor'], ['bell', 'bl_brass'], ['candle', 'cd_classic'], ['title', 'tt_rookie']].forEach(function (c) { if (!BW.COS_BY[m.cos[c[0]]]) m.cos[c[0]] = c[1]; });
    m.bells = Math.max(0, Math.round(m.bells)); m.bellsEarned = Math.max(0, Math.round(m.bellsEarned));
    m.name = BW.cleanName(m.name);
    m.boxes = m.boxes.filter(function (b) { return b && BW.BOX_TIERS[b.tier]; }).map(function (b) { return { tier: b.tier }; });
    m.runs = m.runs.filter(function (r) { return kind(r) === 'object' && BW.SCEN_BY[r.scen] && fin(r.score) && fin(r.dolly) && fin(r.ratio); });
    for (k in m.best) if (!fin(m.best[k])) delete m.best[k];
    var fr = {};
    Object.keys(m.friends).forEach(function (code) {
      if (!BW.parseCode(code).ok || !Array.isArray(m.friends[code])) return;
      fr[code] = m.friends[code].filter(function (x) { return kind(x) === 'object' && fin(x.score) && fin(x.dolly); }).map(function (x) { return { name: BW.cleanName(x.name) || 'Anon', score: x.score, dolly: x.dolly, attempt: fin(x.attempt) ? x.attempt : 1, bankrupt: !!x.bankrupt, me: !!x.me }; });
    });
    m.friends = fr;
    return m;
  }
  // Is this saved run something the engine can safely carry on with?
  function soundRun(s, tape) {
    if (kind(s) !== 'object') return false;
    var whole = function (x) { return fin(x) && Math.round(x) === x; };
    if (!whole(s.d) || s.d < tape.W || s.d > tape.N - 1 || s.day0 !== tape.W || !whole(s.endD) || !whole(s.cash)) return false;
    if (kind(s.pos) !== 'object' || kind(s.flow) !== 'object' || kind(s.tot) !== 'object' || kind(s.st) !== 'object' || kind(s.job) !== 'object' || kind(s.auto) !== 'object' || kind(s.tax) !== 'object' || kind(s.hist) !== 'object' || kind(s.pme) !== 'object' || kind(s.ps) !== 'object') return false;
    if (!Array.isArray(s.cds) || !Array.isArray(s.props) || !Array.isArray(s.biz) || !Array.isArray(s.orders) || !Array.isArray(s.acts) || !Array.isArray(s.hist.nw) || !Array.isArray(s.hist.liq) || !Array.isArray(s.hist.cashW) || !Array.isArray(s.auto.alloc)) return false;
    if (!fin(s.job.salary) || !fin(s.job.living) || !fin(s.tax.lossBank) || !fin(s.accr)) return false;
    var k; for (k in s.tot) if (!fin(s.tot[k])) return false;
    for (k in s.flow) if (!fin(s.flow[k])) return false;
    for (k in s.pos) { var p = s.pos[k]; if (!tape.assets[k] || kind(p) !== 'object' || !fin(p.q) || !(p.q > 0) || !Array.isArray(p.lots) || !p.lots.length) return false;
      if (!p.lots.every(function (l) { return Array.isArray(l) && fin(l[0]) && whole(l[1]) && whole(l[2]); })) return false; }
    // the lists: every entry has to be something the engine could have written itself
    var obj = function (x) { return kind(x) === 'object'; }, pos0 = function (x) { return fin(x) && x >= 0; };
    if (typeof s.done !== 'boolean' || (!s.done && s.d >= s.endD) || s.endD > tape.N - 1) return false;
    if (!s.cds.every(function (c) { return obj(c) && whole(c.p) && c.p > 0 && fin(c.rate) && (c.term === 1 || c.term === 3 || c.term === 5) && whole(c.d0) && whole(c.d1) && c.d1 > c.d0 && whole(c.int); })) return false;
    if (!s.props.every(function (x) { return obj(x) && typeof x.id === 'string' && typeof x.addr === 'string' && fin(x.cond) && pos0(x.full0) && whole(x.d0) && whole(x.buyD) && whole(x.price) && whole(x.basis) && fin(x.rent0) && whole(x.reno) && whole(x.vacant) && whole(x.lease) && fin(x.units) && fin(x.sellDays)
      && (x.loan === null || (obj(x.loan) && whole(x.loan.bal) && fin(x.loan.rate) && whole(x.loan.pay) && whole(x.loan.orig))) && (x.sale === null || (obj(x.sale) && whole(x.sale.d) && fin(x.sale.f))); })) return false;
    if (!s.biz.every(function (x) { return obj(x) && BW.BIZ_BY[x.type] && whole(x.lvl) && x.lvl >= 1 && x.lvl <= 10 && whole(x.buyD) && whole(x.invested) && fin(x.net) && Array.isArray(x.ttm) && x.ttm.every(fin); })) return false;
    if (!s.orders.every(function (o) { return obj(o) && tape.assets[o.id] && (o.side === 'buy' || o.side === 'sell') && (o.kind === 'limit' || o.kind === 'stop') && whole(o.px) && pos0(o.amt) && pos0(o.frac); })) return false;
    if (!s.auto.alloc.every(function (a) { return obj(a) && tape.assets[a.id] && pos0(a.pct); }) || !pos0(s.auto.keep)) return false;
    if (!(s.loan === null || (obj(s.loan) && whole(s.loan.bal) && fin(s.loan.rate) && whole(s.loan.pay)))) return false;
    if (!pos0(s.job.outUntil) || !fin(s.feeMult) || !fin(s.taxMult) || !fin(s.renoMult) || !fin(s.agentMult) || !fin(s.selfSlots) || !fin(s.salaryMult) || !whole(s.startCash)) return false;
    if (![s.hist.nw, s.hist.liq, s.hist.cashW].every(function (arr) { return arr.every(fin); })) return false;
    for (k in s.st) if (typeof s.st[k] === 'number' && !fin(s.st[k])) return false;
    if (!Array.isArray(s.st.sellLog) || !Array.isArray(s.st.buyLog) || !Array.isArray(s.watch) || !obj(s.offers)) return false;
    return true;
  }
  function load() {
    var raw = lsGet(), data = null;
    if (raw) { try { data = JSON.parse(raw); } catch (e) { data = null; } }
    if (kind(data) !== 'object') data = null;
    var fresh = BW.newMeta();
    try { G.meta = data && data.meta ? repair(data.meta, fresh) : fresh; } catch (e) { console.error(e); G.meta = BW.newMeta(); }
    return data && kind(data.run) === 'object' && kind(data.run.cfg) === 'object' ? data.run : null;
  }
  App.wipe = function () { try { window.localStorage.removeItem(KEY); } catch (e) { /* ignore */ } };

  /* ---------- appearance ---------- */
  App.applyLook = function () {
    var app = document.getElementById('app'), c = G.meta.cos;
    app.setAttribute('data-th', c.theme); app.setAttribute('data-cd', c.candle);
    BW.Audio.on = G.meta.set.sound; BW.Audio.music = G.meta.set.music; BW.Audio.haptic = G.meta.set.haptic; BW.Audio.bellSkin = c.bell;
    var bg = getComputedStyle(app).getPropertyValue('--bg').trim();
    document.body.style.background = bg;
    var mt = document.querySelector('meta[name=theme-color]'); if (mt) mt.setAttribute('content', bg);
    ui.dirty = true;
  };

  /* ---------- cached worth ---------- */
  App.worth = function () {
    var c = ui.cache, r = G.run;
    if (!r) return c;
    if (c.d !== r.s.d || c.stamp !== ui.stamp) {
      c.d = r.s.d; c.stamp = ui.stamp;
      c.nw = r.nw(); c.liq = r.liq(); c.dnw = G.dolly.nw(); c.dliq = G.dolly.liq();
      c.lead = c.liq - c.dliq;
      c.leadTxt = Math.abs(c.lead) < 2500 ? 'level' : c.dliq > 500000 && c.liq > 0 ? (c.lead >= 0 ? 'ahead ' : 'behind ') + f.pct(Math.abs(c.liq / c.dliq - 1)) : (c.lead >= 0 ? 'ahead ' : 'behind ') + f.ms(Math.abs(c.lead));
    }
    return c;
  };
  App.touch = function () { ui.stamp = (ui.stamp || 0) + 1; ui.dirty = true; ui.needSave = true; }; // call after any player action
  App.tool = function (id) { return BW.hasTool(G.meta, G.run, id); };

  /* ---------- frame (top bar, transport, tabs) ---------- */
  var el = {};
  function buildChrome() {
    var app = document.getElementById('app');
    U.clear(app);
    el.top = h('header', { id: 'top' });
    el.screen = h('main', { id: 'screen' });
    el.transport = h('div', { id: 'transport' });
    el.tabs = h('nav', { id: 'tabs' });
    U.add(app, [el.top, el.screen, el.transport, el.tabs, h('div', { id: 'sheets' }), h('div', { id: 'toasts' })]);
    ui.screenScope = U.newScope(); U.baseScope = ui.screenScope;
  }
  function renderChrome() {
    var inRun = !!G.run && !ui.hub;
    el.top.hidden = !inRun; el.transport.hidden = !inRun; el.tabs.hidden = !inRun;
    U.resetScope(U.scopeTop);
    U.clear(el.top); U.clear(el.transport); U.clear(el.tabs);
    if (!inRun) return;
    U.inScope(U.scopeTop, function () {
      var r = G.run, s = r.s;
      var prog = h('i', { cls: 'prog' });
      U.on(function () { prog.style.width = (100 * (s.d - s.day0) / (s.endD - s.day0)).toFixed(2) + '%'; });
      var lead = h('b');
      U.on(function () { var w = App.worth(); lead.textContent = w.leadTxt; lead.className = w.lead >= 0 ? 'up' : 'down'; });
      var tk = h('button', { cls: 'tick', 'aria-label': 'Latest news', tap: function () { App.go('news'); } });
      var tkSrc = h('span', { cls: 'src' }), tkTx = h('span', { cls: 'tx' });
      U.add(tk, [tkSrc, tkTx]);
      var lastI = -2;
      U.on(function () {
        var n = ui.tick, i = n ? n.i : -1;
        if (i === lastI) return; lastI = i;
        if (!n) { tkSrc.hidden = true; tkTx.textContent = 'No news yet. The opening bell is about to ring.'; return; }
        tkSrc.hidden = false; tkSrc.className = 'src ' + n.src; tkSrc.textContent = SRC_NAME[n.src]; tkTx.textContent = n.h;
        tk.classList.add('flash'); setTimeout(function () { tk.classList.remove('flash'); }, 900);
      });
      U.add(el.top, [prog,
        h('div', { cls: 'r1' },
          h('button', { style: 'text-align:left', tap: function () { U.explain('networth'); } }, h('div', { cls: 'nwl', text: 'Net worth' }), h('div', { cls: 'nw', live: function () { return f.ms(App.worth().nw); } })),
          h('button', { cls: 'side', tap: function () { BW.Screens.versus(); } },
            h('div', { live: function () { return f.dateLong(r.rel()); } }),
            h('div', null, 'Cash ', h('b', { live: function () { return f.ms(s.cash); } })),
            h('div', null, 'vs Dolly ', lead))),
        tk]);

      // transport
      var pp = h('button', { cls: 'pp', 'aria-label': 'Pause or play', tap: function () { App.setPaused(!ui.paused); } });
      var step = h('button', { cls: 'step', text: '+1 wk', 'aria-label': 'Step one week', tap: function () { if (!s.done) { App.stepDays(5); BW.Audio.play('tick'); } } });
      var spd = h('div', { cls: 'spd', role: 'group', 'aria-label': 'Speed' }), sb = [];
      var list = SPEEDS.slice(); if (App.tool('fast')) list.push([16, '16×']);
      list.forEach(function (sp, i) { var b = h('button', { text: sp[1], tap: function () { ui.speed = sp[0]; BW.Audio.play('speed', i); if (ui.paused) App.setPaused(false); ui.dirty = true; } }); sb.push([sp[0], b]); spd.appendChild(b); });
      var lastP = null, lastS = null;
      U.on(function () {
        if (ui.paused !== lastP) { lastP = ui.paused; pp.innerHTML = U.icon(ui.paused ? 'play' : 'pause'); el.transport.className = ui.paused ? 'paused' : ''; step.disabled = !ui.paused; } // stays in place while running (greyed out), so the speed buttons never move under a finger
        if (ui.speed !== lastS) { lastS = ui.speed; sb.forEach(function (x) { x[1].className = x[0] === ui.speed ? 'on' : ''; }); }
      });
      U.add(el.transport, [pp, step, spd]);

      // tabs
      var TABS = [['home', 'Home', 'home'], ['market', 'Market', 'market'], ['news', 'News', 'news'], ['life', 'Life', 'life'], ['more', 'More', 'more']];
      TABS.forEach(function (t) {
        var dot = t[0] === 'news' ? h('span', { cls: 'dot', hidden: true }) : null;
        var b = h('button', { 'aria-label': t[1], tap: function () { App.go(t[0]); BW.Audio.play('tick'); } }, h('span', { html: U.icon(t[2]), style: 'display:grid' }), h('span', { text: t[1] }), dot);
        U.on(function () { var on = ui.tab === t[0]; if (b._on !== on) { b._on = on; b.className = on ? 'on' : ''; } if (dot) { var n = ui.unread; dot.hidden = !n || ui.tab === 'news'; dot.textContent = n > 99 ? '99+' : String(n); } });
        el.tabs.appendChild(b);
      });
    });
  }
  var STOP = { bust: 1, bear: 1, bear2: 1, crashday: 1, oilup: 1, housebust: 1, gdp: 1 };
  var SRC_NAME = App.SRC_NAME = { FILING: 'Filing', DATA: 'Official', WIRE: 'Wire', RUMOR: 'Rumor', OPINION: 'Opinion' };

  /* ---------- navigation ---------- */
  App.go = function (tab, arg) {
    ui.hub = false; ui.tab = tab; ui.tabArg = arg;
    U.closeAll();
    App.render();
  };
  App.render = function () {
    var name = ui.hub ? 'hub' : ui.tab, sc = BW.Screens[name];
    el.screen.className = ui.hub ? 'hub' : '';
    U.resetScope(ui.screenScope); U.clear(el.screen); el.screen.scrollTop = 0;
    U.inScope(ui.screenScope, function () { sc(el.screen, ui.tabArg); });
    if (name === 'news') { ui.unread = 0; }
    ui.dirty = true;
  };
  App.toHub = function () { ui.hub = true; U.closeAll(); renderChrome(); App.render(); };
  App.toRun = function (tab) { ui.hub = false; ui.tab = tab || 'home'; renderChrome(); App.render(); };
  App.rechrome = renderChrome;

  /* ---------- the clock ---------- */
  App.setPaused = function (p) {
    if (G.run && G.run.s.done) p = true;
    if (ui.paused === p) return;
    ui.paused = p; BW.Audio.play(p ? 'pause' : 'resume'); ui.dirty = true;
  };
  App.frozen = function () { return U.sheetCount() > 0 && G.meta.set.pauseTrade; };
  App.stepDays = function (n) { for (var i = 0; i < n && G.run && !G.run.s.done; i++) stepOne(true); ui.dirty = true; };

  function relevant(n) { // is this story about something the player cares about?
    var s = G.run.s;
    if (n.co) return !!s.pos[n.co] || s.watch.indexOf(n.co) >= 0;
    if (n.sc === 's') { for (var id in s.pos) { var a = G.tape.assets[id]; if (a.sector === n.sec) return true; } return false; }
    return false;
  }
  App.relevant = relevant;

  function stepOne(manual) {
    var r = G.run, s = r.s, tape = G.tape;
    var evs = r.stepDay();
    if (!G.dolly.s.done) G.dolly.stepDay();
    var i, e, pauseWhy = null, pauseNews = null;
    // the day's news
    var cnt = T.newsCount(tape, s.d);
    for (i = ui.newsSeen; i < cnt; i++) {
      var n = tape.news[i], mine = relevant(n);
      if (n.k === 'coinup' || n.k === 'coindown') { if (!App.tool('coin')) continue; }
      if (mine || n.sev >= 3 || (n.sc === 'm' && n.sev >= 2)) { ui.unread++; ui.tick = n; }
      else if (!ui.tick || s.d - ui.tick.d > 3) ui.tick = n;
      if (n.sev >= 3 && (n.sc === 'm' || mine)) {
        BW.Audio.play(n.k === 'bust' || n.k === 'crashday' || n.k === 'bear2' ? 'rumble' : 'big');
        // stop the clock only for the stories that change what you should do, and never at the fastest speeds
        if (G.meta.set.autoPause && !manual && ui.speed <= 4 && (mine || n.stop || STOP[n.k]) && !pauseWhy) { pauseWhy = n; pauseNews = n; }
      } else if (mine && ui.speed <= 2) BW.Audio.play('news');
    }
    ui.newsSeen = cnt;
    for (i = 0; i < evs.length; i++) {
      e = evs[i];
      switch (e.t) {
        case 'pay': if (ui.speed <= 2) BW.Audio.play('coin'); break;
        case 'life': U.toast(e.text, { kind: e.amt < 0 ? 'bad' : 'good', sub: (e.amt < 0 ? 'Cost you ' : 'You received ') + f.ma(Math.abs(e.amt)), ms: 4200 }); BW.Audio.play(e.amt < 0 ? 'bad' : 'good'); break;
        case 'delist': var a = tape.assets[e.id];
          U.toast(a.name + (e.why === 'bankrupt' ? ' went bankrupt' : ' was bought out'), { kind: e.why === 'bankrupt' ? 'bad' : 'good', sub: e.why === 'bankrupt' ? 'Your shares are worth nothing.' : 'You were paid ' + f.ma(e.net) + ' in cash.', ms: 6000 });
          BW.Audio.play(e.why === 'bankrupt' ? 'bad' : 'sell'); pauseWhy = pauseWhy || { h: a.name }; break;
        case 'fill': U.toast('Order filled: ' + (e.side === 'buy' ? 'bought ' : 'sold ') + tape.assets[e.id].tkr, { kind: 'brass', sub: 'At ' + f.px(e.px) }); BW.Audio.play(e.side === 'buy' ? 'buy' : 'sell'); break;
        case 'orderfail': U.toast('Order cancelled: ' + tape.assets[e.id].tkr, { kind: 'bad', sub: e.why === 'cash' ? 'The price was reached, but you did not have the cash set aside for it.' : 'There was nothing left to sell.', ms: 5000 }); BW.Audio.play('error'); break;
        case 'jobloss': U.toast('You were laid off', { kind: 'bad', sub: 'No paycheck for about ' + e.months + ' months. Benefits cover part of it.', ms: 6000 }); BW.Audio.play('bad'); pauseWhy = pauseWhy || { h: 'job' }; break;
        case 'jobback': U.toast('You found a new job', { kind: 'good', sub: 'Paychecks resume.' }); BW.Audio.play('good'); break;
        case 'raise': if (e.promo) { U.toast('Promoted. Pay up ' + e.pct.toFixed(0) + '%', { kind: 'good', sub: 'New salary ' + f.m0(e.salary) + ' a year' }); BW.Audio.play('good'); } break;
        case 'propsold': U.toast('Sold ' + e.name, { kind: e.gain >= 0 ? 'good' : 'bad', sub: 'You walked away with ' + f.ma(e.net) }); BW.Audio.play('sell'); break;
        case 'vacant': U.toast('Tenant moved out of ' + e.name, { sub: 'About ' + e.months + ' month' + (e.months > 1 ? 's' : '') + ' with no rent.' }); break;
        case 'repair': U.toast('Repair bill at ' + e.name, { kind: 'bad', sub: f.ma(e.amt) }); break;
        case 'renodone': U.toast('Renovation finished at ' + e.name, { kind: 'good', sub: 'Worth more, rents for more.' }); BW.Audio.play('good'); break;
        case 'mortdone': U.toast('Mortgage paid off at ' + e.name, { kind: 'good' }); BW.Audio.play('good'); break;
        case 'loandone': U.toast('Student loan paid off', { kind: 'good', sub: 'That payment is yours to keep now.' }); BW.Audio.play('good'); break;
        case 'bizbad': U.toast('Bad month at the ' + e.name, { kind: 'bad', sub: 'An accident cost ' + f.ma(e.amt) }); break;
        case 'cd': U.toast('A term deposit matured', { kind: 'good', sub: f.ma(e.amt) + ' is back in cash.' }); break;
        case 'forced': U.toast('Your card hit its limit', { kind: 'bad', sub: 'Sold to cover it: ' + e.sold.slice(0, 3).join(', '), ms: 7000 }); BW.Audio.play('bad'); pauseWhy = pauseWhy || { h: 'card' }; break;
        case 'bankrupt': U.toast('You are bankrupt', { kind: 'bad', sub: 'Everything was sold and it was not enough.', ms: 8000 }); BW.Audio.play('rumble'); pauseWhy = pauseWhy || { h: 'bankrupt' }; break;
        case 'done': break;
      }
    }
    if ((s.d - s.day0) % 240 === 0 && s.d > s.day0 && !s.done) { BW.Audio.play('year'); if (s.props.length > (s.st.maxProps || 0)) s.st.maxProps = s.props.length; }
    if (s.props.some(function (p) { return p.type === 'tower'; })) s.st.tower = 1;
    if (pauseWhy && !manual && !ui.paused) { ui.paused = true; ui.acc = 0;
      if (pauseNews) U.toast(pauseNews.h, { kind: 'brass', sub: 'Paused. Tap to read, or press play to carry on.', ms: 6000, onTap: function () { App.go('news'); } }); }
    ui.needSave = true;
    if (s.done) { ui.paused = true; setTimeout(function () { BW.Screens.finish(); }, 400); }
    return pauseWhy;
  }

  function frame(ts) {
    var dt = Math.min(0.25, (ts - ui.last) / 1000); ui.last = ts;
    if (G.run && !ui.hub && !G.run.s.done && !ui.paused && !App.frozen()) {
      ui.acc += dt * ui.speed * 4;
      var n = Math.floor(ui.acc); ui.acc -= n; if (n > 24) n = 24;
      for (var i = 0; i < n; i++) { stepOne(false); if (ui.paused || G.run.s.done) break; }
      if (n) ui.dirty = true;
    }
    if (ui.dirty && ts - ui.lastRefresh > 100) { ui.dirty = false; ui.lastRefresh = ts; U.refresh(); }
    if (ui.needSave && Date.now() - ui.saveAt > 4000) App.save();
    requestAnimationFrame(frame);
  }

  /* ---------- starting and resuming runs ---------- */
  // o: { scen, seed, mode: 'open' | 'challenge' | 'daily', code, date }
  App.startRun = function (o) {
    var scen = BW.SCEN_BY[o.scen], fair = o.mode !== 'open';
    var perks = BW.perksFor(G.meta, fair);
    var dest = o.dest && BW.DEST[o.dest] ? o.dest : 'earth';
    var cfg = { seed: o.seed >>> 0, scen: scen.id, dest: dest, years: scen.years, mode: o.mode, code: o.code || BW.makeCode(scen.id, dest, o.seed), date: o.date || null, perks: perks, ev: BW.ENGINE_VERSION };
    G.cfg = cfg; G.scen = scen;
    G.tape = BW.genTape({ seed: cfg.seed, years: scen.years, dest: cfg.dest, mods: scen.mods });
    var rc = { life: scen.life, perks: perks };
    G.run = new BW.Run(G.tape, rc); G.run.s.fair = fair;
    G.dolly = BW.makeDolly(G.tape, rc);
    G.meta.attempts[cfg.code] = (G.meta.attempts[cfg.code] || 0) + 1; cfg.attempt = G.meta.attempts[cfg.code];
    G.resultsShown = false;
    ui.newsSeen = T.newsCount(G.tape, G.run.s.d); ui.unread = 0; ui.tick = null; ui.paused = true; ui.acc = 0; ui.speed = 1; ui.cache = { d: -1 };
    App.touch(); App.save();
    App.toRun('home');
    BW.Screens.intro();
  };
  function resume(saved) {
    try {
      var cfg = saved.cfg, scen = BW.SCEN_BY[cfg.scen];
      if (!scen || cfg.ev !== BW.ENGINE_VERSION) return false;
      G.cfg = cfg; G.scen = scen;
      G.tape = BW.genTape({ seed: cfg.seed, years: scen.years, dest: cfg.dest, mods: scen.mods });
      var rc = { life: scen.life, perks: cfg.perks };
      if (!soundRun(saved.s, G.tape)) { G.tape = null; G.cfg = null; G.scen = null; return false; }
      G.run = new BW.Run(G.tape, rc, saved.s);
      G.dolly = BW.dollySeries(G.tape, rc, saved.s.d);
      ui.speed = (saved.ui && saved.ui.speed) || 1; ui.newsSeen = T.newsCount(G.tape, G.run.s.d); ui.unread = (saved.ui && saved.ui.unread) || 0; ui.paused = true; ui.cache = { d: -1 };
      var k = ui.newsSeen - 1; while (k >= 0 && G.tape.news[k].sev < 2) k--; ui.tick = k >= 0 ? G.tape.news[k] : null;
      return true;
    } catch (e) { console.error(e); G.run = null; G.tape = null; G.cfg = null; G.dolly = null; return false; }
  }
  App.abandon = function () { G.run = null; G.tape = null; G.dolly = null; G.cfg = null; App.save(); App.toHub(); };

  /* ---------- boot ---------- */
  App.boot = function () {
    buildChrome();
    var saved = load();
    App.applyLook();
    var ok = saved ? resume(saved) : false;
    if (saved && !ok) G.lostRun = true;
    ui.hub = true; renderChrome(); App.render();
    document.addEventListener('visibilitychange', function () { if (document.hidden) { App.save(); if (G.run && !ui.paused) { ui.paused = true; ui.dirty = true; } } });
    window.addEventListener('pagehide', function () { App.save(); });
    window.addEventListener('resize', function () { ui.dirty = true; App.resized = (App.resized || 0) + 1; });
    document.addEventListener('keydown', function (e) {
      if (e.target && /input/i.test(e.target.tagName)) return;
      if (e.key === 'Escape') { U.closeTop(); return; }
      if (!G.run || ui.hub) return;
      if (e.key === ' ') { e.preventDefault(); App.setPaused(!ui.paused); }
      var idx = '12345'.indexOf(e.key); if (idx >= 0) { ui.speed = SPEEDS[idx][0]; ui.dirty = true; }
    });
    // a deep link like #BW1CE-K7QM2X opens that challenge
    var hash = (location.hash || '').replace('#', ''), hp = hash ? BW.parseCode(hash) : null;
    if (hp && hp.ok) setTimeout(function () { BW.Screens.challenge(hp.code); }, 300);
    ui.last = performance.now();
    requestAnimationFrame(frame);
    if (window.claude && window.claude.hot && window.claude.hot.snapshot) { try { window.claude.hot.snapshot(function () { App.save(); return {}; }); } catch (e) { /* not in a viewer */ } }
  };
  // test hooks (used by the automated phone tests; harmless in play)
  App._step = function (n) { for (var i = 0; i < n && G.run && !G.run.s.done; i++) stepOne(true); ui.dirty = true; U.refresh(); };
})(typeof globalThis !== 'undefined' ? globalThis : this);
