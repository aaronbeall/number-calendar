// Captures raw screenshots of the running app (npm run dev) with sample data.
// Usage: node scripts/landing-screenshots/capture.cjs && python3 scripts/landing-screenshots/crop.py
const path = require('path');
const fs = require('fs');
const { setup, BASE, chromium } = require('./lib.cjs');
const RAW = path.join(__dirname, 'raw');
fs.mkdirSync(RAW, { recursive: true });
(async () => {
  const b = await chromium.launch();
  for (const theme of ['light', 'dark']) {
    {
      const { page, ctx } = await setup(b, { theme, scale: 2 });
      await page.setViewportSize({ width: 1000, height: 900 });
      const go = async (p, name, wait = 1800) => { await page.goto(BASE + p); await page.waitForTimeout(wait); await page.screenshot({ path: `${RAW}/${theme}-d-${name}.png`, fullPage: true }); };
      await go('/dataset/pnl?year=2026&month=10', 'pnl');
      await go('/dataset/weight?year=2026&month=10', 'weight');
      await go('/dataset/pnl?year=2026&month=10&mode=monthly', 'year');
      await go('/dataset/pnl?year=2026&month=10&panel=2026-10-15', 'panel');
      await go('/dataset/pnl/achievements', 'ach', 2500);
      await page.setViewportSize({ width: 1280, height: 800 });
      await go('/', 'dash');
      await ctx.close();
    }
    {
      const { page, ctx } = await setup(b, { theme, mobile: true, scale: 3 });
      const go = async (p, name, full = false) => { await page.goto(BASE + p); await page.waitForTimeout(2200); await page.screenshot({ path: `${RAW}/${theme}-m-${name}.png`, fullPage: full }); };
      await go('/dataset/pnl?year=2026&month=10', 'pnl');
      await go('/dataset/weight?year=2026&month=10', 'weight');
      await go('/dataset/pnl?year=2026&month=10&panel=2026-10-15', 'panel');
      await go('/', 'dash');
      await go('/dataset/pnl?year=2026&month=10', 'pnl-full', true);
      await go('/dataset/weight?year=2026&month=10', 'weight-full', true);
      await go('/dataset/pnl?year=2026&month=10&mode=monthly', 'year', true);
      await ctx.close();
    }
  }
  await b.close();
})();
