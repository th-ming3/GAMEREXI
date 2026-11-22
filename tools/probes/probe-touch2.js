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

  // chọn bướm onscreen + khoá ong[1] hover tại chỗ
  const targets = await page.evaluate(() => {
    const out = {};
    const g = window.__garden.children.filter(c => c.userData && c.userData.wings);
    for (let i = 0; i < g.length; i++) {
      const p = g[i].getWorldPosition(new THREE.Vector3()).project(window.__cam3d);
      const sx = Math.round((p.x * 0.5 + 0.5) * 1280), sy = Math.round((-p.y * 0.5 + 0.5) * 800);
      if (p.z < 1 && sx > 120 && sx < 1180 && sy > 80 && sy < 700) { out.bf = { sx, sy, i }; break; }
    }
    const b = window.__bees[1];
    b.userData.st = 0; b.userData.dur = 999;
    b.userData.hx = b.position.x; b.userData.hy = b.position.y; b.userData.hz = b.position.z;
    const p2 = b.getWorldPosition(new THREE.Vector3()).project(window.__cam3d);
    out.bee = { sx: Math.round((p2.x * 0.5 + 0.5) * 1280), sy: Math.round((-p2.y * 0.5 + 0.5) * 800), i: 1 };
    return out;
  });
  console.log('TARGETS:', JSON.stringify(targets));

  await page.mouse.click(targets.bee.sx, targets.bee.sy);
  await new Promise(r => setTimeout(r, 300));
  const beeState = await page.evaluate(i => ({ st: window.__bees[i].userData.st, dur: +window.__bees[i].userData.dur.toFixed(2) }), targets.bee.i);
  console.log('BEE-CLICK:', JSON.stringify(beeState), beeState.st === 1 && beeState.dur === 0.42 ? '✓ dart bỏ chạy (dur=0.42 = cạm bẫy chạm)' : '✗');

  await page.mouse.click(targets.bf.sx, targets.bf.sy);
  await new Promise(r => setTimeout(r, 250));
  const bfState = await page.evaluate(i => ({ startle: !!window.__garden.children.filter(c => c.userData && c.userData.wings)[i].__startleCheck || !!window.__butterflies[i].startle }), targets.bf.i);
  console.log('BF-CLICK:', JSON.stringify(bfState), bfState.startle ? '✓ hoảng bay xoắn' : '✗');
  console.log('ERRORS=' + errs.length);
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
