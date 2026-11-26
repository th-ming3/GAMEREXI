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
  await page.evaluate(() => { window.__cam(0, 5, 88, 0, 0.8, 84); window.__ff && window.__ff(5); });
  await new Promise(r => setTimeout(r, 6000));
  const d = await page.evaluate(() => {
    // cần truy cập chunkMap — không export; suy ra từ garden children có userData.cx
    const chunks = [];
    window.__garden.children.forEach(c => {
      if (c.userData && c.userData.grass && c.userData.cx !== undefined) chunks.push({ cx: c.userData.cx, cz: c.userData.cz, vis: c.visible });
    });
    const camL = window.__garden.worldToLocal(window.__cam3d.position.clone());
    const pcx = Math.floor(camL.x / 10), pcz = Math.floor(camL.z / 10);
    const grid = [];
    for (let gx = pcx - 3; gx <= pcx + 3; gx++) {
      const row = [];
      for (let gz = pcz - 3; gz <= pcz + 3; gz++) {
        const c = chunks.find(k => k.cx === gx && k.cz === gz);
        row.push(c ? (c.vis ? 'V' : 'h') : '.');
      }
      grid.push(row.join(' '));
    }
    return { camL: { x: +camL.x.toFixed(1), z: +camL.z.toFixed(1) }, pcx, pcz, grid, n: chunks.length };
  });
  console.log('camLocal:', JSON.stringify(d.camL), 'chunkIdx:', d.pcx, d.pcz, 'total:', d.n);
  console.log(d.grid.join('\n'));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
