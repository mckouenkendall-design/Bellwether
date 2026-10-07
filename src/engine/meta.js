/* Everything around a run: scenarios, unlocks, collectibles, challenge codes,
 * and the end-of-run review that explains how you did against the index and why.
 */
(function (root) {
  'use strict';
  var BW = root.BW, REG = BW.REG, clamp = BW.clamp;
  var LOAN = { bal: 1800000, rate: 6, pay: 19984 };
  var LIFE = BW.LIFE_DEFAULT = { salary: 5200000, cash: 500000, living: 235000, loan: LOAN };

  /* ---------- scenarios ---------- */
  BW.SCENARIOS = [
    { id: 'sprint', code: 'S', name: 'Five-Year Sprint', years: 5, mult: 1, cost: 0, blurb: 'Five years is short. Luck matters more than skill over a stretch like this, which is a lesson of its own.' },
    { id: 'decade', code: 'D', name: 'The Decade', years: 10, mult: 1, cost: 0, blurb: 'Ten years. Long enough to see at least one scare, and probably a recession.' },
    { id: 'classic', code: 'C', name: 'The Long Game', years: 20, mult: 1, cost: 0, blurb: 'Twenty years of paychecks, booms and busts. The standard run.' },
    { id: 'marathon', code: 'M', name: 'Whole Career', years: 40, mult: 1, cost: 20, blurb: 'Age 22 to 62. Compounding gets strange and wonderful in the last ten years.' },
    { id: 'roar', code: 'R', name: 'The Roaring Run', years: 10, mult: 0.9, cost: 15, mods: { force: [{ y: -1.4, bust: true, depth: 3 }], calm: 8, growthBias: 0.5, sentPath: [[0, 0], [8, 0.12], [10, 0.12]] },
      blurb: 'A long boom with nothing in the way. Everyone feels like a genius. Beating Dolly is hardest when everything rises.' },
    { id: 'mania', code: 'T', name: 'Tech Mania', years: 10, mult: 1.1, cost: 20, mods: { sectorMania: [{ y: 0.8, sector: 'tech', dur: 3.2 }], calm: 3 },
      blurb: 'Technology stocks are about to go wild. You know that much. You do not know when it ends.' },
    { id: 'housing', code: 'H', name: 'Housing Fever', years: 12, mult: 1.1, cost: 20, mods: { housing: [{ y: 0.5, boom: 4, bust: 2.5 }] },
      blurb: 'Property prices are taking off. Borrowed money makes gains bigger on the way up, and losses bigger on the way down.' },
    { id: 'stag', code: 'G', name: 'Stagflation', years: 15, mult: 1.3, cost: 30, mods: { inflBias: [[0, 0], [2, 3.5], [7, 5.5], [11, 1.5], [15, 0]], growthBias: -0.5 },
      blurb: 'Prices climb year after year and interest rates chase them. Stocks and bonds both struggle. Cash loses value in your hand.' },
    { id: 'lost', code: 'L', name: 'The Lost Decade', years: 12, mult: 1.4, cost: 30, mods: { force: [{ y: -2.2, reg: REG.BOOM }, { y: 0.8, bust: true, depth: 3.6 }, { y: 6.5, bust: true, depth: 3 }], calm: 0.8, growthBias: -1, sentPath: [[-3, 0.08], [0.5, 0.2], [3, -0.08], [12, -0.3]] },
      blurb: 'You start at the top of a bubble, and you will not get your money back for a long time. Patience is the only weapon.' },
    { id: 'crisis', code: 'K', name: 'Crisis Start', years: 10, mult: 1.2, cost: 25, mods: { force: [{ y: -0.6, bust: true, depth: 4 }] },
      blurb: 'Your first paycheck arrives in the worst market in a generation. Everything is on sale and everyone is terrified.' },
    { id: 'trust', code: 'F', name: 'Trust Fund', years: 20, mult: 1.2, cost: 40, life: { salary: 0, cash: 60000000, living: 320000, loan: null },
      blurb: 'No job. $600,000 and a monthly bill for living. If it runs out, it runs out.' }
  ];
  BW.SCEN_BY = {}; BW.SCENARIOS.forEach(function (s) { BW.SCEN_BY[s.id] = s; if (!s.life) s.life = LIFE; });

  /* ---------- unlocks bought with Bells ---------- */
  BW.LEGACY = [
    // tools
    { id: 'orders', kind: 'tool', name: 'Standing Orders', cost: 12, desc: 'Leave instructions that fire on their own: buy if it drops to a price, sell if it falls through a floor, take profit at a target.' },
    { id: 'screener', kind: 'tool', name: 'Screener', cost: 10, desc: 'Sort and filter every company by valuation, growth, debt and dividends.' },
    { id: 'studio', kind: 'tool', name: 'Chart Studio', cost: 10, desc: 'Moving averages, trading volume, and any chart overlaid against the index.' },
    { id: 'econlab', kind: 'tool', name: 'Economy Lab', cost: 15, desc: 'The gauges professionals watch: how expensive the market is, the gap between long and short interest rates, and stress in the loan market.' },
    { id: 'newsdesk', kind: 'tool', name: 'News Desk', cost: 18, desc: 'Filter the feed by source and see how often each kind of source has turned out to be right so far this run.' },
    { id: 'analyst', kind: 'tool', name: 'Analyst Desk', cost: 30, desc: 'Analysts\' price targets for every company. They are informed, noisy, and tend to chase whatever has gone up lately.' },
    { id: 'sectorfunds', kind: 'tool', name: 'Sector Funds', cost: 10, desc: 'A fund for each sector, owning every company in it.' },
    { id: 'coin', kind: 'tool', name: 'Coin Exchange', cost: 10, desc: 'Opens trading in Fleececoin and its cousins on other worlds. You have been warned.' },
    { id: 'fast', kind: 'tool', name: 'Fast Forward', cost: 8, desc: 'Adds 16x speed.' },
    { id: 'autopsy', kind: 'tool', name: 'News Autopsy', cost: 20, desc: 'After each run, see which headlines were real, which were noise, and what each one did to the price.' },
    // places
    { id: 'dest_moon', kind: 'place', name: 'The Moon', cost: 120, desc: 'Opens the Tranquility Exchange: fifteen lunar companies, new commodities, new property, new businesses. Bells earned there are worth 25% more.' },
    { id: 'dest_mars', kind: 'place', name: 'Mars', cost: 400, req: 'dest_moon', desc: 'Opens the Olympus Exchange, the wildest market there is. Bells earned there are worth 50% more.' },
    // perks (ignored in challenges and the daily tape, so those stay fair)
    { id: 'seed1', kind: 'perk', name: 'Head Start I', cost: 10, desc: 'Begin with an extra $2,000.', seed: 200000 },
    { id: 'seed2', kind: 'perk', name: 'Head Start II', cost: 25, req: 'seed1', desc: 'Begin with an extra $10,000.', seed: 1000000 },
    { id: 'seed3', kind: 'perk', name: 'Head Start III', cost: 60, req: 'seed2', desc: 'Begin with an extra $50,000.', seed: 5000000 },
    { id: 'seed4', kind: 'perk', name: 'Head Start IV', cost: 150, req: 'seed3', desc: 'Begin with an extra $250,000.', seed: 25000000 },
    { id: 'seed5', kind: 'perk', name: 'Head Start V', cost: 400, req: 'seed4', desc: 'Begin with an extra $1,000,000.', seed: 100000000 },
    { id: 'seed6', kind: 'perk', name: 'Head Start VI', cost: 1000, req: 'seed5', desc: 'Begin with an extra $10,000,000. Rocket Yard money.', seed: 1000000000 },
    { id: 'raise1', kind: 'perk', name: 'Better Job I', cost: 15, desc: 'Your salary is 10% higher.', salary: 1.1 },
    { id: 'raise2', kind: 'perk', name: 'Better Job II', cost: 40, req: 'raise1', desc: 'Your salary is 20% higher.', salary: 1.2 },
    { id: 'raise3', kind: 'perk', name: 'Better Job III', cost: 100, req: 'raise2', desc: 'Your salary is 35% higher.', salary: 1.35 },
    { id: 'fee', kind: 'perk', name: 'Discount Broker', cost: 20, desc: 'Trading costs are halved.' },
    { id: 'acct', kind: 'perk', name: 'Good Accountant', cost: 40, desc: 'All investment taxes are 10% lower.' },
    { id: 'handy', kind: 'perk', name: 'Handy', cost: 20, desc: 'Renovations cost 20% less.' },
    { id: 'agent', kind: 'perk', name: 'Family Agent', cost: 25, desc: 'Closing costs on property are halved.' },
    { id: 'operator', kind: 'perk', name: 'Operator', cost: 35, desc: 'Run two businesses yourself instead of one.' }
  ];
  BW.LEGACY_BY = {}; BW.LEGACY.forEach(function (l) { BW.LEGACY_BY[l.id] = l; });

  BW.perksFor = function (meta, fair) {
    var u = meta.unlocked, p = { seed: 0, salaryMult: 1, feeMult: 1, taxMult: 1, renoMult: 1, agentMult: 1, selfSlots: 1 };
    if (fair) return p;
    BW.LEGACY.forEach(function (l) {
      if (l.kind !== 'perk' || !u[l.id] || (meta.perkOff && meta.perkOff[l.id])) return;
      if (l.seed && l.seed > p.seed) p.seed = l.seed;
      if (l.salary && l.salary > p.salaryMult) p.salaryMult = l.salary;
    });
    var on = function (id) { return u[id] && !(meta.perkOff && meta.perkOff[id]); };
    if (on('fee')) p.feeMult = 0.5;
    if (on('acct')) p.taxMult = 0.9;
    if (on('handy')) p.renoMult = 0.8;
    if (on('agent')) p.agentMult = 0.5;
    if (on('operator')) p.selfSlots = 2;
    return p;
  };
  // which tools are live in a run: challenges give everyone the full kit
  BW.hasTool = function (meta, run, id) { return (run && run.s.fair) || !!meta.unlocked[id]; };

  /* ---------- cosmetics ---------- */
  var RAR = BW.RARITY = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary'];
  BW.COSMETICS = [
    { id: 'th_floor', kind: 'theme', name: 'Trading Floor', r: 0, free: true }, { id: 'th_ledger', kind: 'theme', name: 'Ledger Paper', r: 0, free: true },
    { id: 'th_mint', kind: 'theme', name: 'Mint', r: 0 }, { id: 'th_slate', kind: 'theme', name: 'Slate', r: 0 }, { id: 'th_blossom', kind: 'theme', name: 'Blossom', r: 0 },
    { id: 'th_terminal', kind: 'theme', name: 'Green Screen', r: 1 }, { id: 'th_dusk', kind: 'theme', name: 'Dusk', r: 1 },
    { id: 'th_ember', kind: 'theme', name: 'Ember', r: 2 }, { id: 'th_ocean', kind: 'theme', name: 'Deep Water', r: 2 },
    { id: 'th_gold', kind: 'theme', name: 'Gold Standard', r: 3 }, { id: 'th_moon', kind: 'theme', name: 'Moonlight', r: 3 }, { id: 'th_mars', kind: 'theme', name: 'Red Planet', r: 4 },
    { id: 'bl_brass', kind: 'bell', name: 'Brass Bell', r: 0, free: true }, { id: 'bl_silver', kind: 'bell', name: 'Silver Bell', r: 0 }, { id: 'bl_cow', kind: 'bell', name: 'Cowbell', r: 0 },
    { id: 'bl_glass', kind: 'bell', name: 'Glass Bell', r: 1 }, { id: 'bl_toy', kind: 'bell', name: 'Arcade Bell', r: 1 }, { id: 'bl_temple', kind: 'bell', name: 'Temple Bell', r: 2 },
    { id: 'bl_ship', kind: 'bell', name: 'Ship\'s Bell', r: 2 }, { id: 'bl_golden', kind: 'bell', name: 'Golden Bell', r: 3 }, { id: 'bl_moon', kind: 'bell', name: 'Moonrock Bell', r: 4 },
    { id: 'cd_classic', kind: 'candle', name: 'Classic', r: 0, free: true }, { id: 'cd_ocean', kind: 'candle', name: 'Blue and Orange', r: 0, free: true },
    { id: 'cd_mono', kind: 'candle', name: 'Hollow', r: 0 }, { id: 'cd_neon', kind: 'candle', name: 'Neon', r: 1 }, { id: 'cd_fire', kind: 'candle', name: 'Gold and Coal', r: 2 }, { id: 'cd_ghost', kind: 'candle', name: 'Ghost', r: 3 },
    { id: 'tt_rookie', kind: 'title', name: 'Rookie', r: 0, free: true }, { id: 'tt_saver', kind: 'title', name: 'Steady Saver', r: 0 }, { id: 'tt_daytrader', kind: 'title', name: 'Day Trader', r: 0 },
    { id: 'tt_shepherd', kind: 'title', name: 'Shepherd', r: 1 }, { id: 'tt_contrarian', kind: 'title', name: 'Contrarian', r: 1 }, { id: 'tt_landlord', kind: 'title', name: 'Landlord', r: 1 },
    { id: 'tt_tycoon', kind: 'title', name: 'Tycoon', r: 2 }, { id: 'tt_oracle', kind: 'title', name: 'The Oracle', r: 3 }, { id: 'tt_wolf', kind: 'title', name: 'Wolf in Sheep\'s Clothing', r: 3 },
    { id: 'tt_bell', kind: 'title', name: 'The Bellwether', r: 4 }
  ];
  BW.COS_BY = {}; BW.COSMETICS.forEach(function (c) { BW.COS_BY[c.id] = c; });
  BW.BOX_TIERS = [
    { id: 'tin', name: 'Tin Lockbox', w: [70, 24, 5, 1, 0] }, { id: 'bronze', name: 'Bronze Lockbox', w: [52, 32, 12, 3.5, 0.5] },
    { id: 'silver', name: 'Silver Lockbox', w: [30, 38, 22, 8, 2] }, { id: 'gold', name: 'Gold Lockbox', w: [10, 30, 35, 19, 6] },
    { id: 'diamond', name: 'Diamond Lockbox', w: [0, 12, 38, 34, 16] }
  ];
  BW.boxTierFor = function (ratio) { return ratio >= 1.4 ? 4 : ratio >= 1.15 ? 3 : ratio >= 1.0 ? 2 : ratio >= 0.9 ? 1 : 0; };
  // open a lockbox: returns { item } or { item, dupe: bells }
  BW.openBox = function (meta, tier, rnd) {
    var w = BW.BOX_TIERS[tier].w, x = rnd() * 100, r = 0;
    for (r = 0; r < 5; r++) { x -= w[r]; if (x <= 0) break; }
    r = Math.min(r, 4);
    var pick = null, rr;
    for (var k = 0; k < 5 && !pick; k++) { // prefer something new of that rarity, then nearby rarities
      rr = [r, r - 1, r + 1, r - 2, r + 2][k];
      var pool = BW.COSMETICS.filter(function (c) { return c.r === rr && !c.free && !meta.cos.owned[c.id]; });
      if (pool.length) pick = pool[Math.floor(rnd() * pool.length)];
    }
    if (!pick) { var all = BW.COSMETICS.filter(function (c) { return c.r === r && !c.free; }); pick = all[Math.floor(rnd() * all.length)]; var b = [2, 4, 8, 15, 30][r]; meta.bells += b; meta.bellsEarned += b; return { item: pick, dupe: b }; }
    meta.cos.owned[pick.id] = 1;
    return { item: pick };
  };

  /* ---------- badges ---------- */
  // c: { run, s (run state), tot, st, ratio, res (analysis), scen, meta }
  BW.BADGES = [
    { id: 'first', r: 0, name: 'Opening Bell', desc: 'Finish your first run.', t: function () { return true; } },
    { id: 'beat', r: 1, name: 'Ahead of the Flock', desc: 'Finish a run ahead of Dolly.', t: function (c) { return c.ratio > 1 && c.full; } },
    { id: 'beat15', r: 2, name: 'Bellwether', desc: 'Beat Dolly by 15% or more.', t: function (c) { return c.ratio >= 1.15 && c.full; } },
    { id: 'beat50', r: 3, name: 'Lapped the Herd', desc: 'Beat Dolly by 50% or more.', t: function (c) { return c.ratio >= 1.5 && c.full; } },
    { id: 'double', r: 4, name: 'Black Sheep', desc: 'Finish with twice what Dolly has.', t: function (c) { return c.ratio >= 2 && c.full; } },
    { id: 'tie', r: 1, name: 'Sheep in Step', desc: 'Finish within 2% of Dolly, either side.', t: function (c) { return Math.abs(c.ratio - 1) <= 0.02 && c.full; } },
    { id: 'm100k', r: 0, name: 'Six Figures', desc: 'Reach $100,000.', t: function (c) { return c.st.peakNW >= 1e7; } },
    { id: 'm1m', r: 1, name: 'Millionaire', desc: 'Reach $1,000,000.', t: function (c) { return c.st.peakNW >= 1e8; } },
    { id: 'm10m', r: 2, name: 'Eight Figures', desc: 'Reach $10,000,000.', t: function (c) { return c.st.peakNW >= 1e9; } },
    { id: 'm100m', r: 3, name: 'Private Jet Money', desc: 'Reach $100,000,000.', t: function (c) { return c.st.peakNW >= 1e10; } },
    { id: 'm1b', r: 4, name: 'Three Commas', desc: 'Reach $1,000,000,000.', t: function (c) { return c.st.peakNW >= 1e11; } },
    { id: 'diamond', r: 2, name: 'Diamond Hooves', desc: 'Hold your stocks through a 30% market crash without selling.', t: function (c) { return c.st.heldCrash === 1 && c.st.panicSells === 0; } },
    { id: 'dip', r: 1, name: 'Bargain Hunter', desc: 'Buy stocks five times while the market is down 20% or more.', t: function (c) { return c.st.dipBuys >= 5; } },
    { id: 'panic', r: 0, name: 'Spooked', desc: 'Sell stocks while the market is down 15% or more.', t: function (c) { return c.st.panicSells >= 1; } },
    { id: 'bag', r: 1, name: 'Bagholder', desc: 'Still own a company on the day it goes bankrupt.', t: function (c) { return c.st.bustHeld >= 1; } },
    { id: 'bought', r: 1, name: 'Bought Out', desc: 'Own a company when it gets taken over.', t: function (c) { return c.st.dealHeld >= 1; } },
    { id: 'tenbag', r: 3, name: 'Ten-Bagger', desc: 'Sell something for ten times what you paid.', t: function (c) { return c.st.bestPct >= 9; } },
    { id: 'twobag', r: 1, name: 'Double Up', desc: 'Sell something for twice what you paid.', t: function (c) { return c.st.bestPct >= 1; } },
    { id: 'ouch', r: 1, name: 'Ouch', desc: 'Sell something for less than half what you paid.', t: function (c) { return c.st.worstPct <= -0.5; } },
    { id: 'lazy', r: 1, name: 'Hands Off', desc: 'Finish a full run with five trades or fewer.', t: function (c) { return c.st.trades <= 5 && c.full && c.years >= 10; } },
    { id: 'busy', r: 1, name: 'Itchy Fingers', desc: 'Make 300 trades in one run.', t: function (c) { return c.st.trades >= 300; } },
    { id: 'taxman', r: 1, name: 'The Taxman Thanks You', desc: 'Pay $100,000 of tax in one run.', t: function (c) { return c.tot.tax >= 1e7; } },
    { id: 'debtfree', r: 0, name: 'Debt Free', desc: 'Pay off the student loan before it is due.', t: function (c) { return c.s.loan && c.s.loan.bal === 0 && c.years <= 9; } },
    { id: 'nocard', r: 0, name: 'Cushion', desc: 'Finish a full run without ever going into card debt.', t: function (c) { return c.st.cardMonths === 0 && c.full; } },
    { id: 'maxed', r: 1, name: 'Maxed Out', desc: 'Run up so much card debt that things were sold for you.', t: function (c) { return c.st.forced >= 1; } },
    { id: 'broke', r: 2, name: 'Rock Bottom', desc: 'Go bankrupt.', t: function (c) { return c.s.bankrupt; } },
    { id: 'landlord', r: 0, name: 'Landlord', desc: 'Buy your first property.', t: function (c) { return c.st.props >= 1; } },
    { id: 'mogul', r: 2, name: 'Property Mogul', desc: 'Own five properties at once.', t: function (c) { return c.maxProps >= 5 || c.s.props.length >= 5; } },
    { id: 'steal', r: 1, name: 'Stole It', desc: 'Buy a property for at least 7% under what it is worth.', t: function (c) { return c.st.propDeals >= 1; } },
    { id: 'flip', r: 1, name: 'Flipper', desc: 'Renovate a property and sell it for a profit within two years.', t: function (c) { return c.st.flips >= 1; } },
    { id: 'tower', r: 4, name: 'Skyline', desc: 'Own the biggest building on the market.', t: function (c) { return c.s.props.some(function (p) { return p.type === 'tower'; }) || c.st.tower; } },
    { id: 'boss', r: 0, name: 'Open for Business', desc: 'Buy your first business.', t: function (c) { return c.st.bizMax >= 1; } },
    { id: 'empire', r: 2, name: 'Empire', desc: 'Own six businesses at once.', t: function (c) { return c.st.bizMax >= 6; } },
    { id: 'rocket', r: 4, name: 'Liftoff', desc: 'Own the biggest business there is: the Rocket Yard, the Mass Driver or the Space Elevator.', t: function (c) { return c.s.biz.some(function (x) { return x.type === 'rocket' || x.type === 'l_rail' || x.type === 'm_lift'; }); } },
    { id: 'moonrun', r: 2, name: 'One Small Step', desc: 'Finish a run on the Moon.', t: function (c) { return c.run.tape.dest.id === 'moon' && c.full; } },
    { id: 'marsrun', r: 3, name: 'Red Dawn', desc: 'Finish a run on Mars.', t: function (c) { return c.run.tape.dest.id === 'mars' && c.full; } },
    { id: 'marsbeat', r: 4, name: 'Master of Two Worlds', desc: 'Beat Dolly on Mars.', t: function (c) { return c.run.tape.dest.id === 'mars' && c.full && c.ratio > 1; } },
    { id: 'coupon', r: 0, name: 'Coupon Clipper', desc: 'Collect $10,000 of dividends in one run.', t: function (c) { return c.tot.divs >= 1e6; } },
    { id: 'income', r: 2, name: 'Mailbox Money', desc: 'Collect $250,000 of dividends in one run.', t: function (c) { return c.tot.divs >= 2.5e7; } },
    { id: 'locked', r: 0, name: 'Locked In', desc: 'Open a term deposit.', t: function (c) { return c.st.cds >= 1; } },
    { id: 'house', r: 1, name: 'The House Always Wins', desc: 'Lose $1,000 in the casino in one run.', t: function (c) { return c.tot.casinoBet - c.tot.casinoWon >= 1e5; } },
    { id: 'lucky', r: 2, name: 'Beat the House', desc: 'Walk out of the casino $5,000 ahead in one run.', t: function (c) { return c.tot.casinoWon - c.tot.casinoBet >= 5e5; } },
    { id: 'coiner', r: 2, name: 'Fleeced', desc: 'Lose more than half of what you put into a coin.', t: function (c) { var p = c.s.pme.fleece; return p && p.paid > 1e5 && (p.got + c.run.posValue('fleece')) < 0.5 * p.paid; } },
    { id: 'marathon', r: 2, name: 'Gold Watch', desc: 'Finish a 40-year run.', t: function (c) { return c.years >= 40 && c.full; } },
    { id: 'daily7', r: 2, name: 'Regular', desc: 'Finish the Daily Tape on 7 different days.', t: function (c) { return (c.meta.stats.dailies || 0) >= 7; } },
    { id: 'hard', r: 3, name: 'Survivor', desc: 'Beat Dolly in The Lost Decade or Stagflation.', t: function (c) { return c.ratio > 1 && c.full && (c.scen.id === 'lost' || c.scen.id === 'stag'); } },
    { id: 'alltools', r: 2, name: 'Fully Equipped', desc: 'Unlock every tool.', t: function (c) { return BW.LEGACY.every(function (l) { return l.kind !== 'tool' || c.meta.unlocked[l.id]; }); } }
  ];
  BW.BADGE_BELLS = [2, 4, 8, 15, 30];
  BW.BADGE_TITLE = { beat: 'tt_shepherd', diamond: 'tt_contrarian', landlord: 'tt_landlord', empire: 'tt_tycoon', lazy: 'tt_saver', busy: 'tt_daytrader', double: 'tt_wolf', beat50: 'tt_oracle' };

  /* ---------- player profile ---------- */
  BW.newMeta = function () {
    var owned = {}; BW.COSMETICS.forEach(function (c) { if (c.free) owned[c.id] = 1; });
    return { v: 1, name: '', bells: 0, bellsEarned: 0, unlocked: {}, perkOff: {}, cos: { owned: owned, theme: 'th_floor', bell: 'bl_brass', candle: 'cd_classic', title: 'tt_rookie' },
      badges: {}, cards: {}, boxes: [], runs: [], best: {}, stats: { runs: 0, beats: 0, dailies: 0, years: 0 }, friends: {}, attempts: {}, daily: {}, seen: {},
      set: { sound: true, music: true, haptic: true, autoPause: true, pauseTrade: true, line: false } };
  };

  /* ---------- challenge codes ---------- */
  var B32 = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  function enc32(n, len) { var s = ''; for (var i = 0; i < len; i++) { s = B32[n % 32] + s; n = Math.floor(n / 32); } return s; }
  function dec32(s) { var n = 0; for (var i = 0; i < s.length; i++) { var k = B32.indexOf(s[i]); if (k < 0) return -1; n = n * 32 + k; } return n; }
  BW.makeCode = function (scenId, destId, seed) {
    var sc = BW.SCEN_BY[scenId];
    return 'BW' + BW.ENGINE_VERSION + sc.code + BW.DEST[destId || 'earth'].code + '-' + enc32((seed >>> 0) % 1073741824, 6);
  };
  BW.parseCode = function (code) {
    code = String(code || '').toUpperCase().replace(/[\u2010-\u2015\u2212]/g, '-'); // phones like to turn a hyphen into a long dash
    var m = /(?:^|[^A-Z0-9])BW(\d)([A-Z])([A-Z])[-\s]?([A-Z2-9]{6})(?![A-Z0-9])/.exec(code); // works on a bare code, a share link, or a whole pasted message
    if (!m) return { ok: false, why: 'That does not look like a challenge code. They look like BW1CE-K7QM2X.' };
    if (+m[1] !== BW.ENGINE_VERSION) return { ok: false, why: 'That code is from a different version of the game. Everyone needs to be on the same version.' };
    var scen = BW.SCENARIOS.filter(function (s) { return s.code === m[2]; })[0];
    var dest = Object.keys(BW.DEST).filter(function (d) { return BW.DEST[d].code === m[3]; })[0];
    var seed = dec32(m[4]);
    if (!scen || !dest || seed < 0) return { ok: false, why: 'That code is not valid.' };
    return { ok: true, scen: scen.id, dest: dest, seed: seed, code: 'BW' + m[1] + m[2] + m[3] + '-' + m[4] };
  };
  BW.dailySeed = function (dateStr) { return BW.mix('daily', dateStr) % 1073741824; };
  BW.todayStr = function (now) {
    // one shared calendar day for everyone: New York time
    try {
      var p = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now || new Date());
      if (/^\d{4}-\d{2}-\d{2}$/.test(p)) return p;
    } catch (e) { /* fall through */ }
    var d = new Date((now ? now.getTime() : Date.now()) - 5 * 3600 * 1000);
    return d.toISOString().slice(0, 10);
  };
  // result codes: enough to compare with friends, with a checksum that catches typos (not cheats)
  var B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  function utf8(str) { // text to bytes, so names with accents or emoji survive the trip
    var out = [], i, c;
    for (i = 0; i < str.length; i++) {
      c = str.charCodeAt(i);
      if (c >= 0xD800 && c < 0xDC00 && i + 1 < str.length) { var d2 = str.charCodeAt(i + 1); if (d2 >= 0xDC00 && d2 < 0xE000) { c = 0x10000 + ((c - 0xD800) << 10) + (d2 - 0xDC00); i++; } }
      if (c < 0x80) out.push(c);
      else if (c < 0x800) out.push(0xC0 | (c >> 6), 0x80 | (c & 63));
      else if (c < 0x10000) out.push(0xE0 | (c >> 12), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
      else out.push(0xF0 | (c >> 18), 0x80 | ((c >> 12) & 63), 0x80 | ((c >> 6) & 63), 0x80 | (c & 63));
    }
    return out;
  }
  function unutf8(b) {
    var out = '', i = 0, c;
    while (i < b.length) {
      c = b[i++];
      if (c >= 0xF0) c = ((c & 7) << 18) | ((b[i++] & 63) << 12) | ((b[i++] & 63) << 6) | (b[i++] & 63);
      else if (c >= 0xE0) c = ((c & 15) << 12) | ((b[i++] & 63) << 6) | (b[i++] & 63);
      else if (c >= 0xC0) c = ((c & 31) << 6) | (b[i++] & 63);
      if (!(c >= 0)) return null;
      if (c >= 0x10000) { c -= 0x10000; out += String.fromCharCode(0xD800 + (c >> 10), 0xDC00 + (c & 1023)); } else out += String.fromCharCode(c);
    }
    return out;
  }
  function b64e(str) { var out = '', i, bytes = utf8(str);
    for (i = 0; i < bytes.length; i += 3) { var b0 = bytes[i], b1 = bytes[i + 1], b2 = bytes[i + 2];
      out += B64[b0 >> 2] + B64[((b0 & 3) << 4) | ((b1 || 0) >> 4)] + (b1 === undefined ? '' : B64[((b1 & 15) << 2) | ((b2 || 0) >> 6)]) + (b2 === undefined ? '' : B64[b2 & 63]); }
    return out; }
  function b64d(str) { var bytes = [], i, n = 0, bits = 0;
    for (i = 0; i < str.length; i++) { var k = B64.indexOf(str[i]); if (k < 0) return null; n = ((n << 6) | k) & 0xFFFF; bits += 6; if (bits >= 8) { bits -= 8; bytes.push((n >> bits) & 255); } }
    return unutf8(bytes); }
  BW.cleanName = function (name) { // what a name is allowed to be: up to 12 visible characters, no separators, no stray spaces
    var chars = Array.from ? Array.from(String(name == null ? '' : name)) : String(name == null ? '' : name).split('');
    return chars.filter(function (ch) { return ch !== '|' && ch >= ' '; }).slice(0, 12).join('').replace(/\s+/g, ' ').trim();
  };
  BW.makeResult = function (r) { // r: { code, name, score, dolly, attempt, bankrupt }
    var body = [r.code, BW.cleanName(r.name) || 'Anon', Math.round(r.score / 100), Math.round(r.dolly / 100), r.attempt || 1, r.bankrupt ? 1 : 0].join('|');
    return 'R.' + b64e(body + '|' + (BW.mix('result', body) % 46656).toString(36));
  };
  BW.parseResult = function (str) {
    str = String(str || '').trim();
    var m = /R\.([A-Za-z0-9_-]+)/.exec(str);
    if (!m) return { ok: false, why: 'That does not look like a result code.' };
    var body = b64d(m[1]); if (!body) return { ok: false, why: 'That result code is damaged.' };
    var p = body.split('|');
    if (p.length !== 7) return { ok: false, why: 'That result code is damaged.' };
    var chk = p.pop();
    if ((BW.mix('result', p.join('|')) % 46656).toString(36) !== chk) return { ok: false, why: 'That result code has a typo in it.' };
    // A correct checksum only proves there is no typo. The contents still have to be sane before they go on a scoreboard.
    var pc = BW.parseCode(p[0]), sc = +p[2], dl = +p[3], at = +p[4];
    var whole = function (x, lo, hi) { return typeof x === 'number' && isFinite(x) && Math.round(x) === x && x >= lo && x <= hi; };
    if (!pc.ok || pc.code !== p[0] || !/^-?\d+$/.test(p[2]) || !/^-?\d+$/.test(p[3]) || !whole(sc, -1e12, 1e13) || !whole(dl, -1e12, 1e13) || !whole(at, 1, 9999)) return { ok: false, why: 'That result code is not valid.' };
    return { ok: true, code: p[0], name: BW.cleanName(p[1]) || 'Anon', score: sc * 100, dolly: dl * 100, attempt: at, bankrupt: p[5] === '1' };
  };

  /* ---------- the review ---------- */
  var CAT_LABEL = BW.CAT_LABEL = { stocks: 'Stocks you picked', herd: 'The index fund', sector: 'Sector funds', bonds: 'Bonds', cmdty: 'Commodities', crypto: 'The coin', cds: 'Term deposits', realestate: 'Real estate', business: 'Businesses', casino: 'Casino' };
  BW.analyze = function (run, dolly, scen) {
    var s = run.s, tape = run.tape, M = tape.M, d = s.d, trNow = M.bench[d];
    var score = run.liq(), dScore = dolly.liq();
    var years = (d - s.day0) / 240;
    // How far ahead or behind, as a multiple of Dolly. Early in a run both of you can be near or below zero (the student loan),
    // where a ratio means nothing, so the gap is then measured against the money you both started with instead.
    var floor = 500000; // $5,000: what a standard run starts with
    var ratio = dScore >= floor ? Math.max(0, score) / dScore : Math.max(0, 1 + (score - dScore) / floor);
    var res = { score: score, dolly: dScore, nw: run.nw(), dollyNW: dolly.nw(), ratio: ratio, years: years, bankrupt: s.bankrupt, early: !!s.early };
    // public-market-equivalent: for every dollar that went into a thing, what would that dollar have become in the index on the same days?
    var cats = {}, items = [];
    for (var key in s.pme) {
      var p = s.pme[key], val = 0, name = key, tk = null;
      if (tape.assets[key]) { val = run.posValue(key); name = tape.assets[key].name; tk = tape.assets[key].tkr; }
      else if (key === 'cd') { val = run.cdTotal(); name = 'Term deposits'; }
      else if (key === 'casino') { name = 'Casino'; }
      else if (key.indexOf('prop:') === 0) { var pr = run._prop(key.slice(5)); if (pr) { val = run.propValue(pr) - (pr.loan ? pr.loan.bal : 0); name = pr.addr; } else { var L = run.listing(key.slice(5)); name = L ? L.addr : 'Property'; } }
      else if (key.indexOf('biz:') === 0) { var bx = run._biz(key.slice(4)); if (bx) val = run.bizValue(bx); name = BW.BIZ_BY[key.slice(4)].name; }
      var alpha = val - p.u * trNow; // dollars ahead of (or behind) the same money left in the index fund, in today's money
      var profit = val + p.got - p.paid;
      var c = cats[p.cat] || (cats[p.cat] = { cat: p.cat, label: CAT_LABEL[p.cat], alpha: 0, profit: 0, paid: 0, val: 0 });
      c.alpha += alpha; c.profit += profit; c.paid += p.paid; c.val += val;
      if (p.cat !== 'herd') items.push({ key: key, name: name, tkr: tk, cat: p.cat, alpha: alpha, profit: profit, paid: p.paid, val: val });
    }
    res.cats = Object.keys(cats).map(function (k) { return cats[k]; }).sort(function (a, b) { return Math.abs(b.alpha) - Math.abs(a.alpha); });
    items.sort(function (a, b) { return b.alpha - a.alpha; });
    res.best = items.filter(function (x) { return x.alpha > 0; }).slice(0, 3);
    res.worst = items.filter(function (x) { return x.alpha < 0; }).slice(-3).reverse();
    var explained = 0; res.cats.forEach(function (c) { explained += c.alpha; });
    // The score is walk-away value, so that is the gap that gets explained. It splits three ways: what each kind of
    // holding did against the index, what selling up would cost each of you, and everything else (mostly idle cash).
    res.gap = score - dScore;
    res.explained = explained;
    res.exit = (score - res.nw) - (dScore - res.dollyNW); // tax and selling costs still to pay, yours less Dolly's
    res.idle = res.gap - explained - res.exit; // cash on the sidelines, debt paid early, timing, everything else
    res.costs = { fees: s.tot.fees, tax: s.tot.tax, cardInt: s.tot.cardInt, dollyTax: dolly.s.tot.tax, dollyFees: dolly.s.tot.fees };
    var cw = s.hist.cashW, sum = 0; for (var i = 0; i < cw.length; i++) sum += cw[i];
    res.avgCash = cw.length ? sum / cw.length : 0;
    res.idxCagr = Math.pow(M.tr[d] / M.tr[s.day0], 1 / Math.max(0.5, years)) - 1;
    res.trades = s.st.trades;
    // what happened after you sold
    var regret = 0, relief = 0, ns = 0;
    s.st.sellLog.forEach(function (x) { var a = tape.assets[x[1]]; if (!a) return; var e = a.end >= 0 && a.end <= d ? a.end : d; var later = (a.end >= 0 && a.end <= d ? a.endPx : a.pc[e]); if (!x[3]) return; var ch = later / x[3] - 1; ns++; if (ch > 0.25) regret++; else if (ch < -0.1) relief++; });
    res.sells = { n: ns, regret: regret, relief: relief };

    // plain-English lessons, most important first
    var L2 = [], f = BW.fmtMoney, pct = function (x) { return Math.round(x * 100) + '%'; };
    var stock = cats.stocks, herdShare = cats.herd ? cats.herd.paid : 0;
    if (s.bankrupt) L2.push({ k: 'bad', h: 'You went bankrupt', b: 'Debts grew faster than you could pay them. Borrowed money makes good outcomes better and bad outcomes fatal. A cash cushion is what stops one bad month becoming a spiral.' });
    if (res.ratio >= 1.02) L2.push({ k: 'good', h: 'You beat the index', b: 'You finished ' + pct(res.ratio - 1) + ' ahead of Dolly. Most professionals fail to do that over ' + Math.round(years) + ' years. Whether it was skill or luck takes more than one run to tell, so try the same approach on a new market.' });
    else if (res.ratio >= 0.98) L2.push({ k: 'ok', h: 'You matched the index', b: 'A tie with Dolly is a good result. She did nothing but buy the whole market every month, and that beats most people who try harder.' });
    else L2.push({ k: 'bad', h: 'The index won', b: 'Dolly finished ' + pct(1 / Math.max(res.ratio, 0.01) - 1) + ' ahead of you by buying the ' + tape.dest.indexName + ' fund every month and never selling. This is the normal result, for amateurs and professionals alike.' });
    if (res.avgCash > 0.25 && res.idle < 0) L2.push({ k: 'bad', h: 'Too much sat in cash', b: 'On average ' + pct(res.avgCash) + ' of your money was in cash. The market returned about ' + (res.idxCagr * 100).toFixed(1) + '% a year over this run. Cash earned far less, and waiting for the perfect moment cost you roughly ' + f(res.gap < 0 ? Math.min(-res.idle, -res.gap) : -res.idle, { auto: true }) + '.' });
    if (stock && stock.alpha < -0.03 * Math.max(res.nw, 1)) L2.push({ k: 'bad', h: 'Your stock picks trailed the market', b: 'The money you put into individual companies would be worth ' + f(-stock.alpha, { auto: true }) + ' more in the index fund. Most single stocks lose to the index, because a few big winners drive most of its gains and they are hard to pick in advance.' });
    if (stock && stock.alpha > 0.03 * Math.max(res.nw, 1)) L2.push({ k: 'good', h: 'Your stock picks beat the market', b: 'Your individual companies are worth ' + f(stock.alpha, { auto: true }) + ' more than the same money in the index fund.' });
    var gainTax = s.tot.taxGain || 0;
    if (gainTax > 0.02 * Math.max(res.nw, 1) && gainTax > 2.5 * (dolly.s.tot.taxGain || 0)) L2.push({ k: 'bad', h: 'Selling ran up a tax bill', b: 'You paid ' + f(gainTax, { auto: true }) + ' in tax on profits you took along the way. Dolly never sold, so that money stayed invested for her. Every time you sell at a profit, part of it leaves for good and stops compounding. Selling within a year is taxed at 22% instead of 15%.' });
    if (s.st.panicSells > 0 && res.sells.regret > 0) L2.push({ k: 'bad', h: 'You sold when it was scary', b: 'You sold stocks ' + s.st.panicSells + ' time' + (s.st.panicSells > 1 ? 's' : '') + ' while the market was down more than 15%. ' + res.sells.regret + ' of your sales were later up more than 25% from where you let go. Selling low locks the loss in.' });
    if (s.st.chase >= 3) L2.push({ k: 'bad', h: 'You chased what was already hot', b: s.st.chase + ' times you bought a stock right after it had jumped more than 18% in a month. By then the good news is usually in the price.' });
    if (s.st.maxW > 0.4) L2.push({ k: 'ok', h: 'A lot rode on one company', b: 'At one point a single stock was ' + pct(s.st.maxW) + ' of everything you had. That can make you rich or wipe you out. The index spreads the same bet across ' + tape.dest.companies.length + ' companies.' });
    if (s.tot.cardInt > 50000) L2.push({ k: 'bad', h: 'Card interest ate into you', b: 'You paid ' + f(s.tot.cardInt, { auto: true }) + ' in credit card interest at 24% a year. No investment reliably earns 24%, so card debt is always the first thing to clear.' });
    if (cats.realestate && Math.abs(cats.realestate.alpha) > 0.03 * Math.max(res.nw, 1)) L2.push({ k: cats.realestate.alpha > 0 ? 'good' : 'bad', h: cats.realestate.alpha > 0 ? 'Property pulled ahead' : 'Property held you back', b: 'Your real estate ended ' + f(Math.abs(cats.realestate.alpha), { auto: true }) + (cats.realestate.alpha > 0 ? ' ahead of' : ' behind') + ' the same money in the index. A mortgage multiplies whatever the property does, in both directions.' });
    if (cats.business && Math.abs(cats.business.alpha) > 0.03 * Math.max(res.nw, 1)) L2.push({ k: cats.business.alpha > 0 ? 'good' : 'bad', h: cats.business.alpha > 0 ? 'Your businesses earned their keep' : 'Your businesses lagged', b: 'They ended ' + f(Math.abs(cats.business.alpha), { auto: true }) + (cats.business.alpha > 0 ? ' ahead of' : ' behind') + ' the index. A small business can out-earn the market, but all of it rides on one location and one economy.' });
    if (cats.casino && s.tot.casinoBet > 0) L2.push({ k: 'bad', h: 'The casino took its cut', b: 'You bet ' + f(s.tot.casinoBet, { auto: true }) + ' in total. The odds said you would lose about ' + f(Math.round(s.tot.casinoEV), { auto: true }) + '. You actually ' + (s.tot.casinoWon >= s.tot.casinoBet ? 'won ' : 'lost ') + f(Math.abs(s.tot.casinoWon - s.tot.casinoBet), { auto: true }) + '. Play long enough and the two numbers meet.' });
    if (cats.crypto && cats.crypto.alpha < -0.02 * Math.max(res.nw, 1)) L2.push({ k: 'bad', h: tape.dest.crypto.name + ' fleeced you', b: 'It ended ' + f(-cats.crypto.alpha, { auto: true }) + ' behind the index. With nothing underneath the price, you were betting on other buyers showing up.' });
    if (res.trades <= 5 && res.ratio > 0.95 && years >= 5) L2.push({ k: 'good', h: 'You barely touched it', b: (res.trades === 0 ? 'No trades' : res.trades === 1 ? 'Only 1 trade' : 'Only ' + res.trades + ' trades') + ' all run. Doing little is underrated: no fees, almost no tax, and nothing to panic about.' });
    res.lessons = L2.slice(0, 5);
    return res;
  };

  // Bells earned for a finished run
  BW.bellsFor = function (res, scen, played, dest) {
    if (played < 1) return 0;
    var perf = res.bankrupt ? 0.3 : Math.pow(clamp(res.ratio, 0.4, 2.5), 1.5);
    return Math.max(1, Math.round(played * 1.2 * (scen.mult || 1) * ((dest && dest.mult) || 1) * perf));
  };

  // Collector cards: one per company, three finishes
  BW.cardsFor = function (run) {
    var s = run.s, out = {}, tape = run.tape;
    for (var id in s.ps) {
      var a = tape.assets[id]; if (!a || a.kind !== 'stock') continue;
      var ps = s.ps[id], val = run.posValue(id), tier = 0;
      if (ps.days >= 240) tier = 1;
      if (ps.paid >= 50000 && ps.got + val >= 1.5 * ps.paid) tier = 2;
      if (ps.paid >= 50000 && ps.got + val >= 3 * ps.paid) tier = 3;
      if (tier) out[id] = tier;
    }
    return out;
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
