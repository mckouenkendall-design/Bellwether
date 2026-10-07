/* Canvas charts: candlesticks, lines, sparklines, bars, and the bell. */
(function (root) {
  'use strict';
  var BW = root.BW, U = BW.UI, T = BW.T, C = BW.Charts = {};

  function css(name) { return getComputedStyle(document.getElementById('app')).getPropertyValue(name).trim() || '#888'; }
  C.css = css;
  function setup(cv, hCss) {
    var w = cv.clientWidth || cv.parentNode.clientWidth || 320, dpr = Math.min(window.devicePixelRatio || 1, 3);
    if (cv.width !== Math.round(w * dpr) || cv.height !== Math.round(hCss * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(hCss * dpr); cv.style.height = hCss + 'px'; }
    var g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, hCss);
    return { g: g, w: w, h: hCss };
  }
  C.setup = setup;
  function niceStep(span, n) { var raw = span / n, p = Math.pow(10, Math.floor(Math.log10(raw))), f = raw / p; return (f < 1.5 ? 1 : f < 3.5 ? 2 : f < 7.5 ? 5 : 10) * p; }
  function fmtAxis(v) { var a = Math.abs(v); return a >= 1e9 ? (v / 1e9).toFixed(1) + 'B' : a >= 1e6 ? (v / 1e6).toFixed(a >= 1e7 ? 0 : 1) + 'M' : a >= 1e4 ? Math.round(v / 1e3) + 'k' : a >= 100 ? Math.round(v).toString() : a >= 10 ? v.toFixed(1) : v.toFixed(2); }
  C.fmtAxis = fmtAxis;
  C.fmtUsd = function (v) { return (v < 0 ? '-$' : '$') + fmtAxis(Math.abs(v)); };
  function bucketFor(range) { var b = range / 56; return b <= 1.2 ? 1 : b <= 6 ? 5 : b <= 24 ? 20 : b <= 70 ? 60 : b <= 140 ? 120 : 240; }
  function xLabel(rel, bucket, span) { var p = BW.dateParts(rel); if (rel < 0 && (bucket >= 20 || span > 300)) return Math.ceil(-rel / 240) + 'y before'; return bucket >= 60 || span > 700 ? 'Y' + p.year : bucket >= 5 ? p.mname + (span > 200 ? ' Y' + p.year : '') : p.mname + ' ' + p.day; }

  /* ---------- price chart ---------- */
  // o: { asset, day(): current day, day0, range, mode ('candle'|'line'), ma, vol, compare (asset or null), cost (cents or 0), news (array), onInspect(info|null), height }
  C.price = function (box, o) {
    var cv = U.h('canvas'), tip = U.h('div', { cls: 'tip' });
    box.classList.add('chartbox'); box.appendChild(cv); box.appendChild(tip);
    var st = { hover: -1, lastKey: '' }, geo = null;

    function build() {
      var a = o.asset, d1 = Math.min(o.day(), a.end >= 0 ? a.end : 1e9), start = Math.max(a.start, d1 - o.range);
      var b = bucketFor(d1 - start), out = [], d, i;
      var first = start - ((start - o.day0) % b + b) % b; if (first < a.start) first += b * Math.ceil((a.start - first) / b);
      if (first > start) first = start;
      for (d = first; d <= d1; d += b) {
        var e = Math.min(d + b - 1, d1), s0 = Math.max(d, a.start);
        if (e < s0) continue;
        var op, hi = -1, lo = 1e15, cl = a.pc[e], vol = 0;
        if (b === 1) { var q = T.ohlc(a, e); op = q[0]; hi = q[1]; lo = q[2]; vol = T.volume(a, e); }
        else {
          op = s0 > a.start ? a.pc[s0 - 1] : a.pc[s0];
          for (i = s0; i <= e; i++) { var c = a.pc[i]; if (c > hi) hi = c; if (c < lo) lo = c; if (o.vol) vol += T.volume(a, i); }
          if (op > hi) hi = op; if (op < lo) lo = op;
          var wk = (hi - lo) * 0.12 + cl * 0.003; hi += wk * BW.hrand(a.id, e, 7); lo = Math.max(1, lo - wk * BW.hrand(a.id, e, 8));
          if (o.vol) vol /= (e - s0 + 1);
        }
        out.push({ d0: s0, d1: e, o: op, h: hi, l: lo, c: cl, v: vol, news: 0 });
      }
      return { bars: out, b: b, d1: d1, start: start };
    }

    function draw() {
      var a = o.asset, H = o.height || 250, S = setup(cv, H), g = S.g, w = S.w;
      var data = build(), bars = data.bars, n = bars.length;
      if (!n) return;
      var padR = 50, padL = 14, padT = 22, volH = o.vol ? 34 : 0, padB = 32 + volH;
      var pw = w - padL - padR, ph = H - padT - padB;
      var lo = 1e15, hi = -1, i, k;
      for (i = 0; i < n; i++) { if (bars[i].l < lo) lo = bars[i].l; if (bars[i].h > hi) hi = bars[i].h; }
      var line = o.mode === 'line';
      if (line) { lo = 1e15; hi = -1; for (i = 0; i < n; i++) { if (bars[i].c < lo) lo = bars[i].c; if (bars[i].c > hi) hi = bars[i].c; } }
      if (o.cost && o.cost > lo * 0.6 && o.cost < hi * 1.6) { lo = Math.min(lo, o.cost); hi = Math.max(hi, o.cost); }
      var cmp = null;
      if (o.compare) { cmp = []; var base = o.compare.pc[bars[0].d0] || 1, mine = bars[0].o; for (i = 0; i < n; i++) { var cvv = o.compare.pc[bars[i].d1] / base * mine; cmp.push(cvv); if (cvv < lo) lo = cvv; if (cvv > hi) hi = cvv; } }
      var log = hi / Math.max(lo, 1) > 3.5;
      var pad = log ? 0.04 : (hi - lo) * 0.07 + hi * 0.002;
      var y0 = log ? Math.log(lo) - pad : lo - pad, y1 = log ? Math.log(hi) + pad : hi + pad;
      var Y = function (v) { return padT + ph * (1 - ((log ? Math.log(Math.max(v, 1)) : v) - y0) / (y1 - y0)); };
      var slot = pw / n, X = function (i2) { return padL + slot * (i2 + 0.5); };
      var ink3 = css('--ink3'), lineC = css('--line'), up = css('--cUp'), dn = css('--cDown'), brass = css('--brass'), ink = css('--ink'), ink2 = css('--ink2');
      g.font = '11px ' + css('--fT'); g.textBaseline = 'middle';
      // horizontal grid + price labels
      g.strokeStyle = lineC; g.fillStyle = ink3; g.lineWidth = 1; g.textAlign = 'left';
      var ticks = [];
      if (log) { var steps = [1, 2, 5], e10 = Math.pow(10, Math.floor(Math.log10(lo))); for (k = 0; k < 12; k++) { var tv = steps[k % 3] * e10 * Math.pow(10, Math.floor(k / 3)); if (tv >= lo * 0.98 && tv <= hi * 1.02) ticks.push(tv); } if (ticks.length < 2) ticks = [lo, hi]; }
      else { var stp = niceStep(hi - lo || 1, 4); for (var tv2 = Math.ceil(lo / stp) * stp; tv2 <= hi; tv2 += stp) ticks.push(tv2); }
      ticks.forEach(function (tv3) { var yy = Math.round(Y(tv3)) + 0.5; g.globalAlpha = 0.6; g.beginPath(); g.moveTo(padL, yy); g.lineTo(w - padR + 4, yy); g.stroke(); g.globalAlpha = 1; g.fillText(fmtAxis(tv3 / 100), w - padR + 8, yy); });
      // date labels
      g.textAlign = 'center';
      var every = Math.max(1, Math.round(n / (data.d1 - bars[0].d0 > 200 && data.d1 - bars[0].d0 <= 700 ? 3 : 4)));
      for (i = Math.floor(every / 2); i < n; i += every) g.fillText(xLabel(bars[i].d0 - o.day0, data.b, data.d1 - bars[0].d0), X(i), H - volH - 9);
      // volume
      if (o.vol) { var vmax = 0.001; for (i = 0; i < n; i++) vmax = Math.max(vmax, bars[i].v); g.globalAlpha = 0.5;
        for (i = 0; i < n; i++) { var vh = Math.max(1, bars[i].v / vmax * (volH - 6)); g.fillStyle = bars[i].c >= bars[i].o ? up : dn; g.fillRect(X(i) - slot * 0.32, H - vh - 2, Math.max(1, slot * 0.64), vh); } g.globalAlpha = 1; }
      // comparison line
      if (cmp) { g.strokeStyle = ink3; g.lineWidth = 1.5; g.setLineDash([4, 4]); g.beginPath(); for (i = 0; i < n; i++) { if (i) g.lineTo(X(i), Y(cmp[i])); else g.moveTo(X(i), Y(cmp[i])); } g.stroke(); g.setLineDash([]); }
      if (line) {
        var rise = bars[n - 1].c >= bars[0].o, col = rise ? up : dn;
        var grd = g.createLinearGradient(0, padT, 0, padT + ph); grd.addColorStop(0, col); grd.addColorStop(1, 'transparent');
        g.beginPath(); g.moveTo(X(0), Y(bars[0].c)); for (i = 1; i < n; i++) g.lineTo(X(i), Y(bars[i].c));
        g.strokeStyle = col; g.lineWidth = 2; g.lineJoin = 'round'; g.stroke();
        g.lineTo(X(n - 1), padT + ph); g.lineTo(X(0), padT + ph); g.closePath(); g.globalAlpha = 0.16; g.fillStyle = grd; g.fill(); g.globalAlpha = 1;
      } else {
        var bw = Math.max(1.5, Math.min(11, slot * 0.66)), wick = css('--cWick'), hollow = document.getElementById('app').getAttribute('data-cd') === 'cd_mono';
        for (i = 0; i < n; i++) {
          var br = bars[i], x = X(i), isUp = br.c >= br.o, c2 = isUp ? up : dn;
          g.strokeStyle = c2; g.lineWidth = 1.2; g.beginPath(); g.moveTo(Math.round(x) + 0.5, Y(br.h)); g.lineTo(Math.round(x) + 0.5, Y(br.l)); g.stroke();
          var ya = Y(Math.max(br.o, br.c)), yb = Y(Math.min(br.o, br.c)), hh = Math.max(1.2, yb - ya);
          if (hollow && isUp) { g.fillStyle = css('--bg'); g.fillRect(x - bw / 2, ya, bw, hh); g.strokeRect(x - bw / 2 + 0.5, ya + 0.5, bw - 1, Math.max(0.5, hh - 1)); }
          else { g.fillStyle = c2; g.fillRect(x - bw / 2, ya, bw, hh); }
        }
      }
      // moving averages (in trading days)
      if (o.ma) [[50, brass], [200, css('--info')]].forEach(function (m) {
        g.strokeStyle = m[1]; g.lineWidth = 1.4; g.beginPath(); var started = false;
        for (i = 0; i < n; i++) { var e2 = bars[i].d1, s2 = e2 - m[0] + 1; if (s2 < a.start) continue; var sum = 0, stepM = Math.max(1, Math.floor(m[0] / 25)), cnt = 0; for (k = s2; k <= e2; k += stepM) { sum += a.pc[k]; cnt++; } var yv = Y(sum / cnt); if (started) g.lineTo(X(i), yv); else { g.moveTo(X(i), yv); started = true; } }
        g.stroke();
      });
      // your average cost
      if (o.cost) { var yc = Math.round(Y(o.cost)) + 0.5; if (yc > padT && yc < padT + ph) { g.strokeStyle = brass; g.setLineDash([2, 4]); g.lineWidth = 1.5; g.beginPath(); g.moveTo(padL, yc); g.lineTo(w - padR, yc); g.stroke(); g.setLineDash([]); g.fillStyle = brass; g.textAlign = 'left'; g.fillText('you paid', padL + 2, yc - 8); } }
      // last price marker
      var last = bars[n - 1].c, yl = Y(last);
      g.fillStyle = bars[n - 1].c >= bars[0].o ? up : dn; var lbl = fmtAxis(last / 100); g.textAlign = 'left';
      var tw = g.measureText(lbl).width + 10; roundRect(g, w - padR + 4, yl - 9, tw, 18, 4); g.fill();
      g.fillStyle = css('--bg'); g.font = '700 11px ' + css('--fT'); g.fillText(lbl, w - padR + 9, yl + 0.5); g.font = '11px ' + css('--fT');
      // news pins
      if (o.news) {
        var j = 0, nl = o.news;
        for (i = 0; i < n; i++) bars[i].news = 0;
        for (k = 0; k < nl.length; k++) { var nd = nl[k].d; if (nd > data.d1) break; if (nd < bars[0].d0) continue; while (j < n - 1 && bars[j].d1 < nd) j++; bars[j].news += nl[k].sev >= 3 ? 3 : 1; }
        for (i = 0; i < n; i++) if (bars[i].news) { g.fillStyle = bars[i].news >= 3 ? brass : ink3; g.beginPath(); g.arc(X(i), padT + ph + 7, bars[i].news >= 3 ? 3.2 : 2, 0, 6.3); g.fill(); }
      }
      // crosshair
      if (st.hover >= 0 && st.hover < n) {
        var hb = bars[st.hover], hx = Math.round(X(st.hover)) + 0.5;
        g.strokeStyle = ink2; g.lineWidth = 1; g.setLineDash([3, 3]); g.beginPath(); g.moveTo(hx, padT - 4); g.lineTo(hx, padT + ph + 8); g.stroke(); g.setLineDash([]);
        g.fillStyle = ink; g.beginPath(); g.arc(hx, Y(hb.c), 3.5, 0, 6.3); g.fill();
      }
      geo = { padL: padL, slot: slot, n: n, bars: bars, b: data.b };
      paintTip();
    }
    function roundRect(g, x, y, w2, h2, r) { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w2, y, x + w2, y + h2, r); g.arcTo(x + w2, y + h2, x, y + h2, r); g.arcTo(x, y + h2, x, y, r); g.arcTo(x, y, x + w2, y, r); g.closePath(); }
    function paintTip() {
      var f = U.f;
      if (!geo || st.hover < 0 || st.hover >= geo.n) { if (tip.firstChild) U.clear(tip); return; }
      var b = geo.bars[st.hover], ch = b.o ? b.c / b.o - 1 : 0;
      var key = st.hover + ':' + b.c + ':' + o.mode;
      if (key === st.lastKey) return; st.lastKey = key;
      U.clear(tip);
      var when = geo.b === 1 ? f.dateLong(b.d1 - o.day0) : f.date(b.d0 - o.day0) + (geo.b > 20 ? ' to ' + f.date(b.d1 - o.day0) : '');
      U.add(tip, [U.h('b', { text: when, style: 'color:var(--ink)' })]);
      if (o.mode === 'line') U.add(tip, U.h('span', { text: f.px(Math.round(b.c)) }));
      else U.add(tip, [U.h('span', { text: 'open ' + f.px(Math.round(b.o)) }), U.h('span', { text: 'high ' + f.px(Math.round(b.h)) }), U.h('span', { text: 'low ' + f.px(Math.round(b.l)) }), U.h('span', { text: 'close ' + f.px(Math.round(b.c)) })]);
      U.add(tip, U.h('span', { cls: ch >= 0 ? 'up' : 'down', text: f.pp(ch) }));
    }
    function pick(e) {
      if (!geo) return;
      var r = cv.getBoundingClientRect(), x = (e.touches ? e.touches[0].clientX : e.clientX) - r.left;
      var i = Math.max(0, Math.min(geo.n - 1, Math.floor((x - geo.padL) / geo.slot)));
      if (i !== st.hover) { st.hover = i; draw(); if (BW.Audio) BW.Audio.play('scrub'); if (o.onInspect) o.onInspect(geo.bars[i]); }
    }
    var down = false;
    cv.addEventListener('pointerdown', function (e) { down = true; try { cv.setPointerCapture(e.pointerId); } catch (x) { /* ok */ } pick(e); });
    cv.addEventListener('pointermove', function (e) { if (down || e.pointerType === 'mouse') pick(e); });
    var end = function () { down = false; };
    cv.addEventListener('pointerup', end); cv.addEventListener('pointercancel', end);
    cv.addEventListener('pointerleave', function (e) { if (e.pointerType === 'mouse') { st.hover = -1; st.lastKey = ''; draw(); if (o.onInspect) o.onInspect(null); } });
    return { draw: draw, clearHover: function () { st.hover = -1; st.lastKey = ''; draw(); if (o.onInspect) o.onInspect(null); }, o: o };
  };

  /* ---------- sparkline ---------- */
  C.spark = function (cv, arr, d0, d1, wCss, hCss, sign) {
    var dpr = Math.min(window.devicePixelRatio || 1, 3), w = wCss || 64, h = hCss || 30;
    if (cv.width !== w * dpr) { cv.width = w * dpr; cv.height = h * dpr; }
    var g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, w, h);
    var n = d1 - d0; if (n < 2) return;
    var step = Math.max(1, Math.floor(n / 32)), lo = 1e15, hi = -1, i;
    for (i = d0; i <= d1; i += step) { var v = arr[i]; if (v < lo) lo = v; if (v > hi) hi = v; }
    if (arr[d1] < lo) lo = arr[d1]; if (arr[d1] > hi) hi = arr[d1];
    var span = hi - lo || 1; g.beginPath();
    for (i = d0; ; i += step) { if (i > d1) i = d1; var x = 1 + (w - 2) * (i - d0) / n, y = 2 + (h - 4) * (1 - (arr[i] - lo) / span); if (i === d0) g.moveTo(x, y); else g.lineTo(x, y); if (i === d1) break; }
    g.strokeStyle = (sign == null ? arr[d1] >= arr[d0] : sign >= 0) ? css('--up') : css('--down'); g.lineWidth = 1.6; g.lineJoin = 'round'; g.stroke();
  };

  /* ---------- generic line chart ---------- */
  // o: { height, n(): points, x(i): label, series: [{ get(i), color (css var), dash, fill, name }], fmt(v), zero, onHover }
  C.lines = function (box, o) {
    var cv = U.h('canvas'), tip = U.h('div', { cls: 'tip' });
    box.classList.add('chartbox'); box.appendChild(cv); box.appendChild(tip);
    var hover = -1, geo = null;
    function draw() {
      var H = o.height || 190, S = setup(cv, H), g = S.g, w = S.w, n = o.n();
      if (n < 2) { g.fillStyle = css('--ink3'); g.font = '13px ' + css('--fT'); g.textAlign = 'center'; g.fillText(o.emptyText || 'The line appears as time passes.', w / 2, H / 2); return; }
      var i0 = o.from ? Math.max(0, o.from()) : 0, m = n - i0;
      if (m < 2) { i0 = Math.max(0, n - 2); m = n - i0; }
      var padL = 14, padR = 50, padT = 22, padB = 20, pw = w - padL - padR, ph = H - padT - padB;
      var lo = 1e18, hi = -1e18, i, s, step = Math.max(1, Math.floor(m / 240));
      for (s = 0; s < o.series.length; s++) for (i = i0; i < n; i += step) { var v = o.series[s].get(i); if (v == null) continue; if (v < lo) lo = v; if (v > hi) hi = v; }
      for (s = 0; s < o.series.length; s++) { var vl = o.series[s].get(n - 1); if (vl != null) { if (vl < lo) lo = vl; if (vl > hi) hi = vl; } }
      if (o.zero) { if (lo > 0) lo = 0; if (hi < 0) hi = 0; }
      if (hi === lo) { hi += 1; lo -= 1; }
      var pad = (hi - lo) * 0.08; lo -= pad; hi += pad;
      var Y = function (v2) { return padT + ph * (1 - (v2 - lo) / (hi - lo)); }, X = function (i2) { return padL + pw * (i2 - i0) / (m - 1); };
      g.font = '11px ' + css('--fT'); g.textBaseline = 'middle'; g.strokeStyle = css('--line'); g.fillStyle = css('--ink3'); g.lineWidth = 1; g.textAlign = 'left';
      var stp = niceStep(hi - lo, 4);
      for (var tv = Math.ceil(lo / stp) * stp; tv <= hi; tv += stp) { var yy = Math.round(Y(tv)) + 0.5; g.globalAlpha = tv === 0 ? 1 : 0.6; g.beginPath(); g.moveTo(padL, yy); g.lineTo(w - padR + 4, yy); g.stroke(); g.globalAlpha = 1; g.fillText(o.fmt ? o.fmt(tv) : fmtAxis(tv), w - padR + 8, yy); }
      g.textAlign = 'center';
      for (i = 0; i < 4; i++) { var ix = i0 + Math.round((m - 1) * (i + 0.5) / 4); g.fillText(o.x(ix), X(ix), H - 8); }
      for (s = 0; s < o.series.length; s++) {
        var se = o.series[s], col = css(se.color); g.beginPath(); var st2 = false;
        for (i = i0; i < n; i += step) { var v3 = se.get(i); if (v3 == null) continue; if (st2) g.lineTo(X(i), Y(v3)); else { g.moveTo(X(i), Y(v3)); st2 = true; } }
        var vE = se.get(n - 1); if (vE != null) g.lineTo(X(n - 1), Y(vE));
        g.strokeStyle = col; g.lineWidth = se.width || 2; g.lineJoin = 'round'; if (se.dash) g.setLineDash(se.dash); g.stroke(); g.setLineDash([]);
        if (se.fill) { g.lineTo(X(n - 1), padT + ph); g.lineTo(X(i0), padT + ph); g.closePath(); g.globalAlpha = 0.12; g.fillStyle = col; g.fill(); g.globalAlpha = 1; }
        if (vE != null) { g.fillStyle = col; g.beginPath(); g.arc(X(n - 1), Y(vE), 3, 0, 6.3); g.fill(); }
      }
      if (hover >= i0 && hover < n) { var hx = Math.round(X(hover)) + 0.5; g.strokeStyle = css('--ink2'); g.setLineDash([3, 3]); g.beginPath(); g.moveTo(hx, padT - 4); g.lineTo(hx, padT + ph); g.stroke(); g.setLineDash([]); }
      geo = { padL: padL, pw: pw, i0: i0, m: m, n: n };
      U.clear(tip);
      var hi2 = hover >= i0 && hover < n ? hover : n - 1;
      U.add(tip, U.h('b', { text: o.x(hi2, true), style: 'color:var(--ink)' }));
      o.series.forEach(function (se2) { var v4 = se2.get(hi2); if (v4 == null) return; U.add(tip, U.h('span', { style: 'color:' + css(se2.color), text: (se2.name ? se2.name + ' ' : '') + (o.fmtTip ? o.fmtTip(v4) : o.fmt ? o.fmt(v4) : fmtAxis(v4)) })); });
    }
    function pick(e) { if (!geo) return; var r = cv.getBoundingClientRect(), x = e.clientX - r.left; var i = geo.i0 + Math.round((x - geo.padL) / geo.pw * (geo.m - 1)); i = Math.max(geo.i0, Math.min(geo.n - 1, i)); if (i !== hover) { hover = i; draw(); } }
    var down = false;
    cv.addEventListener('pointerdown', function (e) { down = true; try { cv.setPointerCapture(e.pointerId); } catch (x) { /* ok */ } pick(e); });
    cv.addEventListener('pointermove', function (e) { if (down || e.pointerType === 'mouse') pick(e); });
    cv.addEventListener('pointerup', function () { down = false; hover = -1; draw(); }); cv.addEventListener('pointercancel', function () { down = false; hover = -1; draw(); });
    cv.addEventListener('pointerleave', function () { if (!down) { hover = -1; draw(); } });
    return { draw: draw };
  };

  /* ---------- paired bars (earnings: expected vs actual) ---------- */
  C.bars = function (box, o) { // o: { items: [{ a, b, label }], height, fmt }
    var cv = U.h('canvas'); box.classList.add('chartbox'); box.appendChild(cv);
    function draw() {
      var H = o.height || 130, S = setup(cv, H), g = S.g, w = S.w, it = o.items(), n = it.length; if (!n) return;
      var padL = 16, padR = 16, padT = 10, padB = 20, pw = w - padL - padR, ph = H - padT - padB, lo = 0, hi = 0, i;
      for (i = 0; i < n; i++) { lo = Math.min(lo, it[i].a, it[i].b); hi = Math.max(hi, it[i].a, it[i].b); }
      if (hi === lo) hi = lo + 1;
      var Y = function (v) { return padT + ph * (1 - (v - lo) / (hi - lo)); }, slot = pw / n, bw = Math.min(14, slot * 0.34);
      g.strokeStyle = css('--line'); g.beginPath(); g.moveTo(padL, Math.round(Y(0)) + 0.5); g.lineTo(w - padR, Math.round(Y(0)) + 0.5); g.stroke();
      g.font = '10.5px ' + css('--fT'); g.textAlign = 'center'; g.textBaseline = 'middle';
      for (i = 0; i < n; i++) {
        var x = padL + slot * (i + 0.5), z = Y(0);
        g.fillStyle = css('--bg3'); g.fillRect(x - bw - 1, Math.min(z, Y(it[i].b)), bw, Math.max(1, Math.abs(Y(it[i].b) - z)));
        g.fillStyle = it[i].a >= it[i].b ? css('--up') : css('--down'); g.fillRect(x + 1, Math.min(z, Y(it[i].a)), bw, Math.max(1, Math.abs(Y(it[i].a) - z)));
        if (n <= 12 || i % 2 === 0) { g.fillStyle = css('--ink3'); g.fillText(it[i].label, x, H - 8); }
      }
    }
    return { draw: draw };
  };

  /* ---------- the bell ---------- */
  var BELLS = { bl_brass: ['#F0C860', '#B88A2A', '#7A5A14'], bl_silver: ['#E8EDF3', '#A9B4C2', '#6B7686'], bl_cow: ['#C9A26A', '#8C6A3C', '#5A4020'], bl_glass: ['#CFF4FF', '#7FD0E8', '#3E90AA'],
    bl_toy: ['#FF7ACB', '#C23C96', '#7A1E5E'], bl_temple: ['#5EC9A8', '#2F8C70', '#18543F'], bl_ship: ['#FFD9A0', '#D99A4A', '#8C5A1E'], bl_golden: ['#FFE98A', '#F2B81E', '#B07A00'], bl_moon: ['#DCDFE8', '#9AA0B4', '#5C6278'] };
  C.bell = function (cv, skin, angle, size) {
    var S = size || 120, dpr = Math.min(window.devicePixelRatio || 1, 3);
    if (cv.width !== S * dpr) { cv.width = S * dpr; cv.height = S * dpr; cv.style.width = S + 'px'; cv.style.height = S + 'px'; }
    var g = cv.getContext('2d'); g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, S, S);
    var c = BELLS[skin] || BELLS.bl_brass, u = S / 120;
    g.save(); g.translate(S / 2, 16 * u); g.rotate(angle || 0); g.scale(u, u);
    var cow = skin === 'bl_cow';
    // yoke
    g.fillStyle = c[2]; g.beginPath(); g.arc(0, 0, 7, 0, 6.3); g.fill();
    // clapper swings the other way
    g.save(); g.rotate(-(angle || 0) * 1.7); g.strokeStyle = c[2]; g.lineWidth = 4; g.beginPath(); g.moveTo(0, 30); g.lineTo(0, 86); g.stroke(); g.fillStyle = c[2]; g.beginPath(); g.arc(0, 90, 8, 0, 6.3); g.fill(); g.restore();
    var grd = g.createLinearGradient(-40, 0, 40, 0); grd.addColorStop(0, c[1]); grd.addColorStop(0.35, c[0]); grd.addColorStop(1, c[2]);
    g.fillStyle = grd; g.beginPath();
    if (cow) { g.moveTo(-18, 4); g.lineTo(18, 4); g.lineTo(34, 78); g.lineTo(-34, 78); g.closePath(); }
    else { g.moveTo(-10, 4); g.bezierCurveTo(-30, 8, -28, 50, -44, 72); g.quadraticCurveTo(-46, 80, -38, 80); g.lineTo(38, 80); g.quadraticCurveTo(46, 80, 44, 72); g.bezierCurveTo(28, 50, 30, 8, 10, 4); g.closePath(); }
    g.fill();
    g.globalAlpha = 0.35; g.fillStyle = '#fff'; g.beginPath(); g.ellipse(-12, 34, 5, 20, 0.12, 0, 6.3); g.fill(); g.globalAlpha = 1;
    g.fillStyle = c[2]; g.fillRect(-40, 74, 80, 5);
    g.restore();
  };
  C.BELLS = BELLS;
})(typeof globalThis !== 'undefined' ? globalThis : this);
