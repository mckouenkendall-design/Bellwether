// Diagnostics: how predictable are stock returns from things a player could see?
const path=require('path');
for (const f of ['core','content-earth','content-moon','content-mars','tape-co','tape','run']) require(path.join(__dirname,'../src/engine/'+f+'.js'));
const BW=globalThis.BW,T=BW.T;
const seeds=+process.argv[2]||20;
function rankIC(xs,ys){const n=xs.length;if(n<8)return null;const rk=a=>{const o=a.map((v,i)=>[v,i]).sort((p,q)=>p[0]-q[0]);const r=new Array(n);o.forEach((p,i)=>r[p[1]]=i);return r;};const a=rk(xs),b=rk(ys);let sa=0;for(let i=0;i<n;i++)sa+=(a[i]-b[i])**2;return 1-6*sa/(n*(n*n-1));}
const sig={mom60:[],mom240:[],ey:[],oracle:[],size:[],growth:[],debt:[]};const ics={};for(const k in sig)ics[k]={f60:[],f240:[]};
let ewVsCw=[],spreadTop=[];const q6={};const qs={};for(const k in sig)qs[k]=[];
for(let sd=1;sd<=seeds;sd++){
  const t=BW.genTape({seed:sd*104729,years:20,dest:'earth'});const W=t.W,N=t.N;
  // total return series per stock (dividends reinvested)
  const tr={};for(const c of t.companies){const a=t.assets[c.id];const s=new Float64Array(N);let u=1,dp=0;for(let d=a.start;d<N;d++){if(a.end>=0&&d>a.end){s[d]=0;continue;}const px=d===a.end?a.endPx:a.pc[d];while(dp<a.divs.length&&a.divs[dp].d<d)dp++;if(dp<a.divs.length&&a.divs[dp].d===d&&px>0)u*=1+a.divs[dp].amt*100/px;s[d]=u*px;}tr[c.id]=s;}
  // equal weight buy & hold of the starting 30 vs index TR
  let ew=0,n0=0;for(const c of t.companies){if(c.start>W)continue;const a=t.assets[c.id];const e=a.end>=0?a.end:N-1;const r=tr[c.id][e]/tr[c.id][W];ew+=r*(t.M.tr[N-1]/t.M.tr[e]);n0++;}
  ewVsCw.push((ew/n0)/(t.M.tr[N-1]/t.M.tr[W]));
  for(let d=W;d<N-241;d+=60){
    const ids=t.companies.filter(c=>c.start<d-240&&(c.end<0||c.end>d+240)).map(c=>c.id);
    const f60=ids.map(id=>tr[id][d+60]/tr[id][d]),f240=ids.map(id=>tr[id][d+240]/tr[id][d]);
    const S={mom60:ids.map(id=>tr[id][d]/tr[id][d-60]),mom240:ids.map(id=>tr[id][d]/tr[id][d-240]),
      ey:ids.map(id=>{const st=T.coStats(t,t.assets[id],d);return st.eps/st.price;}),
      oracle:ids.map(id=>t.assets[id].fv[d]/(t.assets[id].pc[d]/100)),
      size:ids.map(id=>t.assets[id].pc[d]*t.assets[id].sh[d]),
      growth:ids.map(id=>{const st=T.coStats(t,t.assets[id],d);return st.growth||0;}),
      debt:ids.map(id=>{const st=T.coStats(t,t.assets[id],d);return st.debtToProfit==null?9:st.debtToProfit;})};
    for(const k in S){const a=rankIC(S[k],f60),b=rankIC(S[k],f240);if(a!=null){ics[k].f60.push(a);ics[k].f240.push(b);}
      // top5 minus average, next 240d
      const o=ids.map((id,i)=>[S[k][i],f240[i]]).sort((p,q)=>q[0]-p[0]);const top=o.slice(0,5).reduce((s,x)=>s+x[1],0)/5,all=o.reduce((s,x)=>s+x[1],0)/o.length;qs[k].push(top/all-1);
      const o6=ids.map((id,i)=>[S[k][i],f60[i]]).sort((p,q)=>q[0]-p[0]);(q6[k]=q6[k]||[]).push(o6.slice(0,5).reduce((s,x)=>s+x[1],0)/5/(o6.reduce((s,x)=>s+x[1],0)/o6.length)-1);}
  }
}
const m=a=>a.reduce((s,x)=>s+x,0)/a.length;
console.log('equal-weight buy&hold of starting 30 vs cap-weight index (20y total return ratio): mean',m(ewVsCw).toFixed(3),'median',[...ewVsCw].sort((a,b)=>a-b)[ewVsCw.length>>1].toFixed(3));
console.log('signal'.padEnd(8),'rankIC->60d','rankIC->240d','top5 vs avg, next year');
for(const k in ics)console.log(k.padEnd(8),m(ics[k].f60).toFixed(3).padStart(10),m(ics[k].f240).toFixed(3).padStart(12),((m(qs[k])*100).toFixed(1)+'%').padStart(14),' next 60d annualized:',((m(q6[k])*400).toFixed(1)+'%'));
