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
  const sl = await page.evaluate(() => {
    const s = (window.__slimes || [])[0];
    return s ? [+s.g.position.x.toFixed(1), +s.g.position.z.toFixed(1)] : null;
  });
  // macro slime: đặt player sát slime + camera orbit ngang mặt
  await page.evaluate((p) => { window.__playerPos.set(p[0] + 1.15, 0, p[1] + 1.15); window.__setOrbit(Math.atan2(-1.15, -1.15), 0.3); }, sl);
  await new Promise(r => setTimeout(r, 2000));
  await page.screenshot({ path: '/home/user/shots/macro-slime.png' });
  // macro đá: player cạnh cụm đá đen
  await page.evaluate(() => { window.__playerPos.set(-27.6, 0, -10.4); window.__setOrbit(2.3, 0.24); });
  await new Promise(r => setTimeout(r, 2500));
  await page.screenshot({ path: '/home/user/shots/macro-rock.png' });
  console.log('ERRORS=' + errs.length); errs.slice(0, 3).forEach(e => console.log('ERR:', e));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
