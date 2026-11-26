const puppeteer = require('puppeteer-core');
const fs = require('fs');
(async () => {
  const browser = await puppeteer.launch({
    executablePath: '/home/user/.local/share/choreographer/deps/chrome-linux64/chrome',
    args: ['--headless=new', '--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars']
  });
  const page = await browser.newPage();
  const jobs = [
    { src: 'image-search/little-egret-flying-wings-spread-side-vi-2.jpg', out: 'egretDown', png: 'cut-egret-down.png' },
    { src: 'image-search/little-egret-flying-wings-spread-side-vi-3.jpg', out: 'egretV', png: 'cut-egret-v.png' }
  ];
  const results = {};
  for (const job of jobs) {
    const b64 = fs.readFileSync(job.src).toString('base64');
    const r = await page.evaluate(async (b64) => {
      const img = new Image();
      await new Promise(res => { img.onload = res; img.src = 'data:image/jpeg;base64,' + b64; });
      const W = img.naturalWidth, H = img.naturalHeight;
      const c = document.createElement('canvas'); c.width = W; c.height = H;
      const x = c.getContext('2d');
      x.drawImage(img, 0, 0);
      const d = x.getImageData(0, 0, W, H), p = d.data;
      const N = W * H;
      const bright = new Uint8Array(N);
      for (let i = 0; i < N; i++) {
        const lum = 0.299 * p[i * 4] + 0.587 * p[i * 4 + 1] + 0.114 * p[i * 4 + 2];
        bright[i] = lum > 168 ? 1 : 0;
      }
      // flood từ mép qua pixel KHÔNG sáng => nền
      const outside = new Uint8Array(N);
      const stack = [];
      for (let xx = 0; xx < W; xx++) { stack.push(xx, (H - 1) * W + xx); }
      for (let yy = 0; yy < H; yy++) { stack.push(yy * W, yy * W + W - 1); }
      while (stack.length) {
        const i = stack.pop();
        if (i < 0 || i >= N || outside[i] || bright[i]) continue;
        outside[i] = 1;
        const xx = i % W;
        if (xx > 0) stack.push(i - 1);
        if (xx < W - 1) stack.push(i + 1);
        if (i >= W) stack.push(i - W);
        if (i < N - W) stack.push(i + W);
      }
      // bird = không thuộc nền; giữ component lớn nhất
      const bird = new Uint8Array(N);
      for (let i = 0; i < N; i++) bird[i] = outside[i] ? 0 : 1;
      // component label giữ mảng lớn nhất
      const label = new Int32Array(N).fill(-1);
      let bestId = -1, bestSz = 0, id = 0;
      for (let s = 0; s < N; s++) {
        if (!bird[s] || label[s] >= 0) continue;
        let sz = 0;
        const st = [s]; label[s] = id;
        while (st.length) {
          const i = st.pop(); sz++;
          const xx = i % W;
          const nb = [];
          if (xx > 0) nb.push(i - 1); if (xx < W - 1) nb.push(i + 1);
          if (i >= W) nb.push(i - W); if (i < N - W) nb.push(i + W);
          for (const j of nb) if (bird[j] && label[j] < 0) { label[j] = id; st.push(j); }
        }
        if (sz > bestSz) { bestSz = sz; bestId = id; }
        id++;
      }
      // alpha mềm theo luminance, chỉ trong bird
      const out = x.createImageData(W, H);
      const o = out.data;
      let minX = W, maxX = 0, minY = H, maxY = 0;
      for (let yy = 0; yy < H; yy++) for (let xx = 0; xx < W; xx++) {
        const i = yy * W + xx;
        const a = (bird[i] && label[i] === bestId) ? Math.min(1, Math.max(0, (0.299 * p[i * 4] + 0.587 * p[i * 4 + 1] + 0.114 * p[i * 4 + 2] - 150) / 34)) : 0;
        o[i * 4] = p[i * 4]; o[i * 4 + 1] = p[i * 4 + 1]; o[i * 4 + 2] = p[i * 4 + 2];
        o[i * 4 + 3] = Math.round(a * 255);
        if (a > 0.5) { if (xx < minX) minX = xx; if (xx > maxX) maxX = xx; if (yy < minY) minY = yy; if (yy > maxY) maxY = yy; }
      }
      if (minX > maxX) return null;
      const pad = 6;
      minX = Math.max(0, minX - pad); minY = Math.max(0, minY - pad);
      maxX = Math.min(W - 1, maxX + pad); maxY = Math.min(H - 1, maxY + pad);
      const cw = maxX - minX + 1, ch = maxY - minY + 1;
      const scale = Math.min(1, 560 / Math.max(cw, ch));
      const fw = Math.round(cw * scale), fh = Math.round(ch * scale);
      const c2 = document.createElement('canvas'); c2.width = fw; c2.height = fh;
      const x2 = c2.getContext('2d');
      const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H;
      tmp.getContext('2d').putImageData(out, 0, 0);
      x2.drawImage(tmp, minX, minY, cw, ch, 0, 0, fw, fh);
      return { webp: c2.toDataURL('image/webp', 0.85).split(',')[1], w: fw, h: fh };
    }, b64);
    if (!r) { console.log('FAIL ' + job.src); continue; }
    results[job.out] = r;
  }
  // ghi file png xem trước qua CDP
  for (const k of Object.keys(results)) {
    const png = await page.evaluate(async (webp) => {
      const img = new Image();
      await new Promise(res => { img.onload = res; img.src = 'data:image/webp;base64,' + webp; });
      const c = document.createElement('canvas'); c.width = img.width; c.height = img.height;
      const x = c.getContext('2d');
      x.fillStyle = '#8fae72'; x.fillRect(0, 0, c.width, c.height);
      x.drawImage(img, 0, 0);
      return c.toDataURL('image/png').split(',')[1];
    }, results[k].webp);
    fs.writeFileSync('cut-' + k + '.png', Buffer.from(png, 'base64'));
  }
  // append textures.json
  const tj = JSON.parse(fs.readFileSync('assets/textures.json'));
  for (const k of Object.keys(results)) {
    tj[k] = 'data:image/webp;base64,' + results[k].webp;
    tj[k + 'W'] = results[k].w;
    tj[k + 'H'] = results[k].h;
    console.log(k, results[k].w + 'x' + results[k].h, Math.round(results[k].webp.length * 3 / 4 / 1024) + 'KB');
  }
  fs.writeFileSync('assets/textures.json', JSON.stringify(tj));
  await browser.close();
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
