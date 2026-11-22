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
  await page.evaluate(() => window.__ff && window.__ff(12));
  const snap = () => page.evaluate(() => {
    const r1 = document.querySelector('.rail').getBoundingClientRect();
    const r2 = document.querySelector('.panel').getBoundingClientRect();
    const out = [];
    const v = new THREE.Vector3();
    window.__garden.children.filter(c => c.userData && c.userData.wings).forEach((g, i) => {
      g.getWorldPosition(v).project(window.__cam3d);
      const sx = (v.x * 0.5 + 0.5) * 1280, sy = (-v.y * 0.5 + 0.5) * 800;
      let op = 2;
      g.traverse(m => { if (m.material && m.material.transparent && m.material.opacity < op) op = m.material.opacity; });
      out.push({ sx, sy, op });
    });
    return { rects: [[r1.left, r1.top, r1.right, r1.bottom], [r2.left, r2.top, r2.right, r2.bottom]], birds: out };
  });
const S = [];
  await snap().then(r => S.push(r));
  await new Promise(r => setTimeout(r, 1500));
  await snap().then(r => S.push(r));
  await new Promise(r => setTimeout(r, 1500));
  await snap().then(r => S.push(r));
  if (!S.length || !S[0] || !S[0].birds) { console.log('SNAP-FAIL'); await browser.close(); return; }
  let pass = true;
  const n = S[0].birds.length;
  for (let i = 0; i < n; i++) {
    const inC = S.filter(s => s.birds[i] && (() => {
      const b = s.birds[i];
      return s.rects.some(([a, q, c, d]) => b.sx > a - 14 && b.sx < c + 14 && b.sy > q - 14 && b.sy < d + 14);
    })()).length;
    const opMin = Math.min(...S.map(s => s.birds[i].op));
    const opMax = Math.max(...S.map(s => s.birds[i].op));
    const stable = opMax - opMin < 0.15;
    let verdict = 'SKIP(transition)';
    if (inC >= 2 && stable) {
      verdict = opMin < 0.5 ? 'OK(faded-in-rect)' : (pass = false, 'BAD(in-rect-bright)');
    } else if (inC === 0 && stable) {
      const b = S[0].birds[i];
      const gap = Math.min(...S[0].rects.map(([a, q, c, d]) => Math.max(b.sx - (c + 14), (a - 14) - b.sx, b.sy - (d + 14), (q - 14) - b.sy)));
      verdict = gap > 40 ? (opMin > 0.9 ? 'OK(bright-outside)' : (pass = false, 'BAD(outside-dim,far=' + Math.round(gap) + ')'))
                         : 'SKIP(near-edge)';
    }
    console.log(`bf${i} inRect=${inC}/3 op=${opMin.toFixed(2)}..${opMax.toFixed(2)} -> ${verdict}`);
  }
  console.log('UI-KEEP-OUT:', pass ? 'PASS' : 'FAIL');
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
