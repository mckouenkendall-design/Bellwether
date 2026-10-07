const path=require('path');
for (const f of ['core','content-earth','content-moon','content-mars','tape-co','tape','run']) require(path.join(__dirname,'../src/engine/'+f+'.js'));
const BW=globalThis.BW,T=BW.T;const seeds=+process.argv[2]||30;
const agg={};
for(let sd=1;sd<=seeds;sd++){
  const t=BW.genTape({seed:sd*104729,years:20,dest:'earth'});const W=t.W,N=t.N;
  for(const c of t.companies){if(c.start>0)continue;const a=t.assets[c.id];const e=a.end>=0?a.end:N-1;if(e<=W+240)continue;
    let u=1,dp=0;for(let d=W+1;d<=e;d++){const px=d===a.end?a.endPx:a.pc[d];while(dp<a.divs.length&&a.divs[dp].d<d)dp++;if(dp<a.divs.length&&a.divs[dp].d===d&&px>0)u*=1+a.divs[dp].amt*100/px;}
    const tot=u*(a.end>=0?a.endPx:a.pc[e])/a.pc[W];const yrs=(e-W)/240;
    const rel=Math.log(Math.max(tot,0.001)/(t.M.tr[e]/t.M.tr[W]))/yrs;
    const g=agg[c.tkr]||(agg[c.tkr]={a:c.arche,rel:[],arith:[],cap:[],pe:[],u0:[]});g.rel.push(rel);g.arith.push(tot/(t.M.tr[e]/t.M.tr[W]));g.cap.push(a.pc[W]/100*a.sh[W]);
    const st=T.coStats(t,a,W);g.pe.push(st.pe||0);
  }
}
const m=a=>a.reduce((s,x)=>s+x,0)/a.length;const md=a=>[...a].sort((x,y)=>x-y)[a.length>>1];
const rows=Object.entries(agg).map(([k,v])=>[k,v.a,md(v.rel),m(v.arith),md(v.cap),md(v.pe)]).sort((a,b)=>b[4]-a[4]);
console.log('tkr   arche     med log-excess/yr  mean wealth ratio  med cap $M  med PE');
for(const r of rows)console.log(r[0].padEnd(5),r[1].padEnd(9),(r[2]*100).toFixed(1).padStart(8)+'%',r[3].toFixed(2).padStart(14),Math.round(r[4]).toString().padStart(14),r[5].toFixed(1).padStart(8));
const by={};for(const r of rows){(by[r[1]]=by[r[1]]||[]).push(r);}
for(const k in by)console.log(k.padEnd(9),'med excess',(m(by[k].map(r=>r[2]))*100).toFixed(2)+'%','mean wealth ratio',m(by[k].map(r=>r[3])).toFixed(2));
