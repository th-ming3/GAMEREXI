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
  await new Promise(r => setTimeout(r, 1200));

  const readOp = () => page.evaluate(() => {
    const g = window.__garden.children.find(c => c.userData && c.userData.wings);
    let op = 2;
    g.traverse(m => { if (m.material && m.material.transparent && m.material.opacity < op) op = m.material.opacity; });
    const v = new THREE.Vector3();
    g.getWorldPosition(v).project(window.__cam3d);
    return { op: +op.toFixed(3), sx: Math.round((v.x * 0.5 + 0.5) * 1280), sy: Math.round((-v.y * 0.5 + 0.5) * 800) };
  });
  // butterflies[0] gắn gardenRoot trực tiếp — lấy qua window.__butterfly0 hook chưa có, dùng __garden.children
  const place = (sx, sy) => page.evaluate(([sx, sy]) => {
    // butterflies không export mảng — dùng __butterfly(i) chỉ đọc; thay vào đó tìm group bướm đầu và set local pos từ NDC
    const cam = window.__cam3d;
    const ndc = new THREE.Vector3((sx / 1280) * 2 - 1, -(sy / 800) * 2 + 1, 0.5).unproject(cam);
    const dir = ndc.sub(cam.position).normalize();
    const dist = 4.5;
    const wpos = cam.position.clone().addScaledVector(dir, dist);
    const b = window.__garden.children.filter(c => c.userData && c.userData.wings);
    window.__bfTarget = b[0];
    window.__bfSaved = b[0].position.clone();
    b[0].position.copy(window.__garden.worldToLocal(wpos));
  }, [sx, sy]);
  const restore = () => page.evaluate(() => { if (window.__bfSaved) window.__bfTarget.position.copy(window.__bfSaved); });

  console.log('NATURAL :', JSON.stringify(await readOp()));
  await place(920, 450); // giữa panel
  await new Promise(r => setTimeout(r, 1300));
  console.log('ON PANEL:', JSON.stringify(await readOp()));
  await restore();
  await place(120, 300); // góc trái trên — ngoài rail? rail ~52..272 px → chọn hẳn mép trái ngoài
  await new Promise(r => setTimeout(r, 1300));
  console.log('CORNER  :', JSON.stringify(await readOp()));
  await restore();
  await new Promise(r => setTimeout(r, 1300));
  console.log('RESTORED:', JSON.stringify(await readOp()));
  await page.screenshot({ path: '/home/user/ui-ko.png' });
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
