const fs = require('fs');
const path = require('path');
const puppeteer = require('puppeteer-core');

function findBrowser() {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error('Khong tim thay Chrome/Edge');
}

(async () => {
  const browser = await puppeteer.launch({
    executablePath: findBrowser(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-gpu', '--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--hide-scrollbars']
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push('PAGEERROR: ' + err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push('CONSOLE_ERR: ' + msg.text());
  });
  await page.setViewport({ width: 1280, height: 800 });
  const gameUrl = 'file:///' + path.resolve(__dirname, '../../game.html').replace(/\\/g, '/');
  await page.goto(gameUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });

  const t0 = Date.now();
  let booted = false;
  while (Date.now() - t0 < 45000) {
    booted = await page.evaluate(() => window.__bootOK === true && !!window.__REGION && !!window.__WORLD_MAP_DATA);
    if (booted) break;
    await new Promise(r => setTimeout(r, 400));
  }
  if (!booted) throw new Error('Game did not boot in 45s');
  await new Promise(r => setTimeout(r, 1200));

  const metrics = await page.evaluate(() => {
    const R = window.__REGION;
    const D = window.__WORLD_MAP_DATA;
    return {
      waypoints: (R.waypoints || []).length,
      landPolys: (D.landPolys || []).length,
      skyPolys: (D.skyPolys || []).length,
      rivers: (D.rivers || []).length,
      roads: (D.roads || []).length,
      hSpawn: Number(window.__hillY(0, 0).toFixed(2)),
      hSnowR05: Number(window.__hillY(245.8, -69.1).toFixed(2)),
      hAbyssR07: Number(window.__hillY(127.2, -15.8).toFixed(2)),
      hSkyR08: window.__skyIsleY ? Number((window.__skyIsleY(304.8, -121.0) || 0).toFixed(2)) : null,
      hOcean: Number(window.__hillY(-80, 90).toFixed(2)),
      chunks: window.__chunkStats ? window.__chunkStats.total : 0,
    };
  });

  // Mo ban do lon bang phim M va chup tai Khu 01
  await page.keyboard.press('m');
  await new Promise(r => setTimeout(r, 400));
  await page.screenshot({ path: path.resolve(__dirname, '../../shots/daiviet-map-spawn.png') });

  // Dong ban do lon, dich chuyen sang Khu 05 Dinh Tuyet
  await page.keyboard.press('m');
  await page.evaluate(() => window.__warpTo && window.__warpTo(245.8, -69.1));
  await new Promise(r => setTimeout(r, 1600));
  await page.screenshot({ path: path.resolve(__dirname, '../../shots/daiviet-r05-snow.png') });

  // Dich chuyen sang Khu 08 Tien Gioi Dao Bay
  await page.evaluate(() => window.__warpTo && window.__warpTo(304.8, -121.0, 22.5));
  await new Promise(r => setTimeout(r, 1600));
  await page.screenshot({ path: path.resolve(__dirname, '../../shots/daiviet-r08-sky.png') });

  console.log(JSON.stringify({ booted, metrics, errors }, null, 2));
  await browser.close();
  if (errors.length > 0) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
