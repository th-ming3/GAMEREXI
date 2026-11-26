const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/home/user/.local/share/choreographer/deps/chrome-linux64/chrome',
    args: ['--headless=new', '--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars'],
    defaultViewport: { width: 1280, height: 800 }
  });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  page.on('console', m => { if (m.type() === 'error') errs.push('console: ' + m.text().slice(0, 200)); });
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('file:///home/user/game.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await new Promise(r => setTimeout(r, 6000));
  const st = await page.evaluate(() => ({
    boot: window.__bootOK,
    game: window.__GAME,
    cam: typeof window.CAM,
    tgt: typeof window.TARGET,
    cam3d: typeof window.__cam3d,
    tex: typeof window.__TEXTURES,
    three: typeof window.THREE
  }));
  console.log(JSON.stringify(st));
  errs.slice(0, 6).forEach(e => console.log('ERR:', e));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
