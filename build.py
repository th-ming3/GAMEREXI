#!/usr/bin/env python3
"""
CANH DONG - build script (stdlib only, khong can npm)

Noi src/ thanh 2 file HTML tu chua (single-file): moi thu inline base64
cho ban local (file:// chay doc lap, khong can server).

Che do WEB (python build.py --web):
  - token base64 -> duong dan URL 'models/...' (tach asset khoi HTML)
  - copy toan bo model + texture ra dist/models/
  - ghi ket qua ra dist/ (game.html nhe ~2MB, index.html, invite.html,
    done.html, sw.js, manifest, icons) - dung deploy Github Pages

Output (che do local, mac dinh):
  game.html   - san choi 3D (nhan vat + nhiem vu)
  invite.html - thiep "Hen gap ban" (ban day du)
  index.html  - copy cua invite.html (root domain)
  done.html   - copy cua invite.html (ten cu, giu tuong thich)

Cach chay:  python build.py            (local full)
            python build.py --web      (dist nhe cho web)
"""
import base64
import hashlib
import io
import json
import os
import re
import shutil
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))
WEB = '--web' in sys.argv
DIST = os.path.join(ROOT, 'dist')


def read(p):
    with io.open(os.path.join(ROOT, p), encoding='utf-8') as f:
        return f.read()


def write(p, s):
    with io.open(os.path.join(ROOT, p), 'w', encoding='utf-8') as f:
        f.write(s)


def write_dist(p, s):
    full = os.path.join(DIST, p)
    os.makedirs(os.path.dirname(full), exist_ok=True)
    with io.open(full, 'w', encoding='utf-8') as f:
        f.write(s)


def copy_dist(asset, rel=None):
    """Copy 1 file asset vao dist, tra ve duong dan URL tuong doi."""
    src = os.path.join(ROOT, asset)
    if rel is None:
        rel = 'models/' + os.path.basename(asset)
    dst = os.path.join(DIST, rel)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    shutil.copyfile(src, dst)
    return rel


def emit_models():
    os.makedirs(os.path.join(DIST, 'models'), exist_ok=True)
    shutil.copytree(os.path.join(ROOT, 'assets/icons'), os.path.join(DIST, 'assets', 'icons'), dirs_exist_ok=True)


def wrap(js):
    """Boc 1 doan JS thanh <script> an toan (escape </script> trong string)."""
    return '<script>\n' + js.replace('</script>', '<\\/script>') + '\n</script>\n'


# ---- 1) data script: config + textures (base64 tu manifest)
config = read('src/core/config.js').strip() + '\n' + read('src/game/region-model.js').strip()
textures = json.loads(read('assets/textures.json'))
if WEB:
    tex_idx = 0
    tex_files = []
    for key in list(textures.keys()):
        val = textures[key]
        if isinstance(val, str) and val.startswith('data:'):
            tex_idx += 1
            safe = re.sub(r'[^A-Za-z0-9_.-]', '_', key)[:40] or ('tex%d' % tex_idx)
            rel = 'models/tex-%d-%s.png' % (tex_idx, safe)
            raw = val.split(',', 1)[1]
            os.makedirs(os.path.join(DIST, 'models'), exist_ok=True)
            with io.open(os.path.join(DIST, rel), 'wb') as f:
                f.write(base64.b64decode(raw))
            textures[key] = rel
            tex_files.append(rel)
    print('web: %d texture da tach ra models/' % len(tex_files))
data_tag = wrap(config + '\nwindow.__TEXTURES = '
                + json.dumps(textures, ensure_ascii=False, separators=(',', ':')) + ';')

# ---- 2) vendor
vendor = wrap(read('src/vendor/three.min.js')) + wrap(read('src/vendor/GLTFLoader.js')) + wrap(read('src/vendor/FBXLoader.bundle.js')) + wrap(read('src/vendor/cannon-es.js').replace('export {', 'window.CANNON = {'))

