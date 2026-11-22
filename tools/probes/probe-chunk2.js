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
  await new Promise(r => setTimeout(r, 1200));
  const stat = () => page.evaluate(() => ({
    c: { ...window.__chunkStats },
    geo: window.__renderer.info.memory.geometries,
    heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null
  }));
  await page.evaluate(() => { window.__cam(0, 4.2, 41, 0, 1.2, 30); });
  await new Promise(r => setTimeout(r, 3000));
  const s1 = await stat();
  console.log('AT r41 :', JSON.stringify(s1));
  await page.evaluate(() => { window.__cam(0, 5, 88, 0, 1.5, 70); });
  await new Promise(r => setTimeout(r, 5000));
  const s2 = await stat();
  console.log('AT r88 :', JSON.stringify(s2), '(chunk r41 phải bị dispose: total mới, geo không tăng vô hạn)');
  await page.screenshot({ path: '/home/user/chunk-far2.png' });
  await page.evaluate(() => { window.__cam(0.4, 3.62, 7, -1, 1.4, 0); });
  await new Promise(r => setTimeout(r, 5000));
  const s3 = await stat();
  console.log('BACK   :', JSON.stringify(s3), s3.geo < s2.geo + 40 ? '✓ geo có kiểm soát' : '✗ geo tăng vô hạn');
  console.log('ERRORS=' + errs.length);
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
