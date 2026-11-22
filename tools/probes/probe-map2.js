const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/home/user/.local/share/choreographer/deps/chrome-linux64/chrome',
    args: ['--headless=new', '--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars'],
    defaultViewport: { width: 1280, height: 800 }
  });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 160)));
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('file:///home/user/game.html', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await new Promise(r => setTimeout(r, 5000));
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) { if (await page.evaluate(() => window.__bootOK === true)) break; await new Promise(r => setTimeout(r, 500)); }
  await page.mouse.click(400, 300);
  await page.evaluate(() => { window.__ff && window.__ff(5); });
  // 1) đợi chunk quanh hang (-18, 6) sinh
  await page.evaluate(() => { window.__playerPos.set(-15, 0, 8); window.__setOrbit(Math.atan2(-3, -2), 0.5); });
  await new Promise(r => setTimeout(r, 9000));
  const denStats = await page.evaluate(() => {
    let denChunk = 0, mushrooms = 0, pathPlanes = 0, bushes = 0, chunks = 0;
    window.__garden.children.forEach(c => {
      if (!c.userData) return; chunks++;
      if (c.userData.den) denChunk++;
    });
    window.__garden.traverse(o => {
      if (o.geometry && o.geometry.type === 'CylinderGeometry' && Math.abs(o.position.x - (-18)) < 5 && Math.abs(o.position.z - 6) < 5) mushrooms++;
    });
    let pathCount = 0;
    window.__garden.traverse(o => { if (o.material && o.material.fog && o.geometry && o.geometry.type === 'PlaneGeometry' && o.scale.x > 1.3 && o.scale.y < 2 && o.rotation.z !== 0) pathCount++; });
    return { chunks: chunks, denChunk: denChunk, mushrooms: mushrooms, pathPlanes: pathCount, denPos: window.__denPos };
  });
  console.log('DEN-STATS:', JSON.stringify(denStats));
  await page.screenshot({ path: '/home/user/shots/map-den.png' });
  // 2) thỏ: force spawn
  await page.evaluate(() => { window.__spawnRabbitNow(); });
  await new Promise(r => setTimeout(r, 3500));
  const rab = await page.evaluate(() => {
    const r = window.__rabbits && window.__rabbits[0];
    if (!r) return { ok: false };
    const wp = new THREE.Vector3(); r.m.getWorldPosition(wp);
    return { ok: true, pos: [+wp.x.toFixed(1), +wp.z.toFixed(1)], visible: r.m.visible, hop: +r.hop.toFixed(2) };
  });
  console.log('RABBIT:', JSON.stringify(rab));
  if (rab.ok) await page.screenshot({ path: '/home/user/shots/map-rabbit.png' });
  // 3) đường đất: đứng cạnh đường, nhìn DỌC theo hướng đường để thấy liền mạch qua chunk
  await page.evaluate(() => {
    const pz1 = 15.5 + 5.2 * Math.sin(2 * 0.085) + 3.1 * Math.sin(2 * 0.041 + 2);
    const pz2 = 15.5 + 5.2 * Math.sin(12 * 0.085) + 3.1 * Math.sin(12 * 0.041 + 2);
    window.__playerPos.set(2, 0, pz1 + 2.2);
    window.__setOrbit(Math.atan2(10 - 2, pz2 - pz1), 0.22);
  });
  await new Promise(r => setTimeout(r, 6000));
  await page.screenshot({ path: '/home/user/shots/map-path.png' });
  console.log('ERRORS=' + errs.length);
  errs.slice(0, 4).forEach(e => console.log('ERR:', e));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
