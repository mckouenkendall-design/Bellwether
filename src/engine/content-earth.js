/* Earth: sectors, the 30 companies of the Herd 30, and the IPO bench.
 * All names and tickers are invented. Characters stay the same every run
 * (Northgate is always a bank), but their fortunes are re-rolled from the seed.
 *
 * Company fields:
 *  rev   yearly sales in $M at the start        om   normal operating margin (profit before interest and tax / sales)
 *  g     starting yearly sales growth           cyc  how hard the economy hits it (0 = immune, 1.5 = very)
 *  beta  how much market mood moves the price   dx   debt as a multiple of yearly operating profit
 *  pay   share of profit paid as dividends      ci   capital needed per $ of new sales (growth is expensive when high)
 *  sr/sm noise in sales and margins             risk extra return investors demand (lowers the price)
 *  ex    exposures: oil, gold, copper, wheat prices and the level of interest rates
 */
(function (root) {
  'use strict';
  var BW = root.BW;

  var sectors = [
    { id: 'tech', name: 'Technology', gLong: 0.042, hue: 215,
      moves: 'Grows fast when companies and shoppers are spending. Prices lean on profits far in the future, so rising interest rates hurt more than most.' },
    { id: 'health', name: 'Healthcare', gLong: 0.038, hue: 340,
      moves: 'People get sick in any economy, so sales hold up in recessions. Single events matter more here: drug trial results, patents running out, regulators.' },
    { id: 'energy', name: 'Energy', gLong: 0.022, hue: 28,
      moves: 'Profits follow the price of oil. When oil jumps, these win while most other sectors pay more.' },
    { id: 'bank', name: 'Banking', gLong: 0.03, hue: 165,
      moves: 'Banks earn more when interest rates are higher, and lose badly in recessions when borrowers stop repaying. They run on borrowed money, so a crisis hits them first.' },
    { id: 'staples', name: 'Everyday Goods', gLong: 0.028, hue: 95,
      moves: 'Food, drinks, soap. People buy them in good times and bad, so profits are steady and growth is slow. Often held for the dividends.' },
    { id: 'retail', name: 'Retail & Leisure', gLong: 0.032, hue: 300,
      moves: 'Shopping, travel, eating out. The first spending people cut in a recession and the first to return in a recovery.' },
    { id: 'indust', name: 'Industrials', gLong: 0.03, hue: 50,
      moves: 'Machines, freight, aircraft parts. Orders follow the economy with a lag. Metal and fuel costs squeeze profits.' },
    { id: 'util', name: 'Utilities', gLong: 0.024, hue: 190,
      moves: 'Power and water. Very steady, heavy debt, big dividends. They trade a bit like bonds: when interest rates rise, their prices tend to fall.' },
    { id: 'mater', name: 'Materials', gLong: 0.026, hue: 15,
      moves: 'Miners and makers of raw materials. Profits swing with metal prices and with how much the world is building.' },
    { id: 'media', name: 'Telecom & Media', gLong: 0.026, hue: 265,
      moves: 'Phone networks are steady and carry a lot of debt. Studios and ad businesses depend on hits and on how much companies spend on advertising.' }
  ];

  function C(id, tkr, name, sector, arche, desc, p) {
    p.id = id; p.tkr = tkr; p.name = name; p.sector = sector; p.arche = arche; p.desc = desc;
    p.ex = p.ex || {};
    return p;
  }

  var companies = [
    // ---- Technology
    C('quil', 'QULN', 'Quillon Systems', 'tech', 'steady',
      'Sells the payroll and bookkeeping software that mid-sized companies run on. Customers pay every month and rarely leave.',
      { rev: 9200, om: 0.29, g: 0.09, cyc: 0.5, beta: 1.0, dx: 0.2, pay: 0.22, ci: 0.25, sr: 0.05, sm: 0.012, risk: -0.004 }),
    C('lume', 'LUMR', 'Lumenar', 'tech', 'growth',
      'Designs the chips inside data centres. Orders arrive in floods and droughts, so sales boom and bust with tech spending.',
      { rev: 5400, om: 0.24, g: 0.2, cyc: 1.5, beta: 1.45, dx: 0.3, pay: 0.05, ci: 0.45, sr: 0.14, sm: 0.03, risk: 0.006 }),
    C('pxrt', 'PXRT', 'Pixelroot', 'tech', 'spec',
      'A video app teenagers cannot put down. Growing fast and has never made a full-year profit. The bet is that it will.',
      { rev: 1300, om: -0.06, omMature: 0.2, g: 0.34, cyc: 1.0, beta: 1.6, dx: 0, pay: 0, ci: 0.3, sr: 0.16, sm: 0.035, risk: 0.018 }),
    // ---- Healthcare
    C('marr', 'MRWF', 'Marrowfield Health', 'health', 'steady',
      'One of the big drug makers. Dozens of medicines on sale, which protects it when any one patent runs out.',
      { rev: 21000, om: 0.26, g: 0.045, cyc: 0.15, beta: 0.7, dx: 1.4, pay: 0.5, ci: 0.35, sr: 0.04, sm: 0.012, risk: -0.004 }),
    C('tess', 'TSLY', 'Tessaly Devices', 'health', 'growth',
      'Makes surgical robots and the single-use parts each operation needs. Hospitals buy the robot once and the parts forever.',
      { rev: 3800, om: 0.22, g: 0.14, cyc: 0.4, beta: 1.05, dx: 0.5, pay: 0.08, ci: 0.4, sr: 0.07, sm: 0.018, risk: 0.002 }),
    C('ovan', 'OVNB', 'Ovanta Bio', 'health', 'spec',
      'A small lab with one approved drug and three in trials. Each trial result can double the company or halve it.',
      { rev: 620, om: 0.05, omMature: 0.25, g: 0.18, cyc: 0.1, beta: 1.2, dx: 1.5, pay: 0, ci: 0.6, sr: 0.14, sm: 0.04, risk: 0.022, trials: true }),
    // ---- Energy
    C('iron', 'IRCP', 'Ironcrest Petroleum', 'energy', 'income',
      'Pumps, refines and sells oil on four continents. Old, enormous, and pays a large dividend it hates to cut.',
      { rev: 48000, om: 0.11, g: 0.02, cyc: 0.7, beta: 0.9, dx: 1.6, pay: 0.55, ci: 0.9, sr: 0.05, sm: 0.012, risk: 0.002, ex: { oil: 0.09 } }),
    C('salt', 'SWDR', 'Saltwater Drilling', 'energy', 'cyclical',
      'Rents deep-sea drilling rigs to oil companies. Heavy debt. Mints money when oil is expensive and bleeds when it is cheap.',
      { rev: 2600, om: 0.14, g: 0.03, cyc: 1.0, beta: 1.4, dx: 4.2, pay: 0.1, ci: 1.2, sr: 0.1, sm: 0.03, risk: 0.016, ex: { oil: 0.2 } }),
    C('heli', 'HLRN', 'Helia Renewables', 'energy', 'growth',
      'Builds solar and wind farms with borrowed money, then sells the power on long contracts. Cheap loans are its oxygen.',
      { rev: 1900, om: 0.2, g: 0.16, cyc: 0.3, beta: 1.2, dx: 4.5, pay: 0.15, ci: 1.6, sr: 0.07, sm: 0.02, risk: 0.008, ex: { oil: 0.03 } }),
    // ---- Banking
    C('nrth', 'NGBK', 'Northgate Bank', 'bank', 'income',
      'The bank on every high street. Takes deposits, makes mortgages and business loans, and lives on the gap between the two rates.',
      { rev: 26000, om: 0.3, g: 0.035, cyc: 1.3, beta: 1.15, dx: 2.4, pay: 0.4, ci: 0.5, sr: 0.04, sm: 0.02, risk: 0.006, ex: { rate: 0.012 }, bank: true }),
    C('penn', 'PNWP', 'Pennywhistle Pay', 'bank', 'growth',
      'Runs the card readers and online checkouts for small shops. Takes a sliver of every sale, so it grows as shopping does.',
      { rev: 4100, om: 0.27, g: 0.17, cyc: 1.0, beta: 1.25, dx: 0.4, pay: 0.05, ci: 0.2, sr: 0.07, sm: 0.018, risk: 0.004 }),
    C('cblt', 'CBSC', 'Cobalt Street Capital', 'bank', 'spec',
      'Lends to people and businesses the big banks turn away, at high rates. Very profitable until a lot of them stop paying at once.',
      { rev: 1700, om: 0.33, g: 0.11, cyc: 2.0, beta: 1.6, dx: 4.4, pay: 0.25, ci: 0.7, sr: 0.1, sm: 0.04, risk: 0.02, ex: { rate: -0.006 }, bank: true }),
    // ---- Everyday Goods
    C('kett', 'KTLB', 'Kettleby Foods', 'staples', 'income',
      'Cereal, soup, frozen dinners. Its brands have been in kitchens for eighty years. Slow, dependable, pays you to wait.',
      { rev: 15500, om: 0.16, g: 0.03, cyc: 0.12, beta: 0.6, dx: 2.2, pay: 0.58, ci: 0.5, sr: 0.03, sm: 0.008, risk: -0.006, ex: { wheat: -0.03 } }),
    C('dewd', 'DWDB', 'Dewdrop Beverage', 'staples', 'steady',
      'Fizzy drinks and bottled water sold in 90 countries. Raises prices a little every year and nobody stops buying.',
      { rev: 18000, om: 0.24, g: 0.045, cyc: 0.15, beta: 0.65, dx: 1.8, pay: 0.6, ci: 0.4, sr: 0.03, sm: 0.008, risk: -0.007 }),
    C('barr', 'BRMT', 'Barrowmart', 'staples', 'steady',
      'A no-frills discount grocery chain. Thin profit on each item, huge volume. Busier than ever when money is tight.',
      { rev: 52000, om: 0.045, g: 0.06, cyc: -0.1, beta: 0.7, dx: 1.2, pay: 0.3, ci: 0.35, sr: 0.03, sm: 0.004, risk: -0.003, ex: { wheat: -0.008 } }),
    // ---- Retail & Leisure
    C('toll', 'TLWR', 'Tolliver & Wren', 'retail', 'spec',
      'A grand old department store chain losing shoppers to the internet. Lots of debt, lots of valuable buildings, and a turnaround plan.',
      { rev: 11000, om: 0.05, g: -0.01, cyc: 1.5, beta: 1.3, dx: 3.9, pay: 0.25, ci: 0.6, sr: 0.06, sm: 0.014, risk: 0.02 }),
    C('zipc', 'ZPCT', 'Zipcart', 'retail', 'growth',
      'Online shop that delivers almost anything by tomorrow. Spends nearly everything it earns on more warehouses.',
      { rev: 14000, om: 0.055, omMature: 0.1, g: 0.22, cyc: 1.0, beta: 1.35, dx: 1.0, pay: 0, ci: 0.4, sr: 0.08, sm: 0.012, risk: 0.006 }),
    C('wand', 'WNDL', 'Wanderlane Resorts', 'retail', 'cyclical',
      'Hotels, cruise ships and a theme park. Packed in good years. In a recession the rooms sit empty and the loans still need paying.',
      { rev: 7200, om: 0.17, g: 0.05, cyc: 2.1, beta: 1.45, dx: 3.6, pay: 0.2, ci: 1.3, sr: 0.07, sm: 0.025, risk: 0.012, ex: { oil: -0.03 } }),
    // ---- Industrials
    C('gran', 'GRAR', 'Granite Arrow Rail', 'indust', 'steady',
      'Owns 20,000 miles of freight track. Nobody can build a second railroad next to it, so it sets its prices.',
      { rev: 12500, om: 0.36, g: 0.04, cyc: 0.9, beta: 0.95, dx: 2.3, pay: 0.42, ci: 1.1, sr: 0.035, sm: 0.012, risk: -0.002, ex: { oil: -0.02 } }),
    C('kest', 'WNDH', 'Windhover Aerospace', 'indust', 'cyclical',
      'Makes landing gear and engine parts for airliners. Orders are booked years ahead, then cancelled all at once when airlines panic.',
      { rev: 8800, om: 0.15, g: 0.06, cyc: 1.5, beta: 1.2, dx: 2.4, pay: 0.25, ci: 0.7, sr: 0.07, sm: 0.018, risk: 0.006, ex: { copper: -0.015 } }),
    C('braw', 'BRWN', 'Brawn Machinery', 'indust', 'cyclical',
      'Diggers, cranes and bulldozers. When the world is building, order books are full. When it stops, so do they.',
      { rev: 16000, om: 0.13, g: 0.045, cyc: 1.9, beta: 1.3, dx: 2.0, pay: 0.3, ci: 0.6, sr: 0.07, sm: 0.02, risk: 0.006, ex: { copper: -0.02 } }),
    // ---- Utilities
    C('lant', 'LNLP', 'Lanternlight Power', 'util', 'income',
      'The electric company for six million homes. A regulator sets what it can charge, so profit is small, steady and predictable.',
      { rev: 10500, om: 0.22, g: 0.03, cyc: 0.05, beta: 0.5, dx: 4.8, pay: 0.68, ci: 2.2, sr: 0.02, sm: 0.006, risk: -0.01, ex: { rate: -0.004 } }),
    C('clbr', 'CLBW', 'Clearbrook Water', 'util', 'income',
      'Pipes clean water to three states. About the dullest business there is, which is exactly the appeal.',
      { rev: 3300, om: 0.3, g: 0.035, cyc: 0.02, beta: 0.45, dx: 5.0, pay: 0.62, ci: 2.6, sr: 0.015, sm: 0.006, risk: -0.012, ex: { rate: -0.004 } }),
    C('grid', 'GRSW', 'Gridswell Energy', 'util', 'spec',
      'Sells electricity at whatever the market pays that hour. Bought its power plants with debt at the top of the last boom.',
      { rev: 6400, om: 0.13, g: 0.03, cyc: 0.7, beta: 1.1, dx: 5.4, pay: 0.3, ci: 1.5, sr: 0.08, sm: 0.03, risk: 0.016, ex: { oil: 0.04, rate: -0.006 } }),
    // ---- Materials
    C('redh', 'RDHM', 'Redhollow Mining', 'mater', 'cyclical',
      'Digs copper out of open pits. Its costs barely change, so every move in the copper price lands straight in profit.',
      { rev: 9400, om: 0.2, g: 0.035, cyc: 1.2, beta: 1.3, dx: 2.0, pay: 0.35, ci: 1.1, sr: 0.06, sm: 0.02, risk: 0.008, ex: { copper: 0.22 } }),
    C('aurm', 'AURG', 'Aurum Ridge Gold', 'mater', 'cyclical',
      'A gold miner. Tends to shine when people are frightened and everything else is falling.',
      { rev: 3100, om: 0.2, g: 0.03, cyc: 0.0, beta: 0.55, dx: 1.5, pay: 0.3, ci: 1.0, sr: 0.06, sm: 0.02, risk: 0.006, ex: { gold: 0.32 } }),
    C('cast', 'CSTC', 'Castellan Chemicals', 'mater', 'steady',
      'Makes the glues, coatings and plastics inside other companies\' products. You own a hundred things with Castellan in them.',
      { rev: 13500, om: 0.15, g: 0.04, cyc: 1.1, beta: 1.0, dx: 2.1, pay: 0.4, ci: 0.7, sr: 0.045, sm: 0.014, risk: 0.0, ex: { oil: -0.03 } }),
    // ---- Telecom & Media
    C('sign', 'SGLW', 'Signalis Wireless', 'media', 'income',
      'A mobile phone network with 60 million customers. Mountains of debt from building towers, and a dividend investors depend on.',
      { rev: 34000, om: 0.2, g: 0.02, cyc: 0.2, beta: 0.65, dx: 4.6, pay: 0.65, ci: 1.5, sr: 0.025, sm: 0.008, risk: -0.002, ex: { rate: -0.004 } }),
    C('mari', 'MGPX', 'Marigold Pictures', 'media', 'cyclical',
      'A film and streaming studio. One hit pays for five flops. Nobody, including Marigold, knows which will be which.',
      { rev: 7600, om: 0.14, g: 0.06, cyc: 0.8, beta: 1.15, dx: 2.8, pay: 0.15, ci: 0.8, sr: 0.13, sm: 0.035, risk: 0.008, hits: true }),
    C('loud', 'LDMM', 'Loudmouth Media', 'media', 'cyclical',
      'Radio stations, billboards and podcasts, all paid for by adverts. Advertising is the first budget companies cut.',
      { rev: 4200, om: 0.19, g: 0.035, cyc: 1.8, beta: 1.25, dx: 3.4, pay: 0.3, ci: 0.5, sr: 0.07, sm: 0.022, risk: 0.012 })
  ];

  // New listings that replace companies that go bust or get bought.
  var pool = [
    C('volt', 'VLTQ', 'Voltaic Quay', 'tech', 'growth', 'Builds battery packs for trucks and buses. Young, ambitious, and not yet proven.',
      { rev: 900, om: 0.04, omMature: 0.16, g: 0.3, cyc: 1.2, beta: 1.5, dx: 1.0, pay: 0, ci: 0.6, sr: 0.14, sm: 0.03, risk: 0.016 }),
    C('mind', 'MNDL', 'Mindloom', 'tech', 'growth', 'Rents out artificial intelligence that answers customer calls. Signing up big clients quickly.',
      { rev: 700, om: 0.02, omMature: 0.24, g: 0.4, cyc: 0.9, beta: 1.6, dx: 0, pay: 0, ci: 0.3, sr: 0.16, sm: 0.035, risk: 0.018 }),
    C('fern', 'FRNC', 'Ferncare Clinics', 'health', 'growth', 'A chain of walk-in clinics inside shopping centres. Opening a new one every week.',
      { rev: 1500, om: 0.1, g: 0.2, cyc: 0.3, beta: 1.0, dx: 2.0, pay: 0, ci: 0.6, sr: 0.07, sm: 0.02, risk: 0.008 }),
    C('tide', 'TDHV', 'Tideharvest Power', 'energy', 'growth', 'Turns ocean tides into electricity. The technology works. Whether it pays is the open question.',
      { rev: 500, om: 0.06, omMature: 0.2, g: 0.3, cyc: 0.3, beta: 1.3, dx: 3.5, pay: 0, ci: 1.6, sr: 0.1, sm: 0.03, risk: 0.016 }),
    C('lark', 'LRKF', 'Larkspur Financial', 'bank', 'growth', 'A bank with no branches, only an app. Cheap to run, and growing among people under 30.',
      { rev: 1100, om: 0.16, g: 0.26, cyc: 1.3, beta: 1.4, dx: 2.0, pay: 0, ci: 0.4, sr: 0.09, sm: 0.03, risk: 0.012, ex: { rate: 0.008 }, bank: true }),
    C('oatf', 'OTFD', 'Oatfield & Daughters', 'staples', 'growth', 'Plant-based milk and snacks. Shelves keep selling out. Rivals are starting to copy it.',
      { rev: 800, om: 0.08, g: 0.24, cyc: 0.2, beta: 0.9, dx: 1.0, pay: 0, ci: 0.5, sr: 0.09, sm: 0.02, risk: 0.008, ex: { wheat: -0.03 } }),
    C('hopt', 'HPTV', 'Hoptavern Group', 'retail', 'growth', 'Restaurants where the food comes by conveyor belt. A hit with families, expanding city by city.',
      { rev: 1200, om: 0.1, g: 0.22, cyc: 1.5, beta: 1.3, dx: 2.2, pay: 0, ci: 0.8, sr: 0.08, sm: 0.02, risk: 0.01 }),
    C('skyl', 'SKLF', 'Skyloft Freight', 'indust', 'growth', 'Delivers parcels by cargo drone between warehouses. Cheaper than trucks on the routes where it is allowed to fly.',
      { rev: 1000, om: 0.05, omMature: 0.15, g: 0.3, cyc: 1.2, beta: 1.4, dx: 1.5, pay: 0, ci: 0.9, sr: 0.12, sm: 0.03, risk: 0.014 }),
    C('emrl', 'EMLR', 'Emberline Lithium', 'mater', 'cyclical', 'Mines lithium for batteries. One mine, one product, one very swingy price.',
      { rev: 1400, om: 0.22, g: 0.14, cyc: 1.3, beta: 1.5, dx: 2.0, pay: 0.1, ci: 1.2, sr: 0.14, sm: 0.04, risk: 0.014, ex: { copper: 0.18 } }),
    C('echo', 'ECHG', 'Echogrove Games', 'media', 'growth', 'Makes online games that are free to play and sell costumes inside them. One giant hit so far.',
      { rev: 1600, om: 0.22, g: 0.2, cyc: 0.7, beta: 1.3, dx: 0.2, pay: 0, ci: 0.3, sr: 0.15, sm: 0.04, risk: 0.012, hits: true }),
    C('brgt', 'WKFT', 'Wickford Tolls', 'util', 'income', 'Owns toll roads and two bridges. Cars cross, money arrives.',
      { rev: 1800, om: 0.4, g: 0.04, cyc: 0.5, beta: 0.7, dx: 5.0, pay: 0.6, ci: 2.4, sr: 0.03, sm: 0.01, risk: -0.004, ex: { rate: -0.004 } }),
    C('novi', 'NVGN', 'Novigene', 'health', 'spec', 'Edits genes to treat rare diseases. No sales to speak of yet. Everything rides on its first trials.',
      { rev: 200, om: 0.02, omMature: 0.28, g: 0.35, cyc: 0.1, beta: 1.4, dx: 2.0, pay: 0, ci: 0.7, sr: 0.18, sm: 0.05, risk: 0.026, trials: true })
  ];

  BW.DEST = BW.DEST || {};
  BW.DEST.earth = {
    id: 'earth', name: 'Earth', place: 'the Old Exchange', cur: '$',
    indexName: 'Herd 30', fundTkr: 'HERD', fundName: 'Herd 30 Index Fund',
    reserve: 'the Reserve', sectors: sectors, companies: companies, pool: pool,
    commodities: [
      { id: 'gold', tkr: 'XGLD', name: 'Gold', unit: 'ounce', p0: 1500, desc: 'A lump of metal that pays you nothing. People buy it when they are scared or when money is losing value, so it often rises when stocks fall.' },
      { id: 'oil', tkr: 'XOIL', name: 'Crude Oil', unit: 'barrel', p0: 62, desc: 'The world runs on it. Its price climbs when the economy is hot or supply is cut, and it feeds straight into inflation.' },
      { id: 'copper', tkr: 'XCOP', name: 'Copper', unit: 'pound', p0: 3.1, desc: 'Goes into every wire and pipe, so demand follows building and factories. Traders watch it as an early read on the economy.' },
      { id: 'wheat', tkr: 'XWHT', name: 'Wheat', unit: 'bushel', p0: 5.6, desc: 'Moves on weather and harvests more than on the economy. Mostly noise, with the odd drought.' }
    ],
    crypto: { id: 'fleece', tkr: 'FLCE', name: 'Fleececoin', p0: 0.8, desc: 'A digital coin. Nothing backs it: no profits, no rent, no interest. Its price is whatever the next buyer will pay. That can be a lot more, or nothing.' },
    volMult: 1, growthAdd: 0,
    propTypes: null // filled in by realestate content
  };
})(typeof globalThis !== 'undefined' ? globalThis : this);
