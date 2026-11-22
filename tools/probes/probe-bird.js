const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/home/user/.local/share/choreographer/deps/chrome-linux64/chrome',
    args: ['--headless=new', '--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars'],
    defaultViewport: { width: 1280, height: 800 }
  });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGEERROR:', e.message.slice(0, 160)));
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
  await new Promise(r => setTimeout(r, 1200));
  await page.evaluate(() => {
    window.__garden.rotation.y = 0;
    window.__birds.forEach((e, i) => {
      e.userData.spd = 0;
      const wp = new THREE.Vector3(-2.6 + i * 1.25, 3.3 + (i % 2) * 0.35, -8.2);
      e.position.copy(window.__garden.worldToLocal(wp.clone()));
    });
    window.__ff && window.__ff(9);
  });
  await new Promise(r => setTimeout(r, 700));
  await page.screenshot({ path: 'bird-a.png' });
  await new Promise(r => setTimeout(r, 230));
  await page.screenshot({ path: 'bird-b.png' });
  await new Promise(r => setTimeout(r, 230));
  await page.screenshot({ path: 'bird-c.png' });
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
