/* Bellwether engine core: namespace, deterministic maths, seeded randomness.
 *
 * Everything the market and the money logic compute goes through the functions
 * here, never Math.exp / Math.log / Math.pow / Math.sin. Those are allowed to
 * differ in the last digit between phones (Safari vs Chrome). These versions
 * are built only from + - * / and sqrt, which every device computes identically,
 * so one challenge code produces the same market on every phone.
 */
(function (root) {
  'use strict';
  var BW = root.BW = root.BW || {};

  BW.ENGINE_VERSION = 1;
  BW.DPY = 240; // trading days per year
  BW.DPM = 20;  // per month
  BW.DPW = 5;   // per week
  BW.DPQ = 60;  // per quarter

  var LN2 = 0.6931471805599453;
  var LN2_HI = 6.93147180369123816490e-01;
  var LN2_LO = 1.90821492927058770002e-10;

  function pow2(k) {
    var r = 1;
    if (k >= 0) { while (k >= 30) { r *= 1073741824; k -= 30; } return r * (1 << k); }
    k = -k;
    while (k >= 30) { r /= 1073741824; k -= 30; }
    return r / (1 << k);
  }

  function dexp(x) {
    if (x !== x) return x;
    if (x > 700) return Infinity;
    if (x < -700) return 0;
    var k = Math.round(x / LN2);
    var r = (x - k * LN2_HI) - k * LN2_LO;
    var s = 1;
    for (var i = 16; i >= 1; i--) s = 1 + r * s / i;
    return s * pow2(k);
  }

  function dlog(x) {
    if (!(x > 0)) return x === 0 ? -Infinity : NaN;
    var e = 0, m = x;
    while (m >= 1073741824) { m /= 1073741824; e += 30; }
    while (m < 9.313225746154785e-10) { m *= 1073741824; e -= 30; }
    while (m >= 2) { m /= 2; e++; }
    while (m < 1) { m *= 2; e--; }
    if (m > 1.4142135623730951) { m /= 2; e++; }
    var f = (m - 1) / (m + 1), f2 = f * f;
    var s = 0;
    for (var i = 23; i >= 1; i -= 2) s = s * f2 + 1 / i;
    return 2 * f * s + e * LN2_HI + e * LN2_LO;
  }

  function dpow(x, y) { return dexp(y * dlog(x)); }

  BW.dexp = dexp; BW.dlog = dlog; BW.dpow = dpow; BW.dsqrt = Math.sqrt;

  /* ---------- hashing and RNG (integer only) ---------- */
  function hash32(a) {
    a |= 0;
    a = Math.imul(a ^ (a >>> 16), 0x85ebca6b);
    a = Math.imul(a ^ (a >>> 13), 0xc2b2ae35);
    return (a ^ (a >>> 16)) >>> 0;
  }
  function hashStr(s) {
    var h = 2166136261;
    for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  // mix any number of ints / strings into one 32-bit seed
  function mix() {
    var h = 0x9e3779b9;
    for (var i = 0; i < arguments.length; i++) {
      var k = arguments[i];
      var v = typeof k === 'string' ? hashStr(k) : (k | 0);
      h = hash32((h ^ v) + 0x9e3779b9 + (h << 6) + (h >>> 2));
    }
    return h >>> 0;
  }

  function RNG(seed) { this.s = seed | 0; this.spare = null; }
  RNG.prototype.next = function () { // mulberry32
    this.s = (this.s + 0x6D2B79F5) | 0;
    var t = this.s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  RNG.prototype.n = function () { // standard normal, Marsaglia polar
    if (this.spare !== null) { var v = this.spare; this.spare = null; return v; }
    var u, w, s;
    do { u = this.next() * 2 - 1; w = this.next() * 2 - 1; s = u * u + w * w; } while (s >= 1 || s === 0);
    var m = Math.sqrt(-2 * dlog(s) / s);
    this.spare = w * m;
    return u * m;
  };
  RNG.prototype.range = function (a, b) { return a + (b - a) * this.next(); };
  RNG.prototype.int = function (a, b) { return a + Math.floor(this.next() * (b - a + 1)); };
  RNG.prototype.chance = function (p) { return this.next() < p; };
  RNG.prototype.pick = function (arr) { return arr[Math.floor(this.next() * arr.length)]; };
  RNG.prototype.wpick = function (items, wfn) {
    var tot = 0, i;
    for (i = 0; i < items.length; i++) tot += wfn(items[i]);
    var r = this.next() * tot;
    for (i = 0; i < items.length; i++) { r -= wfn(items[i]); if (r <= 0) return items[i]; }
    return items[items.length - 1];
  };

  // stateless uniform in [0,1) from keys; used for player-dependent luck so it
  // does not depend on the order things happen in
  function hrand() { return hash32(mix.apply(null, arguments) + 0x2545F491) / 4294967296; }
  function hnorm() { // approx normal from 4 uniforms (Irwin-Hall), stateless
    var h = mix.apply(null, arguments), s = 0;
    for (var i = 0; i < 4; i++) { h = hash32(h + 0x6D2B79F5 + i); s += h / 4294967296; }
    return (s - 2) * 1.7320508075688772;
  }

  BW.hash32 = hash32; BW.hashStr = hashStr; BW.mix = mix; BW.RNG = RNG;
  BW.hrand = hrand; BW.hnorm = hnorm;

  BW.clamp = function (x, a, b) { return x < a ? a : x > b ? b : x; };
  BW.lerp = function (a, b, t) { return a + (b - a) * t; };

  /* ---------- calendar ---------- */
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  BW.MONTHS = MONTHS;
  // rel = days since the run started (can be negative for history)
  BW.dateParts = function (rel) {
    var y = Math.floor(rel / 240), r = rel - y * 240;
    var m = Math.floor(r / 20), dd = r - m * 20;
    return { year: y + 1, month: m, day: dd + 1, mname: MONTHS[m] };
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
