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
  await page.evaluate(() => window.__ff && window.__ff(2));
  await new Promise(r => setTimeout(r, 600));
  const snap = () => page.evaluate(() => {
    const b = window.__bees[0];
    const g = b.geometry.attributes.position.array, base = b.userData.base;
    let fl = 0;
    for (let i = 0; i < g.length; i += 3) { const d = Math.abs(g[i + 1] - base[i + 1]); if (d > fl) fl = d; }
    const p = b.position;
    // px width on screen
    const box = new THREE.Box3().setFromObject(b);
    const v1 = box.min.clone(), v2 = box.max.clone();
    const dist = b.getWorldPosition(new THREE.Vector3()).distanceTo(window.__cam3d.position);
    const wpx = v1.sub(window.__cam3d.position).length();
    const s1 = box.min.clone().project(window.__cam3d), s2 = box.max.clone().project(window.__cam3d);
    const pxW = Math.abs((s2.x - s1.x)) * 640;
    // bướm gần nhất
    let bfPx = 0, bfDist = 0;
    window.__garden.children.filter(c => c.userData && c.userData.wings).forEach(c => {
      const bb = new THREE.Box3().setFromObject(c);
      const sA = bb.min.clone().project(window.__cam3d), sB = bb.max.clone().project(window.__cam3d);
      const w = Math.abs(sB.x - sA.x) * 640;
      const d = c.getWorldPosition(new THREE.Vector3()).distanceTo(window.__cam3d.position);
      if (Math.abs(d - dist) < 2.5 && w > bfPx) { bfPx = w; bfDist = d; }
    });
    return { fl: +fl.toFixed(4), px: +pxW.toFixed(0), bfPx: +bfPx.toFixed(0), pos: [p.x.toFixed(2), p.y.toFixed(2), p.z.toFixed(2)] };
  });
  const a = await snap();
  await new Promise(r => setTimeout(r, 300));
  const b = await snap();
  await new Promise(r => setTimeout(r, 300));
  const c = await snap();
  console.log('A:', JSON.stringify(a));
  console.log('B:', JSON.stringify(b));
  console.log('C:', JSON.stringify(c));
  const moved = a.pos.join() !== b.pos.join() || b.pos.join() !== c.pos.join();
  console.log('FLUTTER:', a.fl !== b.fl || b.fl !== c.fl, ' | ONG-DI-CHUYEN:', moved,
    ' | ONG-NHO-HON-BUOM:', a.bfPx > a.px * 1.6);
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
