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
  await page.goto('file:///home/user/game.html', { waitUntil: 'domcontentloaded', timeout: 180000 });
  await new Promise(r => setTimeout(r, 5000));
  const t0 = Date.now();
  while (Date.now() - t0 < 60000) { if (await page.evaluate(() => window.__bootOK === true)) break; await new Promise(r => setTimeout(r, 500)); }
  await page.mouse.click(400, 300);
  await page.evaluate(() => { window.__ff && window.__ff(5); });
  await new Promise(r => setTimeout(r, 2000));
  await page.evaluate(() => { window.__playerPos.set(4.5, 5.5, 12.5); window.__setOrbit(0, 1.35); });
  await new Promise(r => setTimeout(r, 2500));
  // vẽ overlay dot: project từng instance quanh player
  await page.evaluate(() => {
    const cam = window.__cam3d;
    const V = new (Object.getPrototypeOf(cam.position).constructor)();
    const M = new (Object.getPrototypeOf(cam.matrixWorld).constructor)();
    const Q = new (Object.getPrototypeOf(cam.quaternion).constructor)();
    const S = new (Object.getPrototypeOf(cam.scale).constructor)();
    const out = [];
    const colors = ['#ff2020', '#20ff20', '#2040ff', '#ff20ff', '#ffcc00', '#00ffff', '#ffffff', '#ff8020'];
    let mi = 0;
    const cvs = document.createElement('canvas');
    cvs.width = 1280; cvs.height = 800;
    cvs.style.cssText = 'position:fixed;left:0;top:0;z-index:99999;pointer-events:none';
    document.body.appendChild(cvs);
    const ctx = cvs.getContext('2d');
    window.__scene3d.traverse(o => {
      if (!o.isInstancedMesh) return;
      const myId = mi++;
      const col = colors[myId % colors.length];
      const n = Math.min(o.count, 3000);
      for (let i = 0; i < n; i++) {
        o.getMatrixAt(i, M);
        M.decompose(V, Q, S);
        const d = Math.hypot(V.x - 4.5, V.z - 12.5);
        if (d > 7 || V.y > 3) continue;
        V.project(cam);
        if (V.z > 1) continue;
        const sx = (V.x * 0.5 + 0.5) * 1280, sy = (-V.y * 0.5 + 0.5) * 800;
        if (sx < 0 || sx > 1280 || sy < 0 || sy > 800) continue;
        ctx.strokeStyle = col; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(sx, sy, 7, 0, 6.283); ctx.stroke();
        out.push(myId + ':' + col + ' @' + sx.toFixed(0) + ',' + sy.toFixed(0) + ' w=' + +S.x.toFixed(2) + ' g=' + o.geometry.type + ' n=' + o.count);
      }
    });
    window.__dots = out.length;
    window.__dotList = out.slice(0, 60);
  });
  const nDots = await page.evaluate(() => window.__dots);
  console.log('DOTS=' + nDots);
  const list = await page.evaluate(() => window.__dotList);
  list.forEach(l => console.log(l));
  await page.screenshot({ path: '/home/user/shots/probe-dots.png' });
  console.log('ERRORS=' + errs.length);
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
