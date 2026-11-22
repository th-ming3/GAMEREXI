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
    const W = glide.width, H = glide.height;
    /* polygon thân theo lưới đã đo: mỏ → đầu → gáy → vai → bụng → dưới cổ → họng */
    const poly = [[0.105,0.040],[0.150,0.008],[0.210,0.045],[0.265,0.170],[0.330,0.250],[0.430,0.285],[0.462,0.360],[0.452,0.455],[0.425,0.530],[0.375,0.575],[0.310,0.545],[0.250,0.450],[0.210,0.320],[0.170,0.170],[0.125,0.055]];
    const bc = document.createElement('canvas'); bc.width = W; bc.height = H;
    const bx = bc.getContext('2d');
    bx.drawImage(glide, 0, 0);
    bx.globalCompositeOperation = 'destination-in';
    bx.beginPath();
    poly.forEach((p, i) => { const px = p[0] * W, py = p[1] * H; if (i === 0) bx.moveTo(px, py); else bx.lineTo(px, py); });
    bx.closePath();
    bx.fill();
    bx.globalCompositeOperation = 'source-over';
    /* bbox alpha */
    const bd = bx.getImageData(0, 0, W, H).data;
    let minX = W, minY = H, maxX = 0, maxY = 0;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (bd[(y * W + x) * 4 + 3] > 24) {
        if (x < minX) minX = x; if (x > maxX) maxX = x;
        if (y < minY) minY = y; if (y > maxY) maxY = y;
      }
    }
    const pad = 4;
    minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
    const cw = Math.min(W - minX, maxX - minX + 1 + pad * 2), ch = Math.min(H - minY, maxY - minY + 1 + pad * 2);
    const cc = document.createElement('canvas'); cc.width = cw; cc.height = ch;
    cc.getContext('2d').drawImage(bc, minX, minY, cw, ch, 0, 0, cw, ch);
    const rootFx = (0.452 * W - minX) / cw, rootFy = (0.28 * H - minY) / ch;
    return { webp: cc.toDataURL('image/webp', 0.88).split(',')[1], w: cw, h: ch, rootFx, rootFy };
  }, tj.egretMid);
  tj.egretBody = 'data:image/webp;base64,' + out.webp;
  tj.egretBodyW = out.w; tj.egretBodyH = out.h;
  tj.egretBodyRootFx = +out.rootFx.toFixed(4); tj.egretBodyRootFy = +out.rootFy.toFixed(4);
  fs.writeFileSync('assets/textures.json', JSON.stringify(tj));
  console.log('BODY ' + out.w + 'x' + out.h + ' rootF=' + out.rootFx.toFixed(3) + ',' + out.rootFy.toFixed(3));
  await page.evaluate(async (src, bg) => {
    function loadImage(src) { return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = src; }); }
    const im = await loadImage('data:image/webp;base64,' + src);
    const c = document.createElement('canvas'); c.width = im.width; c.height = im.height;
    const x = c.getContext('2d');
    x.fillStyle = bg; x.fillRect(0, 0, c.width, c.height);
    x.drawImage(im, 0, 0);
    window.__PB = c.toDataURL('image/png').split(',')[1];
  }, out.webp, '#9fb86e');
  fs.writeFileSync('prev-body8.png', Buffer.from(await page.evaluate(() => window.__PB), 'base64'));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
