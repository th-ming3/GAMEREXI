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
  await page.goto('file:///home/user/game.html', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await new Promise(r => setTimeout(r, 2600));
  const t0 = Date.now();
  while (Date.now() - t0 < 40000) {
    const ok = await page.evaluate(() => window.__bootOK === true);
    if (ok) break;
    await new Promise(r => setTimeout(r, 500));
  }
  await page.evaluate(() => window.__ff && window.__ff(2));
  await new Promise(r => setTimeout(r, 500));
  const toScreen = () => page.evaluate(() => {
    const v = new THREE.Vector3();
    const proj = o => {
      (o.getWorldPosition ? o.getWorldPosition(v) : v.copy(o.position)).clone();
      const p = (o.getWorldPosition ? o.getWorldPosition(new THREE.Vector3()) : o.position.clone()).project(window.__cam3d);
      return { sx: Math.round((p.x * 0.5 + 0.5) * 1280), sy: Math.round((-p.y * 0.5 + 0.5) * 800), z: p.z };
    };
    return {
      bee: proj(window.__bees[0]),
      bf: proj(window.__butterflies[0].g),
      sfx: typeof window.__sfx
    };
  });
  const sc = await toScreen();
  console.log('SCREEN:', JSON.stringify(sc));
  // click ong
  await page.mouse.click(sc.bee.sx, sc.bee.sy);
  await new Promise(r => setTimeout(r, 350));
  const beeState = await page.evaluate(() => ({ st: window.__bees[0].userData.st, dur: +window.__bees[0].userData.dur.toFixed(2) }));
  console.log('BEE-CLICK → state:', JSON.stringify(beeState), '(mong st=1 dart bỏ chạy)');
  await new Promise(r => setTimeout(r, 1200));
  // click bướm
  await page.mouse.click(sc.bf.sx, sc.bf.sy);
  await new Promise(r => setTimeout(r, 250));
  const bfState = await page.evaluate(() => {
    const B = window.__butterflies[0];
    return { startle: !!B.startle, flap: B.flapBoost || null };
  });
  console.log('BF-CLICK → state:', JSON.stringify(bfState), '(mong startle=true)');
  console.log('SFX-CHIME:', await page.evaluate(() => typeof window.__sfx.chime === 'function'), ' errors=' + errs.length);
  await page.screenshot({ path: '/home/user/touch-bf.png' });
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
