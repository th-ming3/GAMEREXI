const puppeteer = require('puppeteer-core');
const fs = require('fs');

const pageFn = async (egretURL) => {
  function loadImage(url) {
    return new Promise((res, rej) => { const im = new Image(); im.onload = () => res(im); im.onerror = rej; im.src = url; });
  }
  function removeLightBG(im, tol) {
    const W = im.width, H = im.height;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const g = c.getContext('2d'); g.drawImage(im, 0, 0);
    const id = g.getImageData(0, 0, W, H); const d = id.data;
    const isBG = (i) => {
      const r = d[i], gg = d[i + 1], b = d[i + 2];
      return (r > 255 - tol && gg > 255 - tol && b > 255 - tol) ||
             (Math.abs(r - 204) < tol && Math.abs(gg - 204) < tol && Math.abs(b - 204) < tol);
    };
    const seen = new Uint8Array(W * H); const stack = [];
    for (let x = 0; x < W; x++) { stack.push(x, 0, x, H - 1); }
    for (let y = 0; y < H; y++) { stack.push(0, y, W - 1, y); }
    while (stack.length) {
      const y = stack.pop(), x = stack.pop();
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const p = y * W + x; if (seen[p]) continue; seen[p] = 1;
      const i = p * 4; if (!isBG(i)) continue;
      d[i + 3] = 0;
      stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
    }
    g.putImageData(id, 0, 0);
    return c;
  }
  const im = await loadImage(egretURL);
  const clean = removeLightBG(im, 24);
  /* crop bounding box theo alpha + padding */
  const W = clean.width, H = clean.height;
  const g2 = clean.getContext('2d');
  const dd = g2.getImageData(0, 0, W, H).data;
  let minX = W, minY = H, maxX = 0, maxY = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (dd[(y * W + x) * 4 + 3] > 24) {
      if (x < minX) minX = x; if (x > maxX) maxX = x;
      if (y < minY) minY = y; if (y > maxY) maxY = y;
    }
  }
  const pad = 6;
  minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
  maxX = Math.min(W - 1, maxX + pad); maxY = Math.min(H - 1, maxY + pad);
  const cw = maxX - minX + 1, ch = maxY - minY + 1;
  const cc = document.createElement('canvas'); cc.width = cw; cc.height = ch;
  cc.getContext('2d').drawImage(clean, minX, minY, cw, ch, 0, 0, cw, ch);
  /* dọn râu ria sót quanh mép: pixel alpha>0 nhỏ lẻ cách thân chính */
  return { egret: cc.toDataURL('image/webp', 0.9), w: cw, h: ch };
};

(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/home/user/.local/share/choreographer/deps/chrome-linux64/chrome',
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu']
  });
  const page = await browser.newPage();
  await page.goto('about:blank');
  const b64 = p => 'data:image/' + (p.endsWith('.png') ? 'png' : 'jpeg') + ';base64,' + fs.readFileSync(p).toString('base64');
  const result = await page.evaluate(pageFn, b64('/home/user/image-search/great-egret-flying-wings-raised-white-ba-1.jpg'));
  const tj = JSON.parse(fs.readFileSync('/home/user/assets/textures.json', 'utf8'));
  tj.egretMid = result.egret;
  tj.egretMidW = result.w; tj.egretMidH = result.h;
  fs.writeFileSync('/home/user/assets/textures.json', JSON.stringify(tj));
  console.log('EGRET MID:', result.w + 'x' + result.h, Math.round(result.egret.length / 1024) + 'KB');
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
