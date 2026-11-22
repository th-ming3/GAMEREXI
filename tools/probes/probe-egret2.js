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
  const mx = () => page.evaluate(() => {
    const g = window.__birds[0].geometry.attributes.position.array;
    let m = 0;
    for (let i = 1; i < g.length; i += 3) if (Math.abs(g[i]) > m) m = Math.abs(g[i]);
    return +m.toFixed(3);
  });
  const base = [];
  for (let i = 0; i < 7; i++) { base.push(await mx()); await new Promise(r => setTimeout(r, 170)); }
  await page.evaluate(() => window.__startleBird(0));
  const boost = [];
  for (let i = 0; i < 7; i++) { boost.push(await mx()); await new Promise(r => setTimeout(r, 170)); }
  const bMax = Math.max.apply(null, base), kMax = Math.max.apply(null, boost);
  console.log('BASE max:', bMax, ' STARTLE max:', kMax, ' ratio:', (kMax / bMax).toFixed(2));
  console.log('EGRET-TOUCH:', kMax > bMax * 1.4 ? 'PASS ✓ đập cánh dồn' : 'FAIL');
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
