import json
import os
import sys
from playwright.sync_api import sync_playwright

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GAME_URL = 'file:///' + os.path.join(ROOT, 'game.html').replace('\\', '/')
SHOTS_DIR = os.path.join(ROOT, 'shots')
os.makedirs(SHOTS_DIR, exist_ok=True)

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
    print('Launching:', exe, flush=True)
    browser = p.chromium.launch(
        executable_path=exe,
        headless=True,
        args=['--headless=new', '--no-sandbox', '--ignore-gpu-blocklist']
    )
    page = browser.new_page(viewport={'width': 1280, 'height': 800})
    errors = []
    page.on('pageerror', lambda err: errors.append(f'PAGEERROR: {err}'))
    page.on('console', lambda msg: errors.append(f'CONSOLE_ERR: {msg.text}') if msg.type == 'error' else None)

    print('Goto game.html...', flush=True)
    page.goto(GAME_URL, wait_until='domcontentloaded', timeout=120000)
    print('Waiting bootOK...', flush=True)
    page.wait_for_function('() => window.__bootOK === true && !!window.__REGION && !!window.__WORLD_MAP_DATA', timeout=45000)
    print('Booted! Clicking start...', flush=True)
    page.evaluate('''() => {
        const btns = Array.from(document.querySelectorAll('button'));
        const b = btns.find(x => (x.textContent || '').includes('Bắt đầu'));
        if (b) b.click();
    }''')
    page.wait_for_timeout(1200)
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
            hAbyssR07: Number(window.__hillY(127.2, -15.8).toFixed(2)),
            hSkyR08: window.__skyIsleY ? Number((window.__skyIsleY(304.8, -121.0) || 0).toFixed(2)) : null,
            hOcean: Number(window.__hillY(-80, 90).toFixed(2)),
            chunks: window.__chunkStats ? window.__chunkStats.total : 0,
        };
    }''')

    page.keyboard.press('m')
    page.wait_for_timeout(450)
    page.screenshot(path=os.path.join(SHOTS_DIR, 'daiviet-map-spawn.png'))

    page.keyboard.press('m')
    page.evaluate('() => window.__warpTo && window.__warpTo(245.8, -69.1)')
    page.wait_for_timeout(1600)
    page.screenshot(path=os.path.join(SHOTS_DIR, 'daiviet-r05-snow.png'))

    page.evaluate('() => window.__warpTo && window.__warpTo(304.8, -121.0, 22.5)')
    page.wait_for_timeout(1600)
    page.screenshot(path=os.path.join(SHOTS_DIR, 'daiviet-r08-sky.png'))

    browser.close()
    print(json.dumps({'metrics': metrics, 'errors': errors}, indent=2))
    if errors:
        sys.exit(1)
