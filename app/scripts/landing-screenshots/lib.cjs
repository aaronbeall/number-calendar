const { chromium } = require('playwright');
const { build } = require('./seed.cjs');
const BASE='http://localhost:5173';
async function setup(browser, {theme='light', mobile=false, scale=1}={}){
  const ctx = await browser.newContext(mobile ? { viewport:{width:390,height:844}, deviceScaleFactor:scale, isMobile:true, hasTouch:true, colorScheme:theme } : { viewport:{width:1440,height:900}, deviceScaleFactor:scale, colorScheme:theme });
  const page = await ctx.newPage();
  await page.clock.setFixedTime(new Date('2026-10-31T17:00:00'));
  await page.goto(BASE+'/');
  await page.waitForTimeout(800);
  const data = build(); const g = require('fs').existsSync(__dirname+'/goals.json') ? JSON.parse(require('fs').readFileSync(__dirname+'/goals.json')) : {goals:[],achievements:[]};
  await page.evaluate(async ({data, theme, g}) => {
    localStorage.setItem('theme', theme);
    await new Promise((res, rej) => { const req = indexedDB.open('number-calendar'); req.onsuccess = () => {
      const db = req.result; const tx = db.transaction(['datasets','entries','goals','achievements'],'readwrite'); ['goals','achievements'].forEach(s=>{tx.objectStore(s).clear(); g[s].forEach(x=>tx.objectStore(s).put(x));});
      tx.objectStore('datasets').clear(); tx.objectStore('entries').clear();
      data.datasets.forEach(d=>tx.objectStore('datasets').put(d)); data.entries.forEach(e=>tx.objectStore('entries').put(e));
      tx.oncomplete=()=>{db.close();res();}; tx.onerror=rej; }; req.onerror=rej; });
  }, {data, theme, g});
  return {ctx, page};
}
module.exports = { setup, BASE, chromium };
