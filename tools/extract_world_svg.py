#!/usr/bin/env python3
"""Trích xuất hình học lục địa, sông ngòi, quan lộ, đảo bay và 8 khu vực từ dai_viet_world_map_vector.svg."""
import io
import json
import math
import os
import re

SVG_PATH = r'd:\Downloads_Moi\dai_viet_world_map_vector.svg'
OUT_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'src', 'game', 'world-map-data.js')

# Gốc tọa độ world (0,0) đặt tại Khu 01 (Đồng Bằng Kinh Kỳ) để giữ tương thích spawn & nhà/vườn ban đầu
ORIGIN_SX = 552.0
ORIGIN_SY = 813.6
SCALE = 0.20  # 100 SVG px = 20m -> toàn bản đồ ~480m x 288m


def to_world(sx, sy):
    return (round((sx - ORIGIN_SX) * SCALE, 2), round((sy - ORIGIN_SY) * SCALE, 2))


def parse_svg_path_points(d):
    """Parse path d (M/L/H/V/C/Q/Z) thành danh sách polyline các điểm (sx, sy)."""
    tokens = re.findall(r'[MmLlHhVvCcQqZz]|[-+]?\d*\.?\d+(?:[eE][-+]?\d+)?', d)
    polylines = []
    cur = []
    x = y = 0.0
    start_x = start_y = 0.0
    cmd = None
    i = 0

    def next_f():
        nonlocal i
        v = float(tokens[i])
        i += 1
        return v

    while i < len(tokens):
        t = tokens[i]
        if t.isalpha():
            cmd = t
            i += 1
            if cmd in ('Z', 'z'):
                if cur:
                    cur.append((start_x, start_y))
                    polylines.append(cur)
                    cur = []
                x, y = start_x, start_y
            continue

        if cmd in ('M', 'm'):
            nx = next_f()
            ny = next_f()
            if cmd == 'm':
                nx += x
                ny += y
            if cur:
                polylines.append(cur)
            x, y = nx, ny
            start_x, start_y = x, y
            cur = [(x, y)]
            cmd = 'L' if cmd == 'M' else 'l'
        elif cmd in ('L', 'l'):
            nx = next_f()
            ny = next_f()
            if cmd == 'l':
                nx += x
                ny += y
            x, y = nx, ny
            cur.append((x, y))
        elif cmd in ('H', 'h'):
            nx = next_f()
            if cmd == 'h':
                nx += x
            x = nx
            cur.append((x, y))
        elif cmd in ('V', 'v'):
            ny = next_f()
            if cmd == 'v':
                ny += y
            y = ny
            cur.append((x, y))
        elif cmd in ('C', 'c'):
            x1, y1, x2, y2, nx, ny = next_f(), next_f(), next_f(), next_f(), next_f(), next_f()
            if cmd == 'c':
                x1 += x; y1 += y; x2 += x; y2 += y; nx += x; ny += y
            for s in (0.25, 0.5, 0.75, 1.0):
                mt = 1.0 - s
                px = mt**3 * x + 3 * mt**2 * s * x1 + 3 * mt * s**2 * x2 + s**3 * nx
                py = mt**3 * y + 3 * mt**2 * s * y1 + 3 * mt * s**2 * y2 + s**3 * ny
                cur.append((px, py))
            x, y = nx, ny
        elif cmd in ('Q', 'q'):
            x1, y1, nx, ny = next_f(), next_f(), next_f(), next_f()
            if cmd == 'q':
                x1 += x; y1 += y; nx += x; ny += y
            for s in (0.33, 0.66, 1.0):
                mt = 1.0 - s
                px = mt**2 * x + 2 * mt * s * x1 + s**2 * nx
                py = mt**2 * y + 2 * mt * s * y1 + s**2 * ny
                cur.append((px, py))
            x, y = nx, ny
        else:
            i += 1
    if cur:
        polylines.append(cur)
    return polylines


def rdp(pts, eps):
    """Ramer-Douglas-Peucker simplification."""
    if len(pts) < 3:
        return pts
    ax, ay = pts[0]
    bx, by = pts[-1]
    abx, aby = bx - ax, by - ay
    ab2 = abx * abx + aby * aby
    max_d = -1.0
    idx = 0
    for i in range(1, len(pts) - 1):
        px, py = pts[i]
        if ab2 < 1e-9:
            d = math.hypot(px - ax, py - ay)
        else:
            t = max(0.0, min(1.0, ((px - ax) * abx + (py - ay) * aby) / ab2))
            d = math.hypot(px - (ax + abx * t), py - (ay + aby * t))
        if d > max_d:
            max_d = d
            idx = i
    if max_d > eps:
        left = rdp(pts[:idx + 1], eps)
        right = rdp(pts[idx:], eps)
        return left[:-1] + right
    return [pts[0], pts[-1]]


def poly_area(pts):
    a = 0.0
    n = len(pts)
    for i in range(n):
        x1, y1 = pts[i]
        x2, y2 = pts[(i + 1) % n]
        a += x1 * y2 - x2 * y1
    return abs(a) * 0.5


def extract_layer_paths(svg, layer_id):
    m = re.search(rf'<g id="{layer_id}"[^>]*>(.*?)</g>', svg, re.S)
    if not m:
        return []
    return re.findall(r'<path[^>]*d="([^"]+)"', m.group(1))


with io.open(SVG_PATH, encoding='utf-8') as f:
    svg = f.read()

