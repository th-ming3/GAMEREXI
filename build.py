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
config = read('src/core/config.js').strip()
textures = json.loads(read('assets/textures.json'))
data_tag = wrap(config + '\nwindow.__TEXTURES = '
                + json.dumps(textures, ensure_ascii=False, separators=(',', ':')) + ';')

# ---- 2) vendor
vendor = wrap(read('src/vendor/three.min.js')) + wrap(read('src/vendor/GLTFLoader.js')) + wrap(read('src/vendor/FBXLoader.bundle.js'))

# ---- 3) app bundle: world (chung) [+ game pack] trong MOT <script> (scope chung)
world = read('src/core/world.js')
# Bundle the CC0 rig and fur textures into both single-file experiences.
for token, asset in [
    ('__RABBIT_FBX_B64__', 'assets/models/rabbit_src/rabbit.fbx'),
    ('__RABBIT_FUR_B64__', 'assets/models/rabbit_src/texture/Fur-skin.png'),
    ('__RABBIT_SKIN_B64__', 'assets/models/rabbit_src/texture/rabbit-skinn.png'),
    ('__RABBIT_NORM_B64__', 'assets/models/rabbit_src/texture/rabbit-NORM.png'),
]:
    world = world.replace(token, base64.b64encode(open(os.path.join(ROOT, asset), 'rb').read()).decode())
world = world.replace('</script>', '<\\/script>')
soldier_b64 = base64.b64encode(open(os.path.join(ROOT, 'assets/models/soldier.glb'), 'rb').read()).decode()
game_pack = read('src/game/player-quest.js').replace('__SOLDIER_B64__', soldier_b64).replace('</script>', '<\\/script>')

app_game = wrap(world + '\n' + game_pack)
app_invite = wrap(world)


def build(shell_path, data, scripts):
    shell = read(shell_path)
    assert shell.count('<!--__DATA__-->') == 1 and shell.count('<!--__SCRIPTS__-->') == 1, shell_path
    return shell.replace('<!--__DATA__-->', data).replace('<!--__SCRIPTS__-->', scripts)


write('game.html', build('src/shells/game.html', data_tag, vendor + app_game))
invite = build('src/shells/invite.html', data_tag, vendor + app_invite)
write('invite.html', invite)
write('index.html', invite)   # root = thiệp; doi thanh game: cp game.html index.html
write('done.html', invite)    # ten cu

print('game.html   %8d bytes' % os.path.getsize(os.path.join(ROOT, 'game.html')))
print('invite.html %8d bytes' % os.path.getsize(os.path.join(ROOT, 'invite.html')))
print('index.html  = invite | done.html = invite')
