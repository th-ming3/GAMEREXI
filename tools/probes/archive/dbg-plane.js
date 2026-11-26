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
  await page.evaluate(() => { const z = 15.5 + 5.2 * Math.sin(10 * 0.085) + 3.1 * Math.sin(10 * 0.041 + 2); window.__playerPos.set(10, 0, z + 2.4); window.__setOrbit(Math.atan2(-0.2, -2.4), 0.3); });
  await new Promise(r => setTimeout(r, 6000));
  const d = await page.evaluate(() => {
    const rc = new THREE.Raycaster();
    const ndc = { x: -0.39, y: -0.06 };
    rc.setFromCamera(ndc, window.__cam3d);
    const hits = rc.intersectObjects(window.__scene3d ? window.__scene3d.children : [], true);
    return hits.slice(0, 4).map(h => {
      const o = h.object;
      return { d: +h.distance.toFixed(2), geo: o.geometry && o.geometry.type, scale: o.scale.toArray().map(v => +v.toFixed(2)),
        color: o.material && o.material.color ? o.material.color.getHexString() : null, hasMap: !!(o.material && o.material.map),
        vcolors: !!(o.material && o.material.vertexColors), pos: o.position.toArray().map(v => +v.toFixed(1)) };
    });
  });
  console.log('HITS:', JSON.stringify(d, null, 1));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