# 1) Đất liền & đảo
land_polys = []
for d in extract_layer_paths(svg, 'layer-landmass'):
    for pl in parse_svg_path_points(d):
        wpts = [to_world(px, py) for px, py in pl]
        if len(wpts) >= 4 and poly_area(wpts) > 25.0:
            sim = rdp(wpts, 1.4)
            if len(sim) >= 4:
                land_polys.append((poly_area(sim), [[round(p[0], 1), round(p[1], 1)] for p in sim]))

land_polys.sort(key=lambda x: -x[0])
# Giữ tối đa 22 polygon đất liền/đảo lớn nhất để SDF chạy cực nhanh
land_out = [p[1] for p in land_polys[:22]]

# 2) Đảo bay Khu 08
sky_out = []
for d in extract_layer_paths(svg, 'layer-sky-isles'):
    for pl in parse_svg_path_points(d):
        wpts = [to_world(px, py) for px, py in pl]
        if len(wpts) >= 4 and poly_area(wpts) > 6.0:
            sim = rdp(wpts, 0.9)
            if len(sim) >= 4:
                sky_out.append([[round(p[0], 1), round(p[1], 1)] for p in sim])

# 3) Sông ngòi
rivers_out = []
for d in extract_layer_paths(svg, 'layer-rivers'):
    for pl in parse_svg_path_points(d):
        wpts = [to_world(px, py) for px, py in pl]
        sim = rdp(wpts, 1.0)
        if len(sim) >= 2:
            rivers_out.append([[round(p[0], 1), round(p[1], 1)] for p in sim])

# 4) Quan lộ
roads_out = []
for d in extract_layer_paths(svg, 'layer-roads'):
    for pl in parse_svg_path_points(d):
        wpts = [to_world(px, py) for px, py in pl]
        sim = rdp(wpts, 1.2)
        if len(sim) >= 2:
            roads_out.append([[round(p[0], 1), round(p[1], 1)] for p in sim])

# 5) 8 Khu vực chuẩn từ dai_viet_world_map_vector.svg & regional_atlas
REGIONS = [
    {'id': 'r01', 'num': '01', 'name': 'Đồng Bằng Kinh Kỳ', 'sub': 'Hoàng Thành & Ruộng Bậc Thang', 'sx': 552.0, 'sy': 813.6, 'radius': 66, 'color': 0xe0b44c},
    {'id': 'r02', 'num': '02', 'name': 'Đại Thụ Cây Đa Thần', 'sub': 'Rừng Núi Đá Vôi Tây Bắc', 'sx': 576.0, 'sy': 417.6, 'radius': 64, 'color': 0x54b86a},
    {'id': 'r03', 'num': '03', 'name': 'Tháp Chăm & Đá Đỏ', 'sub': 'Bán Đảo Cát Vàng Phương Nam', 'sx': 1164.0, 'sy': 1116.0, 'radius': 62, 'color': 0xd96b38},
    {'id': 'r04', 'num': '04', 'name': 'Rừng Đước Ngập Mặn', 'sub': 'Quần Đảo Phế Tích Chìm', 'sx': 1836.0, 'sy': 1072.8, 'radius': 68, 'color': 0x2ea69a},
    {'id': 'r05', 'num': '05', 'name': 'Đỉnh Tuyết Hoàng Liên', 'sub': 'Cổ Tự Trên Biển Mây', 'sx': 1780.8, 'sy': 468.0, 'radius': 66, 'color': 0x8fd2eb},
    {'id': 'r06', 'num': '06', 'name': 'Hắc Sơn Núi Lửa', 'sub': 'Đỉnh Huyền Thiết Phương Bắc', 'sx': 1164.0, 'sy': 280.8, 'radius': 60, 'color': 0xe0522b},
    {'id': 'r07', 'num': '07', 'name': 'Thiên Khanh Sơn Đoòng', 'sub': 'Vực Sâu Ngọc Bích Trung Tâm', 'sx': 1188.0, 'sy': 734.4, 'radius': 54, 'color': 0x26b5c4},
    {'id': 'r08', 'num': '08', 'name': 'Tiên Giới Đảo Bay', 'sub': 'Quần Đảo Tầng Mây (+4.200m)', 'sx': 2076.0, 'sy': 208.8, 'radius': 60, 'color': 0xf5d469},
]
for r in REGIONS:
    wx, wz = to_world(r['sx'], r['sy'])
    r['x'] = wx
    r['z'] = wz

data = {
    'originSvg': [ORIGIN_SX, ORIGIN_SY],
    'scale': SCALE,
    'bounds': {
        'minX': round((0 - ORIGIN_SX) * SCALE, 1),
        'maxX': round((2400 - ORIGIN_SX) * SCALE, 1),
        'minZ': round((0 - ORIGIN_SY) * SCALE, 1),
        'maxZ': round((1440 - ORIGIN_SY) * SCALE, 1),
    },
    'regions': REGIONS,
    'landPolys': land_out,
    'skyPolys': sky_out,
    'rivers': rivers_out,
    'roads': roads_out,
}

js = '/* Dữ liệu bản đồ Đại Việt trích xuất tự động từ dai_viet_world_map_vector.svg */\n'
js += 'window.__WORLD_MAP_DATA = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n'

with io.open(OUT_PATH, 'w', encoding='utf-8') as f:
    f.write(js)

print(f'landPolys={len(land_out)} (pts={sum(len(p) for p in land_out)}), skyPolys={len(sky_out)}, rivers={len(rivers_out)}, roads={len(roads_out)}, bytes={len(js)}')
