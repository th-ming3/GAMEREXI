const puppeteer = require('puppeteer-core');
const fs = require('fs');
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
  const t0 = Date.now();
  while (Date.now() - t0 < 40000) {
    const ok = await page.evaluate(() => window.__bootOK === true);
    if (ok) break;
    await new Promise(r => setTimeout(r, 500));
  }
  await new Promise(r => setTimeout(r, 1200));

  const measure = () => page.evaluate(() => {
    const cam = window.__cam3d, birds = window.__birds;
    const v = new THREE.Vector3(), r = new THREE.Vector3();
    return birds.map(b => {
      b.getWorldPosition(v);
      const d = v.distanceTo(cam.position);
      const c = v.clone().project(cam);
      r.setFromMatrixColumn(cam.matrixWorld, 0);
      const e = v.clone().addScaledVector(r, b.userData.w / 2).project(cam);
      return {
        d: +d.toFixed(1),
        px: Math.round(Math.abs(e.x - c.x) * 640),
        sx: Math.round((c.x * 0.5 + 0.5) * 1280),
        sy: Math.round((-c.y * 0.5 + 0.5) * 800),
        z: +b.position.z.toFixed(1),
        w: +b.userData.w.toFixed(2),
        vis: b.visible
      };
    });
  });

  const a = await measure();
  await page.screenshot({ path: '/home/user/sz-a.png' });
  await page.evaluate(() => window.__ff && window.__ff(60));
  await new Promise(r => setTimeout(r, 900));
  const b = await measure();
  await page.screenshot({ path: '/home/user/sz-b.png' });

  console.log('FRESH :', JSON.stringify(a));
  console.log('FF60  :', JSON.stringify(b));
  const bad = a.concat(b).filter(x => !x.vis || x.px > 72 || x.z > -12.4 || x.z < -17.6 || x.d < 17);
  console.log('VERDICT:', bad.length === 0 ? 'PASS' : 'FAIL ' + JSON.stringify(bad));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
