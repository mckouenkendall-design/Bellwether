/* All sound is synthesized here with the Web Audio API. No audio files. */
(function (root) {
  'use strict';
  var BW = root.BW, A = BW.Audio = {};
  var ctx = null, master = null, lastScrub = 0, lastNews = 0;
  A.on = true; A.music = true; A.haptic = true; A.bellSkin = 'bl_brass';

  A.unlock = function () {
    if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
    try {
      var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      ctx = new AC(); master = ctx.createGain(); master.gain.value = 0.9;
      var comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4;
      master.connect(comp); comp.connect(ctx.destination);
    } catch (e) { ctx = null; }
  };
  function now() { return ctx.currentTime; }
  function env(g, t0, a, peak, dur) { g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(peak, t0 + a); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur); }
  function tone(o) { // { f, type, at, dur, gain, to, attack, pan }
    var t0 = now() + (o.at || 0), os = ctx.createOscillator(), g = ctx.createGain();
    os.type = o.type || 'sine'; os.frequency.setValueAtTime(o.f, t0);
    if (o.to) os.frequency.exponentialRampToValueAtTime(o.to, t0 + o.dur);
    env(g, t0, o.attack || 0.005, o.gain || 0.1, o.dur);
    os.connect(g); g.connect(master); os.start(t0); os.stop(t0 + o.dur + 0.03);
  }
  var noiseBuf = null;
  function noise(o) { // { at, dur, gain, type ('highpass'|'lowpass'|'bandpass'), f, q }
    if (!noiseBuf) { noiseBuf = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate); var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
    var t0 = now() + (o.at || 0), src = ctx.createBufferSource(), g = ctx.createGain(), fl = ctx.createBiquadFilter();
    src.buffer = noiseBuf; src.loop = true; fl.type = o.type || 'highpass'; fl.frequency.value = o.f || 2000; fl.Q.value = o.q || 0.7;
    env(g, t0, o.attack || 0.003, o.gain || 0.08, o.dur);
    src.connect(fl); fl.connect(g); g.connect(master); src.start(t0, Math.random() * 0.5); src.stop(t0 + o.dur + 0.03);
  }
  // a struck bell: a stack of slightly out-of-tune partials that die away at different speeds
  var BELL = {
    bl_brass: { f: 622, parts: [[0.56, 0.5, 2.2], [0.92, 0.7, 1.8], [1.19, 0.9, 1.5], [1.71, 0.5, 1.1], [2, 0.75, 1.3], [2.74, 0.35, 0.8], [3.76, 0.2, 0.5]], type: 'sine' },
    bl_silver: { f: 880, parts: [[0.5, 0.3, 2], [1, 1, 1.9], [2.01, 0.6, 1.4], [2.76, 0.45, 1], [4.07, 0.3, 0.7], [5.4, 0.18, 0.4]], type: 'sine' },
    bl_cow: { f: 540, parts: [[1, 1, 0.32], [1.48, 0.9, 0.3]], type: 'square', bp: 1800 },
    bl_glass: { f: 1320, parts: [[1, 1, 2.6], [2.32, 0.4, 1.6], [4.25, 0.2, 0.9]], type: 'sine' },
    bl_toy: { f: 784, parts: [[1, 1, 0.18], [1.5, 0.8, 0.18], [2, 0.8, 0.3]], type: 'square', arp: true },
    bl_temple: { f: 196, parts: [[1, 1, 4.5], [2.02, 0.6, 3.4], [2.98, 0.35, 2.4], [4.2, 0.25, 1.6], [5.43, 0.12, 1]], type: 'sine' },
    bl_ship: { f: 494, parts: [[0.56, 0.4, 1.6], [1, 1, 1.5], [2.4, 0.6, 1], [3.9, 0.3, 0.6]], type: 'triangle', twice: true },
    bl_golden: { f: 740, parts: [[0.5, 0.5, 3], [1, 1, 2.6], [1.5, 0.5, 2.2], [2, 0.7, 2], [2.52, 0.4, 1.5], [3, 0.35, 1.2], [4.02, 0.2, 0.9]], type: 'sine' },
    bl_moon: { f: 330, parts: [[1, 1, 3.6], [1.34, 0.5, 3], [2.63, 0.4, 2], [3.3, 0.2, 1.4]], type: 'sine', wob: true }
  };
  function bell(skin, at, vol, pitch) {
    var b = BELL[skin] || BELL.bl_brass, t0 = now() + (at || 0), base = b.f * (pitch || 1), v = vol || 0.2;
    if (b.bp) noise({ at: at, dur: 0.02, gain: v * 0.5, type: 'bandpass', f: 3000 });
    b.parts.forEach(function (p, i) {
      var os = ctx.createOscillator(), g = ctx.createGain(), st = t0 + (b.arp ? i * 0.07 : 0);
      os.type = b.type; os.frequency.setValueAtTime(base * p[0], st);
      if (b.wob) { var l = ctx.createOscillator(), lg = ctx.createGain(); l.frequency.value = 4.5; lg.gain.value = base * p[0] * 0.006; l.connect(lg); lg.connect(os.frequency); l.start(st); l.stop(st + p[2] + 0.1); }
      var peak = v * p[1] * (b.type === 'square' ? 0.25 : 0.5);
      g.gain.setValueAtTime(0.0001, st); g.gain.exponentialRampToValueAtTime(peak, st + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, st + p[2]);
      if (b.bp) { var fl = ctx.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = b.bp; fl.Q.value = 1.2; os.connect(fl); fl.connect(g); } else os.connect(g);
      g.connect(master); os.start(st); os.stop(st + p[2] + 0.05);
    });
    noise({ at: at, dur: 0.012, gain: v * 0.25, type: 'highpass', f: 4000 }); // the strike itself
    if (b.twice) bell.call(null, skin === 'bl_ship' ? 'bl_ship_2' : skin, (at || 0) + 0.22, v, pitch);
  }
  BELL.bl_ship_2 = { f: 494, parts: BELL.bl_ship.parts, type: 'triangle' };
  function pluck(f, at, dur, gain) { // soft mallet note for the jingle
    var t0 = now() + at, car = ctx.createOscillator(), mod = ctx.createOscillator(), mg = ctx.createGain(), g = ctx.createGain();
    car.type = 'sine'; car.frequency.value = f; mod.frequency.value = f * 3.01; mg.gain.setValueAtTime(f * 1.4, t0); mg.gain.exponentialRampToValueAtTime(1, t0 + dur * 0.6);
    mod.connect(mg); mg.connect(car.frequency);
    g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(gain, t0 + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    car.connect(g); g.connect(master); car.start(t0); mod.start(t0); car.stop(t0 + dur + 0.05); mod.stop(t0 + dur + 0.05);
  }
  var N = { C3: 130.81, G2: 98, A2: 110, F2: 87.31, E3: 164.81, G3: 196, A3: 220, C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392, A4: 440, B4: 493.88, C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880, B5: 987.77, C6: 1046.5, E6: 1318.5 };
  function seq(notes, bpm, gain, at) { var t = at || 0, beat = 60 / bpm; notes.forEach(function (n) { if (n[0]) pluck(N[n[0]], t, Math.max(0.25, n[1] * beat * 1.6), gain); t += n[1] * beat; }); return t; }

  var S = {
    tick: function () { tone({ f: 920, to: 700, dur: 0.035, gain: 0.05, type: 'triangle' }); },
    open: function () { tone({ f: 520, to: 780, dur: 0.07, gain: 0.04 }); },
    close: function () { tone({ f: 700, to: 480, dur: 0.07, gain: 0.035 }); },
    scrub: function () { var t = Date.now(); if (t - lastScrub < 45) return; lastScrub = t; tone({ f: 1500, dur: 0.018, gain: 0.02, type: 'triangle' }); },
    buy: function () { tone({ f: 440, to: 660, dur: 0.11, gain: 0.12, type: 'triangle' }); tone({ f: 1318, at: 0.09, dur: 0.28, gain: 0.09 }); tone({ f: 1976, at: 0.09, dur: 0.2, gain: 0.04 }); },
    sell: function () { noise({ dur: 0.06, gain: 0.1, type: 'bandpass', f: 1200, q: 1.5 }); tone({ f: 1760, at: 0.06, dur: 0.3, gain: 0.09 }); tone({ f: 2217, at: 0.15, dur: 0.4, gain: 0.09 }); },
    coin: function () { [1047, 1319, 1568].forEach(function (f, i) { tone({ f: f, at: i * 0.07, dur: 0.16, gain: 0.07 }); }); },
    news: function () { var t = Date.now(); if (t - lastNews < 350) return; lastNews = t; tone({ f: 980, dur: 0.05, gain: 0.05 }); noise({ dur: 0.02, gain: 0.03, type: 'bandpass', f: 2400, q: 3 }); },
    big: function () { bell(A.bellSkin, 0, 0.16); },
    bad: function () { tone({ f: 392, dur: 0.22, gain: 0.1, type: 'triangle' }); tone({ f: 311, at: 0.16, dur: 0.38, gain: 0.1, type: 'triangle' }); },
    good: function () { tone({ f: 523, dur: 0.16, gain: 0.09, type: 'triangle' }); tone({ f: 659, at: 0.1, dur: 0.16, gain: 0.09, type: 'triangle' }); tone({ f: 784, at: 0.2, dur: 0.34, gain: 0.09, type: 'triangle' }); },
    error: function () { tone({ f: 150, dur: 0.12, gain: 0.1, type: 'square' }); tone({ f: 120, at: 0.07, dur: 0.14, gain: 0.08, type: 'square' }); },
    pause: function () { tone({ f: 660, dur: 0.06, gain: 0.07, type: 'triangle' }); tone({ f: 440, at: 0.07, dur: 0.1, gain: 0.07, type: 'triangle' }); },
    resume: function () { tone({ f: 440, dur: 0.06, gain: 0.07, type: 'triangle' }); tone({ f: 660, at: 0.07, dur: 0.1, gain: 0.07, type: 'triangle' }); },
    speed: function (k) { tone({ f: 500 + 90 * (k || 0), dur: 0.05, gain: 0.06, type: 'triangle' }); },
    bell: function () { bell(A.bellSkin, 0, 0.26); bell(A.bellSkin, 0.5, 0.2); bell(A.bellSkin, 1.0, 0.24); },
    bell1: function (skin) { bell(skin || A.bellSkin, 0, 0.24); },
    rumble: function () { noise({ dur: 1.1, gain: 0.2, type: 'lowpass', f: 140, attack: 0.25 }); tone({ f: 70, to: 40, dur: 1.0, gain: 0.16, attack: 0.2 }); },
    year: function () { tone({ f: 784, dur: 0.12, gain: 0.05 }); tone({ f: 1047, at: 0.1, dur: 0.22, gain: 0.05 }); },
    win: function () { seq([['C5', 0.5], ['E5', 0.5], ['G5', 0.5], ['C6', 1]], 150, 0.16); bell(A.bellSkin, 0.85, 0.24, 1); bell(A.bellSkin, 1.3, 0.2, 1.5); },
    lose: function () { seq([['E5', 0.75], ['D5', 0.75], ['C5', 0.75], ['A4', 1.5]], 110, 0.13); },
    tie: function () { seq([['C5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 1]], 130, 0.13); },
    box: function (r) { var notes = [['C5', 0.25], ['E5', 0.25], ['G5', 0.25], ['C6', 0.25], ['E6', 0.5]].slice(0, 2 + (r || 0)); seq(notes, 200, 0.14); if (r >= 3) bell(A.bellSkin, 0.4, 0.2, 1.5); },
    shake: function () { noise({ dur: 0.08, gain: 0.07, type: 'bandpass', f: 900, q: 2 }); noise({ at: 0.12, dur: 0.08, gain: 0.07, type: 'bandpass', f: 1100, q: 2 }); },
    unlock: function () { tone({ f: 660, dur: 0.08, gain: 0.08, type: 'triangle' }); tone({ f: 990, at: 0.08, dur: 0.08, gain: 0.08, type: 'triangle' }); tone({ f: 1320, at: 0.16, dur: 0.3, gain: 0.08 }); },
    card: function () { noise({ dur: 0.035, gain: 0.07, type: 'highpass', f: 3500 }); },
    chip: function () { tone({ f: 2100, dur: 0.03, gain: 0.05, type: 'triangle' }); tone({ f: 2600, at: 0.03, dur: 0.04, gain: 0.04, type: 'triangle' }); },
    rtick: function () { tone({ f: 1800, dur: 0.012, gain: 0.04, type: 'square' }); },
    thunk: function () { tone({ f: 180, to: 80, dur: 0.1, gain: 0.16 }); noise({ dur: 0.03, gain: 0.05, type: 'lowpass', f: 600 }); },
    jackpot: function () { for (var i = 0; i < 9; i++) tone({ f: 1200 + (i % 3) * 300, at: i * 0.07, dur: 0.1, gain: 0.07 }); bell(A.bellSkin, 0.2, 0.2, 1.5); },
    // the title jingle: four bars, home key, ends on the bell
    jingle: function () {
      var bpm = 126, beat = 60 / bpm;
      seq([['E5', 0.5], ['G5', 0.5], ['C6', 1], ['A5', 0.5], ['G5', 0.5], ['E5', 1], ['F5', 0.5], ['A5', 0.5], ['G5', 0.75], ['D5', 0.25], ['E5', 0.5], ['D5', 0.5], ['C5', 2]], bpm, 0.13);
      seq([['C4', 1], ['G4', 1], ['A3', 1], ['E4', 1], ['F4', 1], ['C4', 1], ['G3', 1], ['G3', 1], ['C4', 2]], bpm, 0.07);
      [['C3', 0], ['A2', 2], ['F2', 4], ['G2', 6], ['C3', 8]].forEach(function (b) { tone({ f: N[b[0]], at: b[1] * beat, dur: beat * 1.9, gain: 0.09, type: 'triangle', attack: 0.02 }); });
      bell(A.bellSkin, 8 * beat, 0.22, N.C5 / (BELL[A.bellSkin] || BELL.bl_brass).f);
    }
  };
  A.play = function (name, arg) {
    if (!A.on || !ctx || ctx.state !== 'running') return;
    if (name === 'jingle' && !A.music) return;
    try { if (S[name]) S[name](arg); } catch (e) { /* never let sound break the game */ }
  };
  A.buzz = function (pat) { if (A.haptic && navigator.vibrate) { try { navigator.vibrate(pat); } catch (e) { /* ignore */ } } };
  A.ready = function () { return !!ctx && ctx.state === 'running'; };
})(typeof globalThis !== 'undefined' ? globalThis : this);
