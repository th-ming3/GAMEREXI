const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/home/user/.local/share/choreographer/deps/chrome-linux64/chrome',
    args: ['--headless=new', '--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
    defaultViewport: { width: 1280, height: 800 }
  });
  const page = await browser.newPage();
  await page.evaluateOnNewDocument(() => { try { localStorage.removeItem('worldSave'); } catch (e) {} });
  await page.goto('file:///home/user/game.html', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await new Promise(r => setTimeout(r, 5000));
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) { if (await page.evaluate(() => window.__bootOK === true)) break; await new Promise(r => setTimeout(r, 500)); }
  await page.mouse.click(400, 300);
  await new Promise(r => setTimeout(r, 1500));
  const info = await page.evaluate(() => {
    const V = new (Object.getPrototypeOf(window.__scene3d.position).constructor)();
    let well = null;
    window.__scene3d.traverse(o => { if (o.userData && o.userData.isWell && !well) { well = o; } });
    if (!well) return { no: true };
    well.updateWorldMatrix(true, false);
    const wp = well.getWorldPosition(new (Object.getPrototypeOf(window.__scene3d.position).constructor)());
    const charParentName = window.__char.parent === window.__garden ? '__garden' : (window.__char.parent && window.__char.parent.type);
    // toạ độ well trong không gian __garden (nơi playerPos sống)
    const wl = window.__char.parent.worldToLocal(V.copy(wp));
    return {
      wellWorld: [+wp.x.toFixed(2), +wp.y.toFixed(2), +wp.z.toFixed(2)],
      wellInCharSpace: [+wl.x.toFixed(2), +wl.z.toFixed(2)],
      gardenRotY: +window.__garden.rotation.y.toFixed(3),
      gardenPos: [window.__garden.position.x, window.__garden.position.y, window.__garden.position.z],
      charParent: charParentName,
      wellParentChain: (function () { let p = well.parent, n = []; while (p && n.length < 3) { n.push(p.type + (p === window.__garden ? '(=garden)' : '')); p = p.parent; } return n; })(),
      playerPosNow: [window.__playerPos.x, window.__playerPos.z]
    };
  });
  console.log(JSON.stringify(info, null, 1));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
