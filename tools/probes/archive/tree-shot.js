const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/home/user/.local/share/choreographer/deps/chrome-linux64/chrome',
    args: ['--headless=new', '--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars'],
    defaultViewport: { width: 1280, height: 800 }
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('file:///home/user/game.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await new Promise(r => setTimeout(r, 2600));
  const t0 = Date.now();
  while (Date.now() - t0 < 40000) { const ok = await page.evaluate(() => window.__bootOK === true); if (ok) break; await new Promise(r => setTimeout(r, 500)); }
  await page.evaluate(() => window.__ff && window.__ff(4));
  // tương tác đầu tiên mở gate game loop (giống probe-rpg2)
  await page.mouse.click(400, 300);
  // sinh chunk đủ rộng rồi tìm 1 cây
  await new Promise(r => setTimeout(r, 3000));
  // đợi Soldier decode xong + idle render ít nhất vài frame
  const tL = Date.now();
  while (Date.now() - tL < 60000) {
    if (await page.evaluate(() => window.__char.children.length > 0)) break;
    await new Promise(r => setTimeout(r, 1000));
  }
  await new Promise(r => setTimeout(r, 4000));
  const found = await page.evaluate(() => {
    let treePos = null;
    window.__garden.children.forEach(c => {
      if (treePos || !c.visible || !c.userData || !c.userData.hasTree) return;
      // canopy = mesh có material.map === leafTex? tìm group con có 4 plane: dễ nhất tìm mesh có geometry PlaneGeometry scale lớn
      c.children.forEach(m => {
        if (treePos || !(m instanceof THREE.Group)) return;
        if (m.userData.isTree3D) {
          const wp = new THREE.Vector3();
          m.getWorldPosition(wp);
          treePos = wp.toArray().map(v => +v.toFixed(2));
        }
      });
    });
    return treePos;
  });
  console.log('TREE at:', JSON.stringify(found));
  if (found) {
    await page.evaluate(([fx, fy, fz]) => {
      const tw = new THREE.Vector3(fx, fy, fz);
      const lt = window.__garden.worldToLocal(tw.clone());
      const lp = lt.clone(); lp.x -= 2.4; lp.z -= 1.4;
      window.__playerPos.set(lp.x, 0, lp.z);
      const pw = window.__garden.localToWorld(lp.clone());
      const yaw = Math.atan2(tw.x - pw.x, tw.z - pw.z);
      window.__setOrbit && window.__setOrbit(yaw, 0.12);
    }, found);
    await new Promise(r => setTimeout(r, 3000));
    await page.screenshot({ path: '/home/user/shots/tree-close.png' });
  }
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
