// Calibration: generate many tapes and print what the market looks like.
const path=require('path');
for (const f of ['core','content-earth','content-moon','content-mars','tape-co','tape']) require(path.join(__dirname,'../src/engine/'+f+'.js'));
const BW=globalThis.BW;
const years=+process.argv[2]||20, runs=+process.argv[3]||40;
function stats(arr){const a=[...arr].sort((x,y)=>x-y);const m=a.reduce((s,x)=>s+x,0)/a.length;return {mean:m,med:a[a.length>>1],p10:a[Math.floor(a.length*.1)],p90:a[Math.floor(a.length*.9)],min:a[0],max:a[a.length-1]};}
const f=x=>(x*100).toFixed(1)+'%';
const out={cagr:[],trcagr:[],vol:[],mdd:[],bust:[],take:[],news:[],pe:[],rate:[],infl:[],rec:[],gov:[],lng:[],crp:[],jnk:[],gold:[],oil:[],house:[],stkMed:[],stkBeat:[],ms:[]};
for(let s=1;s<=runs;s++){
  const t0=Date.now();
  const t=BW.genTape({seed:s*7919,years,dest:'earth'});
  out.ms.push(Date.now()-t0);
  const W=t.W,N=t.N,M=t.M;
  const yrs=(N-1-W)/240;
  out.cagr.push(Math.pow(M.idx[N-1]/M.idx[W],1/yrs)-1);
  out.trcagr.push(Math.pow(M.tr[N-1]/M.tr[W],1/yrs)-1);
  let sum=0,sq=0,n=0,peak=0,mdd=0;
  for(let d=W+1;d<N;d++){const r=Math.log(M.idx[d]/M.idx[d-1]);sum+=r;sq+=r*r;n++;peak=Math.max(peak,M.idx[d]);mdd=Math.min(mdd,M.idx[d]/peak-1);}
  out.vol.push(Math.sqrt((sq/n-(sum/n)**2)*240));out.mdd.push(mdd);
  out.bust.push(t.companies.filter(c=>c.endWhy==='bankrupt'&&c.end>=W).length);
  out.take.push(t.companies.filter(c=>c.endWhy==='bought'&&c.end>=W).length);
  out.news.push(t.news.filter(x=>x.d>=W).length/yrs);
  let pe=0,ra=0,inf=0,rec=0;for(let d=W;d<N;d++){pe+=M.pe[d];ra+=M.rate[d];inf+=M.infl[d];if(M.regime[d]===3)rec++;}
  out.pe.push(pe/(N-W));out.rate.push(ra/(N-W));out.infl.push(inf/(N-W));out.rec.push(rec/(N-W));
  const cg=id=>Math.pow(t.assets[id].pc[N-1]/t.assets[id].pc[W],1/yrs)-1;
  out.gov.push(cg('bgov'));out.lng.push(cg('blng'));out.crp.push(cg('bcrp'));out.jnk.push(cg('bjnk'));out.gold.push(cg('gold'));out.oil.push(cg('oil'));
  out.house.push(Math.pow(M.housing[N-1]/M.housing[W],1/yrs)-1);
  // individual stocks present at start: total price return vs index
  const idxRet=M.idx[N-1]/M.idx[W];
  const rets=t.companies.filter(c=>c.start<=W).map(c=>{const a=t.assets[c.id];const e=a.end>=0?a.end:N-1;return ((a.end>=0?a.endPx:a.pc[e])/a.pc[W])/(M.idx[e]/M.idx[W]);});
  rets.sort((a,b)=>a-b);out.stkMed.push(rets[rets.length>>1]);out.stkBeat.push(rets.filter(r=>r>1).length/rets.length);
  if(s<=3){
    console.log('--- seed',s,'idx',M.idx[W].toFixed(0),'->',M.idx[N-1].toFixed(0),'regimes:',summar(M.regime,W,N));
    console.log('   prices@start', t.companies.slice(0,8).map(c=>c.tkr+':'+(c.pc[W]/100).toFixed(0)).join(' '));
  }
}
function summar(reg,W,N){let s='',last=-1;for(let d=W;d<N;d++){if(reg[d]!==last){s+=' '+((d-W)/240).toFixed(1)+':'+['EXP','BOOM','SLOW','REC','RCV'][reg[d]];last=reg[d];}}return s;}
const show=(k,pctf)=>{const s=stats(out[k]);const g=pctf?f:(x=>x.toFixed(2));console.log(k.padEnd(8),'mean',g(s.mean),'med',g(s.med),'p10',g(s.p10),'p90',g(s.p90),'min',g(s.min),'max',g(s.max));};
['cagr','trcagr','vol','mdd','gov','lng','crp','jnk','gold','oil','house','rec','stkBeat'].forEach(k=>show(k,true));
['bust','take','news','pe','rate','infl','stkMed','ms'].forEach(k=>show(k,false));
