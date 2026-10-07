/* Mars: the Olympus Exchange and the fifteen companies of the Olympus 15.
 * The wildest market in the game: enormous growth, enormous debts, and companies whose
 * whole value rests on projects that will take a century.
 *   oil -> deuterium (fuel)            gold -> iridium (the hoard metal)
 *   copper -> iron ore (construction)  wheat -> potatoes (harvests fail at random)
 */
(function (root) {
  'use strict';
  var BW = root.BW;
  function C(id, tkr, name, sector, arche, desc, p) { p.id = id; p.tkr = tkr; p.name = name; p.sector = sector; p.arche = arche; p.desc = desc; p.ex = p.ex || {}; return p; }

  var sectors = [
    { id: 'mterra', like: 'tech', name: 'Terraforming', gLong: 0.045, hue: 140,
      moves: 'Companies paid to turn a dead planet into a living one. Priced almost entirely on promises about decades from now, so belief moves them more than results do.' },
    { id: 'magri', like: 'staples', name: 'Farms & Water', gLong: 0.032, hue: 95,
      moves: 'Food and water. Everyone eats in every economy, so sales are steady and growth is slow. Held for the dividends.' },
    { id: 'mrobo', like: 'tech', name: 'Robotics', gLong: 0.045, hue: 215,
      moves: 'Machines that do the work humans cannot survive doing. Fast growth when colonies are expanding. Rising interest rates hurt more than most, because the profits are far in the future.' },
    { id: 'mpower', like: 'util', name: 'Power', gLong: 0.03, hue: 28,
      moves: 'Fusion, solar and the fuel for both. Steady customers, heavy debt, and at the mercy of dust storms and the deuterium price.' },
    { id: 'mtrade', like: 'bank', name: 'Trade & Finance', gLong: 0.035, hue: 165,
      moves: 'Ports, shipping and banks. They earn more when interest rates are high and trade is brisk, and lose badly in recessions.' }
  ];
  var companies = [
    C('ghef', 'GHEF', 'Greenhouse Effect Inc', 'mterra', 'spec', 'Holds the contract to thicken the Martian air until people can walk outside. The job will take two hundred years. The shares are priced as if it will work.',
      { rev: 3200, om: 0.02, omMature: 0.22, g: 0.3, cyc: 0.8, beta: 1.6, dx: 1.0, pay: 0, ci: 0.6, sr: 0.16, sm: 0.035, risk: 0.018 }),
    C('mgsh', 'MGSH', 'Magnetar Shield', 'mterra', 'spec', 'Building a magnetic shield in orbit to stop the sun stripping the new air away. One machine, one customer, and very large loans.',
      { rev: 1800, om: 0.08, omMature: 0.24, g: 0.22, cyc: 0.5, beta: 1.5, dx: 3.2, pay: 0, ci: 1.2, sr: 0.14, sm: 0.04, risk: 0.022, trials: true, trial: { due: 'shield test', what: 'The next section of the shield is about to be switched on.', win: 'shield section powers up cleanly', fail: 'shield section fails on power-up', winB: 'Another milestone payment is released, and the doubters go quiet for a while.', failB: 'A year of work to redo, and the milestone payment is withheld.' } }),
    C('lchm', 'MSLC', 'Moss & Lichen Co', 'mterra', 'growth', 'Breeds plants tough enough to live on Mars and sells them by the hectare. Already profitable, which makes it the sensible one in this sector.',
      { rev: 4200, om: 0.2, g: 0.18, cyc: 0.6, beta: 1.2, dx: 0.6, pay: 0.06, ci: 0.5, sr: 0.09, sm: 0.022, risk: 0.004 }),
    C('rdsf', 'RDSF', 'Red Soil Farms', 'magri', 'income', 'Greenhouses the size of towns. Feeds half the planet and pays you to wait.',
      { rev: 16000, om: 0.16, g: 0.035, cyc: 0.12, beta: 0.6, dx: 2.2, pay: 0.58, ci: 0.6, sr: 0.03, sm: 0.008, risk: -0.006, ex: { wheat: 0.04 } }),
    C('plww', 'PLWW', 'Polar Water Works', 'magri', 'income', 'Melts the ice cap and pipes it south. The dullest business on Mars, which is exactly the appeal.',
      { rev: 5200, om: 0.3, g: 0.035, cyc: 0.03, beta: 0.45, dx: 5.0, pay: 0.62, ci: 2.6, sr: 0.015, sm: 0.006, risk: -0.012, ex: { rate: -0.004 } }),
    C('ptrp', 'PTRP', 'Potato Republic', 'magri', 'steady', 'Chips, mash, vodka. If it is made of potato and sold on Mars, it is probably theirs.',
      { rev: 11000, om: 0.21, g: 0.05, cyc: 0.2, beta: 0.7, dx: 1.6, pay: 0.5, ci: 0.4, sr: 0.035, sm: 0.01, risk: -0.006, ex: { wheat: -0.05 } }),
    C('tksw', 'TKSW', 'Tinker Swarm', 'mrobo', 'growth', 'Thousands of small robots that build a dome while you sleep. Orders arrive in floods and droughts.',
      { rev: 6200, om: 0.22, g: 0.22, cyc: 1.5, beta: 1.45, dx: 0.4, pay: 0.04, ci: 0.45, sr: 0.14, sm: 0.03, risk: 0.006 }),
    C('cxfd', 'CXFD', 'Cortex Foundry', 'mrobo', 'steady', 'Makes the brains every Martian robot runs on. Customers pay a licence every month and cannot switch.',
      { rev: 9800, om: 0.3, g: 0.1, cyc: 0.6, beta: 1.0, dx: 0.2, pay: 0.2, ci: 0.25, sr: 0.05, sm: 0.012, risk: -0.004 }),
    C('mlrb', 'MLRB', 'Mule Robotics', 'mrobo', 'cyclical', 'Hauling robots for mines and farms. When the planet is building, order books are full. When it stops, so do they.',
      { rev: 12000, om: 0.13, g: 0.06, cyc: 1.9, beta: 1.3, dx: 2.0, pay: 0.28, ci: 0.6, sr: 0.07, sm: 0.02, risk: 0.006, ex: { copper: -0.02 } }),
    C('olfs', 'OLFS', 'Olympus Fusion', 'mpower', 'spec', 'Three fusion plants running and a fourth, far larger, that has not yet switched on. Each test firing can double the company or halve it.',
      { rev: 2800, om: 0.1, omMature: 0.26, g: 0.2, cyc: 0.4, beta: 1.4, dx: 3.6, pay: 0, ci: 1.4, sr: 0.12, sm: 0.035, risk: 0.02, trials: true, ex: { oil: -0.04 }, trial: { due: 'reactor test', what: 'Its giant fourth reactor is scheduled for a test firing.', win: 'reactor fires and holds', fail: 'reactor test ends in a shutdown', winB: 'The plant moves a step closer to selling power, and years of new sales.', failB: 'Months of repairs, and the power it was meant to sell will not arrive on time.' } }),
    C('dbsl', 'DBSL', 'Dustbelt Solar', 'mpower', 'cyclical', 'Solar farms across the equator. Cheap power, until a dust storm buries the panels for a month.',
      { rev: 7400, om: 0.18, g: 0.05, cyc: 0.7, beta: 1.1, dx: 4.6, pay: 0.3, ci: 1.5, sr: 0.09, sm: 0.03, risk: 0.012, ex: { rate: -0.006 } }),
    C('dtwl', 'DTWL', 'Deuterium Wells', 'mpower', 'income', 'Pulls fusion fuel out of Martian groundwater. Old, enormous, and pays a dividend it hates to cut.',
      { rev: 28000, om: 0.13, g: 0.025, cyc: 0.7, beta: 0.9, dx: 1.6, pay: 0.55, ci: 0.9, sr: 0.05, sm: 0.012, risk: 0.002, ex: { oil: 0.1 } }),
    C('phpa', 'PHPA', 'Phobos Port', 'mtrade', 'steady', 'Owns the only deep-space dock in Mars orbit. Every ship pays to tie up. Nobody can build a second moon.',
      { rev: 9000, om: 0.38, g: 0.05, cyc: 0.9, beta: 0.95, dx: 2.3, pay: 0.42, ci: 1.1, sr: 0.035, sm: 0.012, risk: -0.002 }),
    C('rlsh', 'RLSH', 'Red Line Shipping', 'mtrade', 'cyclical', 'Freighters on the long haul to Earth. A round trip takes two years, so it orders ships in booms and takes delivery in busts.',
      { rev: 8200, om: 0.15, g: 0.05, cyc: 1.8, beta: 1.4, dx: 3.8, pay: 0.2, ci: 1.3, sr: 0.09, sm: 0.028, risk: 0.012, ex: { oil: -0.06 } }),
    C('bkol', 'BKOL', 'Bank of Olympus', 'mtrade', 'income', 'The bank in every dome. Takes deposits, lends for habs and harvests, and lives on the gap between the two rates.',
      { rev: 22000, om: 0.3, g: 0.04, cyc: 1.3, beta: 1.15, dx: 2.4, pay: 0.4, ci: 0.5, sr: 0.04, sm: 0.02, risk: 0.006, ex: { rate: 0.012 }, bank: true })
  ];
  var pool = [
    C('vlrl', 'VLRL', 'Valles Rail', 'mtrade', 'steady', 'A railway along the floor of the great canyon. Slow, cheap and the only one.', { rev: 2400, om: 0.34, g: 0.05, cyc: 0.9, beta: 0.9, dx: 2.4, pay: 0.4, ci: 1.2, sr: 0.035, sm: 0.012, risk: -0.002 }),
    C('dmdr', 'DMDR', 'Dome Dairy', 'magri', 'growth', 'Milk from cows that have never seen a sky. Expanding dome by dome.', { rev: 1200, om: 0.1, g: 0.22, cyc: 0.2, beta: 0.9, dx: 1.4, pay: 0, ci: 0.6, sr: 0.08, sm: 0.02, risk: 0.008, ex: { wheat: -0.03 } }),
    C('arbt', 'RBLM', 'Rustbloom Biotech', 'mterra', 'spec', 'Engineers microbes that eat rust and breathe out oxygen. No sales to speak of. Everything rides on the field trials.', { rev: 300, om: 0.02, omMature: 0.28, g: 0.35, cyc: 0.1, beta: 1.5, dx: 2.0, pay: 0, ci: 0.7, sr: 0.18, sm: 0.05, risk: 0.026, trials: true, trial: { due: 'field trial results', what: 'Its rust-eating microbes are being tested in open ground.', win: 'microbes thrive in open ground', fail: 'microbes die off in the field', winB: 'Orders from the terraforming contractors should follow.', failB: 'Back to the lab. The sales investors were counting on will not arrive.' } }),
    C('cnym', 'CNYM', 'Canyon Pictures', 'mtrade', 'cyclical', 'Makes films on Mars for audiences on Earth. One hit pays for five flops.', { rev: 1800, om: 0.14, g: 0.08, cyc: 0.8, beta: 1.2, dx: 2.4, pay: 0.1, ci: 0.7, sr: 0.14, sm: 0.035, risk: 0.008, hits: true }),
    C('brbr', 'BHBR', 'Borehole Brothers', 'mpower', 'cyclical', 'Drills for anyone who pays: water, fuel, heat. Heavy debt and a swingy order book.', { rev: 1600, om: 0.15, g: 0.06, cyc: 1.2, beta: 1.4, dx: 3.8, pay: 0.1, ci: 1.2, sr: 0.11, sm: 0.03, risk: 0.016, ex: { oil: 0.16 } })
  ];
  var secEvents = {
    mterra: [['Earth doubles its terraforming grant', 'Decades of funding are now guaranteed.', 4, 0.03, 0.08], ['Scientists cut their estimate of how fast the air is thickening', 'The timetable just got longer.', -2, -0.04, -0.09], ['Colonists vote on whether to keep paying for terraforming', 'The outcome is uncertain and the sums are large.', -1, -0.03, -0.05]],
    magri: [['Record harvest across the greenhouse belt', 'More food, sold a little cheaper.', 2, -0.02, 0.01], ['Council lifts the cap on water prices', 'Water firms may charge more.', 1, 0.05, 0.03], ['Seed blight raises growing costs', 'Farms are paying more for clean stock.', 0, -0.05, -0.02]],
    mrobo: [['Colonies race to automate', 'Robot orders are up sharply this year.', 4, 0.02, 0.04], ['Processor shortage stalls robot production', 'Deliveries slip into next year.', -3, -0.03, -0.03], ['Council drafts rules on autonomous machines', 'Compliance will cost money.', -1, -0.04, -0.05]],
    mpower: [['Planet-wide dust storm', 'Solar output is down by half and repair crews cannot fly.', -1, -0.07, -0.05], ['Council approves higher power bills', 'Generators may charge more to fund new plants.', 1.5, 0.05, 0.03], ['Mild season leaves fuel stockpiles full', 'Less power was needed than planned.', -2, -0.03, -0.02]],
    mtrade: [['Earth and Mars sign a trade pact', 'Tariffs fall on almost everything that flies between them.', 4, 0.03, 0.05], ['Bad loans tick up across the colonies', 'More borrowers are falling behind.', -1, -0.07, -0.05], ['Planets move apart: the long shipping season begins', 'For the next year every cargo run takes longer and costs more.', -3, -0.04, -0.03]]
  };
  var shocks = [['suit', 'A crack in your helmet visor', 900, 2600], ['medical', 'Low-gravity bone treatment your insurance only partly covers', 1200, 5200], ['pet', 'The dog chewed through an air hose', 600, 2400],
    ['tablet', 'Dust got into your tablet the week of a deadline', 700, 1600], ['family', 'Family on Earth needs help with rent', 800, 3000], ['dental', 'A cracked tooth and a crown', 600, 1900],
    ['heater', 'The burrow heater failed in midwinter', 1000, 3800], ['move', 'Your dome is being resealed and you have to move', 1500, 3600], ['fine', 'A fine for driving the rover on the farm belt', 300, 900], ['call', 'A very long video call to Earth, billed by the minute', 400, 1400]];
  var windfalls = [['bonus', 'A surprise bonus at work', 800, 4200], ['refund', 'A tax refund you were not expecting', 400, 1800], ['gift', 'A relative on Earth left you some money', 2000, 9000], ['sold', 'You sold a fossil-shaped rock to a tourist', 300, 1500]];
  var propTypes = [
    { id: 'condo', name: 'Bunk cell', v: [70, 125], y: [0.105, 0.13], n: 1.2, units: 1 }, { id: 'house', name: 'Family burrow', v: [140, 240], y: [0.088, 0.108], n: 1.5, units: 1 },
    { id: 'duplex', name: 'Twin burrow', v: [230, 360], y: [0.1, 0.125], n: 1.0, units: 2 }, { id: 'fourplex', name: 'Four-burrow row', v: [420, 680], y: [0.105, 0.13], n: 0.7, units: 4 },
    { id: 'apts', name: 'Canyon terraces', v: [1300, 3800], y: [0.105, 0.125], n: 0.5, units: 18 }, { id: 'retail', name: 'Market dome', v: [900, 2600], y: [0.1, 0.125], n: 0.4, units: 6, com: true },
    { id: 'warehouse', name: 'Grain silo', v: [2200, 7000], y: [0.09, 0.115], n: 0.3, units: 1, com: true }, { id: 'tower', name: 'Olympus tower', v: [18000, 70000], y: [0.085, 0.11], n: 0.2, units: 40, com: true }
  ];
  var streets = ['Valles Row', 'Olympus Rise', 'Gale Crescent', 'Jezero Shore', 'Phobos View', 'Dust Lane', 'Rust Street', 'Tharsis Road', 'Canal Walk', 'Deimos Court',
    'Red Bank', 'Utopia Close', 'Sol Street', 'Perseverance Way', 'Crater Lane', 'Polar Approach', 'Greenhouse Row', 'Basalt Yard', 'Elysium Drive', 'Airlock Place'];
  var biz = [
    { id: 'm_cart', dest: 'mars', name: 'Canteen Cart', cost: 400, roc: 0.55, cyc: 0.3, vol: 0.25, desc: 'Cold drinks for hot miners, sold from a cart you pull yourself.' },
    { id: 'm_sweep', dest: 'mars', name: 'Dust Sweeping Round', cost: 2500, roc: 0.4, cyc: 0.5, vol: 0.2, desc: 'Twenty solar roofs, one broom, every week.' },
    { id: 'm_air', dest: 'mars', name: 'Air Bottle Kiosks', cost: 8000, roc: 0.3, cyc: 0.4, vol: 0.15, desc: 'Refill stations by the airlocks. Nobody haggles over air.' },
    { id: 'm_taco', dest: 'mars', name: 'Rover Tacos', cost: 30000, roc: 0.24, cyc: 1.0, vol: 0.25, desc: 'A converted survey rover with a griddle. Follows the work crews.' },
    { id: 'm_cafe', dest: 'mars', name: 'Greenhouse Cafe', cost: 90000, roc: 0.2, cyc: 1.0, vol: 0.2, desc: 'Coffee among real plants, the only green most customers see all week.' },
    { id: 'm_wash', dest: 'mars', name: 'Rover Wash', cost: 250000, roc: 0.18, cyc: 0.8, vol: 0.15, desc: 'Red dust off, shine on. Dust storms are good for business.' },
    { id: 'm_climb', dest: 'mars', name: 'Canyon Climbing Gym', cost: 600000, roc: 0.17, cyc: 1.2, vol: 0.2, desc: 'A third of Earth gravity makes everyone a climber.' },
    { id: 'm_vodka', dest: 'mars', name: 'Potato Distillery', cost: 1500000, roc: 0.16, cyc: 1.0, vol: 0.22, desc: 'The planet runs on potatoes. Some of them deserve better.' },
    { id: 'm_shop', dest: 'mars', name: 'Robot Workshop', cost: 4000000, roc: 0.17, cyc: 1.2, vol: 0.35, desc: 'Forty engineers fixing other people\'s machines. Lumpy, lucrative contracts.' },
    { id: 'm_lodge', dest: 'mars', name: 'Crater Lodge', cost: 12000000, roc: 0.14, cyc: 1.8, vol: 0.2, desc: 'Two hundred rooms on the rim of the biggest volcano anywhere.' },
    { id: 'm_dome', dest: 'mars', name: 'Dome Factory', cost: 40000000, roc: 0.14, cyc: 1.6, vol: 0.2, desc: 'Prefabricated domes, shipped flat. Big orders, thin patience.' },
    { id: 'm_race', dest: 'mars', name: 'Dust Racing Team', cost: 150000000, roc: 0.11, cyc: 0.8, vol: 0.25, desc: 'A trophy asset. The profits are modest. The bragging rights are not.' },
    { id: 'm_lift', dest: 'mars', name: 'Space Elevator', cost: 600000000, roc: 0.14, cyc: 1.2, vol: 0.5, desc: 'A cable from the equator to orbit. When it works, it prints money.' }
  ];

  BW.DEST.mars = {
    id: 'mars', name: 'Mars', place: 'the Olympus Exchange', cur: '$', code: 'R', mult: 1.5, cost: 400, req: 'moon', maniaSector: 'mrobo',
    blurb: 'The wildest market there is. Huge growth, huge debts, and companies valued on projects that will take two hundred years.',
    indexName: 'Olympus 15', fundTkr: 'OLYM', fundName: 'Olympus 15 Index Fund', reserve: 'the Bank of Mars',
    sectors: sectors, companies: companies, pool: pool, secEvents: secEvents, shocks: shocks, windfalls: windfalls, propTypes: propTypes, streets: streets, biz: biz,
    commodities: [
      { id: 'gold', tkr: 'XIRD', name: 'Iridium', unit: 'gram', p0: 1600, desc: 'A rare metal from meteorites, and what Martians hoard. It pays you nothing. People buy it when they are scared, so it often rises when stocks fall.' },
      { id: 'oil', tkr: 'XDEU', name: 'Deuterium', unit: 'litre', p0: 72, desc: 'Fusion fuel. The planet runs on it. Its price climbs when the economy is hot or a well shuts, and it feeds straight into inflation.' },
      { id: 'copper', tkr: 'XIRN', name: 'Iron Ore', unit: 'tonne', p0: 28, desc: 'Mars is made of it, but digging and smelting cost money. Demand follows building. Traders watch it as an early read on the economy.' },
      { id: 'wheat', tkr: 'XPOT', name: 'Potatoes', unit: 'crate', p0: 6.2, desc: 'The staple crop. Moves on harvests more than on the economy. Mostly noise, with the odd blight.' }
    ],
    crypto: { id: 'fleece', tkr: 'DUST', name: 'Dustcoin', p0: 0.8, desc: 'A digital coin. Nothing backs it: no profits, no rent, no interest. Its price is whatever the next buyer will pay. That can be a lot more, or nothing.' },
    cmNews: {
      oilup: [['Deuterium spikes as wells run dry', 'Pipeline rupture cuts off fuel to the southern domes', 'Deuterium soars after export ban'], 'Fuel costs feed into almost every price. Expect inflation to rise, fuel producers to profit, and shippers and factories to pay more.'],
      oildown: [['Deuterium slumps as new wells come online', 'Glut sends fuel prices tumbling'], 'Cheap fuel is a tax cut for everyone except those who sell it. Good for inflation, bad for fuel producers.'],
      wheat: [['Blight sweeps the potato belt', 'Greenhouse breach wipes out a harvest'], 'Potato prices jump. Food costs more for a season or two.']
    },
    volMult: 1.45, growthAdd: 0.01, danger: 2.8
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
