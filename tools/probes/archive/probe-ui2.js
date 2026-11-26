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
  await page.evaluate(() => window.__ff && window.__ff(12));
  await new Promise(r => setTimeout(r, 1500));
  const res = await page.evaluate(() => {
    const rects = [];
    const r1 = document.querySelector('.rail').getBoundingClientRect();
    const r2 = document.querySelector('.panel').getBoundingClientRect();
    rects.push([r1.left, r1.top, r1.right, r1.bottom], [r2.left, r2.top, r2.right, r2.bottom]);
    const out = [];
    const v = new THREE.Vector3();
    const kids = window.__garden.children.filter(c => c.userData && c.userData.wings);
    kids.forEach((g, i) => {
      g.getWorldPosition(v).project(window.__cam3d);
      const sx = (v.x * 0.5 + 0.5) * 1280, sy = (-v.y * 0.5 + 0.5) * 800;
      let op = 2;
      g.traverse(m => { if (m.material && m.material.transparent && m.material.opacity < op) op = m.material.opacity; });
      let inR = false;
      rects.forEach(([a, b, c, d]) => { if (sx > a - 14 && sx < c + 14 && sy > b - 14 && sy < d + 14) inR = true; });
      out.push({ i, sx: Math.round(sx), sy: Math.round(sy), op: +op.toFixed(2), inR, vis: g.visible });
    });
    return out;
  });
  let pass = true;
  res.forEach(r => {
    const ok = r.inR ? r.op < 0.9 : r.op > 0.95;
    if (!ok) pass = false;
    console.log(`bf${r.i} sx=${r.sx} sy=${r.sy} op=${r.op} inRect=${r.inR} vis=${r.vis} ${ok ? 'OK' : 'BAD'}`);
  });
  console.log('UI-KEEP-OUT:', pass ? 'PASS' : 'FAIL');
  await page.screenshot({ path: '/home/user/ui-ko2.png' });
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
