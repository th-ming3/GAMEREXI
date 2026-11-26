const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/home/user/.local/share/choreographer/deps/chrome-linux64/chrome',
    args: ['--headless=new', '--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars'],
    defaultViewport: { width: 1280, height: 800 }
  });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGEERR:', String(e).slice(0, 300)));
  page.on('console', m => { if (['error', 'warning'].includes(m.type())) console.log('CON:', m.text().slice(0, 250)); });
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('file:///home/user/game.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await new Promise(r => setTimeout(r, 9000));
  const st = await page.evaluate(() => ({
    boot: window.__bootOK, char: typeof window.__char, pp: typeof window.__playerPos,
    garden: typeof window.__garden, cam: typeof window.CAM
  }));
  console.log(JSON.stringify(st));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
