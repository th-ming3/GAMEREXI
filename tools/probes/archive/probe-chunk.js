const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/home/user/.local/share/choreographer/deps/chrome-linux64/chrome',
    args: ['--headless=new', '--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars'],
    defaultViewport: { width: 1280, height: 800 }
  });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 150)));
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('file:///home/user/game.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await new Promise(r => setTimeout(r, 2600));
  const t0 = Date.now();
  while (Date.now() - t0 < 40000) {
    const ok = await page.evaluate(() => window.__bootOK === true);
    if (ok) break;
    await new Promise(r => setTimeout(r, 500));
  }
  await new Promise(r => setTimeout(r, 1500));
  const stat = () => page.evaluate(() => ({
    chunks: { ...window.__chunkStats },
    geo: window.__renderer.info.memory.geometries,
    heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null
  }));
  console.log('SPAWN :', JSON.stringify(await stat()));
  // teleport ra xa r=40 (giới đ冥 WASD 46) nhìn ra ngoài
  await page.evaluate(() => {
    window.__cam(0, 4.2, 41, 0, 1.2, 30);
    window.__ff(2);
  });
  await new Promise(r => setTimeout(r, 3500));
  console.log('FAR   :', JSON.stringify(await stat()));
  await page.screenshot({ path: '/home/user/chunk-far.png' });
  // teleport về trung tâm → chunk r=40 phải bị dispose
  await page.evaluate(() => { window.__cam(0.4, 3.62, 7, -1, 1.4, 0); });
  await new Promise(r => setTimeout(r, 3500));
  console.log('BACK  :', JSON.stringify(await stat()));
  console.log('ERRORS=' + errs.length);
  errs.slice(0, 4).forEach(e => console.log('ERR:', e));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
