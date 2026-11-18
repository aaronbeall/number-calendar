// Captures the app screenshots listed in public/site.webmanifest (shown in the browser's install dialog).
// Usage: npm run dev, then node scripts/landing-screenshots/pwa.cjs
const path = require('path');
const fs = require('fs');
const { setup, BASE, chromium } = require('./lib.cjs');
const OUT = path.join(__dirname, '../../public/screenshots');
fs.mkdirSync(OUT, { recursive: true });

(async () => {
  const b = await chromium.launch();
  {
    const { page, ctx } = await setup(b, { theme: 'light' });
    await page.setViewportSize({ width: 1280, height: 800 });
    const shoot = async (p, name, wait = 2000) => {
      await page.goto(BASE + p);
      await page.waitForTimeout(wait);
      await page.screenshot({ path: `${OUT}/${name}.png` });
    };
    await page.goto(BASE + '/'); await page.waitForTimeout(1500);
    await shoot('/dataset/pnl?year=2026&month=10', 'wide-calendar', 3000);
    await shoot('/dataset/pnl/analysis', 'wide-analysis', 3000);
    await ctx.close();
  }
  {
    const { page, ctx } = await setup(b, { theme: 'light', mobile: true, scale: 2 });
    const shoot = async (p, name, wait = 2000) => {
      await page.goto(BASE + p);
      await page.waitForTimeout(wait);
      await page.screenshot({ path: `${OUT}/${name}.png` });
    };
    await shoot('/dataset/pnl?year=2026&month=10', 'narrow-calendar');
    await shoot('/dataset/pnl?year=2026&month=10&panel=2026-10-15', 'narrow-entry');
    await ctx.close();
  }
  await b.close();
  // Convert to webp (needs Pillow)
  require('child_process').execFileSync('python3', ['-c', `
import glob
from PIL import Image
for f in glob.glob('${OUT}/*.png'):
    Image.open(f).convert('RGB').save(f[:-4] + '.webp', quality=82, method=6)
`]);
  for (const f of fs.readdirSync(OUT)) if (f.endsWith('.png')) fs.unlinkSync(path.join(OUT, f));
})();
