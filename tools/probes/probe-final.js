const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/home/user/.local/share/choreographer/deps/chrome-linux64/chrome',
    args: ['--headless=new', '--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars'],
    defaultViewport: { width: 1280, height: 800 }
  });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 120)));
  await page.evaluateOnNewDocument(() => {
    try {
      localStorage.setItem('consent', 'Vâng');
      localStorage.setItem('freeDay', '2026-11-28');
      localStorage.setItem('food', 'Bánh mì chả cá');
      localStorage.setItem('drink', 'Cà phê muối');
      localStorage.setItem('place', 'Phố cổ Hà Nội');
    } catch (e) {}
  });
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto('file:///home/user/done.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await new Promise(r => setTimeout(r, 2600));
  const t0 = Date.now();
  while (Date.now() - t0 < 40000) {
    const ok = await page.evaluate(() => window.__bootOK === true);
    if (ok) break;
    await new Promise(r => setTimeout(r, 500));
  }
  // gesture để kích audio
  await page.mouse.click(400, 600);
  await new Promise(r => setTimeout(r, 1800));
  const amb = await page.evaluate(() => ({
    started: !!(window.__amb && window.__amb.started),
    btn: !!document.querySelector('button[aria-label="Bật tắt âm thanh vườn"]'),
    btnText: (document.querySelector('button[aria-label="Bật tắt âm thanh vườn"]') || {}).textContent || null
  }));
  // damping camera: đổi pointer, camera phải trôi dần (không nhảy tức thời)
  const p1 = await page.evaluate(() => window.__cam3d.position.x);
  await page.mouse.move(400, 400);
  await page.mouse.move(1180, 400, { steps: 4 });
  const p2 = await page.evaluate(() => window.__cam3d.position.x);
  await new Promise(r => setTimeout(r, 700));
  const p3 = await page.evaluate(() => window.__cam3d.position.x);
  console.log('AMB:', JSON.stringify(amb), 'errors=' + errs.length);
  console.log(`DAMP: move→x${p2.toFixed(3)} →0.7s→ x${p3.toFixed(3)} (lerp đúng nếu x3 > x2 tiếp tục trôi)`);
  console.log('CAM-DAMP-OK:', p3 > p2 && errs.length === 0);
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
