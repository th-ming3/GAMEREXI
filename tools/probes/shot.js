const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/home/user/.local/share/choreographer/deps/chrome-linux64/chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars']
  });
  const page = await browser.newPage();
  page.on('pageerror', e => console.log('PAGEERROR:', e.message.slice(0, 120)));
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
  const bootAt = Date.now();
  const waitTo = async ms => { const d = ms - (Date.now() - bootAt); if (d > 0) await new Promise(r => setTimeout(r, d)); };
  await waitTo(400); await page.evaluate(() => { window.__garden.rotation.y = 0; window.__ff && window.__ff(0.7); });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: '/home/user/v58-early.png' });
  await page.evaluate(() => { window.__garden.rotation.y = 0; window.__ff && window.__ff(2.2); });
  await new Promise(r => setTimeout(r, 500));
  await page.screenshot({ path: '/home/user/v58-bloom.png' });
  await page.evaluate(() => { window.__garden.rotation.y = 0; window.__ff && window.__ff(1.3); });
  await new Promise(r => setTimeout(r, 450));
  await page.screenshot({ path: '/home/user/v58-pollen.png' });
  await page.evaluate(() => { window.__garden.rotation.y = 0; window.__ff && window.__ff(9); });
  await page.evaluate(() => {
    window.__garden.rotation.y = 2.1;
    window.__birds.forEach((e, i) => {
      e.userData.frz = 0.32;
      const wp = new THREE.Vector3(-7.5 + i * 1.35, 3.45 + (i % 2) * 0.3, -13.2 - (i % 3));
      e.position.copy(window.__garden.worldToLocal(wp.clone()));
    });
    window.__ff && window.__ff(9);
  });
  await new Promise(r => setTimeout(r, 900));
  await page.screenshot({ path: '/home/user/v58-side.png' });
  await page.evaluate(() => {
    window.__garden.rotation.y = 3.14;
    window.__birds.forEach(e => { e.userData.vx = 0; e.userData.frz = 0.32; });
    const wp = new THREE.Vector3(2.8, 3.7, -13.2);
    window.__birds.forEach((e, i) => {
      const lp = window.__garden.worldToLocal(wp.clone().add(new THREE.Vector3((i % 4) * 1.0 - 1.5, (i % 3) * 0.22, Math.floor(i / 4) * 0.8)));
      e.position.copy(lp);
    });
    window.__ff && window.__ff(9);
  });
  await new Promise(r => setTimeout(r, 900));
  await page.screenshot({ path: '/home/user/v58-back.png' });
  await page.evaluate(() => {
    window.__garden.rotation.y = 0;
    const b = window.__bees[0];
    b.userData.spd = 0;
    window.__ff && window.__ff(9);
  });
  await new Promise(r => setTimeout(r, 300));
  await page.evaluate(() => {
    const b = window.__bees[0];
    const p = new THREE.Vector3(); b.getWorldPosition(p);
    window.__cam(p.x + 0.15, p.y + 0.22, p.z + 1.35, p.x, p.y, p.z);
  });
  await new Promise(r => setTimeout(r, 350));
  await page.screenshot({ path: '/home/user/v58-bee.png' });
  await page.evaluate(() => {
    window.__garden.rotation.y = 0;
    window.__birds.forEach((e, i) => {
      e.userData.frz = 0.32;
      const wp = new THREE.Vector3(-3.2 + i * 0.95, 3.45 + (i % 3) * 0.3, -13.4 - (i % 2) * 0.9);
      e.position.copy(window.__garden.worldToLocal(wp.clone()));
    });
    window.__ff && window.__ff(9);
    window.__cam(0.4, 3.62, 7.0, -0.5, 3.45, -13.4);
  });
  await new Promise(r => setTimeout(r, 700));
  await page.screenshot({ path: '/home/user/v58-egret.png' });
  await page.evaluate(() => { window.__garden.rotation.y = 0; window.__cam(-1.0, 2.1, 4.2, -4.2, 0.55, 1.5); window.__ff && window.__ff(9); });
  await new Promise(r => setTimeout(r, 700));
  await page.screenshot({ path: '/home/user/v58-stem.png' });
  console.log('8 shots done');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
