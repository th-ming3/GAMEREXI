const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/home/user/.local/share/choreographer/deps/chrome-linux64/chrome',
    args: ['--headless=new', '--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
    defaultViewport: { width: 1280, height: 800 }
  });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGE-ERR:', String(e.stack || e).slice(0, 400)));
  page.on('console', m => { if (m.type() === 'error') console.log('CON-ERR:', m.text().slice(0, 300)); });
  await page.goto('file:///home/user/game.html', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await new Promise(r => setTimeout(r, 12000));
  const ok = await page.evaluate(() => window.__bootOK === true);
  console.log('BOOT=' + ok);
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
