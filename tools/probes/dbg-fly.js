const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/home/user/.local/share/choreographer/deps/chrome-linux64/chrome',
    args: ['--headless=new', '--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader'],
    defaultViewport: { width: 1280, height: 800 }
  });
  const page = await browser.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(String(e).slice(0, 200)));
  await page.goto('file:///home/user/game.html', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await new Promise(r => setTimeout(r, 5000));
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) { if (await page.evaluate(() => window.__bootOK === true)) break; await new Promise(r => setTimeout(r, 500)); }
  await page.mouse.click(400, 300);
  await new Promise(r => setTimeout(r, 1500));
  await page.keyboard.down('b'); await new Promise(r => setTimeout(r, 80)); await page.keyboard.up('b');
  const s1 = await page.evaluate(() => ({ fly: !!window.__flyFlag, charY: +window.__char.position.y.toFixed(2) }));
  console.log('AFTER-B:', JSON.stringify(s1));
  await page.keyboard.down('e');
  await new Promise(r => setTimeout(r, 600));
  const s2 = await page.evaluate(() => ({ charY: +window.__char.position.y.toFixed(2) }));
  console.log('E-HOLD-0.6:', JSON.stringify(s2));
  await new Promise(r => setTimeout(r, 700));
  const s3 = await page.evaluate(() => ({ charY: +window.__char.position.y.toFixed(2) }));
  console.log('E-HOLD-1.3:', JSON.stringify(s3));
  await page.keyboard.up('e');
  console.log('ERRORS=' + errs.length); errs.slice(0, 3).forEach(e => console.log('ERR:', e));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
