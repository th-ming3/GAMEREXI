const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/home/user/.local/share/choreographer/deps/chrome-linux64/chrome',
    args: ['--headless=new', '--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars'],
    defaultViewport: { width: 1280, height: 800 }
  });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 140)));
  let posts = 0;
  page.on('request', r => { if (r.url().includes('/api/')) posts++; });
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('file:///home/user/game.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await new Promise(r => setTimeout(r, 2600));
  const t0 = Date.now();
  while (Date.now() - t0 < 40000) {
    const ok = await page.evaluate(() => window.__bootOK === true);
    if (ok) break;
    await new Promise(r => setTimeout(r, 500));
  }
  await new Promise(r => setTimeout(r, 800));
  // UI đã bị xóa?
  const ui = await page.evaluate(() => ({
    rail: !!document.querySelector('.app'),
    hint: !!document.querySelector('.hint'),
    fps: document.getElementById('hudFps').textContent,
    tint: !!document.getElementById('nightTint')
  }));
  await page.mouse.click(500, 300);
  await new Promise(r => setTimeout(r, 300));
  // WASD: nhấn W 1.2s → CAM phải trôi
  const z0 = await page.evaluate(() => window.CAM.z);
  await page.keyboard.down('w');
  await new Promise(r => setTimeout(r, 4200));
  await page.keyboard.up('w');
  const z1 = await page.evaluate(() => window.CAM.z);
  // Q lên
  const y0 = await page.evaluate(() => window.CAM.y);
  await page.keyboard.down('e');
  await new Promise(r => setTimeout(r, 4200));
  await page.keyboard.up('e');
  const y1 = await page.evaluate(() => window.CAM.y);
  console.log('UI:', JSON.stringify(ui), 'errors=' + errs.length, 'POST=' + posts);
  console.log('WASD: z', z0.toFixed(2), '→', z1.toFixed(2), '(W đi tới OK=' + (z1 < z0 - 0.05) + ')');
  console.log('QE  : y', y0.toFixed(2), '→', y1.toFixed(2), '(E bay lên OK=' + (y1 > y0 + 0.04) + ')');
  // 3 pha mặt trời
  const phases = [[1.05, 'game-day'], [2.6, 'game-dusk'], [4.3, 'game-night']];
  for (const [a, name] of phases) {
    await page.evaluate(a2 => window.__setSun(a2), a);
    await new Promise(r => setTimeout(r, 450));
    await page.screenshot({ path: `/home/user/${name}.png` });
  }
  const sun = await page.evaluate(() => ({ a: +window.__sunNow().toFixed(2), fps: document.getElementById('hudFps').textContent }));
  console.log('SUN:', JSON.stringify(sun));
  console.log('GAME:', errs.length === 0 ? 'PASS' : 'FAIL ' + errs.join(' | '));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
