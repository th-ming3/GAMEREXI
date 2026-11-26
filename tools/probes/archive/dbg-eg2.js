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
  const read = () => page.evaluate(() => window.__birds.map(b => ({
    x: Number.isNaN(b.position.x) ? 'NaN' : +b.position.x.toFixed(2),
    dx: b.userData.dirX, spd: +b.userData.spd.toFixed(2), boost: b.userData.startleE !== undefined ? 1 : 0
  })));
  let prev = null;
  for (let i = 0; i < 25; i++) {
    const cur = await read();
    const changed = prev && JSON.stringify(cur) !== JSON.stringify(prev);
    if (changed || i === 0) console.log(i * 400 + 'ms:', JSON.stringify(cur));
    if (cur.some(b => b.x === 'NaN')) { console.log('NaN AT', i * 400, 'ms'); break; }
    prev = cur;
    await new Promise(r => setTimeout(r, 400));
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
