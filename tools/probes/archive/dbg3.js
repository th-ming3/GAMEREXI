const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/home/user/.local/share/choreographer/deps/chrome-linux64/chrome',
    args: ['--headless=new', '--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars'],
    defaultViewport: { width: 1280, height: 800 }
  });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGEERR:', String(e).slice(0, 180)));
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('file:///home/user/game.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await new Promise(r => setTimeout(r, 5000));
  const st = await page.evaluate(() => {
    const out = { cam: typeof window.CAM, cam3d: typeof window.__cam3d, camZ: window.CAM ? window.CAM.z : null };
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'w', bubbles: true }));
    return out;
  });
  console.log('BEFORE:', JSON.stringify(st));
  await new Promise(r => setTimeout(r, 1200));
  await page.evaluate(() => window.dispatchEvent(new KeyboardEvent('keyup', { key: 'w', bubbles: true })));
  const z1 = await page.evaluate(() => ({ camZ: window.CAM ? window.CAM.z : null, camPos: window.__cam3d ? window.__cam3d.position.z : null }));
  console.log('AFTER :', JSON.stringify(z1));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
