const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/home/user/.local/share/choreographer/deps/chrome-linux64/chrome',
    args: ['--headless=new', '--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars'],
    defaultViewport: { width: 1280, height: 800 }
  });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGEERROR:', e.message.slice(0, 160)));
  await page.evaluateOnNewDocument(() => {
    try {
      localStorage.setItem('consent', 'Vâng');
      localStorage.setItem('freeDay', '2026-11-28');
      localStorage.setItem('food', 'Bánh mì chả cá');
      localStorage.setItem('drink', 'Cà phê muối');
      localStorage.setItem('place', 'Phố cổ Hà Nội');
    } catch (e) {}
  });
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('file:///home/user/done.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await new Promise(r => setTimeout(r, 2600));
  const t = Date.now();
  while (Date.now() - t < 40000) {
    const ok = await page.evaluate(() => window.__bootOK === true);
    if (ok) break;
    await new Promise(r => setTimeout(r, 500));
  }
  await new Promise(r => setTimeout(r, 1200));
  const snap = () => page.evaluate(() => window.__birds.map(b => ({ op: +b.material.opacity.toFixed(3), sy: +b.scale.y.toFixed(3), x: +b.position.x.toFixed(2) })));
  const a = await snap();
  await new Promise(r => setTimeout(r, 400));
  const b = await snap();
  let flips = 0;
  for (let i = 0; i < a.length; i++) if (a[i].op !== b[i].op || Math.abs(a[i].sy - b[i].sy) > 0.001) flips++;
  console.log('FLAP: ' + flips + '/' + a.length + ' birds changed pose in 400ms');
  console.log('A:', JSON.stringify(a));
  console.log('B:', JSON.stringify(b));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
