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
  const out = await page.evaluate(async (glideSrc) => {
    function loadImage(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; }); }
    const glide = await loadImage(glideSrc);
    // crop cánh rộng: 0.40→1.0 ngang, 0.02→0.62 dọc (vai thật nằm trong, ghim cứng)
    const gx0 = 0.40, gy0 = 0.02, gx1 = 1.0, gy1 = 0.62;
    const ww = Math.round((gx1 - gx0) * glide.width), wh = Math.round((gy1 - gy0) * glide.height);
    const wc = document.createElement('canvas'); wc.width = ww; wc.height = wh;
    wc.getContext('2d').drawImage(glide, gx0 * glide.width, gy0 * glide.height, ww, wh, 0, 0, ww, wh);
    // vai thật trong ảnh glide gốc (nơi cánh mọc vào lưng, đo tay trên ảnh)
    const RX = Math.round((0.452 - gx0) * glide.width), RY = Math.round((0.40 - gy0) * glide.height);
    const margin = Math.ceil(Math.max(ww, wh) * 0.62);
    const fc = document.createElement('canvas'); fc.width = ww + margin * 2; fc.height = wh + margin * 2;
    // căn TÂM canvas = khớp vai (root)
    fc.getContext('2d').drawImage(wc, Math.round(fc.width / 2) - RX, Math.round(fc.height / 2) - RY);
    // chóp = pixel alpha xa vai nhất, góc tự nhiên
    const fd = fc.getContext('2d').getImageData(0, 0, fc.width, fc.height).data;
    let tipX = 0, tipY = 0, bestD = 0;
    const cx = Math.round(fc.width / 2), cy = Math.round(fc.height / 2);
    for (let y = 0; y < fc.height; y++) for (let x = 0; x < fc.width; x++) {
      if (fd[(y * fc.width + x) * 4 + 3] > 120) {
        const dx = x - cx, dy = y - cy, d = dx * dx + dy * dy;
        if (d > bestD) { bestD = d; tipX = x; tipY = y; }
      }
    }
    const ang = Math.atan2(cy - tipY, tipX - cx);
    return { webp: fc.toDataURL('image/webp', 0.85).split(',')[1], w: fc.width, h: fc.height, ang: +ang.toFixed(3), srcW: ww, srcH: wh, rootX: RX, rootY: RY };
  }, tj.egretMid);
  tj.egretWing = 'data:image/webp;base64,' + out.webp;
  tj.egretWingW = out.w; tj.egretWingH = out.h;
  tj.egretWingAng = out.ang;
  tj.egretWingSrcW = out.srcW; tj.egretWingSrcH = out.srcH;
  tj.egretWingRootX = out.rootX; tj.egretWingRootY = out.rootY;
  fs.writeFileSync('assets/textures.json', JSON.stringify(tj));
  console.log('WING ' + out.w + 'x' + out.h + ' srcW=' + out.srcW + ' ang=' + out.ang + ' root=' + out.rootX + ',' + out.rootY);
  await page.evaluate(async (src) => {
    function loadImage(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; }); }
    const im = await loadImage('data:image/webp;base64,' + src);
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const x = c.getContext('2d');
    x.fillStyle = '#9fb86e'; x.fillRect(0, 0, c.width, c.height);
    x.drawImage(im, 0, 0);
    x.fillStyle = '#ff2222';
    x.beginPath(); x.arc(im.width / 2, im.height / 2, 6, 0, 7); x.fill();
    window.__PW = c.toDataURL('image/png').split(',')[1];
  }, out.webp);
  fs.writeFileSync('prev-wing2.png', Buffer.from(await page.evaluate(() => window.__PW), 'base64'));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
