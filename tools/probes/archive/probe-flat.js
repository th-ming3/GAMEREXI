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
  await page.goto('file:///home/user/game.html', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await new Promise(r => setTimeout(r, 5000));
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) { if (await page.evaluate(() => window.__bootOK === true)) break; await new Promise(r => setTimeout(r, 500)); }
  await page.mouse.click(400, 300);
  await page.evaluate(() => { window.__ff && window.__ff(5); });
  await new Promise(r => setTimeout(r, 3000));
  // dò mesh quanh điểm có hoa sấp (gần slime (3,12))
  const info = await page.evaluate(() => {
    const out = [];
    const C = new (window.__scene3d.constructor.constructor === Function ? Object.getPrototypeOf(window.__scene3d).constructor : Object)(); // noop
    const px = 4.5, pz = 12.5;
    window.__scene3d.traverse(o => {
      if (!o.isMesh && !o.isInstancedMesh) return;
      o.updateWorldMatrix(true, false);
      const p = o.getWorldPosition ? o.getWorldPosition(new (Object.getPrototypeOf(o.position).constructor)()) : o.position;
      const d = Math.hypot(p.x - px, p.z - pz);
      if (d < 2.6) {
        let mapName = '';
        try { mapName = o.material && o.material.map && o.material.map.image ? (o.material.map.image.width + 'x' + o.material.map.image.height) : (o.material && o.material.map ? 'canvas' : ''); } catch (e) {}
        const bs = o.geometry && o.geometry.boundingBox ? o.geometry.boundingBox : null;
        out.push({
          t: o.isInstancedMesh ? 'inst(' + o.count + ')' : 'mesh',
          d: +d.toFixed(2),
          g: o.geometry ? o.geometry.type : '?',
          sc: o.scale ? [+o.scale.x.toFixed(2), +o.scale.y.toFixed(2), +o.scale.z.toFixed(2)] : null,
          p: [+p.x.toFixed(1), +p.y.toFixed(2), +p.z.toFixed(1)],
          map: mapName,
          vc: o.geometry && o.geometry.attributes.color ? 1 : 0
        });
      }
    });
    return out.slice(0, 40).map(o => [o.t,o.d,o.g,(o.sc||[]).join(','),o.p.join(','),o.map,o.vc].join(' ~ '));
  });
  console.log('NEAR-FLAT:', JSON.stringify(info, null, 1).slice(0, 3500));
  // chụp từ trên xuống
  await page.evaluate(() => { window.__playerPos.set(4.5, 5.5, 12.5); window.__setOrbit(0, 1.35); });
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: '/home/user/shots/probe-topdown.png' });
  console.log('ERRORS=' + errs.length);
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
