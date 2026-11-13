// Captures raw screenshots of the running app (npm run dev) with sample data.
// Usage: node scripts/landing-screenshots/capture.cjs && python3 scripts/landing-screenshots/crop.py
const path = require('path');
const fs = require('fs');
const { setup, BASE, chromium } = require('./lib.cjs');
const RAW = path.join(__dirname, 'raw');
fs.mkdirSync(RAW, { recursive: true });

// Screenshot one card on the analysis page, found by its title.
async function shootCard(page, title, file, { hideFloating = false } = {}) {
  if (hideFloating) {
    // On phones the analysis time-frame panel floats over the charts; hide it for the capture.
    await page.evaluate(() => {
      for (const el of document.querySelectorAll('body *')) {
        const pos = getComputedStyle(el).position;
        if ((pos === 'fixed' || pos === 'sticky') && /TIME FRAME/i.test(el.textContent || '')) el.style.display = 'none';
      }
    });
  }
  const ok = await page.evaluate((t) => {
    const el = [...document.querySelectorAll('h1,h2,h3,h4,div,span')].find((e) => e.childElementCount <= 2 && e.textContent.trim() === t);
    if (!el) return false;
    let c = el;
    while (c && !(c.getBoundingClientRect().height > 250 && /rounded/.test(c.className))) c = c.parentElement;
    if (!c) return false;
    c.setAttribute('data-shot', t);
    c.scrollIntoView({ block: 'center' });
    return true;
  }, title);
  if (!ok) { console.warn('card not found:', title); return; }
  await page.waitForTimeout(2200);
  await page.locator(`[data-shot="${title}"]`).screenshot({ path: file });
}

// Save a big day so new achievements unlock, then capture the celebration overlay.
async function shootCelebration(page, file) {
  await page.goto(BASE + '/dataset/pnl?year=2026&month=10&panel=2026-10-30');
  await page.waitForTimeout(2000);
  const box = page.locator('textarea').first();
  await box.click();
  await box.fill('1250+880-120');
  await box.press('Enter');
  await page.waitForTimeout(3500);
  await page.screenshot({ path: file });
}

(async () => {
  const b = await chromium.launch();
  for (const theme of ['light', 'dark']) {
    {
      const { page, ctx } = await setup(b, { theme, scale: 2 });
      await page.setViewportSize({ width: 1000, height: 900 });
      const go = async (p, name, wait = 1800) => { await page.goto(BASE + p); await page.waitForTimeout(wait); await page.screenshot({ path: `${RAW}/${theme}-d-${name}.png`, fullPage: true }); };
      await go('/dataset/pnl?year=2026&month=10', 'pnl');
      await go('/dataset/weight?year=2026&month=10', 'weight');
      await go('/dataset/pnl?year=2026&month=10&panel=2026-10-15', 'panel');
      await go('/dataset/pnl/targets', 'targets');
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto(BASE + '/dataset/pnl/analysis');
      await page.waitForTimeout(1500);
      for (const t of ['Projections', 'Monthly Deviation', 'Momentum Quadrant', 'Trend Over Time']) {
        await shootCard(page, t, `${RAW}/${theme}-d-an-${t.toLowerCase().replace(/ /g, '-')}.png`);
      }
      await page.setViewportSize({ width: 1280, height: 800 });
      await shootCelebration(page, `${RAW}/${theme}-d-celebrate.png`);
      await ctx.close();
    }
    {
      const { page, ctx } = await setup(b, { theme, mobile: true, scale: 3 });
      const go = async (p, name, full = false) => { await page.goto(BASE + p); await page.waitForTimeout(2200); await page.screenshot({ path: `${RAW}/${theme}-m-${name}.png`, fullPage: full }); };
      await go('/dataset/pnl?year=2026&month=10', 'pnl');
      await go('/dataset/pnl?year=2026&month=10', 'pnl-full', true);
      await go('/dataset/weight?year=2026&month=10', 'weight-full', true);
      await page.goto(BASE + '/dataset/pnl/analysis');
      await page.waitForTimeout(1500);
      for (const t of ['Projections', 'Monthly Deviation', 'Momentum Quadrant']) {
        await shootCard(page, t, `${RAW}/${theme}-m-an-${t.toLowerCase().replace(/ /g, '-')}.png`, { hideFloating: true });
      }
      await shootCelebration(page, `${RAW}/${theme}-m-celebrate.png`);
      await ctx.close();
    }
  }
  await b.close();
})();
