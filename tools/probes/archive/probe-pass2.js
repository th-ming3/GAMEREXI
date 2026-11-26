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
  await page.goto('file:///home/user/game.html', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await new Promise(r => setTimeout(r, 5000));
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) { if (await page.evaluate(() => window.__bootOK === true)) break; await new Promise(r => setTimeout(r, 500)); }
  await page.mouse.click(400, 300);
  await page.evaluate(() => { window.__ff && window.__ff(5); });
  // slime gần player
  await new Promise(r => setTimeout(r, 3000));
  const sl = await page.evaluate(() => {
    const s = (window.__slimes || [])[0];
    if (!s) return { ok: false };
    return { ok: true, pos: [+s.g.position.x.toFixed(1), +s.g.position.z.toFixed(1)], squashY: +s.body.scale.y.toFixed(2), blink: s.blink > 0 };
  });
  console.log('SLIME:', JSON.stringify(sl));
  if (sl.ok) {
    await page.evaluate((p) => { window.__playerPos.set(p[0] + 2.6, 0, p[1] + 2.0); window.__setOrbit(Math.atan2(-2.6, -2.0), 0.18); }, sl.pos);
    await new Promise(r => setTimeout(r, 2500));
    await page.screenshot({ path: '/home/user/shots/map-slime.png' });
  }
  // hồ: lá súng + cá nhỏ
  await page.evaluate(() => { window.__playerPos.set(14.6, 0, 37.6); window.__setOrbit(Math.atan2(-4.6, -3.6), 0.42); });
  await new Promise(r => setTimeout(r, 6000));
  const lake2 = await page.evaluate(() => ({ lilies: (window.__lakeLilies || []).length, smallFish: (window.__lakeFishSmall || []).length }));
  console.log('LAKE-DRESS:', JSON.stringify(lake2));
  await page.screenshot({ path: '/home/user/shots/map-lily.png' });
  console.log('ERRORS=' + errs.length);
  errs.slice(0, 3).forEach(e => console.log('ERR:', e));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
