const puppeteer = require('puppeteer-core');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/home/user/.local/share/choreographer/deps/chrome-linux64/chrome',
    args: ['--headless=new', '--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars'],
    defaultViewport: { width: 1280, height: 800 }
  });
  const page = await browser.newPage();
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
  await page.evaluate(() => window.__ff && window.__ff(3));
  await new Promise(r => setTimeout(r, 500));

  // đo FPS 1s
  const fps = await page.evaluate(() => new Promise(res => {
    let n = 0; const s = performance.now();
    (function loop() { n++; if (performance.now() - s < 1000) requestAnimationFrame(loop); else res(n); })();
  }));

  const N = 26, DT = 130;
  const samp = () => page.evaluate(() => {
    const v = new THREE.Vector3();
    const grab = arr => arr.map(o => {
      o.getWorldPosition ? o.getWorldPosition(v) : v.copy(o.position);
      return [v.x, v.y, v.z];
    });
    return {
      bees: grab(window.__bees),
      bfs: grab(window.__garden.children.filter(c => c.userData && c.userData.wings)),
      birds: grab(window.__birds)
    };
  });
  const frames = [];
  for (let i = 0; i < N; i++) { frames.push(await samp()); await new Promise(r => setTimeout(r, DT)); }
  const audit = (name, key, tp) => {
    let maxStep = 0, teleports = 0, vmax = 0;
    for (let f = 1; f < frames.length; f++) {
      frames[f][key].forEach((p, i) => {
        const q = frames[f - 1][key][i]; if (!q) return;
        const d = Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
        if (d > maxStep) maxStep = d;
        const v = d / (DT / 1000);
        if (v > vmax && d < tp) vmax = v;
        if (d > tp) teleports++;
      });
    }
    console.log(`${name}: maxStep=${maxStep.toFixed(3)}u/${DT}ms  vmax=${vmax.toFixed(2)}u/s  teleports=${teleports}`);
    return teleports;
  };
  const t1 = audit('BEE ', 'bees', 0.45);
  const t2 = audit('BUTF', 'bfs', 0.45);
  const t3 = audit('BIRD', 'birds', 3.0);
  console.log(`FPS(headless SwiftShader, chỉ tham khảo)=${fps}`);
  console.log('PHYSICS:', (t1 + t2 + t3) === 0 ? 'PASS — không hệ nào teleport, quỹ đạo trơn' : 'FAIL');
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
