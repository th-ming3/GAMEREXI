# Bản đồ cấu trúc dự án GAMEREXI (Cánh Đồng)

> File được sinh tự động bởi `tools/generate_project_map.py`. Không sửa tay.

## Quy ước thư mục
- `src/`: Toàn bộ mã nguồn chỉnh sửa trực tiếp.
- `assets/`: Model 3D (`.glb`/`.fbx`), texture base64, icon PWA.
- `tools/`: Script build/extract và bộ probe kiểm thử.
- `game.html`, `index.html`, `invite.html`, `done.html`, `sw.js`: Output build từ `python build.py` (không sửa tay).
- `dist/`: Output build nhẹ cho web deploy (`python build.py --web`).

## `src/core/`
_Tầng lõi WebGL / Three.js: cấu hình, địa hình, scene & chunk streaming_

- `src/core/config.js`
- `src/core/terrain.js`
- `src/core/world.js`

## `src/game/`
_Hệ thống gameplay: bản đồ Đại Việt 8 khu vực, nhân vật, nhiệm vụ, NPC, chiến đấu, vật lý, lặn nước_

- `src/game/adventure.js`
- `src/game/boss.js`
- `src/game/campaign.js`
- `src/game/combat.js`
- `src/game/menu.js`
- `src/game/npcs.js`
- `src/game/physics.js`
- `src/game/player-quest.js`
- `src/game/real-assets.js`
- `src/game/region-model.js`
- `src/game/underwater.js`
- `src/game/water-state.js`
- `src/game/world-map-data.js`

## `src/shells/`
_Template HTML, manifest PWA và Service Worker_

- `src/shells/game.html`
- `src/shells/invite.html`
- `src/shells/loading.html`
- `src/shells/manifest.webmanifest`
- `src/shells/sw.js`

## `src/vendor/`
_Thư viện nhúng offline (Three.js, GLTFLoader, FBXLoader, cannon-es)_

- `src/vendor/FBXLoader.bundle.js`
- `src/vendor/GLTFLoader.js`
- `src/vendor/cannon-es.js`
- `src/vendor/three.min.js`

## `tools/`
_Tooling build, trích xuất SVG bản đồ và tạo map dự án_

- `tools/extract_world_svg.py`
- `tools/generate_project_map.py`
- `tools/prepare-real-assets.mjs`
- `tools/rig-koi-blender.py`

## `tools/probes/`
_Các script kiểm thử headless (Playwright / Puppeteer)_

- `tools/probes/probe-daiviet-map.js`
- `tools/probes/probe-touch.js`
- `tools/probes/probe-ui.js`
- `tools/probes/probe-warp.js`
- `tools/probes/probe-y.js`
- `tools/probes/probe.js`
- `tools/probes/probe_daiviet_map.py`
