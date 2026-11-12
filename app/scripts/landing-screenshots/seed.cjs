// Builds deterministic, realistic sample data
function rng(seed){ return () => { seed = (seed*1664525+1013904223) % 4294967296; return seed/4294967296; }; }
function days(start, end){ const out=[]; for(let d=new Date(start+'T12:00:00'); d<=new Date(end+'T12:00:00'); d.setDate(d.getDate()+1)) out.push(new Date(d)); return out; }
const key = d => d.toISOString().slice(0,10);
function build(){
  const now = '2026-01-01T00:00:00Z';
  const datasets = [
    { id:'pnl', name:'Trading P&L', description:'Daily profit and loss', icon:'dollar', tracking:'series', valence:'positive', createdAt: now, updatedAt: now },
    { id:'weight', name:'Weight', description:'Morning weigh-in, lbs', icon:'activity', tracking:'trend', valence:'negative', createdAt: now, updatedAt: now },
    { id:'steps', name:'Steps', description:'Daily step count', icon:'footprints', tracking:'series', valence:'positive', createdAt: now, updatedAt: now },
    { id:'sleep', name:'Sleep', description:'Hours slept', icon:'moon', tracking:'trend', valence:'positive', createdAt: now, updatedAt: now },
  ];
  const entries = [];
  const r = rng(42);
  const all = days('2026-01-02','2026-10-31');
  // P&L: weekdays, 1-4 trades, net positive drift
  for (const d of all){ const wd=d.getDay(); if(wd===0||wd===6) continue; if (r()<0.06) continue;
    const n = 1+Math.floor(r()*3.5); const nums=[];
    for(let i=0;i<n;i++){ let v = Math.round((r()-0.42)*900/5)*5; if(v===0) v=25; nums.push(v); }
    entries.push({datasetId:'pnl', date:key(d), numbers:nums}); }
  // Weight: steady downward trend with daily noise
  all.forEach((d,i)=>{ const trend = 196.4 - i*0.052 + Math.sin(i/9)*0.9; const v = trend + (r()-0.5)*2.2; if (r()<0.1) return;
    entries.push({datasetId:'weight', date:key(d), numbers:[Math.round(v*10)/10]}); });
  // Steps: every day, walks summed
  for (const d of all){ const wd=d.getDay(); const base = (wd===0||wd===6)? 9000: 7000;
    const parts = 1+Math.floor(r()*3); const nums=[];
    for(let i=0;i<parts;i++) nums.push(Math.round((base/parts)*(0.4+r()*1.2)/10)*10);
    entries.push({datasetId:'steps', date:key(d), numbers:nums}); }
  // Sleep
  for (const d of all){ if (r()<0.08) continue; entries.push({datasetId:'sleep', date:key(d), numbers:[Math.round((6.2+r()*2.4)*4)/4]}); }
  return {datasets, entries};
}
module.exports = { build };
