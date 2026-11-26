const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/home/user/.local/share/choreographer/deps/chrome-linux64/chrome',
    args: ['--headless=new', '--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars'],
    defaultViewport: { width: 1280, height: 800 }
  });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('file:///home/user/game.html', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await new Promise(r => setTimeout(r, 5000));
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) {
    const ok = await page.evaluate(() => window.__bootOK === true);
    if (ok) break;
    await new Promise(r => setTimeout(r, 500));
  }
  await page.evaluate(() => { window.__ff && window.__ff(4); });
  await new Promise(r => setTimeout(r, 1200));
  const st = await page.evaluate(() => {
    const c = window.__char;
    return { meshes: c.children.length ? (function (n) { let k = 0; c.children[0].traverse(() => k++); return k; })() : 0, loaded: c.children.length > 0 };
  });
  console.log('CHAR-GLB:', JSON.stringify(st));
  // đi bộ để walk anim bật
  await page.mouse.click(500, 300);
  await page.keyboard.down('w');
  await new Promise(r => setTimeout(r, 5000));
  await page.keyboard.up('w');
  const walkState = await page.evaluate(() => {
    const p = window.__playerPos;
    return { x: +p.x.toFixed(2), z: +p.z.toFixed(2), camDist: +window.__cam3d.position.distanceTo(new THREE.Vector3(p.x, 1.3, p.z)).toFixed(2) };
  });
  console.log('WALK-STATE:', JSON.stringify(walkState));
  // đ1ến gần cây: tìm cây rồi đặt player cạnh
  await page.evaluate(() => {
    let tp = null;
    window.__garden.children.forEach(c => {
      if (tp || !c.visible || !c.userData || !c.userData.hasTree) return;
      c.children.forEach(m => {
        if (tp || !(m instanceof THREE.Group) || m.children.length !== 1) return;
        const wp = new THREE.Vector3(); m.getWorldPosition(wp);
        tp = wp.toArray();
      });
    });
    if (tp) {
      const lp = window.__garden.worldToLocal(new THREE.Vector3(tp[0] + 2.4, 0, tp[2] + 1.4));
      window.__playerPos.set(lp.x, 0, lp.z);
      window.__setOrbit(Math.atan2(-2.4, -1.4), 0.12);
    }
  });
  await new Promise(r => setTimeout(r, 1400));
  await page.screenshot({ path: '/home/user/shots/rpg-soldier.png' });
  const trees = await page.evaluate(() => { let n = 0; window.__garden.children.forEach(c => { if (c.userData && c.userData.hasTree) n++; }); return n; });
  console.log('TREES:', trees, 'ERRORS=' + errs.length);
  errs.slice(0, 5).forEach(e => console.log('ERR:', e));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
