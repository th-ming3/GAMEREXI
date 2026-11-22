const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/home/user/.local/share/choreographer/deps/chrome-linux64/chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars']
  });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGEERROR:', e.message.slice(0, 140)));
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
  const t = Date.now();
  while (Date.now() - t < 40000) {
    const ok = await page.evaluate(() => window.__bootOK === true);
    if (ok) break;
    await new Promise(r => setTimeout(r, 500));
  }
  await page.evaluate(() => window.__ff && window.__ff(8));
  const proj = () => page.evaluate(() => {
    const cam = window.__scene3d ? null : null;
    // project first 3 birds to screen space
    const out = [];
    (window.__birds || []).slice(0, 3).forEach(b => {
      const v = b.position.clone();
      window.__garden.localToWorld(v);
      v.project(window.__cam3d);
      out.push([v.x.toFixed(2), v.y.toFixed(2)]);
    });
    return out;
  });
  // tìm camera object qua scene traversal
  const p1 = await proj();
  await page.evaluate(() => { window.__garden.rotation.y = 1.2; });
  await new Promise(r => setTimeout(r, 800));
  const p2 = await proj();
  console.log('birds rot 0   :', JSON.stringify(p1));
  console.log('birds rot 1.2 :', JSON.stringify(p2));
  const moved = JSON.stringify(p1) !== JSON.stringify(p2);
  console.log(moved ? 'PASS: chim xoay theo the gioi' : 'FAIL: chim van dan vao ong kinh');
  await page.screenshot({ path: '/home/user/phys-rot.png' });
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
