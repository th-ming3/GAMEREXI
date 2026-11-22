const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/home/user/.local/share/choreographer/deps/chrome-linux64/chrome',
    args: ['--headless=new', '--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars'],
    defaultViewport: { width: 1280, height: 800 }
  });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 150)));
  await page.evaluateOnNewDocument(() => { try { localStorage.removeItem('worldSave'); } catch (e) {} });
  await page.goto('file:///home/user/game.html', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await new Promise(r => setTimeout(r, 5000));
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) { if (await page.evaluate(() => window.__bootOK === true)) break; await new Promise(r => setTimeout(r, 500)); }
  await page.mouse.click(400, 300);
  await page.evaluate(() => { window.__ff && window.__ff(5); });
  await new Promise(r => setTimeout(r, 2500));
  // đếm landmark + chụp cận cụm lạ
  const lmCk = await page.evaluate(() => {
    let well = null, big = null;
    window.__scene3d.traverse(o => {
      if (o.userData && o.userData.isWell && !well) { const wp = o.getWorldPosition(new (Object.getPrototypeOf(o.position).constructor)()); well = [+wp.x.toFixed(1), +wp.y.toFixed(2), +wp.z.toFixed(1), o.visible]; }
      if (o.userData && o.userData.isBigTree && !big) { const wp = o.getWorldPosition(new (Object.getPrototypeOf(o.position).constructor)()); big = [+wp.x.toFixed(1), +wp.y.toFixed(2), +wp.z.toFixed(1), o.visible]; }
    });
    return { well, big };
  });
  console.log('LM-CHECK:', JSON.stringify(lmCk));
  // chụp bằng world-space: camera ngoài scene nhìn thẳng vào landmark
  const wps = await page.evaluate(() => {
    let wW = null, wB = null;
    window.__scene3d.traverse(o => {
      const V = new (Object.getPrototypeOf(o.position).constructor)();
      if (o.userData && o.userData.isWell && !wW) { o.getWorldPosition(V); wW = [V.x, V.y, V.z]; }
      if (o.userData && o.userData.isBigTree && !wB) { o.getWorldPosition(V); wB = [V.x, V.y, V.z]; }
    });
    return { wW, wB };
  });
  // đặt player = worldToLocal(wellWorld + worldOffset) — chính xác mọi xoay
  const placed = await page.evaluate(() => {
    const VP = Object.getPrototypeOf(window.__scene3d.position).constructor;
    let well = null, big = null;
    window.__scene3d.traverse(o => {
      if (o.userData && o.userData.isWell && !well) well = o;
      if (o.userData && o.userData.isBigTree && !big) big = o;
    });
    function place(obj, ox, oz, pitch) {
      obj.updateWorldMatrix(true, false);
      const wp = obj.getWorldPosition(new VP());
      const tgt = wp.clone().add(new VP(ox, 0, oz));
      const loc = window.__garden.localToWorld(tgt);
      window.__playerPos.set(loc.x, 0, loc.z);
      window.__setOrbit(Math.atan2(-ox, -oz), pitch);
      return [+wp.x.toFixed(1), +wp.y.toFixed(2), +wp.z.toFixed(1), +loc.x.toFixed(1), +loc.z.toFixed(1)];
    }
    const wI = place(well, 2.3, 1.9, 0.2);
    return { wI };
  });
  console.log('WELL-PLACED:', JSON.stringify(placed));
  await new Promise(r => setTimeout(r, 7000));
  await page.screenshot({ path: '/home/user/shots/map-well.png' });
  const placedB = await page.evaluate(() => {
    const VP = Object.getPrototypeOf(window.__scene3d.position).constructor;
    let big = null;
    window.__scene3d.traverse(o => { if (o.userData && o.userData.isBigTree && !big) big = o; });
    big.updateWorldMatrix(true, false);
    const wp = big.getWorldPosition(new VP());
    const tgt = wp.clone().add(new VP(4.5, 0, 3.4));
    const loc = window.__garden.localToWorld(tgt);
    window.__playerPos.set(loc.x, 0, loc.z);
    window.__setOrbit(Math.atan2(-4.5, -3.4), 0.3);
    return [+wp.x.toFixed(1), +wp.z.toFixed(1)];
  });
  console.log('BIG-PLACED:', JSON.stringify(placedB));
  await new Promise(r => setTimeout(r, 7000));
  await page.screenshot({ path: '/home/user/shots/map-bigtree.png' });
  // chuồn chuồn ngày (đếm visible)
  const df = await page.evaluate(() => {
    let n = 0, vis = 0;
    window.__scene3d.traverse(o => { if (o.userData && o.userData.spd !== undefined && o.userData.r !== undefined) { n++; if (o.visible) vis++; } });
    return { dragonflyGroups: n, visibleDay: vis };
  });
  console.log('DRAGONFLY:', JSON.stringify(df));
  const lm = await page.evaluate(() => window.__landmarks);
  console.log('LANDMARKS:', JSON.stringify(lm));
  console.log('ERRORS=' + errs.length); errs.slice(0, 3).forEach(e => console.log('ERR:', e));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
