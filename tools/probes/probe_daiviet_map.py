import functools
import http.server
import json
import os
import socketserver
import sys
import threading
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DIST_DIR = os.path.join(ROOT, 'dist')
SHOTS_DIR = os.path.join(ROOT, 'shots')
os.makedirs(SHOTS_DIR, exist_ok=True)


class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, format, *args):
        pass


handler = functools.partial(QuietHandler, directory=DIST_DIR)
httpd = http.server.ThreadingHTTPServer(('127.0.0.1', 0), handler)
port = httpd.server_address[1]
threading.Thread(target=httpd.serve_forever, daemon=True).start()
GAME_URL = f'http://127.0.0.1:{port}/game.html'

with sync_playwright() as p:
    exe = None
    for cand in [
        r'C:\Program Files\Google\Chrome\Application\chrome.exe',
        r'C:\Program Files (x86)\Google\Chrome\Application\chrome.exe',
        r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
        r'C:\Program Files\Microsoft\Edge\Application\msedge.exe',
    ]:
        if os.path.exists(cand):
            exe = cand
            break
    browser = p.chromium.launch(
        executable_path=exe,
        headless=True,
        args=['--headless=new', '--no-sandbox', '--ignore-gpu-blocklist']
    )
    page = browser.new_page(viewport={'width': 1280, 'height': 800})
    errors = []
    page.on('pageerror', lambda err: (errors.append(f'PAGEERROR: {err}'), print('PAGEERROR:', err, flush=True)))
    page.on('console', lambda msg: (errors.append(f'CONSOLE_ERR: {msg.text}'), print('CONSOLE_ERR:', msg.text, flush=True)) if msg.type == 'error' else None)

    print('Goto', GAME_URL, flush=True)
    page.goto(GAME_URL, wait_until='domcontentloaded', timeout=60000)
    print('Wait bootOK', flush=True)
    page.wait_for_function('() => window.__bootOK === true && !!window.__REGION && !!window.__WORLD_MAP_DATA', timeout=30000)
    print('Booted! Clicking start...', flush=True)
    page.evaluate('''() => {
        const b = Array.from(document.querySelectorAll('button')).find(x => (x.textContent || '').includes('Bắt đầu'));
        if (b) b.click();
    }''')
    page.wait_for_timeout(1200)

    metrics = page.evaluate('''() => {
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
            hVolcanoR06: Number(window.__hillY(122.4, -106.6).toFixed(2)),
            hAbyssR07: Number(window.__hillY(127.2, -15.8).toFixed(2)),
            hSkyR08: window.__skyIsleY ? Number((window.__skyIsleY(304.8, -121.0) || 0).toFixed(2)) : null,
            hOcean: Number(window.__hillY(-80, 90).toFixed(2)),
        };
    }''')

    # 1. Khu 01 (Spawn thoáng) + mở bản đồ to
    page.evaluate('() => { window.__warpTo && window.__warpTo(-6, 4); window.__setOrbit && window.__setOrbit(2.4, 0.35); }')
    page.keyboard.press('m')
    page.wait_for_timeout(1400)
    page.screenshot(path=os.path.join(SHOTS_DIR, 'daiviet-map-spawn.png'))
    page.keyboard.press('m')

    # 2. Khu 05 Đỉnh Tuyết Hoàng Liên (đứng nhìn về đỉnh tuyết)
    page.evaluate('() => { window.__warpTo && window.__warpTo(228, -58, 18); window.__setOrbit && window.__setOrbit(2.3, 0.25); }')
    page.wait_for_timeout(1400)
    page.screenshot(path=os.path.join(SHOTS_DIR, 'daiviet-r05-snow.png'))

    # 3. Khu 06 Hắc Sơn Núi Lửa (nhìn miệng núi lửa dung nham)
    page.evaluate('() => { window.__warpTo && window.__warpTo(106, -92, 18); window.__setOrbit && window.__setOrbit(2.3, 0.32); }')
    page.wait_for_timeout(1400)
    page.screenshot(path=os.path.join(SHOTS_DIR, 'daiviet-r06-volcano.png'))

    # 4. Khu 07 Thiên Khanh Sơn Đoòng (nhìn xuống hố sụt)
    page.evaluate('() => { window.__warpTo && window.__warpTo(108, -16, 16); window.__setOrbit && window.__setOrbit(1.6, 0.42); }')
    page.wait_for_timeout(1400)
    page.screenshot(path=os.path.join(SHOTS_DIR, 'daiviet-r07-abyss.png'))

    # 5. Khu 08 Tiên Giới Đảo Bay
    page.evaluate('() => { window.__warpTo && window.__warpTo(304.8, -121.0, 26); window.__setOrbit && window.__setOrbit(2.0, 0.38); }')
    page.wait_for_timeout(1400)
    page.screenshot(path=os.path.join(SHOTS_DIR, 'daiviet-r08-sky.png'))

    browser.close()
    httpd.shutdown()
    print(json.dumps({'metrics': metrics, 'errors': errors}, indent=2))
    if errors:
        sys.exit(1)
