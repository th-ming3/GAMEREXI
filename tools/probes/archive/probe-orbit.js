const puppeteer = require('puppeteer-core');
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
  await new Promise(r => setTimeout(r, 1000));
  const sample = () => page.evaluate(() => {
    const cam = window.__cam3d, v = new THREE.Vector3();
    let minOp = 2, hid = 0;
    window.__birds.forEach(b => {
      b.getWorldPosition(v);
      const d = v.distanceTo(cam.position);
      if (b.material.opacity < minOp) minOp = b.material.opacity;
      if (!b.visible || d < 6.5) hid++;
    });
    return { minOp: +minOp.toFixed(2), near: hid, rot: +window.__garden.rotation.y.toFixed(2) };
  });
  console.log('START:', JSON.stringify(await sample()));
  const steps = 10;
  for (let i = 1; i <= steps; i++) {
    await page.evaluate(rot => { window.__garden.rotation.y = rot; }, (i / steps) * Math.PI);
    await new Promise(r => setTimeout(r, 450));
    console.log(`ROT ${(i / steps * 180).toFixed(0)}°:`, JSON.stringify(await sample()));
  }
  await page.screenshot({ path: '/home/user/orbit-mid.png' });
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
