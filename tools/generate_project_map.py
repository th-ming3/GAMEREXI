#!/usr/bin/env python3
"""Sinh tự động docs/PROJECT_MAP.md phản ánh cấu trúc hiện tại của dự án GAMEREXI."""
import io
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'docs', 'PROJECT_MAP.md')

SECTIONS = [
    ('src/core', 'Tầng lõi WebGL / Three.js: cấu hình, địa hình, scene & chunk streaming'),
    ('src/game', 'Hệ thống gameplay: bản đồ Đại Việt 8 khu vực, nhân vật, nhiệm vụ, NPC, chiến đấu, vật lý, lặn nước'),
    ('src/shells', 'Template HTML, manifest PWA và Service Worker'),
    ('src/vendor', 'Thư viện nhúng offline (Three.js, GLTFLoader, FBXLoader, cannon-es)'),
    ('tools', 'Tooling build, trích xuất SVG bản đồ và tạo map dự án'),
    ('tools/probes', 'Các script kiểm thử headless (Playwright / Puppeteer)'),
]

lines = [
    '# Bản đồ cấu trúc dự án GAMEREXI (Cánh Đồng)',
    '',
    '> File được sinh tự động bởi `tools/generate_project_map.py`. Không sửa tay.',
    '',
    '## Quy ước thư mục',
    '- `src/`: Toàn bộ mã nguồn chỉnh sửa trực tiếp.',
    '- `assets/`: Model 3D (`.glb`/`.fbx`), texture base64, icon PWA.',
    '- `tools/`: Script build/extract và bộ probe kiểm thử.',
    '- `game.html`, `index.html`, `invite.html`, `done.html`, `sw.js`: Output build từ `python build.py` (không sửa tay).',
    '- `dist/`: Output build nhẹ cho web deploy (`python build.py --web`).',
    '',
]

for rel, desc in SECTIONS:
    full = os.path.join(ROOT, rel)
    if not os.path.isdir(full):
        continue
    files = sorted(
        f for f in os.listdir(full)
        if os.path.isfile(os.path.join(full, f))
    )
    lines.append(f'## `{rel}/`')
    lines.append(f'_{desc}_')
    lines.append('')
    for f in files:
        lines.append(f'- `{rel}/{f}`')
    lines.append('')

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with io.open(OUT, 'w', encoding='utf-8') as f:
    f.write('\n'.join(lines))

print('Generated docs/PROJECT_MAP.md')
