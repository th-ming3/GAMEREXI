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
  await page.evaluateOnNewDocument(() => { try { localStorage.removeItem('worldSave'); } catch (e) {} });
  await page.goto('file:///home/user/game.html', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await new Promise(r => setTimeout(r, 5000));
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) { if (await page.evaluate(() => window.__bootOK === true)) break; await new Promise(r => setTimeout(r, 500)); }
  await page.mouse.click(400, 300);
  await page.evaluate(() => { window.__ff && window.__ff(5); });
  await new Promise(r => setTimeout(r, 2000));
  const res = await page.evaluate(() => {
    const VP = Object.getPrototypeOf(window.__scene3d.position).constructor;
    let well = null;
    window.__scene3d.traverse(o => { if (o.userData && o.userData.isWell && !well) well = o; });
    well.updateWorldMatrix(true, false);
    const wp = well.getWorldPosition(new VP());
    const loc = window.__char.parent.worldToLocal(wp.clone());
    // khối đỏ đánh dấu tại chính vị trí giếng trong garden space
    const T = window.__scene3d.constructor; // Group constructor? dùng Mesh qua key
    const redBox = new (well.children[0].constructor)(new (well.children[0].geometry.constructor)(1.2, 1.2, 1.2), new (well.children[0].material.constructor)({ color: 0xff2222 }));
    redBox.position.set(loc.x, loc.y + 0.6, loc.z);
    window.__char.parent.add(redBox);
    // ép mọi mesh của giếng thành đỏ basic
    well.traverse(m => { if (m.isMesh) { m.material = redBox.material; } });
    // đặt player cạnh đó
    window.__playerPos.set(loc.x + 1.5, 0, loc.z + 1.5);
    window.__setOrbit(Math.atan2(-1.5, -1.5), 0.22);
    return { world: [+wp.x.toFixed(1), +wp.y.toFixed(2), +wp.z.toFixed(1)], local: [+loc.x.toFixed(1), +loc.y.toFixed(2), +loc.z.toFixed(1)], wellVis: well.visible, parentVis: well.parent.visible };
  });
  console.log('DBG:', JSON.stringify(res));
  await new Promise(r => setTimeout(r, 5000));
  await page.screenshot({ path: '/home/user/shots/well-red.png' });
  console.log('ERRORS=' + errs.length); errs.slice(0, 3).forEach(e => console.log('ERR:', e));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
