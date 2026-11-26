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
  const info = await page.evaluate(() => {
    const out = [];
    const px = 4.5, pz = 12.5;
    const M = new (Object.getPrototypeOf(window.__scene3d.matrix).constructor)();
    const V = new (Object.getPrototypeOf(window.__scene3d.position).constructor)();
    const Q = new (Object.getPrototypeOf(window.__scene3d.quaternion).constructor)();
    const S = new (Object.getPrototypeOf(window.__scene3d.scale).constructor)();
    const E = new (Object.getPrototypeOf(window.__scene3d.rotation).constructor)();
    window.__scene3d.traverse(o => {
      if (!o.isInstancedMesh) return;
      let hit = 0, sample = null;
      const n = Math.min(o.count, 4000);
      for (let i = 0; i < n; i++) {
        o.getMatrixAt(i, M);
        M.decompose(V, Q, S);
        const d = Math.hypot(V.x - px, V.z - pz);
        if (d < 2.6) {
          hit++;
          if (!sample) { E.setFromQuaternion(Q, 'YXZ'); const bs = o.geometry.boundingBox; sample = [o.geometry.type, +S.x.toFixed(2), +S.y.toFixed(2), +S.z.toFixed(2), +V.x.toFixed(1), +V.y.toFixed(2), +V.z.toFixed(1), +E.x.toFixed(2), +E.y.toFixed(2), +E.z.toFixed(2), bs ? (+ (bs.max.x - bs.min.x).toFixed(2) + 'x' + +(bs.max.y - bs.min.y).toFixed(2) + 'x' + +(bs.max.z - bs.min.z).toFixed(2)) : '?', o.material && o.material.map && o.material.map.image ? o.material.map.image.width + 'x' + o.material.map.image.height : 'plain'].join(' ~ '); }
        }
      }
      if (hit) out.push('INST hit=' + hit + ' of ' + o.count + ' :: ' + sample);
    });
    return out;
  });
  info.forEach(l => console.log(l));
  console.log('ERRORS=' + errs.length);
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
