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
    // ---- THÂN từ pose V (egret 420x405): crop giữa-dưới, tránh 2 cánh giơ V
    const body = await loadImage(bodySrc);
    const bx0 = 0.14, bx1 = 0.80, by0 = 0.22, by1 = 1.0;
    const bw = Math.round((bx1 - bx0) * body.width), bh = Math.round((by1 - by0) * body.height);
    const bc = document.createElement('canvas'); bc.width = bw; bc.height = bh;
    const bx = bc.getContext('2d');
    bx.drawImage(body, bx0 * body.width, by0 * body.height, bw, bh, 0, 0, bw, bh);
    // ---- CÁNH từ pose glide (egretMid 526x322): cánh phải quất lên trên-phải
    const wing = await loadImage(wingSrc);
    const wx0 = 0.50, wx1 = 1.0, wy0 = 0.0, wy1 = 0.55;
    const ww = Math.round((wx1 - wx0) * wing.width), wh = Math.round((wy1 - wy0) * wing.height);
    const wc = document.createElement('canvas'); wc.width = ww; wc.height = wh;
    const wx = wc.getContext('2d');
    wx.drawImage(wing, wx0 * wing.width, wy0 * wing.height, ww, wh, 0, 0, ww, wh);
    // gốc cánh (khớp vai) = pixel alpha xa nhất về trái-dưới của khối cánh
    const wd = wx.getImageData(0, 0, ww, wh).data;
    let rootX = ww, rootY = wh, best = 1e9;
    for (let y = 0; y < wh; y++) for (let x = 0; x < ww; x++) {
      if (wd[(y * ww + x) * 4 + 3] > 120) {
        const score = (ww - 1 - x) + (wh - 1 - y) * 1.4; // ưu tiên dưới-phải? không: vai = trái-dưới của rect
      }
    }
    // vai nằm ở mép trái-dưới: tìm pixel alpha có x nhỏ nhất trong nửa dưới
    for (let y = Math.floor(wh * 0.5); y < wh; y++) for (let x = 0; x < ww; x++) {
      if (wd[(y * ww + x) * 4 + 3] > 120) { if (x < rootX) { rootX = x; rootY = y; } break; }
    }
    // dán vào canvas lớn đủ xoay: vai nằm ĐÚNG TÂM canvas
    const margin = Math.ceil(Math.max(ww, wh) * 0.42);
    const fc = document.createElement('canvas'); fc.width = ww + margin * 2; fc.height = wh + margin * 2;
    const fx = fc.getContext('2d');
    fx.drawImage(wc, margin - rootX, margin - rootY);
    // góc tự nhiên của cánh: từ vai đến chóp (pixel alpha xa vai nhất)
    const fd = fx.getImageData(0, 0, fc.width, fc.height).data;
    let tipX = 0, tipY = 0, bestD = 0;
    for (let y = 0; y < fc.height; y++) for (let x = 0; x < fc.width; x++) {
      if (fd[(y * fc.width + x) * 4 + 3] > 120) {
        const dx = x - (margin + rootX), dy = y - (margin + rootY);
        const d = dx * dx + dy * dy;
        if (d > bestD) { bestD = d; tipX = x; tipY = y; }
      }
    }
    const ang = Math.atan2((margin + rootY) - tipY, tipX - (margin + rootX)); // >0 = chóp phía trên-phải
    return {
      body: { webp: bc.toDataURL('image/webp', 0.85).split(',')[1], w: bw, h: bh },
      wing: { webp: fc.toDataURL('image/webp', 0.85).split(',')[1], w: fc.width, h: fc.height, ang: +ang.toFixed(3), rootX, rootY, ww, wh }
    };
  }, tj.egret, tj.egretMid);
  tj.egretBody = 'data:image/webp;base64,' + out.body.webp;
  tj.egretBodyW = out.body.w; tj.egretBodyH = out.body.h;
  tj.egretWing = 'data:image/webp;base64,' + out.wing.webp;
  tj.egretWingW = out.wing.w; tj.egretWingH = out.wing.h;
  tj.egretWingAng = out.wing.ang;
  fs.writeFileSync('assets/textures.json', JSON.stringify(tj));
  console.log('BODY ' + out.body.w + 'x' + out.body.h + '  WING ' + out.wing.w + 'x' + out.wing.h + ' ang=' + out.wing.ang + ' root=' + out.wing.rootX + ',' + out.wing.rootY + ' srcW=' + out.wing.ww);
  // preview: thân + cánh trên nền chữ nhật + chấm vai
  const prev = await page.evaluate(async (tj) => {
    function loadImage(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; }); }
    const mk = async (src, W, H) => {
      const im = await loadImage(src);
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const x = c.getContext('2d');
      x.fillStyle = '#9fb86e'; x.fillRect(0, 0, W, H);
      x.drawImage(im, 0, 0);
      return c.toDataURL('image/png').split(',')[1];
    };
    return { b: await mk(tj.egretBody, tj.egretBodyW, tj.egretBodyH), w: await mk(tj.egretWing, tj.egretWingW, tj.egretWingH) };
  }, tj);
  fs.writeFileSync('prev-body.png', Buffer.from(prev.b, 'base64'));
  fs.writeFileSync('prev-wing.png', Buffer.from(prev.w, 'base64'));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
