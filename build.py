#!/usr/bin/env python3
"""
CANH DONG — build script (stdlib only, khong can npm)

Noi src/ thanh 2 file HTML tu chua (single-file): moi thu inline base64
vì preview iframe khong co network — file build chay doc lap o bat ky dau.

Output:
  game.html   — san choi 3D (nhan vat + nhiem vu)  [nang ~4.9MB]
  invite.html — thiệp "Hen gap ban" (ban day du)   [nang ~1.9MB]
  index.html  — copy cua invite.html (root domain) — doi bang cp neu muon game o root
  done.html   — copy cua invite.html (ten cu, giu tuong thich)

Cach chay:  python3 build.py
"""
import base64
import hashlib
import json
import os

ROOT = os.path.dirname(os.path.abspath(__file__))


def read(p):
    with open(os.path.join(ROOT, p), encoding='utf-8') as f:
        return f.read()


def write(p, s):
    with open(os.path.join(ROOT, p), 'w', encoding='utf-8') as f:
        f.write(s)


def wrap(js):
    """Boc 1 doan JS thanh <script> an toan (escape </script> trong string)."""
    return '<script>\n' + js.replace('</script>', '<\\/script>') + '\n</script>\n'


# ---- 1) data script: config + textures (base64 tu manifest)
config = read('src/core/config.js').strip() + '\n' + read('src/game/region-model.js').strip()
textures = json.loads(read('assets/textures.json'))
data_tag = wrap(config + '\nwindow.__TEXTURES = '
                + json.dumps(textures, ensure_ascii=False, separators=(',', ':')) + ';')

# ---- 2) vendor
vendor = wrap(read('src/vendor/three.min.js')) + wrap(read('src/vendor/GLTFLoader.js')) + wrap(read('src/vendor/FBXLoader.bundle.js')) + wrap(read('node_modules/cannon-es/dist/cannon-es.js').replace('export {', 'window.CANNON = {'))

# ---- 3) app bundle: world (chung) [+ game pack] trong MOT <script> (scope chung)
world = read('src/core/terrain.js') + '\n' + read('src/game/real-assets.js') + '\n' + read('src/game/npcs.js') + '\n' + read('src/game/water-state.js') + '\n' + read('src/game/combat.js') + '\n' + read('src/game/boss.js') + '\n' + read('src/game/campaign.js') + '\n' + read('src/game/underwater.js') + '\n' + read('src/core/world.js')
# Bundle the CC0 rig and fur textures into both single-file experiences.
for token, asset in [
    ('__RABBIT_FBX_B64__', 'assets/models/rabbit_src/rabbit.fbx'),
    ('__RABBIT_FUR_B64__', 'assets/models/rabbit_src/texture/Fur-skin.png'),
    ('__RABBIT_SKIN_B64__', 'assets/models/rabbit_src/texture/rabbit-skinn.png'),
    ('__RABBIT_NORM_B64__', 'assets/models/rabbit_src/texture/rabbit-NORM.png'),
    ('__KOHAKU_KOI_B64__', 'assets/models/runtime/kohaku-koi-rigged.glb'),
    ('__OGON_KOI_B64__', 'assets/models/runtime/ogon-koi-rigged.glb'),
    ('__RA_GRASS_B64__', 'assets/models/runtime/meadow-grass-lod2.glb'),
    ('__RA_FLOWER_B64__', 'assets/models/runtime/wildflower-patch-lod2.glb'),
    ('__RA_BROADLEAF_B64__', 'assets/models/runtime/beech-tree-lod1.glb'),
    ('__RA_BLOSSOM_B64__', 'assets/models/runtime/cherry-tree-lod1.glb'),
    ('__RA_PINE_B64__', 'assets/models/runtime/young-spruce-lod1.glb'),
    ('__RA_HOUSE_B64__', 'assets/models/runtime/timber-frame-house.glb'),
    ('__RA_RUINS_B64__', 'assets/models/runtime/sunken-ruins.glb'),
    ('__RA_TEMPLE_B64__', 'assets/models/runtime/temple-interior.glb'),
    ('__RA_NPC_TAM_B64__', 'assets/models/runtime/npc-tam.glb'),
    ('__RA_NPC_BA_MAN_B64__', 'assets/models/runtime/npc-ba-man.glb'),
    ('__RA_NPC_HOA_B64__', 'assets/models/runtime/npc-hoa.glb'),
    ('__RA_NPC_LAM_B64__', 'assets/models/runtime/npc-lam.glb'),
    ('__RA_VALVE_B64__', 'assets/models/runtime/wall-lever-lod1.glb'),
    ('__RA_ENEMY_MUSHROOM_B64__', 'assets/models/runtime/porcini-mushroom-lod1.glb'),
    ('__RA_ENEMY_REED_B64__', 'assets/models/runtime/cattail-lod1.glb'),
    ('__RA_ENEMY_BOULDER_B64__', 'assets/models/runtime/granite-boulder-lod1.glb'),
    ('__RA_ENEMY_LURE_B64__', 'assets/models/runtime/dandelion-patch.glb'),
    ('__RA_BOSS_01_B64__', 'assets/models/runtime/combat-mech-lod1.glb'),
    ('__RA_GUARDIAN_01_B64__', 'assets/models/runtime/stone-feline-guardian-lod1.glb'),
]:
    world = world.replace(token, base64.b64encode(open(os.path.join(ROOT, asset), 'rb').read()).decode())
world = world.replace('</script>', '<\\/script>')
soldier_b64 = base64.b64encode(open(os.path.join(ROOT, 'assets/models/soldier.glb'), 'rb').read()).decode()
game_pack = (read('src/game/adventure.js') + '\n' + read('src/game/physics.js') + '\n' + read('src/game/player-quest.js')).replace('__SOLDIER_B64__', soldier_b64).replace('</script>', '<\\/script>')

app_game = wrap(world + '\n' + game_pack)
app_invite = wrap(world)


def build(shell_path, data, scripts):
    shell = read(shell_path)
    assert shell.count('<!--__DATA__-->') == 1 and shell.count('<!--__SCRIPTS__-->') == 1 and shell.count('<!--__BOOT_SPLASH__-->') == 1, shell_path
    shell = shell.replace('<!--__BOOT_SPLASH__-->', read('src/shells/loading.html'))
    favicon = base64.b64encode(open(os.path.join(ROOT, 'assets/favicon.ico'), 'rb').read()).decode()
    shell = shell.replace('__FAVICON_DATA__', 'data:image/x-icon;base64,' + favicon)
    return shell.replace('<!--__DATA__-->', data).replace('<!--__SCRIPTS__-->', scripts)


game_html = build('src/shells/game.html', data_tag, vendor + app_game)
write('game.html', game_html)
invite = build('src/shells/invite.html', data_tag, vendor + app_invite)
write('invite.html', invite)
write('index.html', invite)   # root = thiệp; doi thanh game: cp game.html index.html
write('done.html', invite)    # ten cu
write('manifest.webmanifest', read('src/shells/manifest.webmanifest'))
sw_version = hashlib.sha256(game_html.encode('utf-8')).hexdigest()[:12]
write('sw.js', read('src/shells/sw.js').replace('__SW_VERSION__', sw_version))

print('game.html   %8d bytes' % os.path.getsize(os.path.join(ROOT, 'game.html')))
print('invite.html %8d bytes' % os.path.getsize(os.path.join(ROOT, 'invite.html')))
print('index.html  = invite | done.html = invite | sw.js = ' + sw_version)
