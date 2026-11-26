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
  // 1) nhà gỗ cận
  await page.evaluate(() => { window.__playerPos.set(23.5, 0, 12.5); window.__setOrbit(Math.atan2(2.5, -3.5), 0.22); });
  await new Promise(r => setTimeout(r, 3500));
  await page.screenshot({ path: '/home/user/shots/map-cabin.png' });
  // 2) địa hình đồi gò + đá tảng (đi xa về tây)
  await page.evaluate(() => { window.__playerPos.set(-22, 0, -14); window.__setOrbit(2.4, 0.3); });
  await new Promise(r => setTimeout(r, 4000));
  await page.screenshot({ path: '/home/user/shots/map-hills.png' });
  // 3) slime mới cận
  const sl = await page.evaluate(() => {
    const s = (window.__slimes || [])[0];
    return s ? [+s.g.position.x.toFixed(1), +s.g.position.z.toFixed(1)] : null;
  });
  console.log('SLIME-POS:', JSON.stringify(sl));
  if (sl) {
    await page.evaluate((p) => { window.__playerPos.set(p[0] + 2.4, 0, p[1] + 2.2); window.__setOrbit(Math.atan2(-2.4, -2.2), 0.2); }, sl);
    await new Promise(r => setTimeout(r, 2500));
    await page.screenshot({ path: '/home/user/shots/map-slime.png' });
  }
  // 4) đêm: dơi + đá phát sáng + sáng hồ
  await page.evaluate(() => { window.__setSun && window.__setSun(4.71); });
  await new Promise(r => setTimeout(r, 2500));
  await page.evaluate(() => { window.__playerPos.set(-14, 0, -2); window.__setOrbit(1.6, 0.18); });
  await new Promise(r => setTimeout(r, 3000));
  await page.screenshot({ path: '/home/user/shots/map-night.png' });
  console.log('ERRORS=' + errs.length); errs.slice(0, 3).forEach(e => console.log('ERR:', e));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
