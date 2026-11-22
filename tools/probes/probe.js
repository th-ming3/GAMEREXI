const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/home/user/.local/share/choreographer/deps/chrome-linux64/chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars']
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
  const t = Date.now();
  while (Date.now() - t < 40000) {
    const ok = await page.evaluate(() => window.__bootOK === true);
    if (ok) break;
    await new Promise(r => setTimeout(r, 500));
  }
  await page.evaluate(() => window.__ff && window.__ff(7));
  await new Promise(r => setTimeout(r, 1000));
  await page.screenshot({ path: '/home/user/p-all.png' });
  await page.evaluate(() => {
    window.__garden.children.forEach(o => {
      if (o.isMesh && o.geometry && o.geometry.type === 'CircleGeometry') {
        o.material.color = new THREE.Color(0xff0000);
        o.material.vertexColors = false;
      }
      if (o.isMesh && o.geometry && o.geometry.type === 'SphereGeometry') {
        o.material.color = new THREE.Color(0x0000ff);
      }
    });
  });
  await new Promise(r => setTimeout(r, 600));
  await page.screenshot({ path: '/home/user/p-probe.png' });
  console.log('DONE');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
