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
  const info = await page.evaluate(() => {
    const VP = Object.getPrototypeOf(window.__scene3d.position).constructor;
    let well = null, kids = 0;
    window.__scene3d.traverse(o => { if (o.userData && o.userData.isWell && !well) { well = o; } });
    if (!well) return { none: true };
    well.updateWorldMatrix(true, false);
    const wp = well.getWorldPosition(new VP());
    const loc = window.__char.parent.worldToLocal(wp.clone());
    window.__playerPos.set(loc.x + 0.6, 0, loc.z + 0.6);
    window.__setOrbit(Math.atan2(-0.6, -0.6), 0.3);
    // cột đỏ đánh dấu
    const mk = new (Object.getPrototypeOf(window.__scene3d.position).constructor === undefined ? Object : Object)();
    const red = new window.__scene3d.children[0].constructor === undefined ? null : null;
    return { world: [+wp.x.toFixed(1), +wp.y.toFixed(2), +wp.z.toFixed(1)], local: [+loc.x.toFixed(1), +loc.z.toFixed(1)], nKids: well.children.length };
  });
  console.log('WELL-DBG:', JSON.stringify(info));
  await new Promise(r => setTimeout(r, 6000));
  await page.screenshot({ path: '/home/user/shots/well-close.png' });
  console.log('ERRORS=' + errs.length); errs.slice(0, 3).forEach(e => console.log('ERR:', e));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
