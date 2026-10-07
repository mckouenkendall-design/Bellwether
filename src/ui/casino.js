/* The casino: a small side room. Real rules and real odds, house edge included.
 * It bets your run's cash, and the end-of-run review shows what it cost you.
 */
(function (root) {
  'use strict';
  var BW = root.BW, U = BW.UI, h = U.h, f = U.f, App = BW.App, G = BW.G, C = BW.Charts;
  var K = BW.Casino = {};
  var tab = 'bj', bet = 2500;
  var SUITS = ['♠', '♥', '♦', '♣'], RANKS = ['', '', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
  function rnd(n) { // unbiased integer in [0, n)
    if (window.crypto && window.crypto.getRandomValues) { var a = new Uint32Array(1), lim = Math.floor(4294967296 / n) * n; do { window.crypto.getRandomValues(a); } while (a[0] >= lim); return a[0] % n; }
    return Math.floor(Math.random() * n);
  }
  K.rnd = rnd;
  function shoe(decks) { var s = [], d, r, su, i; for (d = 0; d < decks; d++) for (su = 0; su < 4; su++) for (r = 2; r <= 14; r++) s.push({ r: r, s: su }); for (i = s.length - 1; i > 0; i--) { var j = rnd(i + 1), t = s[i]; s[i] = s[j]; s[j] = t; } return s; }
  function cardEl(c, back) { if (back) return h('div', { cls: 'pcard back' }); return h('div', { cls: 'pcard' + (c.s === 1 || c.s === 2 ? ' red' : '') }, h('span', null, RANKS[c.r], h('div', { cls: 'sm', text: SUITS[c.s] })), h('span', { cls: 'big', text: SUITS[c.s] })); }

  /* ---------- pure rules (also used by the odds tests) ---------- */
  K.bjValue = function (cards) { var t = 0, aces = 0; cards.forEach(function (c) { if (c.r === 14) { aces++; t += 11; } else t += Math.min(c.r, 10); }); while (t > 21 && aces) { t -= 10; aces--; } return { total: t, soft: aces > 0 }; };
  K.PAYS = [['Royal flush', 800], ['Straight flush', 50], ['Four of a kind', 25], ['Full house', 9], ['Flush', 6], ['Straight', 4], ['Three of a kind', 3], ['Two pair', 2], ['Jacks or better', 1]];
  K.pokerRank = function (cards) { // index into PAYS, or -1
    var rs = cards.map(function (c) { return c.r; }).sort(function (a, b) { return a - b; }), flush = cards.every(function (c) { return c.s === cards[0].s; });
    var cnt = {}, i; rs.forEach(function (r) { cnt[r] = (cnt[r] || 0) + 1; });
    var groups = Object.keys(cnt).map(function (k) { return [cnt[k], +k]; }).sort(function (a, b) { return b[0] - a[0] || b[1] - a[1]; });
    var straight = groups.length === 5 && (rs[4] - rs[0] === 4 || (rs[0] === 2 && rs[1] === 3 && rs[2] === 4 && rs[3] === 5 && rs[4] === 14));
    if (straight && flush) return rs[0] === 10 ? 0 : 1;
    if (groups[0][0] === 4) return 2; if (groups[0][0] === 3 && groups[1][0] === 2) return 3; if (flush) return 4; if (straight) return 5;
    if (groups[0][0] === 3) return 6; if (groups[0][0] === 2 && groups[1][0] === 2) return 7; if (groups[0][0] === 2 && groups[0][1] >= 11) return 8;
    return -1;
  };
  K.WHEEL = [0, 32, 15, 19, 4, 21, 2, 25, 17, 34, 6, 27, 13, 36, 11, 30, 8, 23, 10, 5, 24, 16, 33, 1, 20, 14, 31, 9, 22, 18, 29, 7, 28, 12, 35, 3, 26];
  var REDS = {}; [1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36].forEach(function (n) { REDS[n] = 1; });
  K.isRed = function (n) { return !!REDS[n]; };
  // total returned (stake included) for a set of bets when n comes up
  K.roulettePay = function (bets, n) {
    var t = 0, k;
    for (k in bets) { var v = bets[k]; if (!v) continue;
      if (k[0] === 'n') { if (+k.slice(1) === n) t += v * 36; }
      else if (n !== 0) { if ((k === 'red' && REDS[n]) || (k === 'black' && !REDS[n]) || (k === 'odd' && n % 2 === 1) || (k === 'even' && n % 2 === 0) || (k === 'low' && n <= 18) || (k === 'high' && n >= 19)) t += v * 2;
        if ((k === 'd1' && n <= 12) || (k === 'd2' && n > 12 && n <= 24) || (k === 'd3' && n > 24)) t += v * 3; } }
    return t;
  };
  var mk = function (o) { var a = []; for (var k in o) for (var i = 0; i < o[k]; i++) a.push(k); return a; };
  K.STRIPS = [mk({ S: 1, B: 2, H: 4, C: 6, R: 9, Y: 6, X: 4 }), mk({ S: 1, B: 2, H: 4, C: 6, R: 9, Y: 3, X: 7 }), mk({ S: 1, B: 3, H: 4, C: 6, R: 8, Y: 3, X: 7 })];
  K.SLOTPAY = { SSS: 300, BBB: 100, HHH: 40, CCC: 20, RRR: 11, YYY: 20, YY: 5, Y: 2 };
  K.slotPay = function (a, b, c) { if (a === b && b === c && K.SLOTPAY[a + a + a]) return K.SLOTPAY[a + a + a]; if (a === 'Y' && b === 'Y') return K.SLOTPAY.YY; if (a === 'Y') return K.SLOTPAY.Y; return 0; };
  K.slotRTP = (function () { var t = 0, n = 0; K.STRIPS[0].forEach(function (a) { K.STRIPS[1].forEach(function (b) { K.STRIPS[2].forEach(function (c) { t += K.slotPay(a, b, c); n++; }); }); }); return t / n; })();

  /* ---------- shared UI ---------- */
  // Money leaves your cash the moment a bet is placed, and comes back only when the bet is decided.
  function stake(amount, edge) { var r = G.run.casinoBet(amount, edge); App.touch(); return r.ok; }
  function payOut(staked, payout) { var r = G.run.casinoPay(staked, payout); App.touch(); return r; }
  // A hand in progress stays on the table if you look away, so walking off is never a way to dodge a bad one.
  var live = { run: null, bj: null, vp: null, flight: 0 };
  function table(key, fresh) { if (live.run !== G.run) { live = { run: G.run, bj: null, vp: null, flight: 0 }; } return live[key] || (live[key] = fresh()); }
  function onTable() { // stakes that belong to a hand or a spin still in progress
    var t = live.flight;
    if (live.bj && live.bj.phase === 'play') live.bj.hands.forEach(function (x) { t += x.bet; });
    if (live.vp && live.vp.phase === 'hold') t += live.vp.stake;
    return t;
  }
  function betBar(onChange) {
    var s = G.run.s, opts = [500, 2500, 10000, 50000, 250000, 1000000].filter(function (v, i) { return i < 3 || v <= Math.max(s.cash, 10000); });
    if (opts.indexOf(bet) < 0) bet = opts[Math.min(1, opts.length - 1)];
    return U.chips(opts.map(function (v) { return [v, f.m0(v)]; }), function () { return bet; }, function (v) { bet = v; BW.Audio.play('chip'); if (onChange) onChange(); }, true);
  }
  function tally(el) {
    var s = G.run.s, card = h('div', { cls: 'card', style: 'margin-top:12px' });
    card.appendChild(U.kvLive('Your cash', function () { return f.money(s.cash); }));
    card.appendChild(U.kvLive('Bet in total this run', function () { return f.ma(s.tot.casinoBet); }));
    var net = h('span'); U.on(function () { var n = s.tot.casinoWon - s.tot.casinoBet + (s.casOpen || 0); net.textContent = n === 0 ? 'Even' : (n > 0 ? 'Up ' : 'Down ') + f.ma(Math.abs(n)); net.className = n === 0 ? '' : f.sign(n); });
    card.appendChild(h('div', { cls: 'kv' }, h('span', { text: 'How you are doing' }), net));
    card.appendChild(U.kvLive('What the odds say you should have lost', function () { return f.ma(Math.round(s.tot.casinoEV)); }));
    el.appendChild(card);
  }

  K.open = function () {
    var s0 = G.run.s;
    if (live.run !== G.run) live = { run: G.run, bj: null, vp: null, flight: 0 };
    // A bet left on the table when the page was closed cannot be picked up again: the cards are gone.
    if ((s0.casOpen || 0) > onTable()) {
      var lost = s0.casOpen - onTable(); G.run.casinoPay(lost, 0); App.touch();
      U.toast('You left a bet on the table', { kind: 'bad', sub: f.ma(lost) + ' was lost when you walked away.', ms: 5000 });
    }
    U.sheet({ title: 'Casino', full: true, build: function (b) {
      var body = h('div', { style: 'margin-top:12px' });
      b.appendChild(U.seg([['bj', 'Blackjack'], ['rl', 'Roulette'], ['sl', 'Slots'], ['vp', 'Poker']], function () { return tab; }, function (v) { tab = v; reg.render(); }));
      b.appendChild(body);
      var reg = U.region(body, function (host) { ({ bj: blackjack, rl: roulette, sl: slots, vp: poker })[tab](host); tally(host); });
    } });
    U.once('x_casino', 'About the casino', 'Every game here uses real rules and real odds, and in every one the house keeps a slice of all the money bet. You can win tonight. Nobody wins over a lifetime. It uses your run\'s cash, and the end-of-run review will show what it cost.');
  };

  /* ---------- blackjack ---------- */
  var bjShoe = [];
  function blackjack(host) {
    var s = G.run.s, st = table('bj', function () { return { phase: 'bet', hands: [], dealer: [], cur: 0, msg: 'Place your bet.' }; });
    var felt = h('div', { cls: 'felt' }), ctr = h('div', { cls: 'stack', style: 'margin-top:12px' });
    host.appendChild(felt); host.appendChild(ctr);
    host.appendChild(h('p', { cls: 'mute', style: 'font-size:12.5px;margin-top:10px', text: 'Six decks. Dealer stands on 17. Blackjack pays 3 to 2. The house keeps about 0.5% of every dollar bet if you play each hand perfectly, and 2% or more if you play on instinct.' }));
    function draw() { if (bjShoe.length < 60) bjShoe = shoe(6); BW.Audio.play('card'); return bjShoe.pop(); }
    function total() { var t = 0; st.hands.forEach(function (x) { t += x.bet; }); return t; }
    function paint() {
      U.clear(felt); U.clear(ctr);
      var hide = st.phase === 'play', dv = K.bjValue(st.dealer);
      var dh = h('div', { cls: 'hand' }); st.dealer.forEach(function (c, i) { dh.appendChild(cardEl(c, hide && i === 1)); });
      felt.appendChild(h('div', null, h('div', { cls: 'lbl', text: 'Dealer' + (st.dealer.length && !hide ? ': ' + dv.total : '') }), dh));
      felt.appendChild(h('div', { cls: 'msg', text: st.msg }));
      var ph = h('div');
      st.hands.forEach(function (x, i) { var v = K.bjValue(x.cards), row = h('div', { cls: 'hand' }); x.cards.forEach(function (c) { row.appendChild(cardEl(c)); });
        ph.appendChild(h('div', { style: st.phase === 'play' && i !== st.cur ? 'opacity:.55' : '' }, row, h('div', { cls: 'lbl', text: (st.hands.length > 1 ? 'Hand ' + (i + 1) + ': ' : 'You: ') + v.total + (v.soft && v.total < 21 ? ' (soft)' : '') + '  bet ' + f.m0(x.bet) }))); });
      if (!st.hands.length) ph.appendChild(h('div', { cls: 'hand' }));
      felt.appendChild(ph);
      if (st.phase === 'play') {
        var x = st.hands[st.cur], two = x.cards.length === 2, canMore = s.cash >= x.bet;
        ctr.appendChild(h('div', { cls: 'btns' }, h('button', { cls: 'btn', text: 'Stand', tap: stand }), h('button', { cls: 'btn pri', text: 'Hit', tap: hit })));
        var extra = h('div', { cls: 'btns' });
        if (two && canMore) extra.appendChild(h('button', { cls: 'btn ghost', text: 'Double', tap: dbl }));
        if (two && canMore && st.hands.length === 1 && Math.min(x.cards[0].r, 10) === Math.min(x.cards[1].r, 10)) extra.appendChild(h('button', { cls: 'btn ghost', text: 'Split', tap: split }));
        if (extra.children.length) ctr.appendChild(extra);
      } else {
        ctr.appendChild(betBar(paint));
        var deal = h('button', { cls: 'btn pri', text: 'Deal for ' + f.m0(bet), tap: start }); deal.disabled = bet > s.cash; ctr.appendChild(deal);
        if (bet > s.cash) ctr.appendChild(h('p', { cls: 'down', style: 'font-size:13px;text-align:center', text: 'You do not have that much cash.' }));
      }
    }
    function start() {
      if (st.phase === 'play' || bet > s.cash || !stake(bet, 0.005)) return;
      st.hands = [{ cards: [draw(), draw()], bet: bet }]; st.dealer = [draw(), draw()]; st.cur = 0; st.phase = 'play'; st.msg = '';
      var pv = K.bjValue(st.hands[0].cards).total, dv = K.bjValue(st.dealer).total;
      if (pv === 21 || dv === 21) { st.natural = pv === 21; finish(true); return; }
      paint();
    }
    function hit() { var x = st.hands[st.cur]; x.cards.push(draw()); if (K.bjValue(x.cards).total >= 21) next(); else paint(); }
    function stand() { next(); }
    function dbl() { var x = st.hands[st.cur]; if (!stake(x.bet, 0.005)) return; x.bet *= 2; x.cards.push(draw()); BW.Audio.play('chip'); next(); }
    function split() { var x = st.hands[0]; if (!stake(x.bet, 0.005)) return; st.hands = [{ cards: [x.cards[0], draw()], bet: x.bet, split: true }, { cards: [x.cards[1], draw()], bet: x.bet, split: true }]; BW.Audio.play('chip'); if (K.bjValue(st.hands[0].cards).total >= 21) next(); else paint(); }
    function next() { st.cur++; if (st.cur >= st.hands.length) finish(false); else if (K.bjValue(st.hands[st.cur].cards).total >= 21) next(); else paint(); }
    function finish(natural) {
      var live = st.hands.some(function (x) { return K.bjValue(x.cards).total <= 21; });
      if (!natural && live) while (K.bjValue(st.dealer).total < 17) st.dealer.push(draw());
      var dv = K.bjValue(st.dealer).total, dBJ = st.dealer.length === 2 && dv === 21, tot = 0, pay = 0;
      st.hands.forEach(function (x) { var pv = K.bjValue(x.cards).total, pBJ = x.cards.length === 2 && pv === 21 && !x.split; tot += x.bet;
        if (pv > 21) return; if (pBJ && !dBJ) { pay += Math.round(x.bet * 2.5); return; } if (dBJ && !pBJ) return;
        if (dv > 21 || pv > dv) pay += x.bet * 2; else if (pv === dv) pay += x.bet; });
      payOut(tot, pay);
      var net = pay - tot; st.phase = 'done';
      st.msg = net > 0 ? (pay === Math.round(tot * 2.5) && st.hands.length === 1 && st.hands[0].cards.length === 2 ? 'Blackjack! ' : 'You win ') + f.m0(net) : net === 0 ? 'Push. Your bet comes back.' : (dBJ ? 'Dealer has blackjack. ' : '') + 'You lose ' + f.m0(-net);
      BW.Audio.play(net > 0 ? 'good' : net === 0 ? 'tick' : 'bad'); paint();
    }
    paint();
  }

  /* ---------- roulette ---------- */
  function roulette(host) {
    var s = G.run.s, bets = {}, spinning = false, last = null, angle = 0;
    var cv = h('canvas'), msg = h('div', { cls: 'msg', text: 'Tap the table to place chips.' });
    host.appendChild(h('div', { cls: 'felt' }, h('div', { cls: 'wheelwrap' }, cv), msg));
    var grid = h('div', { cls: 'rgrid', style: 'margin-top:12px' }), out = h('div', { cls: 'rout' }), btnRefs = {};
    function total() { var t = 0; for (var k in bets) t += bets[k]; return t; }
    function place(k, b) { if (spinning) return; if (total() + bet > s.cash) { msg.textContent = 'Not enough cash for another chip.'; BW.Audio.play('error'); return; } bets[k] = (bets[k] || 0) + bet; b.classList.add('bet'); BW.Audio.play('chip'); paintGo(); }
    function mkb(k, label, cls) { var b = h('button', { cls: cls || '', text: label, 'aria-label': 'Bet on ' + label, tap: function () { place(k, b); } }); btnRefs[k] = b; return b; }
    for (var row = 0; row < 3; row++) for (var col = 0; col < 12; col++) { var n = col * 3 + (3 - row); grid.appendChild(mkb('n' + n, String(n), K.isRed(n) ? 'r' : 'b')); }
    host.appendChild(grid);
    [['n0', '0', 'g'], ['d1', '1 to 12'], ['d2', '13 to 24'], ['d3', '25 to 36'], ['low', '1 to 18'], ['even', 'Even'], ['red', 'Red'], ['black', 'Black'], ['odd', 'Odd'], ['high', '19 to 36']].forEach(function (x) { var b = mkb(x[0], x[1]); if (x[2]) { b.style.background = '#17804F'; b.className = 'zero'; } if (x[0] === 'red') b.style.background = '#B52A2A'; if (x[0] === 'black') b.style.background = '#1D1D22'; out.appendChild(b); });
    host.appendChild(out);
    var ctr = h('div', { cls: 'stack', style: 'margin-top:12px' }); host.appendChild(ctr);
    var go = h('button', { cls: 'btn pri' }), clr = h('button', { cls: 'btn ghost', text: 'Clear chips', tap: function () { if (spinning) return; bets = {}; for (var k in btnRefs) btnRefs[k].classList.remove('bet'); paintGo(); } });
    ctr.appendChild(h('div', { cls: 'mute', style: 'font-size:12.5px', text: 'Chip size' })); ctr.appendChild(betBar()); ctr.appendChild(h('div', { cls: 'btns' }, clr, go));
    host.appendChild(h('p', { cls: 'mute', style: 'font-size:12.5px;margin-top:10px', text: 'One zero, 37 pockets. A single number pays 35 to 1 when the fair price would be 36 to 1. That gap is the house edge: 2.7% of every chip, on every bet on the table.' }));
    function paintGo() { var t = total(); go.textContent = t ? 'Spin with ' + f.m0(t) : 'Spin'; go.disabled = !t || spinning; }
    function wheel(a, ballA) {
      var S = 200, dpr = Math.min(window.devicePixelRatio || 1, 3); if (cv.width !== S * dpr) { cv.width = S * dpr; cv.height = S * dpr; cv.style.width = S + 'px'; cv.style.height = S + 'px'; }
      var g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, S, S); g.save(); g.translate(S / 2, S / 2);
      var seg = Math.PI * 2 / 37, i;
      g.fillStyle = '#2B1B0E'; g.beginPath(); g.arc(0, 0, 98, 0, 6.3); g.fill();
      for (i = 0; i < 37; i++) { var n2 = K.WHEEL[i], a0 = a + i * seg - seg / 2 - Math.PI / 2;
        g.beginPath(); g.moveTo(0, 0); g.arc(0, 0, 88, a0, a0 + seg); g.closePath(); g.fillStyle = n2 === 0 ? '#17804F' : K.isRed(n2) ? '#B52A2A' : '#1D1D22'; g.fill();
        g.save(); g.rotate(a + i * seg); g.fillStyle = '#fff'; g.font = '700 9px sans-serif'; g.textAlign = 'center'; g.fillText(String(n2), 0, -74); g.restore(); }
      g.fillStyle = '#3A2714'; g.beginPath(); g.arc(0, 0, 58, 0, 6.3); g.fill(); g.fillStyle = '#C9A24A'; g.beginPath(); g.arc(0, 0, 10, 0, 6.3); g.fill();
      if (ballA != null) { g.fillStyle = '#fff'; g.beginPath(); g.arc(Math.sin(ballA) * 66, -Math.cos(ballA) * 66, 5, 0, 6.3); g.fill(); }
      g.restore();
    }
    U.tap(go, function () {
      var t = total(); if (!t || spinning || t > s.cash || !stake(t, 1 / 37)) return;
      spinning = true; live.flight += t; paintGo(); msg.textContent = 'No more bets.';
      var idx = rnd(37), n3 = K.WHEEL[idx], seg = Math.PI * 2 / 37, t0 = performance.now(), dur = 3600, a0 = angle, turns = 4 * Math.PI * 2, lastTick = 0;
      var ballEnd = a0 + turns + idx * seg; // ball ends over the winning pocket, wherever the wheel stops
      (function loop(ts) {
        var k = Math.min(1, (ts - t0) / dur), e = 1 - Math.pow(1 - k, 3);
        angle = a0 + turns * e; var ball = ballEnd - (1 - e) * 22;
        wheel(angle, ball);
        var tk = Math.floor(ball / seg); if (tk !== lastTick) { lastTick = tk; if (k < 0.97) BW.Audio.play('rtick'); }
        if (k < 1 && cv.isConnected) { requestAnimationFrame(loop); return; }
        angle = angle % (Math.PI * 2);
        var pay = K.roulettePay(bets, n3); live.flight -= t; payOut(t, pay); spinning = false; last = n3;
        var net = pay - t; msg.textContent = n3 + (n3 === 0 ? ' green. ' : K.isRed(n3) ? ' red. ' : ' black. ') + (net > 0 ? 'You win ' + f.m0(net) : net === 0 ? 'You break even.' : 'You lose ' + f.m0(-net));
        BW.Audio.play(net > 0 ? 'good' : 'thunk'); bets = {}; for (var kk in btnRefs) btnRefs[kk].classList.remove('bet'); paintGo();
      })(t0);
    });
    wheel(0, null); paintGo();
  }

  /* ---------- slots ---------- */
  function symbol(cv, k) {
    var S = 60, dpr = Math.min(window.devicePixelRatio || 1, 3); cv.width = S * dpr; cv.height = S * dpr; var g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, S, S); g.textAlign = 'center'; g.textBaseline = 'middle';
    if (k === 'S') { g.fillStyle = '#C62B2B'; g.font = '800 48px ' + C.css('--fD'); g.fillText('7', 30, 33); }
    else if (k === 'B') { var c2 = document.createElement('canvas'); C.bell(c2, 'bl_brass', 0, 56); g.drawImage(c2, 2, 2, 56, 56); }
    else if (k === 'H') { g.fillStyle = '#F2F2EE'; g.strokeStyle = '#444'; g.lineWidth = 1.5; [[20, 30, 11], [30, 24, 12], [40, 30, 11], [26, 38, 10], [36, 38, 10]].forEach(function (c) { g.beginPath(); g.arc(c[0], c[1], c[2], 0, 6.3); g.fill(); g.stroke(); }); g.fillStyle = '#F2F2EE'; g.beginPath(); g.arc(30, 31, 12, 0, 6.3); g.fill(); g.fillStyle = '#333'; g.beginPath(); g.ellipse(46, 26, 7, 8, 0.3, 0, 6.3); g.fill(); g.fillRect(24, 46, 3, 8); g.fillRect(34, 46, 3, 8); }
    else if (k === 'C') { g.fillStyle = '#E6BA4E'; g.beginPath(); g.arc(30, 30, 20, 0, 6.3); g.fill(); g.strokeStyle = '#9A6A12'; g.lineWidth = 3; g.beginPath(); g.arc(30, 30, 15, 0, 6.3); g.stroke(); g.fillStyle = '#7A5A14'; g.font = '800 20px ' + C.css('--fD'); g.fillText('$', 30, 31); }
    else if (k === 'R') { g.fillStyle = '#1D2A44'; g.fillRect(6, 20, 48, 20); g.fillStyle = '#fff'; g.font = '800 15px ' + C.css('--fD'); g.fillText('BAR', 30, 31); }
    else if (k === 'Y') { g.strokeStyle = '#2E7D32'; g.lineWidth = 3; g.beginPath(); g.moveTo(22, 38); g.quadraticCurveTo(26, 14, 40, 10); g.moveTo(40, 38); g.quadraticCurveTo(40, 22, 40, 10); g.stroke(); g.fillStyle = '#D32F2F'; g.beginPath(); g.arc(20, 42, 10, 0, 6.3); g.fill(); g.beginPath(); g.arc(41, 43, 10, 0, 6.3); g.fill(); }
    else { g.fillStyle = '#C9CED6'; g.fillRect(18, 28, 24, 4); }
  }
  function slots(host) {
    var s = G.run.s, busy = false, cvs = [h('canvas'), h('canvas'), h('canvas')], reels = cvs.map(function (c) { return h('div', { cls: 'reel' }, c); });
    var msg = h('div', { cls: 'msg', text: 'Three in a row pays.' });
    host.appendChild(h('div', { cls: 'felt', style: 'min-height:190px' }, h('div', { cls: 'reels' }, reels), msg));
    ['S', 'B', 'H'].forEach(function (k, i) { symbol(cvs[i], k); });
    var ctr = h('div', { cls: 'stack', style: 'margin-top:12px' }), go = h('button', { cls: 'btn pri' }); host.appendChild(ctr);
    function paint() { go.textContent = 'Spin for ' + f.m0(bet); go.disabled = busy || bet > s.cash; }
    ctr.appendChild(betBar(paint)); ctr.appendChild(go);
    var pt = h('div', { cls: 'card', style: 'margin-top:12px' }), names = { SSS: 'Three sevens', BBB: 'Three bells', HHH: 'Three sheep', CCC: 'Three coins', YYY: 'Three cherries', RRR: 'Three bars', YY: 'Cherries on the first two reels', Y: 'A cherry on the first reel' };
    Object.keys(names).forEach(function (k) { pt.appendChild(U.kv(names[k], K.SLOTPAY[k] + 'x your bet')); });
    host.appendChild(pt);
    host.appendChild(h('p', { cls: 'mute', style: 'font-size:12.5px;margin-top:10px', text: 'Over time this machine pays back ' + (K.slotRTP * 100).toFixed(1) + '% of what goes in. The other ' + ((1 - K.slotRTP) * 100).toFixed(1) + '% is the house\'s, far more than any table game takes. The lights and near-misses are there so you do not notice.' }));
    U.tap(go, function () {
      if (busy || bet > s.cash || !stake(bet, 1 - K.slotRTP)) return; busy = true; paint(); msg.textContent = '';
      var res = K.STRIPS.map(function (st) { return st[rnd(st.length)]; }), staked = bet; live.flight += staked;
      reels.forEach(function (r, i) { r.classList.add('spin'); var iv = setInterval(function () { symbol(cvs[i], 'SBHCRYX'[rnd(7)]); }, 70);
        setTimeout(function () { clearInterval(iv); r.classList.remove('spin'); symbol(cvs[i], res[i]); BW.Audio.play('thunk');
          if (i === 2) { var mult = K.slotPay(res[0], res[1], res[2]), pay = staked * mult; live.flight -= staked; payOut(staked, pay); busy = false;
            msg.textContent = mult ? (mult >= 2 ? 'You win ' + f.m0(pay - staked) : 'Your bet comes back.') : 'Nothing.'; if (mult >= 20) BW.Audio.play('jackpot'); else if (mult > 1) BW.Audio.play('coin'); paint(); } }, 600 + i * 450); });
    });
    paint();
  }

  /* ---------- video poker: Jacks or Better ---------- */
  function poker(host) {
    var s = G.run.s, st = table('vp', function () { return { phase: 'bet', cards: [], held: [false, false, false, false, false], deck: [], msg: 'Jacks or Better. Deal five cards.', stake: 0 }; });
    var felt = h('div', { cls: 'felt', style: 'min-height:200px' }), ctr = h('div', { cls: 'stack', style: 'margin-top:12px' });
    host.appendChild(felt); host.appendChild(ctr);
    var pt = h('div', { cls: 'card', style: 'margin-top:12px' }); K.PAYS.forEach(function (p) { pt.appendChild(U.kv(p[0], p[1] === 1 ? 'Your bet back' : p[1] + 'x your bet')); }); host.appendChild(pt);
    host.appendChild(h('p', { cls: 'mute', style: 'font-size:12.5px;margin-top:10px', text: 'This is the machine version of poker: you against a pay table, with no opponents to read. Played perfectly the house keeps about 0.5%. Hardly anyone plays it perfectly. A full table with computer opponents is not built yet.' }));
    function paint() {
      U.clear(felt); U.clear(ctr);
      var row = h('div', { cls: 'hand', style: 'gap:6px' });
      st.cards.forEach(function (c, i) { var el = cardEl(c); el.style.marginLeft = '0'; if (st.held[i]) el.classList.add('held'); if (st.phase === 'hold') { el.setAttribute('role', 'button'); el.setAttribute('aria-label', 'Hold card ' + (i + 1)); U.tap(el, function () { st.held[i] = !st.held[i]; BW.Audio.play('tick'); paint(); }); } row.appendChild(el); });
      felt.appendChild(row); felt.appendChild(h('div', { cls: 'msg', text: st.msg }));
      if (st.phase === 'hold') { ctr.appendChild(h('p', { cls: 'mute', style: 'font-size:13px;text-align:center', text: 'Tap the cards you want to keep.' })); ctr.appendChild(h('button', { cls: 'btn pri', text: 'Draw', tap: drawStep })); }
      else { ctr.appendChild(betBar(paint)); var d = h('button', { cls: 'btn pri', text: 'Deal for ' + f.m0(bet), tap: deal }); d.disabled = bet > s.cash; ctr.appendChild(d); }
    }
    function deal() { if (st.phase === 'hold' || bet > s.cash || !stake(bet, 0.0046)) return; st.deck = shoe(1); st.cards = [0, 1, 2, 3, 4].map(function () { BW.Audio.play('card'); return st.deck.pop(); }); st.held = [false, false, false, false, false]; st.stake = bet; st.phase = 'hold'; var r0 = K.pokerRank(st.cards); st.msg = r0 >= 0 ? 'You already have ' + K.PAYS[r0][0].toLowerCase() + '.' : ''; paint(); }
    function drawStep() { st.cards = st.cards.map(function (c, i) { if (st.held[i]) return c; BW.Audio.play('card'); return st.deck.pop(); }); var rk = K.pokerRank(st.cards), pay = rk >= 0 ? st.stake * K.PAYS[rk][1] : 0; payOut(st.stake, pay); st.phase = 'bet'; st.held = [false, false, false, false, false];
      st.msg = rk >= 0 ? K.PAYS[rk][0] + '. ' + (pay > st.stake ? 'You win ' + f.m0(pay - st.stake) : 'Your bet comes back.') : 'Nothing. You lose ' + f.m0(st.stake); BW.Audio.play(rk >= 0 ? (rk <= 3 ? 'jackpot' : rk === 8 ? 'tick' : 'good') : 'bad'); paint(); }
    paint();
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
