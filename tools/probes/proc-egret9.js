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
    function chainY(chain, x) {
      if (x <= chain[0][0]) return chain[0][1];
      for (let i = 1; i < chain.length; i++) {
        if (x <= chain[i][0]) {
          const t = (x - chain[i - 1][0]) / (chain[i][0] - chain[i - 1][0]);
          return chain[i - 1][1] + t * (chain[i][1] - chain[i - 1][1]);
        }
      }
      return chain[chain.length - 1][1];
    }
    const glide = await loadImage(glideSrc);
    // THÂN: vùng giữa glide — đầu + cổ + thân, vai tại (0.447, 0.293) trong crop
    const bx0 = 0.30, by0 = 0.16, bx1 = 0.64, by1 = 0.98;
    const bw = Math.round((bx1 - bx0) * glide.width), bh = Math.round((by1 - by0) * glide.height);
    const bc = document.createElement('canvas'); bc.width = bw; bc.height = bh;
    bc.getContext('2d').drawImage(glide, bx0 * glide.width, by0 * glide.height, bw, bh, 0, 0, bw, bh);
    // CÁNH: crop rộng, wipe dưới (đuôi + chân đen), vai ghim tâm canvas
    const gx0 = 0.40, gy0 = 0.02, gx1 = 1.0, gy1 = 0.62;
    const ww = Math.round((gx1 - gx0) * glide.width), wh = Math.round((gy1 - gy0) * glide.height);
    const wc = document.createElement('canvas'); wc.width = ww; wc.height = wh;
    wc.getContext('2d').drawImage(glide, gx0 * glide.width, gy0 * glide.height, ww, wh, 0, 0, ww, wh);
    {
      const x = wc.getContext('2d');
      const id = x.getImageData(0, 0, wc.width, wc.height), d = id.data;
      const chain = [[0.0, 0.30], [0.30, 0.48], [0.50, 0.60], [0.75, 0.65], [1.0, 0.80]];
      for (let xx = 0; xx < wc.width; xx++) {
        const yt = chainY(chain, xx / wc.width) * wc.height;
        for (let yy = Math.max(0, Math.ceil(yt)); yy < wc.height; yy++) d[(yy * wc.width + xx) * 4 + 3] = 0;
      }
      x.putImageData(id, 0, 0);
    }
    const RX = Math.round((0.452 - gx0) * glide.width), RY = Math.round((0.40 - gy0) * glide.height);
    const margin = Math.ceil(Math.max(ww, wh) * 0.62);
    const fc = document.createElement('canvas'); fc.width = ww + margin * 2; fc.height = wh + margin * 2;
    fc.getContext('2d').drawImage(wc, Math.round(fc.width / 2) - RX, Math.round(fc.height / 2) - RY);
    const fd = fc.getContext('2d').getImageData(0, 0, fc.width, fc.height).data;
    const cx = Math.round(fc.width / 2), cy = Math.round(fc.height / 2);
    let tipX = 0, tipY = 0, bestD = 0;
    for (let y = 0; y < fc.height; y++) for (let x = 0; x < fc.width; x++) {
      if (fd[(y * fc.width + x) * 4 + 3] > 120) {
        const dx = x - cx, dy = y - cy, dd = dx * dx + dy * dy;
        if (dd > bestD) { bestD = dd; tipX = x; tipY = y; }
      }
    }
    const ang = Math.atan2(cy - tipY, tipX - cx);
    return {
      body: { webp: bc.toDataURL('image/webp', 0.88).split(',')[1], w: bw, h: bh },
      wing: { webp: fc.toDataURL('image/webp', 0.85).split(',')[1], w: fc.width, h: fc.height },
      rootFx: (0.452 - bx0) / (bx1 - bx0), rootFy: (0.40 - by0) / (by1 - by0),
      ang: +ang.toFixed(3), srcW: ww
    };
  }, tj.egretMid);
  tj.egretBody = 'data:image/webp;base64,' + out.body.webp;
  tj.egretBodyW = out.body.w; tj.egretBodyH = out.body.h;
  tj.egretWing = 'data:image/webp;base64,' + out.wing.webp;
  tj.egretWingW = out.wing.w; tj.egretWingH = out.wing.h;
  tj.egretWingAng = out.ang; tj.egretWingSrcW = out.srcW;
  tj.egretBodyRootFx = +out.rootFx.toFixed(4); tj.egretBodyRootFy = +out.rootFy.toFixed(4);
  fs.writeFileSync('assets/textures.json', JSON.stringify(tj));
  console.log('BODY ' + out.body.w + 'x' + out.body.h + ' rootF=' + out.rootFx.toFixed(3) + ',' + out.rootFy.toFixed(3) + ' WING ' + out.wing.w + 'x' + out.wing.h + ' ang=' + out.ang);
  const prev = await page.evaluate(async (tj) => {
    function loadImage(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; }); }
    const mk = async (src, bg) => {
      const im = await loadImage(src);
      const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
      const x = c.getContext('2d');
      x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height);
      x.drawImage(im, 0, 0);
      return c.toDataURL('image/png').split(',')[1];
    };
    return { b: await mk(tj.egretBody, '#9fb86e'), w: await mk(tj.egretWing, '#c9b98a') };
  }, tj);
  fs.writeFileSync('prev-body5.png', Buffer.from(prev.b, 'base64'));
  fs.writeFileSync('prev-wing5.png', Buffer.from(prev.w, 'base64'));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
