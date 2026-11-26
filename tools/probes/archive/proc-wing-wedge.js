const puppeteer = require('puppeteer-core');
const fs = require('fs');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/home/user/.local/share/choreographer/deps/chrome-linux64/chrome',
    args: ['--headless=new', '--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars']
  });
  const page = await browser.newPage();
  await page.goto('about:blank');
  const tj = JSON.parse(fs.readFileSync('assets/textures.json'));
  // vẽ nêm vai: tam giác mềm từ tâm (vai) loe về phía khối cánh, màu kem khớp cánh
  await page.evaluate(async (wingSrc) => {
    function loadImage(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; }); }
    const im = await loadImage(wingSrc);
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const x = c.getContext('2d');
    x.drawImage(im, 0, 0);
    const cx = im.width / 2, cy = im.height / 2;
    // hướng khối cánh: chóp gần nhất theo alpha — quét 12 hướng, chọn hướng có pixel alpha đặc nhất gần tâm
    const d = x.getImageData(0, 0, c.width, c.height).data;
    const has = (ax, ay) => {
      const px = Math.round(ax), py = Math.round(ay);
      if (px < 0 || py < 0 || px >= c.width || py >= c.height) return 0;
      return d[(py * c.width + px) * 4 + 3] > 120 ? 1 : 0;
    };
    let bestA = 0, bestScore = 0;
    for (let k = 0; k < 24; k++) {
      const a = k / 24 * Math.PI * 2;
      let sc = 0;
      for (let r = 10; r < 200; r += 8) { if (has(cx + Math.cos(a) * r, cy + Math.sin(a) * r)) sc += 200 - r; }
      if (sc > bestScore) { bestScore = sc; bestA = a; }
    }
    // vẽ nêm: 3 lớp tam giác loe dần + chóp tròn mềm quanh vai
    x.fillStyle = 'rgba(232,220,196,0.96)';
    x.beginPath(); x.moveTo(cx, cy);
    x.lineTo(cx + Math.cos(bestA - 0.5) * 130, cy + Math.sin(bestA - 0.5) * 130);
    x.lineTo(cx + Math.cos(bestA + 0.5) * 130, cy + Math.sin(bestA + 0.5) * 130);
    x.closePath(); x.fill();
    x.fillStyle = 'rgba(236,225,203,0.9)';
    x.beginPath(); x.moveTo(cx, cy);
    x.lineTo(cx + Math.cos(bestA - 0.34) * 170, cy + Math.sin(bestA - 0.34) * 170);
    x.lineTo(cx + Math.cos(bestA + 0.34) * 170, cy + Math.sin(bestA + 0.34) * 170);
    x.closePath(); x.fill();
    // quầng mềm quanh vai che khớp
    const g = x.createRadialGradient(cx, cy, 0, cx, cy, 42);
    g.addColorStop(0, 'rgba(238,228,206,0.95)'); g.addColorStop(1, 'rgba(238,228,206,0)');
    x.fillStyle = g;
    x.beginPath(); x.arc(cx, cy, 42, 0, 7); x.fill();
    window.__WW = c.toDataURL('image/webp', 0.85);
  }, tj.egretWing);
  const webp = await page.evaluate(() => window.__WW);
  tj.egretWing = webp;
  fs.writeFileSync('assets/textures.json', JSON.stringify(tj));
  console.log('WEDGE OK ' + Math.round(webp.length / 1024) + 'KB');
  await page.evaluate(async (src) => {
    function loadImage(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; }); }
    const im = await loadImage(src);
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const x = c.getContext('2d');
    x.fillStyle = '#9fb86e'; x.fillRect(0, 0, c.width, c.height);
    x.drawImage(im, 0, 0);
    window.__PW = c.toDataURL('image/png').split(',')[1];
  }, tj.egretWing);
  fs.writeFileSync('prev-wing8.png', Buffer.from(await page.evaluate(() => window.__PW), 'base64'));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
