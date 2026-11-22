const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/home/user/.local/share/choreographer/deps/chrome-linux64/chrome',
    args: ['--headless=new', '--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars'],
    defaultViewport: { width: 1280, height: 800 }
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('file:///home/user/game.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await new Promise(r => setTimeout(r, 2600));
  const t0 = Date.now();
  while (Date.now() - t0 < 40000) { const ok = await page.evaluate(() => window.__bootOK === true); if (ok) break; await new Promise(r => setTimeout(r, 500)); }
  const px = () => page.evaluate(() => +window.__birds[0].position.x.toFixed(4));
  const xs0 = [];
  for (let i = 0; i < 5; i++) { xs0.push(await px()); await new Promise(r => setTimeout(r, 300)); }
  await page.evaluate(() => window.__startleBird(0));
  const xs1 = [];
  for (let i = 0; i < 5; i++) { xs1.push(await px()); await new Promise(r => setTimeout(r, 300)); }
  const rate = a => Math.abs(a[a.length - 1] - a[0]) / (0.3 * (a.length - 1));
  const r0 = rate(xs0), r1 = rate(xs1);
  console.log('BASE rate:', r0.toFixed(4), 'u/s | STARTLE rate:', r1.toFixed(4), 'u/s | ratio:', (r1 / r0).toFixed(2));
  console.log('EGRET-TOUCH:', r1 > r0 * 1.6 ? 'PASS ✓ phóng nhanh + đập dồn' : 'FAIL');
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
