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
  await page.evaluate(() => {
    window.__garden.rotation.y = 0; window.__ff && window.__ff(9);
    const b = window.__bees[5];
    b.userData.st = 0; b.userData.dur = 999;
    b.userData.hx = b.position.x; b.userData.hy = b.position.y; b.userData.hz = b.position.z;
  });
  await new Promise(r => setTimeout(r, 400));
  await page.evaluate(() => {
    const b = window.__bees[5];
    const p = new THREE.Vector3(); b.getWorldPosition(p);
    window.__cam(p.x + 0.1, p.y + 0.75, p.z + 1.7, p.x + 0.45, p.y - 0.05, p.z);
    window.__ff && window.__ff(3);
  });
  await new Promise(r => setTimeout(r, 500));
  await new Promise(r => setTimeout(r, 400));
  const dbg = await page.evaluate(() => {
    const b = window.__bees[5];
    const v = new THREE.Vector3(); b.getWorldPosition(v).project(window.__cam3d);
    return { op: +b.material.opacity.toFixed(2), sx: Math.round((v.x*0.5+0.5)*1280), sy: Math.round((-v.y*0.5+0.5)*800), vis: b.visible };
  });
  console.log('BEE:', JSON.stringify(dbg));
  await page.screenshot({ path: '/home/user/v58-bee.png' });
  console.log('BEE SHOT DONE');
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
