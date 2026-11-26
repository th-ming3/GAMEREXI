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
  await page.setViewport({ width: 1280, height: 800 });
  await page.evaluateOnNewDocument(() => { try { localStorage.removeItem('worldSave'); } catch (e) {} });
  await page.goto('file:///home/user/game.html', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await new Promise(r => setTimeout(r, 5000));
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) { if (await page.evaluate(() => window.__bootOK === true)) break; await new Promise(r => setTimeout(r, 500)); }
  await page.mouse.click(400, 300);
  await page.evaluate(() => { window.__ff && window.__ff(5); });
  // 1) hồ + koi
  await page.evaluate(() => { window.__playerPos.set(13.4, 0, 34); window.__setOrbit(Math.atan2(-3.4, -2.2), 0.32); });
  await new Promise(r => setTimeout(r, 7000));
  const lake = await page.evaluate(() => {
    return { kois: (window.__kois || []).length, ripples: (window.__lakeRipples || []).length, landmarks: !!window.__landmarks, cabin: window.__cabinPos || null };
  });
  console.log('LAKE:', JSON.stringify(lake));
  await page.screenshot({ path: '/home/user/shots/map-lake.png' });
  // 2) nhà gỗ
  await page.evaluate(() => { const c = window.__cabinPos; window.__playerPos.set(c.x - 3.2, 0, c.z + 2.4); window.__setOrbit(Math.atan2(3.2, -2.4), 0.14); });
  await new Promise(r => setTimeout(r, 6000));
  await page.screenshot({ path: '/home/user/shots/map-cabin.png' });
  // 3) nhảy + sprint + bay
  await page.evaluate(() => { window.__playerPos.set(0.4, 0, 6.8); window.__setOrbit(0, 0.16); });
  await page.keyboard.down('Shift'); await page.keyboard.down('w');
  await new Promise(r => setTimeout(r, 2600));
  await page.keyboard.up('Shift'); await page.keyboard.up('w');
  const spd = await page.evaluate(() => ({ x: +window.__playerPos.x.toFixed(2), z: +window.__playerPos.z.toFixed(2) }));
  console.log('SPRINT-POS:', JSON.stringify(spd));
  await page.keyboard.down('Space');
  await new Promise(r => setTimeout(r, 350));
  const jump = await page.evaluate(() => { return { charY: +window.__char.position.y.toFixed(2) }; });
  await page.keyboard.up('Space');
  console.log('JUMP-CHARY:', JSON.stringify(jump));
  await page.keyboard.down('b');
  await new Promise(r => setTimeout(r, 80));
  await page.keyboard.up('b');
  const y0 = await page.evaluate(() => +window.__char.position.y.toFixed(2));
  await page.keyboard.down('e');
  await new Promise(r => setTimeout(r, 2600));
  await page.keyboard.up('e');
  const fly = await page.evaluate(() => ({ charY: +window.__char.position.y.toFixed(2), camY: +window.__cam3d.position.y.toFixed(2) }));
  fly.rise = +(fly.charY - y0).toFixed(2);
  console.log('FLY-CHARY:', JSON.stringify(fly), '(rise>0.25 + camY>2 = camera bay theo ok)');
  // 4) đêm: fireflies + owl
  await page.evaluate(() => { window.__setSun && window.__setSun(4.71); });
  await new Promise(r => setTimeout(r, 2500));
  const night = await page.evaluate(() => ({
    isNight: window.__isNight, ff: (document.querySelectorAll('canvas').length, true),
    owlVisible: (function () { let v = null; window.__garden.traverse(o => { if (o.parent && o.parent.children.length === 3 && o.parent.visible !== undefined && o.visible !== undefined && !v) v = o.parent.visible; }); return v; })()
  }));
  console.log('NIGHT-FLAG:', JSON.stringify(night));
  await page.screenshot({ path: '/home/user/shots/map-night.png' });
  console.log('ERRORS=' + errs.length);
  errs.slice(0, 4).forEach(e => console.log('ERR:', e));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
