const puppeteer = require('puppeteer-core');
const fs = require('fs');

const pageFn = async (monarchURL, whiteURL, petalURL, groundURL, beeURL) => {
  function loadImage(url) {
    return new Promise((res, rej) => {
      const im = new Image();
      im.onload = () => res(im);
      im.onerror = rej;
      im.src = url;
    });
  }
  function removeLightBG(im, tol) {
    const W = im.width, H = im.height;
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    const g = c.getContext('2d');
    g.drawImage(im, 0, 0);
    const id = g.getImageData(0, 0, W, H);
    const d = id.data;
    const isBG = (i) => {
      const r = d[i], gg = d[i + 1], b = d[i + 2];
      const w1 = (r > 255 - tol && gg > 255 - tol && b > 255 - tol);
      const w2 = (Math.abs(r - 204) < tol && Math.abs(gg - 204) < tol && Math.abs(b - 204) < tol);
      return w1 || w2;
    };
    const seen = new Uint8Array(W * H);
    const stack = [];
    for (let x = 0; x < W; x++) { stack.push(x, 0, x, H - 1); }
    for (let y = 0; y < H; y++) { stack.push(0, y, W - 1, y); }
    while (stack.length) {
      const y = stack.pop(), x = stack.pop();
      if (x < 0 || y < 0 || x >= W || y >= H) continue;
      const p = y * W + x;
      if (seen[p]) continue;
      seen[p] = 1;
      const i = p * 4;
      if (!isBG(i)) continue;
      d[i + 3] = 0;
      stack.push(x + 1, y, x - 1, y, x, y + 1, x, y - 1);
    }
    g.putImageData(id, 0, 0);
    return c;
  }
  function splitButterfly(canvas, cutRatio, stripRatio) {
    const W = canvas.width, H = canvas.height;
    const cutX = Math.round(W * cutRatio);
    const halfStrip = Math.round(W * stripRatio);
    const bodyL = cutX - halfStrip, bodyR = cutX + halfStrip;
    const bc = document.createElement('canvas');
    bc.width = halfStrip * 2; bc.height = H;
    bc.getContext('2d').drawImage(canvas, bodyL, 0, halfStrip * 2, H, 0, 0, halfStrip * 2, H);
    const wl = document.createElement('canvas');
    wl.width = bodyL; wl.height = H;
    wl.getContext('2d').drawImage(canvas, 0, 0, bodyL, H, 0, 0, bodyL, H);
    const wr = document.createElement('canvas');
    wr.width = bodyL; wr.height = H;
    const g2 = wr.getContext('2d');
    g2.translate(wr.width, 0);
    g2.scale(-1, 1);
    g2.drawImage(wl, 0, 0);
    function shrink(src, maxH) {
      const s = Math.min(1, maxH / src.height);
      if (s >= 1) return src;
      const cc = document.createElement('canvas');
      cc.width = Math.round(src.width * s);
      cc.height = Math.round(src.height * s);
      cc.getContext('2d').drawImage(src, 0, 0, cc.width, cc.height);
      return cc;
    }
    return {
      body: bc.toDataURL('image/webp', 0.9),
      wingL: shrink(wl, 620).toDataURL('image/webp', 0.88),
      wingR: shrink(wr, 620).toDataURL('image/webp', 0.88)
    };
  }
  function shrinkCanvas(srcC, maxW) {
    const s = Math.min(1, maxW / srcC.width);
    const c = document.createElement('canvas');
    c.width = Math.round(srcC.width * s);
    c.height = Math.round(srcC.height * s);
    c.getContext('2d').drawImage(srcC, 0, 0, c.width, c.height);
    return c;
  }
  function shrinkJpeg(im, maxW, q) {
    const s = Math.min(1, maxW / im.width);
    const c = document.createElement('canvas');
    c.width = Math.round(im.width * s);
    c.height = Math.round(im.height * s);
    c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
    return c.toDataURL('image/jpeg', q);
  }
  const m = await loadImage(monarchURL);
  const mClean = removeLightBG(m, 26);
  const mSplit = splitButterfly(mClean, 0.912, 0.052);
  const w = await loadImage(whiteURL);
  const wClean = removeLightBG(w, 30);
  const wSplit = splitButterfly(wClean, 0.728, 0.034);
  const petal = await loadImage(petalURL);
  const ground = await loadImage(groundURL);
  const beeIm = await loadImage(beeURL);
  const beeClean = removeLightBG(beeIm, 34);
  const beeC = shrinkCanvas(beeClean, 512);
  return {
    mBody: mSplit.body, mWL: mSplit.wingL, mWR: mSplit.wingR,
    wBody: wSplit.body, wWL: wSplit.wingL, wWR: wSplit.wingR,
    petal: shrinkJpeg(petal, 512, 0.82),
    ground: shrinkJpeg(ground, 1024, 0.8),
    bee: beeC.toDataURL('image/webp', 0.9)
  };
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
  const result = await page.evaluate(pageFn,
    b64('/home/user/assets/wing-monarch.png'),
    b64('/home/user/assets/wing-white.png'),
    b64('/home/user/assets/petal.jpg'),
    b64('/home/user/assets/ground.jpg'),
    b64('/home/user/assets/bee.jpg')
  );
  fs.writeFileSync('/home/user/assets/textures.json', JSON.stringify(result));
  console.log('SIZES:', Object.keys(result).map(k => k + '=' + Math.round(result[k].length / 1024) + 'KB').join(' '));
  await browser.close();
})().catch(e => { console.error(e); process.exit(1); });
