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
  await new Promise(r => setTimeout(r, 2000));
  // 1) slime trong suốt cận
  await page.evaluate(() => {
    const VP = Object.getPrototypeOf(window.__scene3d.position).constructor;
    const s0 = window.__slimes[0];
    const w = window.__garden.localToWorld(new VP(s0.g.position.x + 1.4, 0, s0.g.position.z + 1.3));
    window.__playerPos.set(w.x, 0, w.z);
    window.__setOrbit(Math.atan2(-1.4, -1.3), 0.14);
  });
  await new Promise(r => setTimeout(r, 4000));
  await page.screenshot({ path: '/home/user/shots/fix-slime.png' });
  // 2) thỏ giữa nhịp (spawn ngay)
  await page.evaluate(() => { window.__spawnRabbitNow && window.__spawnRabbitNow(); });
  await new Promise(r => setTimeout(r, 1400));
  await page.screenshot({ path: '/home/user/shots/fix-rabbit.png' });
  // 3) bay: tư thế glide
  await page.keyboard.down('b'); await new Promise(r => setTimeout(r, 80)); await page.keyboard.up('b');
  await page.evaluate(() => { window.__setFlyY && window.__setFlyY(5.2); });
  await page.evaluate(() => { window.__playerPos.set(2.5, 0, 10.5); window.__setOrbit(0.4, 0.05); });
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: '/home/user/shots/fix-fly.png' });
  const flyY = await page.evaluate(() => +window.__char.position.y.toFixed(2));
  console.log('FLY-Y:', flyY);
  // 4) đêm: đom đóm teleport quanh player (headless lerp chậm — thực 60fps tự tụ về)
  await page.evaluate(() => { window.__setSun && window.__setSun(4.71); });
  await page.evaluate(() => { window.__playerPos.set(0.4, 0, 6.8); window.__setOrbit(0.6, 0.1); });
  await new Promise(r => setTimeout(r, 1000));
  await page.evaluate(() => {
    const V = new (Object.getPrototypeOf(window.__scene3d.position).constructor)();
    (window.__fireflies || []).forEach((f, i) => {
      const a = i / 30 * 6.283, r = 2 + (i % 4) * 0.8;
      f.cx = 0.4 + Math.cos(a) * r; f.cz = 6.8 + Math.sin(a) * r; f.r = 0.3;
      f.m.position.set(f.cx, 1 + (i % 5) * 0.25, f.cz);
    });
  });
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: '/home/user/shots/fix-night.png' });
  console.log('ERRORS=' + errs.length); errs.slice(0, 3).forEach(e => console.log('ERR:', e));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