# ---- 3) app bundle: world (chung) [+ game pack] trong MOT <script> (scope chung)
world = read('src/core/terrain.js') + '\n' + read('src/game/real-assets.js') + '\n' + read('src/game/npcs.js') + '\n' + read('src/game/water-state.js') + '\n' + read('src/game/combat.js') + '\n' + read('src/game/boss.js') + '\n' + read('src/game/campaign.js') + '\n' + read('src/game/menu.js') + '\n' + read('src/game/underwater.js') + '\n' + read('src/core/world.js')
MODEL_TOKENS = [
    ('__RABBIT_FBX_B64__', 'assets/models/rabbit_src/rabbit.fbx', 'models/rabbit_src/rabbit.fbx'),
    ('__RABBIT_FUR_B64__', 'assets/models/rabbit_src/texture/Fur-skin.png', 'models/rabbit_src/texture/Fur-skin.png'),
    ('__RABBIT_SKIN_B64__', 'assets/models/rabbit_src/texture/rabbit-skinn.png', 'models/rabbit_src/texture/rabbit-skinn.png'),
    ('__RABBIT_NORM_B64__', 'assets/models/rabbit_src/texture/rabbit-NORM.png', 'models/rabbit_src/texture/rabbit-NORM.png'),
    ('__KOHAKU_KOI_B64__', 'assets/models/runtime/kohaku-koi-rigged.glb', None),
    ('__OGON_KOI_B64__', 'assets/models/runtime/ogon-koi-rigged.glb', None),
    ('__RA_GRASS_B64__', 'assets/models/runtime/meadow-grass-lod2.glb', None),
    ('__RA_FLOWER_B64__', 'assets/models/runtime/wildflower-patch-lod2.glb', None),
    ('__RA_BROADLEAF_B64__', 'assets/models/runtime/beech-tree-lod1.glb', None),
    ('__RA_BLOSSOM_B64__', 'assets/models/runtime/cherry-tree-lod1.glb', None),
    ('__RA_PINE_B64__', 'assets/models/runtime/young-spruce-lod1.glb', None),
    ('__RA_HOUSE_B64__', 'assets/models/runtime/timber-frame-house.glb', None),
    ('__RA_RUINS_B64__', 'assets/models/runtime/sunken-ruins.glb', None),
    ('__RA_TEMPLE_B64__', 'assets/models/runtime/temple-interior.glb', None),
    ('__RA_NPC_TAM_B64__', 'assets/models/runtime/npc-tam.glb', None),
    ('__RA_NPC_BA_MAN_B64__', 'assets/models/runtime/npc-ba-man.glb', None),
    ('__RA_NPC_HOA_B64__', 'assets/models/runtime/npc-hoa.glb', None),
    ('__RA_NPC_LAM_B64__', 'assets/models/runtime/npc-lam.glb', None),
    ('__RA_VALVE_B64__', 'assets/models/runtime/wall-lever-lod1.glb', None),
    ('__RA_ENEMY_MUSHROOM_B64__', 'assets/models/runtime/porcini-mushroom-lod1.glb', None),
    ('__RA_ENEMY_REED_B64__', 'assets/models/runtime/cattail-lod1.glb', None),
    ('__RA_ENEMY_BOULDER_B64__', 'assets/models/runtime/granite-boulder-lod1.glb', None),
    ('__RA_ENEMY_LURE_B64__', 'assets/models/runtime/dandelion-patch.glb', None),
    ('__RA_BOSS_01_B64__', 'assets/models/runtime/combat-mech-lod1.glb', None),
    ('__RA_GUARDIAN_01_B64__', 'assets/models/runtime/stone-feline-guardian-lod1.glb', None),
    ('__RA_PROP_BENCH_B64__', 'assets/models/runtime/cracked-marble-bench-lod1.glb', None),
    ('__RA_PROP_SIGN_B64__', 'assets/models/runtime/blade-sign-small-lod1.glb', None),
    ('__RA_PROP_BUSH_B64__', 'assets/models/runtime/bilberry-bush-lod1.glb', None),
    ('__RA_PROP_FERN_B64__', 'assets/models/runtime/bracken-fern-lod1.glb', None),
    ('__RA_PROP_REED_B64__', 'assets/models/runtime/common-reed-lod1.glb', None),
    ('__RA_PROP_LOG_B64__', 'assets/models/runtime/fallen-log-lod1.glb', None),
    ('__RA_PROP_SHROOM_B64__', 'assets/models/runtime/fly-agaric-lod1.glb', None),
    ('__RA_PROP_THORN_B64__', 'assets/models/runtime/dead-thornbush-lod1.glb', None),
    ('__RA_PROP_CATTAIL_B64__', 'assets/models/runtime/cattail-clump-lod1.glb', None),
    ('__RA_PROP_PONDSTONE_B64__', 'assets/models/runtime/granite-pond-edge-stone-1-lod1.glb', None),
    ('__RA_PROP_PONDSTONE2_B64__', 'assets/models/runtime/granite-pond-edge-stone-2-lod1.glb', None),
    ('__RA_PROP_CLIFF_B64__', 'assets/models/runtime/cliff-face-lod1.glb', None),
    ('__RA_PROP_KOPJE_B64__', 'assets/models/runtime/granite-kopje-lod1.glb', None),
    ('__RA_PROP_RUNE_B64__', 'assets/models/runtime/glowing-rune-stone-lod1.glb', None),
    ('__RA_PROP_PILLAR_B64__', 'assets/models/runtime/dungeon-stone-pillar-lod1.glb', None),
    ('__RA_PROP_CAMPFIRE_B64__', 'assets/models/runtime/campfire-ring-lod1.glb', None),
    ('__RA_PROP_ERRATIC_B64__', 'assets/models/runtime/erratic-boulder-lod1.glb', None),
    ('__RA_PROP_BRIDGE_B64__', 'assets/models/runtime/covered-wooden-bridge-lod1.glb', None),
    ('__RA_PROP_GARAGE_B64__', 'assets/models/runtime/garage-lod1.glb', None),
    ('__RA_K_TREEDEFAULT_B64__', 'assets/models/runtime/kenney-tree_default.glb', None),
    ('__RA_K_TREEDETAILED_B64__', 'assets/models/runtime/kenney-tree_detailed.glb', None),
    ('__RA_K_TREEFAT_B64__', 'assets/models/runtime/kenney-tree_fat.glb', None),
    ('__RA_K_TREECONE_B64__', 'assets/models/runtime/kenney-tree_cone.glb', None),
    ('__RA_K_ROCKA_B64__', 'assets/models/runtime/kenney-rock_largeA.glb', None),
    ('__RA_K_ROCKC_B64__', 'assets/models/runtime/kenney-rock_largeC.glb', None),
    ('__RA_K_BUSH_B64__', 'assets/models/runtime/kenney-plant_bushLarge.glb', None),
    ('__RA_K_SHROOM_B64__', 'assets/models/runtime/kenney-mushroom_redGroup.glb', None),
    ('__RA_K_LOG_B64__', 'assets/models/runtime/kenney-log_large.glb', None),
    ('__RA_K_CLIFF_B64__', 'assets/models/runtime/kenney-cliff_block_rock.glb', None),
    ('__RA_K_BRIDGESTONE_B64__', 'assets/models/runtime/kenney-bridge_stone.glb', None),
    ('__RA_K_CAMPSTONES_B64__', 'assets/models/runtime/kenney-campfire_stones.glb', None),
    ('__RA_K_FENCE_B64__', 'assets/models/runtime/kenney-fence.glb', None),
    ('__RA_K_FOUNTAIN_B64__', 'assets/models/runtime/kenney-fountain-round.glb', None),
    ('__RA_K_WALL_B64__', 'assets/models/runtime/kenney-wall-block.glb', None),
    ('__RA_K_TOWER_B64__', 'assets/models/runtime/kenney-tower.glb', None),
]
if WEB:
    emit_models()
