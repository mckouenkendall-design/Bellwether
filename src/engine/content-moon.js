/* The Moon: the Tranquility Exchange and the fifteen companies of the Lunar 15.
 * A frontier economy: faster growth, wilder swings, and everything depends on water ice.
 * Under the hood the four commodities play the same roles as on Earth:
 *   oil -> water ice (the fuel everything runs on)     gold -> helium-3 (what people hoard when scared)
 *   copper -> titanium (follows construction)          wheat -> algae (harvests fail at random)
 */
(function (root) {
  'use strict';
  var BW = root.BW;
  function C(id, tkr, name, sector, arche, desc, p) { p.id = id; p.tkr = tkr; p.name = name; p.sector = sector; p.arche = arche; p.desc = desc; p.ex = p.ex || {}; return p; }

  var sectors = [
    { id: 'lmine', like: 'mater', name: 'Mining', gLong: 0.034, hue: 28,
      moves: 'Helium-3, titanium and ice dug out of the regolith. Profits follow what the stuff sells for, which swings far more than the cost of digging it up.' },
    { id: 'lsup', like: 'util', name: 'Life Support', gLong: 0.03, hue: 190,
      moves: 'Air, water and power. Nobody on the Moon can cancel their subscription, so sales are as steady as breathing. Heavy debt, big dividends, and prices that sag when interest rates rise.' },
    { id: 'lbuild', like: 'indust', name: 'Habitat', gLong: 0.04, hue: 50,
      moves: 'Domes, tunnels and the bricks to make them. Booms when settlers are arriving and credit is cheap, stops dead when either dries up.' },
    { id: 'ltrans', like: 'indust', name: 'Launch & Transport', gLong: 0.04, hue: 215,
      moves: 'Rockets, railguns and surface shuttles. Fuel is made from water ice, so when ice is dear, margins are thin. Traffic follows the economy.' },
    { id: 'lplay', like: 'retail', name: 'Tourism & Leisure', gLong: 0.045, hue: 300,
      moves: 'Visitors from Earth and fun for the locals. The first spending cut in a slump and the fastest to return.' }
  ];
  var companies = [
    C('slhe', 'SLHE', 'Selene Helium', 'lmine', 'income', 'Sieves helium-3 out of lunar soil and ships it to fusion plants on Earth. Old, enormous, and pays a dividend the whole colony counts on.',
      { rev: 30000, om: 0.2, g: 0.03, cyc: 0.6, beta: 0.85, dx: 1.6, pay: 0.5, ci: 1.0, sr: 0.05, sm: 0.015, risk: 0.002, ex: { gold: 0.28 } }),
    C('mrti', 'MRTI', 'Mare Titanium', 'lmine', 'cyclical', 'Strip-mines titanium from the dark lunar seas. Costs barely move, so every tick in the titanium price lands straight in profit.',
      { rev: 9000, om: 0.19, g: 0.04, cyc: 1.3, beta: 1.3, dx: 2.0, pay: 0.3, ci: 1.1, sr: 0.07, sm: 0.022, risk: 0.008, ex: { copper: 0.22 } }),
    C('dshi', 'DSHI', 'Deep Shadow Ice', 'lmine', 'spec', 'Drills for water ice in craters that have not seen sunlight in two billion years. Deep in debt. Rich when ice is scarce, in trouble when it is not.',
      { rev: 2400, om: 0.14, g: 0.05, cyc: 0.9, beta: 1.45, dx: 4.0, pay: 0.1, ci: 1.3, sr: 0.11, sm: 0.03, risk: 0.016, ex: { oil: 0.22 } }),
    C('brwl', 'BRWL', 'Breathewell', 'lsup', 'income', 'Makes the air. Every dome pays a monthly bill and none of them shop around. Dull, essential, generous with dividends.',
      { rev: 12000, om: 0.24, g: 0.035, cyc: 0.05, beta: 0.5, dx: 4.6, pay: 0.66, ci: 2.2, sr: 0.02, sm: 0.006, risk: -0.01, ex: { rate: -0.004 } }),
    C('aqlp', 'AQLP', 'Aquifer Loop', 'lsup', 'income', 'Recycles every drop of water in three cities. When ice gets expensive, recycled water gets valuable.',
      { rev: 4200, om: 0.28, g: 0.035, cyc: 0.03, beta: 0.5, dx: 4.8, pay: 0.6, ci: 2.4, sr: 0.02, sm: 0.007, risk: -0.01, ex: { oil: 0.03, rate: -0.004 } }),
    C('sngd', 'SNGD', 'Sunward Grid', 'lsup', 'growth', 'Builds solar fields on the crater rims where the sun never sets, with borrowed money. Cheap loans are its oxygen.',
      { rev: 2600, om: 0.2, g: 0.17, cyc: 0.3, beta: 1.2, dx: 4.4, pay: 0.12, ci: 1.6, sr: 0.07, sm: 0.02, risk: 0.008, ex: { rate: -0.006 } }),
    C('dmtx', 'DMTX', 'Dometrix', 'lbuild', 'cyclical', 'Builds pressurised domes to order. A full order book in boom years, cancellations by the dozen in a slump.',
      { rev: 14000, om: 0.13, g: 0.05, cyc: 1.9, beta: 1.35, dx: 2.2, pay: 0.28, ci: 0.7, sr: 0.08, sm: 0.02, risk: 0.006, ex: { copper: -0.02 } }),
    C('rgsn', 'RGSN', 'Regolith & Sons', 'lbuild', 'steady', 'Bakes moon dust into bricks. Every wall on the Moon is made of them and nobody else has the kilns.',
      { rev: 8000, om: 0.3, g: 0.05, cyc: 0.9, beta: 0.95, dx: 1.6, pay: 0.4, ci: 0.9, sr: 0.04, sm: 0.012, risk: -0.002, ex: { oil: -0.02 } }),
    C('brhm', 'BRHM', 'Burrow Homes', 'lbuild', 'spec', 'Digs family homes into lava tubes and sells them before they are finished. Builds with other people\'s money, lots of it.',
      { rev: 3600, om: 0.11, g: 0.12, cyc: 2.0, beta: 1.6, dx: 4.4, pay: 0.2, ci: 0.9, sr: 0.1, sm: 0.035, risk: 0.02 }),
    C('tyln', 'TYLN', 'Tycho Launch', 'ltrans', 'cyclical', 'Flies cargo and people to orbit and back. Burns a river of fuel made from ice, and books its flights years ahead.',
      { rev: 16000, om: 0.14, g: 0.06, cyc: 1.5, beta: 1.25, dx: 2.4, pay: 0.25, ci: 0.8, sr: 0.07, sm: 0.02, risk: 0.006, ex: { oil: -0.05 } }),
    C('rlgf', 'RLGF', 'Railgun Freight', 'ltrans', 'growth', 'Fires cargo into orbit from a twelve-mile electric rail. No fuel, tiny cost per tonne, and it is still building the second rail.',
      { rev: 3800, om: 0.2, g: 0.22, cyc: 1.1, beta: 1.45, dx: 1.2, pay: 0.03, ci: 0.6, sr: 0.12, sm: 0.03, risk: 0.006 }),
    C('hprl', 'HPRL', 'Hopper Lines', 'ltrans', 'steady', 'The shuttle between the domes. Every commuter on the Moon rides a Hopper twice a day.',
      { rev: 6200, om: 0.22, g: 0.045, cyc: 0.6, beta: 0.8, dx: 2.4, pay: 0.45, ci: 1.2, sr: 0.035, sm: 0.012, risk: -0.004, ex: { oil: -0.03 } }),
    C('sxgr', 'SXGR', 'Sixth Gee Resorts', 'lplay', 'cyclical', 'Hotels where guests weigh a sixth of what they do at home. Packed when Earth is flush, empty when it is not, and the loans do not care which.',
      { rev: 7400, om: 0.17, g: 0.06, cyc: 2.1, beta: 1.45, dx: 3.6, pay: 0.2, ci: 1.3, sr: 0.07, sm: 0.025, risk: 0.012 }),
    C('mblg', 'MBLG', 'Moonball League', 'lplay', 'cyclical', 'Owns the low-gravity sport half of Earth watches. One great season pays for three dull ones.',
      { rev: 5200, om: 0.16, g: 0.07, cyc: 0.8, beta: 1.15, dx: 2.2, pay: 0.15, ci: 0.6, sr: 0.13, sm: 0.035, risk: 0.008, hits: true }),
    C('ertt', 'ERTT', 'Earthrise Tours', 'lplay', 'growth', 'Sells the trip of a lifetime: a week on the Moon and a photo of home rising over the horizon. Growing as fast as it can find seats.',
      { rev: 2800, om: 0.1, omMature: 0.2, g: 0.28, cyc: 1.6, beta: 1.5, dx: 1.0, pay: 0, ci: 0.5, sr: 0.13, sm: 0.03, risk: 0.014 })
  ];
  var pool = [
    C('lvts', 'LVTS', 'Lava Tube Storage', 'lbuild', 'income', 'Rents out sealed caverns as warehouses. The rock does the work.', { rev: 1600, om: 0.38, g: 0.05, cyc: 0.5, beta: 0.7, dx: 4.6, pay: 0.6, ci: 2.2, sr: 0.03, sm: 0.01, risk: -0.004, ex: { rate: -0.004 } }),
    C('chmf', 'CHMF', 'Cheesemonger Foods', 'lplay', 'growth', 'Makes cheese on the Moon, mostly for the joke. Earth buys it by the tonne.', { rev: 900, om: 0.12, g: 0.26, cyc: 0.6, beta: 1.1, dx: 1.0, pay: 0, ci: 0.5, sr: 0.1, sm: 0.025, risk: 0.008, ex: { wheat: -0.04 } }),
    C('lnbl', 'LNBL', 'Luna Biolabs', 'lsup', 'spec', 'Grows medicines that only crystallise properly in low gravity. Each trial result can double it or halve it.', { rev: 500, om: 0.04, omMature: 0.26, g: 0.3, cyc: 0.1, beta: 1.4, dx: 1.8, pay: 0, ci: 0.7, sr: 0.16, sm: 0.045, risk: 0.024, trials: true }),
    C('fsrd', 'FSRD', 'Farside Radio', 'lplay', 'cyclical', 'Broadcasts from the quiet side of the Moon and lives on advertising, the first budget anyone cuts.', { rev: 1400, om: 0.2, g: 0.06, cyc: 1.7, beta: 1.25, dx: 2.8, pay: 0.25, ci: 0.5, sr: 0.08, sm: 0.025, risk: 0.012 }),
    C('crcp', 'CRCP', 'Crater Capital', 'lbuild', 'spec', 'Lends to settlers the big banks on Earth will not touch, at rates to match.', { rev: 1500, om: 0.32, g: 0.14, cyc: 2.0, beta: 1.6, dx: 4.2, pay: 0.2, ci: 0.7, sr: 0.1, sm: 0.04, risk: 0.02, bank: true })
  ];
  var secEvents = {
    lmine: [['Earth orders a new wave of fusion plants', 'Demand for lunar helium-3 is set to rise for years.', 4, 0.04, 0.05], ['Mining tax proposed by the colonial council', 'A share of every tonne dug would go to the public purse.', 0, -0.07, -0.05], ['Stockpiles of ore pile up at the docks', 'More is being dug than shipped.', -4, -0.04, -0.04]],
    lsup: [['Council approves higher air and water rates', 'Life support firms may charge more to fund new plants.', 1.5, 0.05, 0.03], ['Solar storm damages the grid', 'Record repair bills across the sector.', 0, -0.05, -0.03], ['Council freezes utility bills', 'Life support firms must absorb rising costs themselves.', -1, -0.06, -0.04]],
    lbuild: [['Ten thousand settlers approved for next year', 'Every one of them needs somewhere to live.', 5, 0.03, 0.06], ['Dome seal defect found in a popular design', 'Inspections and refits across the industry.', -2, -0.06, -0.05], ['Settler arrivals slow to a trickle', 'Fewer newcomers means fewer new homes.', -5, -0.03, -0.05]],
    ltrans: [['Earth cuts launch duties', 'Shipping to and from the Moon just got cheaper to buy.', 4, 0.03, 0.04], ['Debris scare closes two orbital lanes', 'Flights are rerouted for months.', -3, -0.05, -0.04], ['New spaceport opens ahead of schedule', 'More slots, more traffic.', 3, 0.02, 0.03]],
    lplay: [['Moon holidays become the thing to do', 'Bookings from Earth are at a record.', 5, 0.03, 0.05], ['Earth travellers stay home', 'Households on Earth are saving, not flying.', -5, -0.04, -0.05], ['Radiation scare empties the resorts', 'A solar flare warning kept visitors away for a season.', -3, -0.04, -0.03]]
  };
  var shocks = [['suit', 'Your pressure suit failed inspection', 900, 2600], ['medical', 'A decompression check your insurance only partly covers', 1200, 5200], ['pet', 'The cat got into the air filters', 600, 2400],
    ['tablet', 'Your tablet died the week of a deadline', 700, 1600], ['family', 'Family on Earth needs help with rent', 800, 3000], ['dental', 'A cracked tooth and a crown', 600, 1900],
    ['heater', 'The hab heater failed during lunar night', 1000, 3800], ['move', 'Your dome is being resealed and you have to move', 1500, 3600], ['fine', 'A fine for tracking dust through the airlock', 300, 900], ['wedding', 'Three weddings on Earth in one year', 1200, 3000]];
  var windfalls = [['bonus', 'A surprise bonus at work', 800, 4200], ['refund', 'A tax refund you were not expecting', 400, 1800], ['gift', 'A relative on Earth left you some money', 2000, 9000], ['sold', 'You sold a meteorite you found', 300, 1500]];
  var propTypes = [
    { id: 'condo', name: 'Sleeping pod', v: [70, 125], y: [0.105, 0.13], n: 1.2, units: 1 }, { id: 'house', name: 'Family hab', v: [140, 240], y: [0.088, 0.108], n: 1.5, units: 1 },
    { id: 'duplex', name: 'Twin hab', v: [230, 360], y: [0.1, 0.125], n: 1.0, units: 2 }, { id: 'fourplex', name: 'Four-hab cluster', v: [420, 680], y: [0.105, 0.13], n: 0.7, units: 4 },
    { id: 'apts', name: 'Habitat ring', v: [1300, 3800], y: [0.105, 0.125], n: 0.5, units: 18 }, { id: 'retail', name: 'Airlock arcade', v: [900, 2600], y: [0.1, 0.125], n: 0.4, units: 6, com: true },
    { id: 'warehouse', name: 'Cargo depot', v: [2200, 7000], y: [0.09, 0.115], n: 0.3, units: 1, com: true }, { id: 'tower', name: 'Dome spire', v: [18000, 70000], y: [0.085, 0.11], n: 0.2, units: 40, com: true }
  ];
  var streets = ['Tranquility Row', 'Copernicus Way', 'Tycho Rim', 'Shackleton Terrace', 'Mare Lane', 'Kepler Close', 'Apollo Walk', 'Earthrise View', 'Lava Tube Four', 'Serenity Court',
    'Crater Bank', 'Regolith Road', 'Armstrong Rise', 'Dust Lane', 'Terminator Street', 'Polaris Yard', 'Farside Approach', 'Airlock Row', 'Highland Drive', 'Peary Place'];
  var biz = [
    { id: 'l_rock', dest: 'moon', name: 'Moon Rock Stall', cost: 400, roc: 0.55, cyc: 0.3, vol: 0.25, desc: 'A folding table of polished rocks outside the arrivals lounge. Tourists cannot resist.' },
    { id: 'l_rover', dest: 'moon', name: 'Rover Rentals', cost: 2500, roc: 0.4, cyc: 0.6, vol: 0.2, desc: 'Three dented rovers and a hand-painted sign.' },
    { id: 'l_vend', dest: 'moon', name: 'Airlock Vending', cost: 8000, roc: 0.3, cyc: 0.4, vol: 0.15, desc: 'Snack lockers in the places people wait for a door to cycle.' },
    { id: 'l_noodle', dest: 'moon', name: 'Noodle Rover', cost: 30000, roc: 0.24, cyc: 1.0, vol: 0.25, desc: 'Hot noodles on wheels, parked wherever a shift is ending.' },
    { id: 'l_tramp', dest: 'moon', name: 'Trampoline Park', cost: 90000, roc: 0.2, cyc: 1.1, vol: 0.2, desc: 'A sixth of the gravity, six times the fun. Insurance is the main cost.' },
    { id: 'l_wash', dest: 'moon', name: 'Suit Wash', cost: 250000, roc: 0.18, cyc: 0.8, vol: 0.15, desc: 'Moon dust gets into everything. You get it out.' },
    { id: 'l_golf', dest: 'moon', name: 'Crater Golf', cost: 600000, roc: 0.17, cyc: 1.3, vol: 0.2, desc: 'Eighteen holes. Drives carry for a mile. Bring spare balls.' },
    { id: 'l_brew', dest: 'moon', name: 'Dome Brewery', cost: 1500000, roc: 0.16, cyc: 1.0, vol: 0.22, desc: 'Beer brewed with recycled water and no shame about it.' },
    { id: 'l_tailor', dest: 'moon', name: 'Suit Tailor', cost: 4000000, roc: 0.17, cyc: 1.2, vol: 0.35, desc: 'Made-to-measure pressure suits for people who can afford not to look like everyone else.' },
    { id: 'l_hotel', dest: 'moon', name: 'Rim Hotel', cost: 12000000, roc: 0.14, cyc: 1.8, vol: 0.2, desc: 'Two hundred rooms on a crater rim, every one with a view of Earth.' },
    { id: 'l_brick', dest: 'moon', name: 'Brickworks', cost: 40000000, roc: 0.14, cyc: 1.6, vol: 0.2, desc: 'Kilns that turn dust into the walls of the next city.' },
    { id: 'l_team', dest: 'moon', name: 'Moonball Team', cost: 150000000, roc: 0.11, cyc: 0.8, vol: 0.25, desc: 'A trophy asset in the most-watched league there is.' },
    { id: 'l_rail', dest: 'moon', name: 'Mass Driver', cost: 600000000, roc: 0.14, cyc: 1.2, vol: 0.5, desc: 'Your own electric rail to orbit. Most launches work.' }
  ];

  BW.DEST.moon = {
    id: 'moon', name: 'The Moon', place: 'the Tranquility Exchange', cur: '$', code: 'L', mult: 1.25, cost: 120, maniaSector: 'ltrans',
    blurb: 'A frontier economy. Faster growth, wilder swings, and everything from fuel to inflation hangs on the price of water ice.',
    indexName: 'Lunar 15', fundTkr: 'LUNA', fundName: 'Lunar 15 Index Fund', reserve: 'the Lunar Reserve',
    sectors: sectors, companies: companies, pool: pool, secEvents: secEvents, shocks: shocks, windfalls: windfalls, propTypes: propTypes, streets: streets, biz: biz,
    commodities: [
      { id: 'gold', tkr: 'XHE3', name: 'Helium-3', unit: 'gram', p0: 1400, desc: 'Fusion fuel, and the Moon\'s answer to gold. It pays you nothing. People pile into it when they are scared, so it often rises when stocks fall.' },
      { id: 'oil', tkr: 'XICE', name: 'Water Ice', unit: 'tonne', p0: 640, desc: 'Drinking water, breathing air and rocket fuel all start as ice. Its price climbs when the economy is hot or a mine shuts, and it feeds straight into inflation.' },
      { id: 'copper', tkr: 'XTIT', name: 'Titanium', unit: 'kilo', p0: 31, desc: 'Every dome and rocket is made of it, so demand follows building. Traders watch it as an early read on the economy.' },
      { id: 'wheat', tkr: 'XALG', name: 'Algae', unit: 'vat', p0: 56, desc: 'What most lunar food is made from. Moves on crop failures more than on the economy. Mostly noise, with the odd blight.' }
    ],
    crypto: { id: 'fleece', tkr: 'CRTR', name: 'Cratercoin', p0: 0.8, desc: 'A digital coin. Nothing backs it: no profits, no rent, no interest. Its price is whatever the next buyer will pay. That can be a lot more, or nothing.' },
    cmNews: {
      oilup: [['Ice prices spike as a polar mine floods', 'Collapsed shaft cuts off a third of the ice supply', 'Ice soars after export quota'], 'Ice becomes fuel, air and water, so it feeds into almost every price. Expect inflation to rise, ice miners to profit, and anyone who flies or builds to pay more.'],
      oildown: [['Ice slumps as new craters come online', 'Glut sends ice prices tumbling'], 'Cheap ice is a tax cut for everyone except those who dig it. Good for inflation, bad for ice miners.'],
      wheat: [['Blight sweeps the algae vats', 'Contamination wipes out a season of algae'], 'Algae prices jump. Food costs more for a season or two.']
    },
    volMult: 1.25, growthAdd: 0.006, danger: 1.8
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
