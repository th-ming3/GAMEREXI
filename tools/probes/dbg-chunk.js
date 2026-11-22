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
  await page.evaluate(() => { window.__cam(0, 5, 88, 0, 1.5, 70); });
  await new Promise(r => setTimeout(r, 4000));
  const d = await page.evaluate(() => {
    const out = { cam: window.__cam3d.position.toArray().map(v => +v.toFixed(1)), camLocal: window.__cam3d ? null : null };
    // gardenRoot position?
    out.groot = window.__garden.position.toArray().map(v => +v.toFixed(1));
    out.rot = +window.__garden.rotation.y.toFixed(2);
    // quét chunk group: tìm group có userData.cx — qua scene traverse
    let tiles = 0, visTiles = 0, sample = null;
    window.__garden.children.forEach(c => {
      if (c.userData && c.userData.grass && c.children[0] && c.children[0].geometry && c.children[0].geometry.type === 'PlaneGeometry') {
        tiles++;
        if (c.visible) visTiles++;
        if (!sample && c.visible) {
          const wp = c.children[0].getWorldPosition(new THREE.Vector3());
          sample = { pos: wp.toArray().map(v => +v.toFixed(1)), dist: +wp.distanceTo(window.__cam3d.position).toFixed(1), fog: window.__scene3d.fog ? [window.__scene3d.fog.near, window.__scene3d.fog.far] : null };
        }
      }
    });
    out.tiles = tiles; out.visTiles = visTiles; out.sample = sample;
    out.fog = window.__scene3d.fog ? [window.__scene3d.fog.near, window.__scene3d.fog.far] : null;
    return out;
  });
  console.log(JSON.stringify(d));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
