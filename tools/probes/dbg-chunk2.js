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
  await page.evaluate(() => { window.__cam(0, 5, 88, 0, 1.5, 70); window.__ff && window.__ff(5); });
  await new Promise(r => setTimeout(r, 5000));
  const d = await page.evaluate(() => ({
    cam: window.__cam3d.position.toArray().map(v => +v.toFixed(1)),
    stats: { ...window.__chunkStats }
  }));
  console.log('CAM:', JSON.stringify(d));
  await page.screenshot({ path: '/home/user/chunk-far3.png' });
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
