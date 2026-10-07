/* Outside a run: the hub, starting runs, challenges, unlocks, collection, settings, and the end-of-run review. */
(function (root) {
  'use strict';
  var BW = root.BW, U = BW.UI, h = U.h, f = U.f, T = BW.T, App = BW.App, G = BW.G, C = BW.Charts, S = BW.Screens;
  var RAR = BW.RARITY, BOXCOL = ['#9AA3AD', '#B98456', '#C9D2DE', '#F2C230', '#8FE3F7'];
  function bellIcon() { return h('span', { html: U.icon('bell'), style: 'display:inline-grid;width:16px;height:16px' }); }
  function bellsEl(fn) { return h('span', { cls: 'bellcount' }, bellIcon(), h('span', { live: fn })); }
  function scenOpen(sc) { return !sc.cost || !!G.meta.unlocked['scen_' + sc.id]; }
  function randSeed() { return Math.floor(Math.random() * 1073741824); }

  /* ======================= HUB ======================= */
  S.hub = function (el) {
    var m = G.meta, cv = h('canvas', { 'aria-label': 'Ring the bell', role: 'button' });
    var swing = { t: 0, on: false };
    function drawBell(a) { C.bell(cv, m.cos.bell, a, 124); }
    function ring() {
      BW.Audio.unlock(); BW.Audio.play('bell1'); BW.Audio.buzz(15);
      swing.t = performance.now(); if (swing.on) return; swing.on = true;
      (function loop(ts) { var k = (ts - swing.t) / 1000; if (k > 1.6 || !cv.isConnected) { swing.on = false; drawBell(0); return; } drawBell(0.42 * Math.exp(-2.6 * k) * Math.sin(k * 15)); requestAnimationFrame(loop); })(performance.now());
    }
    U.tap(cv, ring);
    var title = BW.COS_BY[m.cos.title];
    el.appendChild(h('div', { cls: 'hero' }, h('div', { cls: 'wm', text: 'Bellwether' }),
      h('div', { cls: 'row2' }, h('div', null, h('p', { cls: 'sub', text: 'Your money against a sheep who only buys the index. Beat her if you can.' }),
        h('div', { cls: 'rowf', style: 'margin-top:14px;flex-wrap:wrap' }, bellsEl(function () { return m.bells + ' Bells'; }), h('span', { cls: 'tag', text: (m.name ? m.name + ', ' : '') + (title ? title.name : 'Rookie') }))), cv)));
    drawBell(0);
    var body = h('div', { cls: 'hubbody' }); el.appendChild(body);
    if (G.lostRun) { body.appendChild(h('p', { cls: 'note bad', text: 'Your unfinished run could not be carried over. Either the game was updated or the saved run was damaged. Your Bells, unlocks and collection are safe.' })); G.lostRun = false; }
    if (!App.ui.storageOK) body.appendChild(h('p', { cls: 'note bad', text: 'This browser is blocking saved data, so progress will be lost when you close the page. Private or incognito windows do this.' }));
    if (G.run && !G.run.s.done) {
      body.appendChild(h('button', { cls: 'btn pri', style: 'min-height:62px;flex-direction:column;gap:0', tap: function () { App.toRun(App.ui.tab); if (!BW.Audio.ready()) BW.Audio.unlock(); } }, h('span', { text: 'Continue your run' }), h('span', { style: 'font-size:12.5px;font-weight:600;opacity:.8', text: G.scen.name + ', ' + f.dateLong(G.run.rel()) })));
      body.appendChild(h('button', { cls: 'btn', text: 'Start a different run', tap: function () { S.newRun(); } }));
    } else if (G.run && G.run.s.done && !G.resultsShown) {
      body.appendChild(h('button', { cls: 'btn pri', text: 'See how your run ended', tap: function () { S.finish(); } }));
    } else body.appendChild(h('button', { cls: 'btn pri', style: 'min-height:58px', text: 'Start a run', tap: function () { S.newRun(); } }));
    var today = BW.todayStr(), done = m.daily[today];
    var nb = m.boxes.length, earned = Object.keys(m.badges).length;
    body.appendChild(h('div', { cls: 'tile2' },
      h('button', { cls: 'tile', tap: function () { S.daily(); } }, h('b', { text: 'Daily Tape' }), h('small', { text: done ? 'Done. You ' + (done.ratio >= 1 ? 'beat' : 'trailed') + ' Dolly by ' + f.pct(Math.abs(done.ratio - 1), 0) : 'Today\'s market, same for everyone' })),
      h('button', { cls: 'tile', tap: function () { S.challenge(); } }, h('b', { text: 'Challenge friends' }), h('small', { text: 'Share a code, play the same market' })),
      h('button', { cls: 'tile', tap: function () { S.legacy(); } }, h('b', { text: 'Unlocks' }), h('small', { live: function () { return m.bells + ' Bells to spend'; } })),
      h('button', { cls: 'tile', tap: function () { S.collection(); } }, h('b', { text: 'Collection' }), h('small', { text: nb ? nb + ' lockbox' + (nb > 1 ? 'es' : '') + ' to open' : earned + ' of ' + BW.BADGES.length + ' badges' })),
      h('button', { cls: 'tile', tap: function () { S.records(); } }, h('b', { text: 'Records' }), h('small', { text: m.stats.runs ? m.stats.runs + ' run' + (m.stats.runs > 1 ? 's' : '') + ', beat Dolly ' + m.stats.beats + ' time' + (m.stats.beats === 1 ? '' : 's') : 'Nothing yet' })),
      h('button', { cls: 'tile', tap: function () { S.howto(); } }, h('b', { text: 'How to play' }), h('small', { text: 'Two minutes' }))));
    body.appendChild(h('button', { cls: 'btn ghost', text: 'Settings', tap: function () { S.settings(); } }));
    body.appendChild(h('p', { cls: 'mute', style: 'font-size:12px;text-align:center;margin-top:6px', text: 'Play money only. No ads, no purchases, nothing held back.' }));
  };

  /* ======================= STARTING ======================= */
  function begin(o) {
    function go() { U.closeAll(); BW.Audio.unlock(); App.startRun(o); }
    if (G.run && !G.run.s.done) U.confirm({ title: 'Abandon the run in progress?', body: 'Your current run (' + G.scen.name + ', ' + f.dateLong(G.run.rel()) + ') will be thrown away and earns nothing. To keep its rewards, open it and use Cash in now.', yes: 'Abandon it', danger: true, onYes: go });
    else go();
  }
  var pickDest = 'earth';
  function destOpen(id) { return id === 'earth' || !!G.meta.unlocked['dest_' + id]; }
  S.newRun = function () {
    var m = G.meta;
    if (!destOpen(pickDest)) pickDest = 'earth';
    U.sheet({ title: 'Choose a run', full: true, build: function (b, ctl) {
      var reg = U.region(b, function (host) {
        var perks = BW.LEGACY.filter(function (l) { return l.kind === 'perk' && m.unlocked[l.id]; });
        host.appendChild(h('p', { cls: 'lead', text: 'Every run is a fresh, random market. One year passes in about a minute at normal speed, and you can pause or change speed whenever you like.' }));
        if (destOpen('moon')) {
          host.appendChild(h('h3', { text: 'Where' }));
          host.appendChild(U.seg(Object.keys(BW.DEST).filter(destOpen).map(function (k) { return [k, BW.DEST[k].name]; }), function () { return pickDest; }, function (v) { pickDest = v; reg.render(); }));
          host.appendChild(h('p', { cls: 'soft', style: 'font-size:14px;margin-top:8px', text: BW.DEST[pickDest].blurb + (BW.DEST[pickDest].mult > 1 ? ' Bells x' + BW.DEST[pickDest].mult + '.' : '') }));
        }
        var wrap = h('div', { cls: 'stack', style: 'margin-top:14px' });
        BW.SCENARIOS.forEach(function (sc) {
          var open = scenOpen(sc), best = m.best[sc.id];
          var card = h('div', { cls: 'card stack' });
          card.appendChild(h('div', { cls: 'rowf' }, h('div', { cls: 'grow' }, h('div', { cls: 'disp', style: 'font-size:19px', text: sc.name }), h('div', { cls: 'mute', style: 'font-size:12.5px', text: sc.years + ' years' + (sc.mult !== 1 ? ', Bells x' + sc.mult : '') + (best ? ', best ' + (best >= 1 ? '+' : '') + Math.round((best - 1) * 100) + '% vs Dolly' : '') })),
            open ? null : h('span', { cls: 'bellcount' }, bellIcon(), String(sc.cost))));
          card.appendChild(h('p', { cls: 'soft', style: 'font-size:14px', text: sc.blurb }));
          if (open) card.appendChild(h('button', { cls: 'btn' + (sc.id === 'classic' ? ' pri' : ''), text: 'Play ' + sc.name, tap: function () { begin({ scen: sc.id, seed: randSeed(), mode: 'open', dest: pickDest }); } }));
          else card.appendChild(h('button', { cls: 'btn', text: m.bells >= sc.cost ? 'Unlock for ' + sc.cost + ' Bells' : 'Needs ' + sc.cost + ' Bells', disabled: m.bells < sc.cost, tap: function () { m.bells -= sc.cost; m.unlocked['scen_' + sc.id] = 1; App.saveSoon(); BW.Audio.play('unlock'); U.toast(sc.name + ' unlocked', { kind: 'brass' }); reg.render(); } }));
          wrap.appendChild(card);
        });
        host.appendChild(wrap);
        if (perks.length) {
          host.appendChild(h('h3', { text: 'Your perks for this run' }));
          var list = h('div', { cls: 'list' });
          perks.forEach(function (p) { list.appendChild(U.switchRow(p.name, p.desc, function () { return !m.perkOff[p.id]; }, function (v) { if (v) delete m.perkOff[p.id]; else m.perkOff[p.id] = 1; App.saveSoon(); })); });
          host.appendChild(list);
          host.appendChild(h('p', { cls: 'mute', style: 'font-size:12.5px;margin-top:8px', text: 'Dolly gets the same head start and salary as you, so the comparison stays fair. Perks are switched off in challenges and the Daily Tape.' }));
        }
      });
    } });
  };

  S.daily = function () {
    var m = G.meta, today = BW.todayStr(), done = m.daily[today], code = BW.makeCode('decade', 'earth', BW.dailySeed(today));
    U.sheet({ title: 'Daily Tape', build: function (b) {
      b.appendChild(h('p', { cls: 'lead', text: 'One market per day, the same for every player. Ten years, the full toolkit, no perks. The day changes at midnight New York time.' }));
      var card = h('div', { cls: 'card', style: 'margin-top:12px' });
      card.appendChild(U.kv('Today', today)); card.appendChild(U.kv('Code', code));
      if (done) { card.appendChild(U.kv('Your result', f.ms(done.score))); card.appendChild(U.kv('Dolly', f.ms(done.dolly))); card.appendChild(U.kv('You finished', (done.ratio >= 1 ? 'ahead by ' : 'behind by ') + f.pct(Math.abs(done.ratio - 1)), 'total')); }
      b.appendChild(card);
      if (done) b.appendChild(h('p', { cls: 'mute', style: 'font-size:12.5px;margin-top:8px', text: 'You can play it again for practice. Results show which attempt they were, because the second time you know what is coming.' }));
      b.appendChild(h('div', { cls: 'stack', style: 'margin-top:14px' }, h('button', { cls: 'btn pri', text: done ? 'Play again' : 'Play today\'s tape', tap: function () { begin({ scen: 'decade', seed: BW.dailySeed(today), mode: 'daily', code: code, date: today }); } }),
        h('button', { cls: 'btn ghost', text: 'Compare with friends', tap: function () { S.board(code); } })));
    } });
  };

  S.shareCode = function (code, text) {
    var url = location.href.split('#')[0] + '#' + code;
    U.sheet({ title: 'Share this market', build: function (b) {
      b.appendChild(h('p', { cls: 'lead', text: 'Anyone who enters this code plays the identical market: same prices, same news, same surprises. Then compare result codes.' }));
      var box = h('input', { cls: 'txt num', id: 'share-code', readonly: true, value: code, style: 'text-align:center;font-weight:700;font-size:22px;letter-spacing:.04em;margin-top:14px', 'aria-label': 'Challenge code' });
      b.appendChild(box);
      var msg = text || ('Play my Bellwether market. Code ' + code + '  ' + url);
      b.appendChild(h('div', { cls: 'btns', style: 'margin-top:12px' }, copyBtn('Copy code', code, box), shareBtn(msg, box)));
    } });
  };
  function copyBtn(label, text, sel) {
    var bt = h('button', { cls: 'btn', text: label });
    U.tap(bt, function () {
      var ok = function () { bt.textContent = 'Copied'; BW.Audio.play('tick'); setTimeout(function () { bt.textContent = label; }, 1400); };
      var fall = function () { if (sel) { sel.focus(); sel.select(); try { if (document.execCommand('copy')) { ok(); return; } } catch (e) { /* ignore */ } } U.toast('Press and hold the text to copy it.'); };
      try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(ok, fall); else fall(); } catch (e) { fall(); }
    });
    return bt;
  }
  function shareBtn(text, sel) {
    var bt = h('button', { cls: 'btn pri', text: 'Share' });
    U.tap(bt, function () {
      try { if (navigator.share) { navigator.share({ text: text }).catch(function () { /* cancelled */ }); return; } } catch (e) { /* fall through */ }
      try { navigator.clipboard.writeText(text).then(function () { U.toast('Copied. Paste it into a message.'); }, function () { if (sel) { sel.focus(); sel.select(); } U.toast('Press and hold the text to copy it.'); }); } catch (e2) { U.toast('Press and hold the text to copy it.'); }
    });
    return bt;
  }

  S.challenge = function (prefill) {
    var m = G.meta, st = { scen: 'decade' };
    U.sheet({ title: 'Challenge friends', full: true, build: function (b) {
      b.appendChild(h('p', { cls: 'lead', text: 'There is no server. A challenge is a short code that rebuilds the exact same market on every phone. Everyone plays it with the full toolkit and no perks, then swaps result codes.' }));
      b.appendChild(h('h3', { text: 'Join with a code' }));
      var inp = h('input', { cls: 'txt num', id: 'join-code', placeholder: 'BW1CE-K7QM2X', autocapitalize: 'characters', autocomplete: 'off', spellcheck: 'false', value: prefill || '', 'aria-label': 'Challenge code' });
      b.appendChild(h('div', { cls: 'stack' }, inp, h('button', { cls: 'btn pri', text: 'Play this code', tap: function () {
        var p = BW.parseCode(inp.value); if (!p.ok) { U.toast(p.why, { kind: 'bad', ms: 4500 }); BW.Audio.play('error'); return; }
        begin({ scen: p.scen, seed: p.seed, mode: 'challenge', code: p.code, dest: p.dest }); } })));
      b.appendChild(h('h3', { text: 'Start a new one' }));
      var opts = BW.SCENARIOS.filter(scenOpen).map(function (sc) { return [sc.id, sc.name + ' (' + sc.years + 'y)']; });
      b.appendChild(U.chips(opts, function () { return st.scen; }, function (v) { st.scen = v; }, true));
      var dopts = Object.keys(BW.DEST).filter(destOpen).map(function (k) { return [k, BW.DEST[k].name]; }); st.dest = 'earth';
      if (dopts.length > 1) { var dc = U.chips(dopts, function () { return st.dest; }, function (v) { st.dest = v; }, true); dc.style.marginTop = '6px'; b.appendChild(dc); }
      b.appendChild(h('div', { cls: 'btns', style: 'margin-top:10px' }, h('button', { cls: 'btn', text: 'Make a code', tap: function () { var code = BW.makeCode(st.scen, st.dest, randSeed()); inp.value = code; S.shareCode(code); } })));
      b.appendChild(h('h3', { text: 'Scoreboards on this phone' }));
      var codes = Object.keys(m.friends);
      if (!codes.length) b.appendChild(h('div', { cls: 'empty', text: 'Finish a challenge or a Daily Tape and its scoreboard appears here. Add friends by pasting their result codes.' }));
      else { var list = h('div', { cls: 'list' }); codes.slice(-12).reverse().forEach(function (c) { var rows = m.friends[c]; list.appendChild(h('button', { cls: 'item', tap: function () { S.board(c); } }, h('span', { cls: 'grow' }, h('div', { cls: 't1 num', text: c }), h('div', { cls: 't2', text: rows.length + ' result' + (rows.length > 1 ? 's' : '') })), h('span', { html: U.icon('chev'), style: 'width:20px;color:var(--ink3)' }))); }); b.appendChild(list); }
      b.appendChild(h('button', { cls: 'btn ghost', style: 'margin-top:12px', text: 'Add a friend\'s result code', tap: function () { S.addResult(); } }));
      b.appendChild(h('p', { cls: 'mute', style: 'font-size:12.5px;margin-top:14px', text: 'Result codes are on the honour system. Someone determined could fake one, and anyone can replay a market once they have seen it, which is why each result shows its attempt number.' }));
    } });
  };
  S.addResult = function (after) {
    U.sheet({ title: 'Add a result', build: function (b, ctl) {
      var inp = h('input', { cls: 'txt', id: 'res-code', placeholder: 'Paste the result code here', autocomplete: 'off', spellcheck: 'false', 'aria-label': 'Result code' });
      b.appendChild(h('div', { cls: 'stack' }, h('p', { cls: 'lead', text: 'Paste the whole message your friend sent. The code starts with R.' }), inp, h('button', { cls: 'btn pri', text: 'Add to scoreboard', tap: function () {
        var p = BW.parseResult(inp.value); if (!p.ok) { U.toast(p.why, { kind: 'bad' }); BW.Audio.play('error'); return; }
        var rows = Array.isArray(G.meta.friends[p.code]) ? G.meta.friends[p.code] : (G.meta.friends[p.code] = []);
        if (!rows.some(function (x) { return x.name === p.name && x.score === p.score && x.attempt === p.attempt; })) rows.push({ name: p.name, score: p.score, dolly: p.dolly, attempt: p.attempt, bankrupt: p.bankrupt });
        App.saveSoon(); BW.Audio.play('unlock'); ctl.close(true); if (after) after(); else S.board(p.code); } })));
    } });
  };
  S.board = function (code) {
    var m = G.meta;
    U.sheet({ title: 'Scoreboard', full: true, build: function (b) {
      var reg = U.region(b, function (host) {
        var rows = (m.friends[code] || []).slice().sort(function (a, c) { return c.score - a.score; });
        host.appendChild(h('div', { cls: 'rowf' }, h('div', { cls: 'grow disp num', style: 'font-size:20px', text: code }), h('button', { cls: 'btn sm', text: 'Share code', tap: function () { S.shareCode(code); } })));
        if (!rows.length) host.appendChild(h('div', { cls: 'empty', text: 'No results yet. Play this market, then add your friends\' result codes.' }));
        else { var list = h('div', { cls: 'list', style: 'margin-top:12px' });
          rows.forEach(function (x, i) { var lead = x.dolly > 0 ? x.score / x.dolly - 1 : 0;
            list.appendChild(h('div', { cls: 'item' }, h('span', { cls: 'logo round', style: 'background:' + (i === 0 ? 'var(--brass);color:var(--brassInk)' : 'var(--bg3);color:var(--ink)'), text: String(i + 1) }),
              h('span', { cls: 'grow' }, h('div', { cls: 't1', text: x.me && x.name === 'You' ? 'You' : x.name + (x.me ? ' (you)' : '') }), h('div', { cls: 't2', text: (x.attempt > 1 ? 'Attempt ' + x.attempt + '. ' : 'First try. ') + (x.bankrupt ? 'Went bankrupt.' : '') })),
              h('span', { cls: 'right' }, h('div', { cls: 'v1', text: f.ms(x.score) }), h('div', { cls: 'v2 ' + f.sign(lead), text: f.pp(lead, 0) + ' vs Dolly' })))); });
          host.appendChild(list);
          host.appendChild(h('p', { cls: 'mute', style: 'font-size:12.5px;margin-top:8px', text: 'Dolly finished this market with ' + f.ms(rows[0].dolly) + '.' })); }
        host.appendChild(h('button', { cls: 'btn ghost', style: 'margin-top:12px', text: 'Add a friend\'s result code', tap: function () { S.addResult(function () { reg.render(); }); } }));
        host.appendChild(h('button', { cls: 'btn', style: 'margin-top:10px', text: 'Play this market', tap: function () { var p = BW.parseCode(code); if (p.ok) begin({ scen: p.scen, seed: p.seed, mode: 'challenge', code: p.code, dest: p.dest }); } }));
      });
    } });
  };

  /* ======================= INTRO ======================= */
  S.intro = function () {
    var m = G.meta, r = G.run, s = r.s, sc = G.scen, first = !m.seen.tutorial;
    var steps = first ? [
      ['Meet Dolly', 'Dolly is a sheep. Every payday she puts her spare money into one fund that owns the whole market, and never touches it. She gets the same pay and the same bills as you. Finish with more than her and you win. Most people do not.'],
      ['Time is yours', 'One year takes about a minute. The brass button at the bottom pauses. The numbers beside it change the speed. While any panel is open, time waits.'],
      ['Look inside everything', 'Tap any company for its chart, its numbers and its news. Words with a dotted underline explain themselves when tapped. Prices move for reasons, and the reasons are there to be found.']
    ] : [];
    var i = 0;
    U.sheet({ title: sc.name, build: function (b, ctl) {
      var reg = U.region(b, function (host) {
        if (i < steps.length) {
          host.appendChild(h('div', { cls: 'disp', style: 'font-size:22px', text: steps[i][0] }));
          host.appendChild(h('p', { cls: 'lead', style: 'font-size:16px;line-height:1.5;margin-top:8px', text: steps[i][1] }));
          host.appendChild(h('button', { cls: 'btn pri', style: 'margin-top:18px', text: 'Next', tap: function () { i++; BW.Audio.play('tick'); reg.render(); } }));
          return;
        }
        m.seen.tutorial = 1;
        host.appendChild(h('p', { cls: 'lead', text: sc.blurb }));
        var card = h('div', { cls: 'card', style: 'margin-top:12px' });
        if (G.cfg.dest !== 'earth') card.appendChild(U.kv('Where', G.tape.dest.name + ', ' + G.tape.dest.place));
        card.appendChild(U.kv('Length', sc.years + ' years'));
        card.appendChild(U.kv('You start with', f.ms(s.cash)));
        if (s.job.salary > 0) card.appendChild(U.kv('Salary', f.m0(s.job.salary) + ' a year')); else card.appendChild(U.kv('Job', 'None'));
        card.appendChild(U.kv('Living costs', f.m0(s.job.living) + ' a month'));
        if (s.loan) card.appendChild(U.kv('Student loan', f.m0(s.loan.bal) + ' at ' + s.loan.rate + '%'));
        host.appendChild(card);
        if (s.fair) host.appendChild(h('p', { cls: 'note', style: 'margin-top:10px', text: 'Shared market ' + G.cfg.code + '. Full toolkit, no perks' + (G.cfg.attempt > 1 ? '. This is your attempt number ' + G.cfg.attempt + '.' : '.') }));
        host.appendChild(h('button', { cls: 'btn pri', style: 'margin-top:16px;min-height:58px', text: 'Ring the opening bell', tap: function () { BW.Audio.unlock(); BW.Audio.play('bell'); BW.Audio.buzz([30, 80, 30]); ctl.close(true); App.setPaused(false); App.ui.paused = false; App.ui.dirty = true; } }));
      });
    } });
  };

  /* ======================= UNLOCKS ======================= */
  S.legacy = function () {
    var m = G.meta;
    U.sheet({ title: 'Unlocks', full: true, head: bellsEl(function () { return String(m.bells); }), build: function (b) {
      var reg = U.region(b, function (host) {
        host.appendChild(h('p', { cls: 'lead' }, 'Finishing runs earns ', U.term('Bells', 'bells'), '. Everything here is permanent, and everything is earned by playing.'));
        [['tool', 'Tools', 'Sharper ways to see and act. Challenges give every player all of these.'], ['place', 'Places', 'Whole new markets, each stranger than the last.'], ['perk', 'Perks', 'A stronger start on your own runs. Switched off in challenges.']].forEach(function (sec) {
          host.appendChild(h('h3', { text: sec[1] })); host.appendChild(h('p', { cls: 'mute', style: 'font-size:12.5px;margin:-4px 0 8px', text: sec[2] }));
          var wrap = h('div', { cls: 'list' });
          BW.LEGACY.filter(function (l) { return l.kind === sec[0]; }).forEach(function (l) {
            var own = !!m.unlocked[l.id], locked = l.req && !m.unlocked[l.req];
            if (locked && !own) { var rq = BW.LEGACY_BY[l.req]; if (rq.req && !m.unlocked[rq.req]) return; }
            var right = own ? h('span', { cls: 'tag up', text: 'Owned' }) : locked ? h('span', { cls: 'tag', text: 'After ' + BW.LEGACY_BY[l.req].name }) :
              h('button', { cls: 'btn sm ' + (m.bells >= l.cost ? 'pri' : ''), disabled: m.bells < l.cost, 'aria-label': 'Unlock ' + l.name + ' for ' + l.cost + ' Bells', tap: function () {
                m.bells -= l.cost; m.unlocked[l.id] = 1; App.saveSoon(); BW.Audio.play('unlock'); BW.Audio.buzz(15); U.toast(l.name + ' unlocked', { kind: 'brass' });
                if (BW.BADGES && !m.badges.alltools && BW.LEGACY.every(function (x) { return x.kind !== 'tool' || m.unlocked[x.id]; })) { m.badges.alltools = { t: Date.now() }; m.bells += 8; U.toast('Badge earned: Fully Equipped', { kind: 'brass' }); }
                reg.render(); if (G.run) App.rechrome(); } }, bellIcon(), String(l.cost));
            wrap.appendChild(h('div', { cls: 'item' }, h('span', { cls: 'grow' }, h('div', { cls: 't1', text: l.name }), h('div', { cls: 't2', style: 'white-space:normal', text: l.desc })), right));
          });
          host.appendChild(wrap);
        });
        host.appendChild(h('p', { cls: 'mute', style: 'font-size:12.5px;margin-top:14px', text: 'New scenarios are unlocked from the Start a run screen. Looks, bells and titles come out of lockboxes and badges.' }));
      });
    } });
  };

  /* ======================= COLLECTION ======================= */
  var TH_SW = { th_floor: ['#0E1B2C', '#E6BA4E', '#52D3A4'], th_ledger: ['#E9F0E7', '#9A6A12', '#0B7F56'], th_mint: ['#0C211E', '#9CF0C5', '#FF8E7A'], th_slate: ['#17191D', '#D8DCE3', '#7FD6A6'], th_blossom: ['#F7E9EC', '#C2376A', '#13805A'], th_terminal: ['#050B06', '#5CFF7E', '#FFB454'],
    th_dusk: ['#1E1730', '#FFB08A', '#86E3C0'], th_ember: ['#1A1412', '#FF8A3D', '#9AD98A'], th_ocean: ['#06202B', '#5FD8F0', '#6FE6B8'], th_gold: ['#0A0906', '#FFD34D', '#C9C3B0'], th_moon: ['#E8EAEE', '#3D4A6B', '#1B7F64'], th_mars: ['#2A0F0A', '#FFC24A', '#A8E08F'] };
  var CD_SW = { cd_classic: ['#52D3A4', '#FF7C6E'], cd_ocean: ['#4FA8FF', '#FF9A3D'], cd_mono: ['#EDF2F8', '#7186A2'], cd_neon: ['#3DFFD0', '#FF4FD8'], cd_fire: ['#FFC83D', '#5E6470'], cd_ghost: ['#E8ECF5', '#8A5BFF'] };
  var ctab = 'looks';
  S.collection = function (tab) {
    var m = G.meta; if (tab) ctab = tab; else if (m.boxes.length) ctab = 'boxes';
    U.sheet({ title: 'Collection', full: true, build: function (b) {
      var body = h('div', { style: 'margin-top:12px' });
      b.appendChild(U.seg([['looks', 'Looks'], ['badges', 'Badges'], ['cards', 'Cards'], ['boxes', 'Lockboxes']], function () { return ctab; }, function (v) { ctab = v; reg.render(); }));
      b.appendChild(body);
      var reg = U.region(body, function (host) { ({ looks: looks, badges: badges, cards: cards, boxes: boxes })[ctab](host, function () { reg.render(); }); });
    } });
  };
  function looks(host, redraw) {
    var m = G.meta;
    [['theme', 'Themes'], ['bell', 'Bells'], ['candle', 'Chart colours'], ['title', 'Titles']].forEach(function (k) {
      var all = BW.COSMETICS.filter(function (c) { return c.kind === k[0]; }), own = all.filter(function (c) { return m.cos.owned[c.id]; }).length;
      host.appendChild(h('h3', { text: k[1] + '  ' + own + ' of ' + all.length }));
      var grid = h('div', { cls: 'grid3' });
      all.forEach(function (c) {
        var has = !!m.cos.owned[c.id], sel = m.cos[k[0]] === c.id, vis;
        if (k[0] === 'theme') { var sw = TH_SW[c.id]; vis = h('span', { cls: 'sw3' }, h('i', { style: 'background:' + sw[0] }), h('i', { style: 'background:' + sw[1] }), h('i', { style: 'background:' + sw[2] })); }
        else if (k[0] === 'candle') { var cs = CD_SW[c.id]; vis = h('span', { cls: 'sw3' }, h('i', { style: 'background:' + cs[0] }), h('i', { style: 'background:' + cs[1] })); }
        else if (k[0] === 'bell') { vis = h('canvas'); C.bell(vis, c.id, 0, 44); }
        else vis = h('span', { cls: 'medal rar' + c.r, html: U.icon('star') });
        var cell = h('button', { cls: 'cell rar' + c.r + (has ? '' : ' locked') + (sel ? ' sel' : ''), 'aria-label': c.name, tap: function () {
          if (!has) { U.toast(c.name + ' is locked', { sub: RAR[c.r] + '. Found in lockboxes' + (k[0] === 'title' ? ' and earned with badges.' : '.') }); return; }
          m.cos[k[0]] = c.id; App.applyLook(); App.saveSoon(); if (k[0] === 'bell') BW.Audio.play('bell1', c.id); else BW.Audio.play('tick'); redraw(); } },
          vis, h('span', { cls: 'nm', text: c.name }), h('span', { cls: 'rar', text: RAR[c.r] }));
        grid.appendChild(cell);
      });
      host.appendChild(grid);
    });
  }
  function badges(host) {
    var m = G.meta, got = Object.keys(m.badges).length;
    host.appendChild(h('p', { cls: 'lead', text: got + ' of ' + BW.BADGES.length + ' earned. Each one pays Bells the first time.' }));
    var list = h('div', { cls: 'list', style: 'margin-top:12px' });
    BW.BADGES.slice().sort(function (a, c) { return (m.badges[c.id] ? 1 : 0) - (m.badges[a.id] ? 1 : 0) || a.r - c.r; }).forEach(function (bd) {
      var has = !!m.badges[bd.id];
      list.appendChild(h('div', { cls: 'item rar' + bd.r, style: has ? '' : 'opacity:.5' }, h('span', { cls: 'medal', html: U.icon(has ? 'trophy' : 'lock') }), h('span', { cls: 'grow' }, h('div', { cls: 't1', text: bd.name }), h('div', { cls: 't2', style: 'white-space:normal', text: bd.desc })), h('span', { cls: 'right' }, h('div', { cls: 'rar', text: RAR[bd.r] }), h('div', { cls: 'v2 mute', text: '+' + BW.BADGE_BELLS[bd.r] }))));
    });
    host.appendChild(list);
  }
  function cards(host) {
    var m = G.meta, total = 0, got = 0, was = G.tape;
    Object.keys(BW.DEST).forEach(function (k) { var d = BW.DEST[k]; d.companies.concat(d.pool).forEach(function (c) { total++; if (m.cards[c.id]) got++; }); });
    host.appendChild(h('p', { cls: 'lead', text: got + ' of ' + total + ' companies collected. Hold one for a full year to earn its bronze card. Make 50% on it for silver. Triple your money for gold.' }));
    Object.keys(BW.DEST).forEach(function (k) {
      var dest = BW.DEST[k], all = dest.companies.concat(dest.pool);
      host.appendChild(h('h3', { text: dest.name === 'Earth' ? 'Earth' : dest.name }));
      if (!destOpen(k)) { host.appendChild(h('div', { cls: 'empty', style: 'padding:14px', text: all.length + ' cards wait here. Unlock ' + dest.name + ' to start collecting them.' })); return; }
      var grid = h('div', { cls: 'grid3' });
      G.tape = { sectors: dest.sectors };
      all.forEach(function (c) { var t = m.cards[c.id] || 0;
        grid.appendChild(h('div', { cls: 'cardc t' + t }, h('span', { cls: 'mute num', style: 'font-size:10.5px;font-weight:700', text: c.tkr }), U.logo({ kind: 'stock', id: c.id, tkr: c.tkr, sector: c.sector }, t ? 'lg' : ''), h('span', { style: 'font-weight:600;line-height:1.15', text: c.name }), h('span', { cls: 'mute', style: 'font-size:10.5px', text: ['Not yet held', 'Bronze', 'Silver', 'Gold'][t] })));
      });
      G.tape = was;
      host.appendChild(grid);
    });
  }
  function boxes(host, redraw) {
    var m = G.meta;
    if (!m.boxes.length) { host.appendChild(h('div', { cls: 'empty', text: 'No lockboxes waiting. Finish a run to earn one. The better you do against Dolly, the better the box.' })); return; }
    host.appendChild(h('p', { cls: 'lead', text: 'Tap a lockbox to open it.' }));
    var opening = false;
    var wrap = h('div', { cls: 'grid3', style: 'margin-top:14px' });
    m.boxes.forEach(function (bx, i) {
      var tier = BW.BOX_TIERS[bx.tier], el = h('div', { cls: 'box', style: '--bc:' + BOXCOL[bx.tier] });
      wrap.appendChild(h('button', { cls: 'cell', style: 'min-height:130px', 'aria-label': 'Open ' + tier.name, tap: function () {
        if (opening || bx.opened) return; opening = true; bx.opened = true;
        el.classList.add('shake'); BW.Audio.play('shake');
        setTimeout(function () {
          var at = m.boxes.indexOf(bx); if (at < 0) { opening = false; return; }
          m.boxes.splice(at, 1);
          var out = BW.openBox(m, bx.tier, Math.random); App.saveSoon();
          BW.Audio.play('box', out.item.r); BW.Audio.buzz(out.item.r >= 3 ? [20, 40, 20, 40, 60] : 20);
          U.sheet({ title: tier.name, build: function (b2, ctl) {
            b2.appendChild(h('div', { cls: 'reveal rar' + out.item.r, style: 'text-align:center;padding:10px 0' }, h('div', { cls: 'rar', style: 'font-size:14px', text: RAR[out.item.r] }), h('div', { cls: 'disp', style: 'font-size:28px;margin:6px 0', text: out.item.name }),
              h('div', { cls: 'mute', text: { theme: 'Theme', bell: 'Bell', candle: 'Chart colours', title: 'Title' }[out.item.kind] + (out.dupe ? '. You already had it, so here are ' + out.dupe + ' Bells instead.' : '') })));
            var btns = h('div', { cls: 'btns', style: 'margin-top:16px' });
            if (!out.dupe) btns.appendChild(h('button', { cls: 'btn pri', text: 'Use it now', tap: function () { m.cos[out.item.kind] = out.item.id; App.applyLook(); App.saveSoon(); if (out.item.kind === 'bell') BW.Audio.play('bell1', out.item.id); ctl.close(true); } }));
            btns.appendChild(h('button', { cls: 'btn', text: 'Nice', tap: function () { ctl.close(); } }));
            b2.appendChild(btns);
          }, onClose: redraw });
        }, 520);
      } }, el, h('span', { cls: 'nm', text: tier.name })));
    });
    host.appendChild(wrap);
  }

  S.records = function () {
    var m = G.meta;
    U.sheet({ title: 'Records', full: true, build: function (b) {
      var card = h('div', { cls: 'card' });
      card.appendChild(U.kv('Runs finished', String(m.stats.runs))); card.appendChild(U.kv('Times you beat Dolly', String(m.stats.beats)));
      card.appendChild(U.kv('Years lived', Math.round(m.stats.years).toString())); card.appendChild(U.kv('Bells earned, all time', String(m.bellsEarned)));
      b.appendChild(card);
      b.appendChild(h('h3', { text: 'Recent runs' }));
      if (!m.runs.length) { b.appendChild(h('div', { cls: 'empty', text: 'Your finished runs will be listed here.' })); return; }
      var list = h('div', { cls: 'list' });
      m.runs.forEach(function (x) { var sc = BW.SCEN_BY[x.scen] || { name: x.scen };
        list.appendChild(h('button', { cls: 'item', tap: function () { S.shareCode(x.code); } }, h('span', { cls: 'grow' }, h('div', { cls: 't1', text: sc.name + (x.dest && x.dest !== 'earth' ? ', ' + BW.DEST[x.dest].name : '') + (x.mode === 'daily' ? ' (Daily)' : x.mode === 'challenge' ? ' (Challenge)' : '') }), h('div', { cls: 't2', text: x.years.toFixed(x.years % 1 ? 1 : 0) + ' years' + (x.bankrupt ? ', bankrupt' : '') + (x.early ? ', cashed in early' : '') + ', +' + x.bells + ' Bells' })),
          h('span', { cls: 'right' }, h('div', { cls: 'v1', text: f.ms(x.score) }), h('div', { cls: 'v2 ' + f.sign(x.ratio - 1), text: f.pp(x.ratio - 1, 0) + ' vs Dolly' })))); });
      b.appendChild(list);
      b.appendChild(h('p', { cls: 'mute', style: 'font-size:12.5px;margin-top:8px', text: 'Tap a run to get the code for that exact market.' }));
    } });
  };

  S.settings = function () {
    var m = G.meta, st = m.set;
    U.sheet({ title: 'Settings', full: true, onClose: function () { if (App.ui.hub) App.render(); }, build: function (b) {
      var name = h('input', { cls: 'txt', id: 'set-name', maxlength: '12', placeholder: 'Your name on scoreboards', value: m.name || '', autocomplete: 'off', 'aria-label': 'Your name' });
      name.addEventListener('input', function () { m.name = BW.cleanName(name.value); App.saveSoon(); });
      b.appendChild(name);
      var sw = function (label, sub, key) { return U.switchRow(label, sub, function () { return st[key]; }, function (v) { st[key] = v; App.applyLook(); App.saveSoon(); }); };
      b.appendChild(h('h3', { text: 'Sound and feel' }));
      b.appendChild(h('div', { cls: 'list' }, sw('Sound effects', null, 'sound'), sw('Jingles', 'The short tunes at the start and end of a run.', 'music'), sw('Vibration', 'On phones that support it.', 'haptic')));
      b.appendChild(h('button', { cls: 'btn ghost', style: 'margin-top:10px', text: 'Play the jingle', tap: function () { BW.Audio.unlock(); BW.Audio.play('jingle'); } }));
      b.appendChild(h('h3', { text: 'Time' }));
      b.appendChild(h('div', { cls: 'list' }, sw('Pause on big news', 'Stops the clock for market-wide shocks and major news about things you own.', 'autoPause'), sw('Pause while a panel is open', 'Prices hold still while you read or trade.', 'pauseTrade')));
      b.appendChild(h('h3', { text: 'Charts' }));
      b.appendChild(h('div', { cls: 'list' }, sw('Start charts as a line', 'Instead of candlesticks.', 'line')));
      b.appendChild(h('button', { cls: 'btn ghost', style: 'margin-top:10px', text: 'Themes, bells and chart colours', tap: function () { S.collection('looks'); } }));
      b.appendChild(h('h3', { text: 'Your data' }));
      b.appendChild(h('p', { cls: 'mute', style: 'font-size:13px', text: 'Everything is saved on this device only. Clearing your browser data erases it.' }));
      b.appendChild(h('button', { cls: 'btn ghost', style: 'margin-top:10px;color:var(--down)', text: 'Erase all progress', tap: function () { U.confirm({ title: 'Erase everything?', body: 'Bells, unlocks, collection, records and any run in progress will be gone for good.', yes: 'Erase', danger: true, onYes: function () { U.confirm({ title: 'Are you certain?', body: 'This cannot be undone.', yes: 'Yes, erase it all', danger: true, onYes: function () { App.wipe(); G.run = null; G.meta = BW.newMeta(); App.applyLook(); App.save(); App.toHub(); } }); } }); } }));
      b.appendChild(h('p', { cls: 'mute', style: 'font-size:12px;margin-top:18px', text: 'Typefaces: Bricolage Grotesque and Figtree, both under the SIL Open Font License. All companies, tickers and events are invented. Nothing here is financial advice.' }));
    } });
  };

  S.howto = function () {
    U.sheet({ title: 'How to play', full: true, build: function (b) {
      [['The goal', 'Finish the run with more money than Dolly. She gets the same pay, bills and surprises as you, and she only ever buys the index fund. Your score is what you would keep after selling everything and paying tax.'],
        ['Time', 'A year passes in about a minute. Pause with the brass button, step a week at a time, or run faster: up to 8x, and 16x once you unlock Fast Forward. While a panel is open the clock waits.'],
        ['Investing', 'Open the Market to buy stocks, funds, bonds and commodities. Tap anything to see its chart, its numbers and the news behind its moves. Dotted words explain themselves.'],
        ['The news', 'Stories are generated from what is really happening inside the simulated economy and companies. Some are facts, some are rumors, some are noise. Tap a story to see what the price did afterwards.'],
        ['Life', 'Your paycheck arrives monthly. Under Life you can pay down debt, lock money in deposits, buy and renovate property with a mortgage, and own businesses.'],
        ['Why keep playing', 'Every run is a new market. Finishing earns Bells for permanent tools, perks and scenarios, a lockbox with something to collect, and badges. The Daily Tape gives everyone the same market each day.'],
        ['With friends', 'A challenge code rebuilds the identical market on any phone. Play it, then swap result codes to fill in the scoreboard.']].forEach(function (x) {
        b.appendChild(h('h3', { text: x[0] })); b.appendChild(h('p', { cls: 'lead', text: x[1] })); });
    } });
  };

  /* ======================= END OF RUN ======================= */
  function settle() {
    var m = G.meta, r = G.run, s = r.s, sc = G.scen, cfg = G.cfg;
    var res = BW.analyze(r, G.dolly, sc), played = res.years, full = !s.early;
    // A friend's code can take you to a place you have not unlocked yet. You can play it, but the richer payout waits until you have.
    var destOpenNow = !r.tape.dest.cost || !!m.unlocked['dest_' + r.tape.dest.id];
    var out = { res: res, bells: BW.bellsFor(res, sc, played, destOpenNow ? r.tape.dest : null), badges: [], cards: [], box: null, daily: 0 };
    m.stats.runs++; m.stats.years += played; if (res.ratio > 1 && full) m.stats.beats++;
    if (cfg.mode === 'daily' && !m.daily[cfg.date]) { m.stats.dailies = (m.stats.dailies || 0) + 1; out.daily = 8; }
    if (cfg.mode === 'daily' && (!m.daily[cfg.date] || res.score > m.daily[cfg.date].score)) m.daily[cfg.date] = { score: res.score, dolly: res.dolly, ratio: res.ratio };
    var ctx = { run: r, s: s, tot: s.tot, st: s.st, ratio: res.ratio, res: res, scen: sc, meta: m, years: played, full: full, maxProps: s.st.maxProps || 0 };
    BW.BADGES.forEach(function (bd) { var ok = false; try { ok = !m.badges[bd.id] && bd.t(ctx); } catch (e) { ok = false; }
      if (ok) { m.badges[bd.id] = { t: Date.now() }; out.badges.push(bd); out.bells += BW.BADGE_BELLS[bd.r]; var tt = BW.BADGE_TITLE[bd.id]; if (tt) m.cos.owned[tt] = 1; } });
    var cds = BW.cardsFor(r); for (var id in cds) if (cds[id] > (m.cards[id] || 0)) { m.cards[id] = cds[id]; out.cards.push([id, cds[id]]); }
    if (played >= 3 && played >= sc.years * 0.5) { out.box = s.bankrupt ? 0 : BW.boxTierFor(res.ratio); m.boxes.push({ tier: out.box }); }
    out.total = out.bells + out.daily; m.bells += out.total; m.bellsEarned += out.total;
    m.runs.unshift({ scen: sc.id, dest: cfg.dest, code: cfg.code, mode: cfg.mode, years: played, score: res.score, dolly: res.dolly, ratio: res.ratio, bells: out.total, t: Date.now(), bankrupt: s.bankrupt, early: !!s.early });
    if (m.runs.length > 40) m.runs.length = 40;
    if (full && (!m.best[sc.id] || res.ratio > m.best[sc.id])) m.best[sc.id] = res.ratio;
    if (s.fair && full) { var rows = Array.isArray(m.friends[cfg.code]) ? m.friends[cfg.code] : (m.friends[cfg.code] = []); rows.push({ name: m.name || 'You', score: res.score, dolly: res.dolly, attempt: cfg.attempt || 1, bankrupt: s.bankrupt, me: true }); }
    out.resultCode = s.fair && full ? BW.makeResult({ code: cfg.code, name: m.name || 'Anon', score: res.score, dolly: res.dolly, attempt: cfg.attempt || 1, bankrupt: s.bankrupt }) : null;
    G.resultsShown = true; G.lastOut = out;
    App.save();
    return out;
  }
  S.finish = function () {
    if (!G.run || !G.run.s.done) return;
    U.closeAll(); U.clear(document.getElementById('toasts'));
    var out = G.resultsShown && G.lastOut ? G.lastOut : settle();
    var r = G.run, s = r.s, d = G.dolly, res = out.res, m = G.meta, tape = G.tape;
    var won = res.ratio >= 1.02, tied = !won && res.ratio >= 0.98;
    setTimeout(function () { BW.Audio.play(s.bankrupt ? 'lose' : won ? 'win' : tied ? 'tie' : 'lose'); }, 350);
    function leave() { G.run = null; G.tape = null; G.dolly = null; G.cfg = null; G.lastOut = null; App.save(); }
    U.sheet({ title: G.scen.name + ': the result', full: true, onClose: function () { if (G.run && G.run.s.done) { leave(); App.toHub(); } }, build: function (b, ctl) {
      b.appendChild(h('div', { cls: 'disp', style: 'font-size:30px;line-height:1.05', text: s.bankrupt ? 'You went bankrupt' : won ? 'You beat Dolly by ' + f.pct(res.ratio - 1, 0) : tied ? 'A dead heat with Dolly' : 'Dolly beat you by ' + f.pct(1 / Math.max(res.ratio, 0.01) - 1, 0) }));
      b.appendChild(h('p', { cls: 'soft', style: 'margin-top:6px', text: (s.early ? 'Cashed in after ' : 'After ') + res.years.toFixed(res.years % 1 ? 1 : 0) + ' years. Over that time the market returned ' + (res.idxCagr * 100).toFixed(1) + '% a year.' }));
      b.appendChild(h('div', { cls: 'versus', style: 'margin-top:14px' },
        h('div', { cls: 'side' + (res.score >= res.dolly ? ' win' : '') }, h('div', { cls: 'who', text: 'You walk away with' }), h('div', { cls: 'amt2', text: f.ms(res.score) })),
        h('div', { cls: 'side' + (res.score < res.dolly ? ' win' : '') }, h('div', { cls: 'who', text: 'Dolly walks away with' }), h('div', { cls: 'amt2', text: f.ms(res.dolly) }))));
      var cbox = h('div', { style: 'margin-top:10px' });
      var chart = C.lines(cbox, { height: 170, n: function () { return s.hist.nw.length; }, x: function (i, long) { return long ? f.dateLong((i + 1) * 5) : f.date((i + 1) * 5); },
        series: [{ get: function (i) { return d.s.hist.nw[i] / 100; }, color: '--ink3', dash: [5, 4], name: 'Dolly', width: 1.6 }, { get: function (i) { return s.hist.nw[i] / 100; }, color: '--brass', name: 'You', fill: true, width: 2.4 }], fmt: C.fmtUsd, fmtTip: function (v) { return f.m0(Math.round(v * 100)); } });
      b.appendChild(cbox); setTimeout(chart.draw, 300);
      b.appendChild(h('p', { cls: 'mute', style: 'font-size:12px;margin-top:6px' }, 'The chart tracks net worth. The two boxes above show ', U.term('walk-away value', 'liq'), ': what is left after selling everything and paying the tax and selling costs.'));

      b.appendChild(h('h3', { text: 'Why it turned out this way' }));
      var ls = h('div', { cls: 'stack' });
      res.lessons.forEach(function (l) { ls.appendChild(h('div', { cls: 'lesson ' + (l.k === 'good' ? 'good' : l.k === 'bad' ? 'bad' : '') }, h('b', { text: l.h }), h('p', { text: l.b }))); });
      b.appendChild(ls);

      b.appendChild(h('h3', null, 'Where the gap came from, ', U.term('measured against the index', 'pme')));
      var rows = res.cats.filter(function (c) { return c.cat !== 'herd' || Math.abs(c.alpha) > 100; }).map(function (c) { return [c.label, c.alpha]; });
      if (Math.abs(res.exit) >= 100) rows.push(['Tax and selling costs still to pay', res.exit]);
      rows.push(['Cash on the sidelines, debts, timing', res.idle]);
      var max = 1; rows.forEach(function (x) { max = Math.max(max, Math.abs(x[1])); });
      var bars = h('div', { cls: 'bars card' });
      rows.forEach(function (x) { var w = Math.min(50, 50 * Math.abs(x[1]) / max);
        bars.appendChild(h('div', { cls: 'bar' }, h('span', { text: x[0] }), h('span', { cls: 'num ' + f.sign(x[1]), style: 'font-weight:700', text: f.mp(x[1]) }), h('div', { cls: 'trk' }, h('i', { style: (x[1] >= 0 ? 'left:50%;' : 'right:50%;') + 'width:' + w + '%;background:var(' + (x[1] >= 0 ? '--up' : '--down') + ')' })))); });
      bars.appendChild(h('div', { cls: 'kv total', style: 'margin-top:6px' }, h('span', { text: 'Your walk-away value minus Dolly\'s' }), h('span', { cls: f.sign(res.gap), text: f.mp(res.gap) })));
      b.appendChild(bars);
      b.appendChild(h('p', { cls: 'mute', style: 'font-size:12.5px;margin-top:6px', text: 'Each line asks: if every dollar you put there had gone into the ' + tape.dest.indexName + ' fund on the same day instead, how much more or less would you have now?' }));

      b.appendChild(h('h3', { text: 'What it cost to play' }));
      var cost = h('div', { cls: 'card' });
      cost.appendChild(U.kv('Tax you paid', f.ma(res.costs.tax))); cost.appendChild(U.kv('Tax Dolly paid', f.ma(res.costs.dollyTax)));
      cost.appendChild(U.kv('Trading costs you paid', f.ma(res.costs.fees))); cost.appendChild(U.kv('Trading costs Dolly paid', f.ma(res.costs.dollyFees)));
      if (res.costs.cardInt) cost.appendChild(U.kv('Card interest', f.ma(res.costs.cardInt)));
      cost.appendChild(U.kv('Your trades', String(res.trades))); cost.appendChild(U.kv('Average share held as cash', f.pct(res.avgCash, 0)));
      b.appendChild(cost);

      if (res.best.length || res.worst.length) {
        b.appendChild(h('h3', { text: 'Best and worst calls, against the index' }));
        var bw = h('div', { cls: 'list' });
        res.best.concat(res.worst).forEach(function (x) { bw.appendChild(h('div', { cls: 'item', style: 'min-height:52px' }, h('span', { cls: 'grow' }, h('div', { cls: 't1', text: x.name }), h('div', { cls: 't2', text: 'Put in ' + f.ma(x.paid) + ', profit ' + f.mp(x.profit) })), h('span', { cls: 'v1 ' + f.sign(x.alpha), text: f.mp(x.alpha) }))); });
        b.appendChild(bw);
      }

      if (BW.hasTool(m, r, 'autopsy')) {
        var held = {}; for (var k in s.ps) held[k] = 1;
        var items = tape.news.filter(function (n) { return n.d > s.day0 && n.d <= s.d - 60 && n.co && held[n.co] && n.sev >= 2 && n.k !== 'earn'; }).slice(-14).reverse();
        if (items.length) {
          b.appendChild(h('h3', { text: 'News autopsy: stories about companies you owned' }));
          var au = h('div', { cls: 'list' });
          items.forEach(function (n) { var a = tape.assets[n.co], e = a.end >= 0 ? Math.min(a.end, n.d + 60) : n.d + 60; if (e <= n.d || !a.pc[n.d - 1]) return;
            var day = a.pc[n.d] / a.pc[n.d - 1] - 1, later = (a.end === e ? a.endPx : a.pc[e]) / a.pc[n.d] - 1;
            au.appendChild(h('div', { cls: 'item' }, h('span', { cls: 'grow' }, h('div', { cls: 't1', style: 'white-space:normal;font-size:14px', text: n.h }), h('div', { cls: 't2', style: 'white-space:normal', text: 'That day ' + f.pp(day) + ', next three months ' + f.pp(later) })),
              h('span', { cls: 'tag ' + (n.tr === 'real' ? 'up' : n.tr === 'noise' ? 'down' : ''), text: n.tr === 'real' ? 'Real' : n.tr === 'noise' ? 'Noise' : 'Unclear' }))); });
          b.appendChild(au);
        }
      }

      b.appendChild(h('h3', { text: 'What you earned' }));
      var rw = h('div', { cls: 'card stack' });
      rw.appendChild(h('div', { cls: 'rowf' }, h('span', { cls: 'grow', text: 'Bells for this run' }), h('span', { cls: 'bellcount', style: 'font-size:20px' }, bellIcon(), '+' + out.total)));
      if (tape.dest.cost && !m.unlocked['dest_' + tape.dest.id]) rw.appendChild(h('p', { cls: 'mute', style: 'font-size:12.5px;margin-top:6px', text: 'You reached ' + tape.dest.name + ' on a friend\'s code. Runs there pay ' + Math.round((tape.dest.mult - 1) * 100) + '% more Bells once you unlock it yourself.' }));
      if (out.daily) rw.appendChild(h('div', { cls: 'mute', style: 'font-size:13px', text: 'Includes 8 for finishing today\'s Daily Tape.' }));
      if (res.years < 1) rw.appendChild(h('div', { cls: 'mute', style: 'font-size:13px', text: 'Runs shorter than a year earn nothing.' }));
      out.badges.forEach(function (bd) { rw.appendChild(h('div', { cls: 'rowf rar' + bd.r }, h('span', { cls: 'medal', html: U.icon('trophy') }), h('span', { cls: 'grow' }, h('div', { style: 'font-weight:700', text: bd.name }), h('div', { cls: 'mute', style: 'font-size:12.5px', text: bd.desc })), h('span', { cls: 'rar', text: '+' + BW.BADGE_BELLS[bd.r] }))); });
      if (out.cards.length) rw.appendChild(h('div', { cls: 'soft', style: 'font-size:14px', text: 'New cards: ' + out.cards.map(function (c) { return tape.assets[c[0]].name + ' (' + ['', 'bronze', 'silver', 'gold'][c[1]] + ')'; }).join(', ') + '.' }));
      if (out.box != null) rw.appendChild(h('button', { cls: 'btn', text: 'Open your ' + BW.BOX_TIERS[out.box].name, tap: function () { S.collection('boxes'); } }));
      else rw.appendChild(h('div', { cls: 'mute', style: 'font-size:13px', text: 'No lockbox: the run ended before halfway.' }));
      b.appendChild(rw);

      if (out.resultCode) {
        b.appendChild(h('h3', { text: 'Send your result to friends' }));
        var txt = (m.name || 'I') + ' finished Bellwether market ' + G.cfg.code + ' with ' + f.ms(res.score) + ' (' + f.pp(res.ratio - 1, 0) + ' vs Dolly). My result: ' + out.resultCode;
        var ta = h('input', { cls: 'txt', id: 'result-code', readonly: true, value: out.resultCode, 'aria-label': 'Your result code' });
        b.appendChild(h('div', { cls: 'stack' }, ta, h('div', { cls: 'btns' }, copyBtn('Copy', txt, ta), shareBtn(txt, ta)), h('button', { cls: 'btn ghost', text: 'Open the scoreboard', tap: function () { S.board(G.cfg ? G.cfg.code : ''); } })));
        if (!m.name) b.appendChild(h('p', { cls: 'mute', style: 'font-size:12.5px;margin-top:6px', text: 'Set your name in Settings and it will appear on your friends\' scoreboards.' }));
      }
      var code = G.cfg.code, scen = G.scen.id, seed = G.cfg.seed, mode = G.cfg.mode, date = G.cfg.date, destId = G.cfg.dest;
      b.appendChild(h('div', { cls: 'stack', style: 'margin-top:22px' },
        h('button', { cls: 'btn pri', text: 'Back to the hub', tap: function () { ctl.close(true); leave(); App.toHub(); } }),
        h('button', { cls: 'btn', text: 'Replay this exact market', tap: function () { ctl.close(true); leave(); App.startRun({ scen: scen, seed: seed, mode: mode === 'open' ? 'challenge' : mode, code: code, date: date, dest: destId }); } }),
        mode === 'open' ? h('button', { cls: 'btn ghost', text: 'Challenge a friend to this market', tap: function () { S.shareCode(code); } }) : null));
    } });
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
