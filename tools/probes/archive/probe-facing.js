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
  await new Promise(r => setTimeout(r, 800));
  const snap = () => page.evaluate(() => {
    const out = [];
    window.__garden.children.filter(c => c.userData && c.userData.wings).forEach(g => {
      out.push({ x: g.position.x, z: g.position.z, ry: g.rotation.y });
    });
    return out;
  });
  const N = 14, samples = [];
  for (let i = 0; i < N; i++) { samples.push(await snap()); await new Promise(r => setTimeout(r, 260)); }
  const score = {};
  for (let s = 1; s < N; s++) {
    samples[s].forEach((b, i) => {
      const p = samples[s - 1][i];
      const vx = b.x - p.x, vz = b.z - p.z;
      const sp = Math.sqrt(vx * vx + vz * vz);
      if (sp < 0.004) return; // đang đậu/quay tại chỗ — bỏ qua
      // đầu model = -Z local; hướng đầu world = (-sin ry, -cos ry)
      const hx = -Math.sin(b.ry), hz = -Math.cos(b.ry);
      const dot = (vx * hx + vz * hz) / sp;
      (score[i] = score[i] || []).push(+dot.toFixed(2));
    });
  }
  let pass = true;
  Object.keys(score).forEach(i => {
    const avg = score[i].reduce((a, b) => a + b, 0) / score[i].length;
    const ok = avg > 0.5;
    if (!ok) pass = false;
    console.log(`bf${i}: dot=${avg.toFixed(2)} n=${score[i].length} ${ok ? 'HEAD-FIRST OK' : 'FLYING-BACKWARD'}`);
  });
  console.log('FACING:', pass ? 'PASS' : 'FAIL');
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
