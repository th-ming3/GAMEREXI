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
  await page.evaluateOnNewDocument(() => { try { localStorage.removeItem('worldSave'); } catch (e) {} });
  await page.goto('file:///home/user/game.html', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await new Promise(r => setTimeout(r, 5000));
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) { if (await page.evaluate(() => window.__bootOK === true)) break; await new Promise(r => setTimeout(r, 500)); }
  await page.mouse.click(400, 300);
  await page.evaluate(() => { window.__ff && window.__ff(5); window.__setSun && window.__setSun(4.71); });
  await new Promise(r => setTimeout(r, 6000));
  const d = await page.evaluate(() => {
    let n = 0, vis = 0, near = 0, sample = null;
    window.__scene3d.traverse(o => {
      if (o.isSprite && o.material && o.material.map && o.material.blending === 2 && o.material.map.image && o.material.map.image.width === 64) {
        n++;
        if (o.visible) vis++;
        const dist = Math.hypot(o.position.x, o.position.z - 6.8);
        if (dist < 10) { near++; if (!sample) sample = [+o.position.x.toFixed(1), +o.position.y.toFixed(1), +o.position.z.toFixed(1), +o.scale.x.toFixed(2), +o.material.opacity.toFixed(2)]; }
      }
    });
    return { sprites: n, visible: vis, nearPlayer: near, sample, isNight: window.__isNight };
  });
  console.log('FF-DBG:', JSON.stringify(d));
  console.log('ERRORS=' + errs.length);
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
