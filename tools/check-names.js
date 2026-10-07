const fs=require('fs');
globalThis.BW={};
require('/home/claude/bellwether/src/engine/content-earth.js');
const all=[];for(const ex of ['nasdaq','nyse','amex']){all.push(...JSON.parse(fs.readFileSync('tick/'+ex+'.json','utf8')))}
const syms=new Set(all.map(x=>x.symbol.trim().toUpperCase()));
const names=all.map(x=>x.name.toLowerCase());
const d=BW.DEST.earth;
const cos=[...d.companies,...d.pool];
const tk=[...cos.map(c=>c.tkr),'HERD',...d.commodities.map(c=>c.tkr),d.crypto.tkr,'BGOV','BLNG','BCRP','BJNK','XGLD','XOIL','XCOP','XWHT','FLCE'];
console.log('real symbols loaded',syms.size);
for(const t of tk) if(syms.has(t)) console.log('TICKER CLASH',t);
for(const c of cos){const first=c.name.toLowerCase().split(' ')[0].replace('&','').trim();const hits=names.filter(n=>n.split(/[\s,]+/)[0]===first);if(hits.length)console.log('NAME?',c.name,'->',hits.slice(0,3));}