for token, asset, forced_rel in MODEL_TOKENS:
    if WEB:
        world = world.replace(token, copy_dist(asset, forced_rel))
    else:
        world = world.replace(token, base64.b64encode(io.open(os.path.join(ROOT, asset), 'rb').read()).decode())
world = world.replace('</script>', '<\\/script>')
if WEB:
    game_pack = (read('src/game/adventure.js') + '\n' + read('src/game/physics.js') + '\n' + read('src/game/player-quest.js')).replace('__SOLDIER_B64__', copy_dist('assets/models/soldier.glb')).replace('</script>', '<\\/script>')
else:
    soldier_b64 = base64.b64encode(io.open(os.path.join(ROOT, 'assets/models/soldier.glb'), 'rb').read()).decode()
    game_pack = (read('src/game/adventure.js') + '\n' + read('src/game/physics.js') + '\n' + read('src/game/player-quest.js')).replace('__SOLDIER_B64__', soldier_b64).replace('</script>', '<\\/script>')

app_game = wrap(world + '\n' + game_pack)
app_invite = wrap(world)


def build(shell_path, data, scripts):
    shell = read(shell_path)
    assert shell.count('<!--__DATA__-->') == 1 and shell.count('<!--__SCRIPTS__-->') == 1 and shell.count('<!--__BOOT_SPLASH__-->') == 1, shell_path
    shell = shell.replace('<!--__BOOT_SPLASH__-->', read('src/shells/loading.html'))
    favicon = base64.b64encode(io.open(os.path.join(ROOT, 'assets/favicon.ico'), 'rb').read()).decode()
    shell = shell.replace('__FAVICON_DATA__', 'data:image/x-icon;base64,' + favicon)
    return shell.replace('<!--__DATA__-->', data).replace('<!--__SCRIPTS__-->', scripts)


if WEB:
    game_html = build('src/shells/game.html', data_tag, vendor + app_game)
    write_dist('game.html', game_html)
    invite = build('src/shells/invite.html', data_tag, vendor + app_invite)
    write_dist('index.html', invite)
    write_dist('invite.html', invite)
    write_dist('done.html', invite)
    write_dist('manifest.webmanifest', read('src/shells/manifest.webmanifest'))
    sw_version = hashlib.sha256(game_html.encode('utf-8')).hexdigest()[:12]
    write_dist('sw.js', read('src/shells/sw.js').replace('__SW_VERSION__', sw_version))
    print('dist/game.html %8d bytes' % os.path.getsize(os.path.join(DIST, 'game.html')))
    print('dist/index.html=invite | sw.js = ' + sw_version)
else:
    game_html = build('src/shells/game.html', data_tag, vendor + app_game)
    write('game.html', game_html)
    invite = build('src/shells/invite.html', data_tag, vendor + app_invite)
    write('invite.html', invite)
    write('index.html', invite)   # root = thiep; doi thanh game: cp game.html index.html
    write('done.html', invite)    # ten cu
    write('manifest.webmanifest', read('src/shells/manifest.webmanifest'))
    sw_version = hashlib.sha256(game_html.encode('utf-8')).hexdigest()[:12]
    write('sw.js', read('src/shells/sw.js').replace('__SW_VERSION__', sw_version))
    print('game.html   %8d bytes' % os.path.getsize(os.path.join(ROOT, 'game.html')))
    print('invite.html %8d bytes' % os.path.getsize(os.path.join(ROOT, 'invite.html')))
    print('index.html  = invite | done.html = invite | sw.js = ' + sw_version)