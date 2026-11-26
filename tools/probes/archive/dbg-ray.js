const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/home/user/.local/share/choreographer/deps/chrome-linux64/chrome',
    args: ['--headless=new', '--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars'],
    defaultViewport: { width: 1280, height: 800 }
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('file:///home/user/game.html', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await new Promise(r => setTimeout(r, 5000));
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) { if (await page.evaluate(() => window.__bootOK === true)) break; await new Promise(r => setTimeout(r, 500)); }
  await page.mouse.click(400, 300);
  await page.evaluate(() => { window.__ff && window.__ff(5); });
  await page.evaluate(() => {
    const pz1 = 15.5 + 5.2 * Math.sin(2 * 0.085) + 3.1 * Math.sin(2 * 0.041 + 2);
    const pz2 = 15.5 + 5.2 * Math.sin(12 * 0.085) + 3.1 * Math.sin(12 * 0.041 + 2);
    window.__playerPos.set(2, 0, pz1 + 2.2);
    window.__setOrbit(Math.atan2(10 - 2, pz2 - pz1), 0.22);
  });
  await new Promise(r => setTimeout(r, 6000));
  const res = await page.evaluate(() => {
    const rc = new THREE.Raycaster();
    const out = [];
    for (let i = 0; i <= 24; i++) {
      const ndc = { x: -0.7 + i * 0.06, y: -0.28 };
      rc.setFromCamera(ndc, window.__cam3d);
      const hits = rc.intersectObjects(window.__scene3d.children, true);
      let picked = null;
      for (const h of hits) {
        const o = h.object;
        if (o.material && o.material.map && o.material.vertexColors) break; /* ground */
        if (o.material && o.material.map && o.scale.x > 1) break; /* dirt patch */
        picked = { geo: o.geometry && o.geometry.type, s: o.scale ? o.scale.x.toFixed(2) : '?', col: o.material && o.material.color ? o.material.color.getHex().toString(16) : (o.material && o.material.map ? 'map' : '?'), d: +h.distance.toFixed(1) };
        break;
      }
      if (picked) out.push({ x: ndc.x.toFixed(2), ...picked });
    }
    return out;
  });
  console.log('SCAN:', JSON.stringify(res));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
