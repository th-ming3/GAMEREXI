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
  const out = await page.evaluate(async (bodySrc, wingSrc) => {
    function loadImage(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; }); }
    const body = await loadImage(bodySrc);
    const bx0 = 0.16, bx1 = 0.88, by0 = 0.08, by1 = 1.0;
    const bw = Math.round((bx1 - bx0) * body.width), bh = Math.round((by1 - by0) * body.height);
    const bc = document.createElement('canvas'); bc.width = bw; bc.height = bh;
    bc.getContext('2d').drawImage(body, bx0 * body.width, by0 * body.height, bw, bh, 0, 0, bw, bh);
    const wing = await loadImage(wingSrc);
    const wx0 = 0.50, wy0 = 0.0;
    const ww = Math.round((1 - wx0) * wing.width), wh = Math.round(0.55 * wing.height);
    const wc = document.createElement('canvas'); wc.width = ww; wc.height = wh;
    wc.getContext('2d').drawImage(wing, wx0 * wing.width, wy0 * wing.height, ww, wh, 0, 0, ww, wh);
    const wd = wc.getContext('2d').getImageData(0, 0, ww, wh).data;
    let rootX = ww, rootY = wh;
    for (let y = Math.floor(wh * 0.5); y < wh; y++) for (let x = 0; x < ww; x++) {
      if (wd[(y * ww + x) * 4 + 3] > 120) { if (x < rootX) { rootX = x; rootY = y; } break; }
    }
    const margin = Math.ceil(Math.max(ww, wh) * 0.42);
    const fc = document.createElement('canvas'); fc.width = ww + margin * 2; fc.height = wh + margin * 2;
    fc.getContext('2d').drawImage(wc, margin - rootX, margin - rootY);
    const fd = fc.getContext('2d').getImageData(0, 0, fc.width, fc.height).data;
    let tipX = 0, tipY = 0, bestD = 0;
    const cx = margin + rootX, cy = margin + rootY;
    for (let y = 0; y < fc.height; y++) for (let x = 0; x < fc.width; x++) {
      if (fd[(y * fc.width + x) * 4 + 3] > 120) {
        const dx = x - cx, dy = y - cy, d = dx * dx + dy * dy;
        if (d > bestD) { bestD = d; tipX = x; tipY = y; }
      }
    }
    const ang = Math.atan2(cy - tipY, tipX - cx);
    return {
      body: { webp: bc.toDataURL('image/webp', 0.85).split(',')[1], w: bw, h: bh },
      wing: { webp: fc.toDataURL('image/webp', 0.85).split(',')[1], w: fc.width, h: fc.height, ang: +ang.toFixed(3) },
      srcW: ww, srcH: wh
    };
  }, tj.egret, tj.egretMid);
  tj.egretBody = 'data:image/webp;base64,' + out.body.webp;
  tj.egretBodyW = out.body.w; tj.egretBodyH = out.body.h;
  tj.egretWing = 'data:image/webp;base64,' + out.wing.webp;
  tj.egretWingW = out.wing.w; tj.egretWingH = out.wing.h;
  tj.egretWingAng = out.wing.ang;
  tj.egretWingSrcW = out.srcW; tj.egretWingSrcH = out.srcH;
  fs.writeFileSync('assets/textures.json', JSON.stringify(tj));
  console.log('BODY ' + out.body.w + 'x' + out.body.h + ' WING ' + out.wing.w + 'x' + out.wing.h + ' srcW=' + out.srcW + ' ang=' + out.wing.ang);
  await page.evaluate(async (tj) => {
    function loadImage(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; }); }
    const im = await loadImage(tj.egretBody);
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const x = c.getContext('2d');
    x.fillStyle = '#9fb86e'; x.fillRect(0, 0, c.width, c.height);
    x.drawImage(im, 0, 0);
    window.__PB = c.toDataURL('image/png').split(',')[1];
  }, tj);
  const pb = await page.evaluate(() => window.__PB);
  fs.writeFileSync('prev-body2.png', Buffer.from(pb, 'base64'));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
