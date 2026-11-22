const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/home/user/.local/share/choreographer/deps/chrome-linux64/chrome',
    args: ['--headless=new', '--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars'],
    defaultViewport: { width: 1280, height: 800 }
  });
  const page = await browser.newPage();
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
  const snap = () => page.evaluate(() => {
    const out = [];
    for (const bi of [0, 2]) {
      const g = window.__birds[bi].geometry.attributes.position.array;
      let mx = 0;
      for (let i = 1; i < g.length; i += 3) if (Math.abs(g[i]) > mx) mx = Math.abs(g[i]);
      out.push({ mx: +mx.toFixed(4), x: +window.__birds[bi].position.x.toFixed(3), z: +window.__birds[bi].position.z.toFixed(3) });
    }
    return out;
  });
  const a = await snap();
  await new Promise(r => setTimeout(r, 400));
  const b = await snap();
  await new Promise(r => setTimeout(r, 400));
  const c = await snap();
  console.log('A:', JSON.stringify(a));
  console.log('B:', JSON.stringify(b));
  console.log('C:', JSON.stringify(c));
  console.log('WARP-CHANGED:', a[0].mx !== b[0].mx || b[0].mx !== c[0].mx,
    ' MOVED:', a[0].x !== b[0].x && b[0].x !== c[0].x,
    ' PHASE-DIFF:', a[0].mx.toFixed(3) !== a[1].mx.toFixed(3));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
