const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/home/user/.local/share/choreographer/deps/chrome-linux64/chrome',
    args: ['--headless=new', '--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars'],
    defaultViewport: { width: 1280, height: 800 }
  });
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => { try { localStorage.setItem('consent', 'Vâng'); localStorage.setItem('freeDay', '2026-11-28'); localStorage.setItem('food', 'Bánh mì chả cá'); localStorage.setItem('drink', 'Cà phê muối'); localStorage.setItem('place', 'Phố cổ Hà Nội'); } catch (e) {} });
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('file:///home/user/done.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await new Promise(r => setTimeout(r, 2600));
  const t0 = Date.now();
  while (Date.now() - t0 < 40000) { const ok = await page.evaluate(() => window.__bootOK === true); if (ok) break; await new Promise(r => setTimeout(r, 500)); }
  await page.evaluate(() => window.__ff && window.__ff(2.4));
  await new Promise(r => setTimeout(r, 700));
  await page.screenshot({ path: '/home/user/v59-final.png' });
  console.log('DONE');
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
