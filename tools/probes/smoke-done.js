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
  await page.goto('file:///home/user/done.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await new Promise(r => setTimeout(r, 4000));
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) { if (await page.evaluate(() => window.__bootOK === true)) break; await new Promise(r => setTimeout(r, 500)); }
  const st = await page.evaluate(() => {
    let photoTrees = 0, chunks = 0;
    window.__garden && window.__garden.children.forEach(c => {
      if (!c.userData) return; chunks++;
      c.children.forEach(m => {
        if (m instanceof THREE.Group && m.userData.isTree3D && m.children.length === 2) photoTrees++;
      });
    });
    return { boot: window.__bootOK === true, chunks: chunks, photoTrees: photoTrees };
  });
  await new Promise(r => setTimeout(r, 1500));
  await page.screenshot({ path: '/home/user/shots/done-check.png' });
  console.log('DONE-SMOKE:', JSON.stringify(st), 'ERRORS=' + errs.length);
  errs.slice(0, 3).forEach(e => console.log('ERR:', e));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
