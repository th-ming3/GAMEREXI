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
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('file:///home/user/game.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await new Promise(r => setTimeout(r, 2600));
  const t0 = Date.now();
  while (Date.now() - t0 < 40000) { const ok = await page.evaluate(() => window.__bootOK === true); if (ok) break; await new Promise(r => setTimeout(r, 500)); }
  await page.evaluate(() => window.__birds.forEach(b => { b.userData.frz = 0.32; }));
  const read = () => page.evaluate(() => window.__birds.map(b => Number.isNaN(b.position.x) ? 'NaN' : +b.position.x.toFixed(2)));
  for (let i = 0; i < 10; i++) {
    const r = await read();
    console.log(i * 500 + 'ms:', JSON.stringify(r));
    if (r.some(x => x === 'NaN')) break;
    await new Promise(r2 => setTimeout(r2, 500));
  }
  console.log('errors=' + errs.length); errs.slice(0, 4).forEach(e => console.log('ERR:', e));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
