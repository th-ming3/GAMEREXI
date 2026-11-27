// Đại Việt Atlas — full MESH-ONLY diorama. No image planes, no alpha cut-outs,
// no TextureLoader. Every tile, brick, rail and leaf below is real geometry.
// QA sheets in refs/ were read for proportion only; they are never loaded at runtime.
import * as THREE from 'three';
import { Kit, place, lathe, arc, sweep, canvasTex, rng } from './kit.js';
import { U } from './env.js';
import { addA } from './geo_a.js';
import { addB } from './geo_b.js';

const R = 13;                 // village square radius, m
const WATER = 22;             // lotus pond radius, m
const ROOF_RED = '#8f3327';
const TIMBER = '#5a3327';
const STONE_C = '#9a9787';

// ---------------------------------------------------------------- canvas textures (painted in code)
function speckle(g, w, h, n, r0, r1, colors, rand) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = colors[(rand() * colors.length) | 0];
    g.globalAlpha = 0.05 + rand() * 0.09;
    g.beginPath(); g.arc(rand() * w, rand() * h, r0 + rand() * (r1 - r0), 0, Math.PI * 2); g.fill();
  }
  g.globalAlpha = 1;
}
const stoneMap = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#b9b6a6'; g.fillRect(0, 0, w, h);
  speckle(g, w, h, 2400, 2, 26, ['#9c9a8b', '#d2cfc0', '#a6a494', '#c8c5b5'], rng(7));
  for (let i = 0; i < 90; i++) {
    g.strokeStyle = 'rgba(70,80,58,.22)'; g.lineWidth = 1 + rng(i + 2)() * 2;
    const x = rng(i + 11)() * w, y = rng(i + 21)() * h;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + 18, y + 7); g.stroke();
  }
}, { repeat: [3, 3] });
const plasterMap = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#d8c79b'; g.fillRect(0, 0, w, h);
  speckle(g, w, h, 3200, 2, 16, ['#c4b184', '#e7d8ad', '#bfa97b', '#d9cba2'], rng(21));
  speckle(g, w, h, 420, 1, 4, ['#7d8a4d', '#6b7a42'], rng(22));
}, { repeat: [2, 2] });
const woodMap = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = TIMBER; g.fillRect(0, 0, w, h);
  const r = rng(13);
  for (let i = 0; i < 180; i++) {
    g.strokeStyle = r() > .5 ? 'rgba(30,15,10,.18)' : 'rgba(190,120,70,.12)';
    g.lineWidth = .5 + r() * 2;
    const y = r() * h; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y + (r() - .5) * 5); g.stroke();
  }
}, { repeat: [2, 2] });
const groundMap = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#6f7d45'; g.fillRect(0, 0, w, h);
  speckle(g, w, h, 5000, 1, 6, ['#829052', '#5f6e3b', '#95a262', '#586736'], rng(11));
}, { repeat: [40, 40] });
const clothMap = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#d8bd8c'; g.fillRect(0, 0, w, h);
  const r = rng(31);
  for (let i = 0; i < 160; i++) {
    g.strokeStyle = r() > .5 ? 'rgba(90,60,30,.07)' : 'rgba(255,240,200,.09)';
    g.lineWidth = .5 + r() * 2;
    const y = r() * h; g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke();
  }
}, { repeat: [3, 3] });

const stone = new THREE.MeshStandardMaterial({ map: stoneMap, color: '#ffffff', roughness: .9 });
const plaster = new THREE.MeshStandardMaterial({ map: plasterMap, roughness: .95 });
const wood = new THREE.MeshStandardMaterial({ map: woodMap, roughness: .75, emissive: '#1a0805', emissiveIntensity: 0 });
const red = new THREE.MeshStandardMaterial({ color: ROOF_RED, roughness: .65 });
const gold = new THREE.MeshStandardMaterial({ color: '#d6a24b', metalness: .55, roughness: .35 });
const darkWood = new THREE.MeshStandardMaterial({ color: '#3d2b22', roughness: .85 });
const leaf = new THREE.MeshStandardMaterial({ color: '#54702e', roughness: .9, flatShading: true });
const lotusLeaf = new THREE.MeshLambertMaterial({ color: '#6fa860', side: THREE.DoubleSide, emissive: '#2c4a2e', emissiveIntensity: .6 });
const petal = new THREE.MeshStandardMaterial({ color: '#ffd0e0', roughness: .8, side: THREE.DoubleSide, emissive: '#6b2f42', emissiveIntensity: .35 });
const cloth = new THREE.MeshStandardMaterial({ map: clothMap, color: '#e8cda0', roughness: .92, side: THREE.DoubleSide });
const glow = new THREE.MeshStandardMaterial({ color: '#fff2d4', emissive: '#ffb654', emissiveIntensity: 0 });
const lanternMat = new THREE.MeshStandardMaterial({ color: '#d94f38', roughness: .6, emissive: '#ff7a3c', emissiveIntensity: 0 });

const box = (w, h, d, m, x = 0, y = 0, z = 0) => {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; return o;
};
const column = (H, D) => lathe([[.001, 0], [D * .7, 0], [D * .7, .1], [D * .58, .18], [D / 2, .3],
  [D / 2, H - .3], [D * .65, H - .22], [D * .75, H - .08], [D * .75, H], [.001, H]], 12);

// ---------------------------------------------------------------- shared geometry registry
// One geometry per shape; all repeated pieces go through Kit/InstancedMesh (<300 draw calls).
const G = {};
function geo() {
  if (G.ready) return G;
  G.tile = new THREE.CylinderGeometry(.09, .09, .5, 8, 1, false, 0, Math.PI);
  G.tile.rotateZ(-Math.PI / 2);   // arch faces +Y, axis along X
  G.tile.rotateY(Math.PI / 2);    // axis now along Z (down the roof slope)
  G.ridge = new THREE.CylinderGeometry(.10, .12, 1, 7);
  G.brick = new THREE.BoxGeometry(.52, .26, .42);       // voussoir + wall stone
  G.slat = new THREE.BoxGeometry(.045, 1, .045);
  G.hslat = new THREE.BoxGeometry(1, .045, .045);
  G.leafIco = new THREE.IcosahedronGeometry(1, 1);
  G.cone = new THREE.ConeGeometry(1, 1, 6);
  G.urn = lathe([[.001, 0], [.11, 0], [.15, .1], [.12, .22], [.05, .3], [.06, .36], [.001, .38]], 8);
  G.jar = lathe([[.001, 0], [.28, 0], [.42, .16], [.5, .42], [.4, .72], [.24, .9], [.3, 1.0], [.001, 1.02]], 12);
  G.turtle = new THREE.SphereGeometry(1, 12, 8);
  G.lantern = lathe([[.001, 0], [.24, 0], [.3, .32], [.24, .64], [.001, .64]], 10);
  G.leafPad = new THREE.CircleGeometry(.52, 12); G.leafPad.rotateX(-Math.PI / 2);
  G.bud = lathe([[.001, 0], [.16, .06], [.24, .3], [.16, .55], [.001, .72]], 8);
  G.root = lathe([[.001, 0], [.1, 0], [.05, 1], [.02, 2], [.001, 3]], 6);
  G.trunk = lathe([[.001, 0], [.22, 0], [.18, 1], [.14, 2.4], [.1, 3], [.001, 3.1]], 8);
  G.reed = new THREE.ConeGeometry(.035, 1, 5);
  G.pillar = column(1, .28);
  G.dragonHorn = new THREE.ConeGeometry(.05, .3, 5);
  G.slTile = new THREE.BoxGeometry(.55, .04, .26);   // woven mat slat / sail panel
  G.ready = true;
  return G;
}

// Colours reused for per-instance variety.
const C = {
  tileWarm: new THREE.Color('#a8492f'), tileMid: new THREE.Color('#933525'), tileDark: new THREE.Color('#6f261c'),
  stoneWarm: new THREE.Color('#a8a493'), stoneMoss: new THREE.Color('#7f8a64'), stonePale: new THREE.Color('#c2bda9'),
  leafA: new THREE.Color('#54702e'), leafB: new THREE.Color('#658237'), leafC: new THREE.Color('#46632a'), leafD: new THREE.Color('#789646'),
  clothA: new THREE.Color('#e0c493'), clothB: new THREE.Color('#d2b07c'), bamboo: new THREE.Color('#c4a870'),
};
const pick = (arr, r) => arr[(r() * arr.length) | 0];

// ---------------------------------------------------------------- geometry-only hip-and-gable roof
// Individual half-cylinder tiles in staggered rows on both slopes, with upturned eave
// corners, ridge beam, dragon finials and under-eave timber brackets.
function roof(kit, rand, opt) {
  const { x, y, z, w, d, h, rot = 0, rows = 8, cols = 18, tileR = .09, ridge = true, finials = true } = opt;
  const ca = Math.cos(rot), sa = Math.sin(rot);
  const put = (lx, ly, lz, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1, color) => {
    // local rotation about X (slope) then Y (yaw), applied to a composed matrix
    const m = new THREE.Matrix4().compose(new THREE.Vector3(lx, ly, lz), new THREE.Quaternion(), new THREE.Vector3(sx, sy, sz));
    if (rx) m.multiply(new THREE.Matrix4().makeRotationX(rx));
    if (rz) m.multiply(new THREE.Matrix4().makeRotationZ(rz));
    if (ry) m.premultiply(new THREE.Matrix4().makeRotationY(ry));
    m.premultiply(new THREE.Matrix4().makeTranslation(x, y, z));
    if (color) kit.add('tile', m, color); else kit.add('tile', m);
    return m;
  };
  const pitch = Math.atan2(h, d / 2);
  const halfD = d / 2 + .45, halfW = w / 2 + .45;
  for (const sign of [-1, 1]) {
    for (let row = 0; row < rows; row++) {
      const t = row / (rows - 1);                      // 0 = ridge, 1 = eave
      const dz = sign * (halfD * (1 - t) * .04 + halfD * t);
      const dy = h * (1 - t) + .06;
      const slope = sign * pitch;
      // outer two rows curl up at the four corners (Vietnamese upturned eave)
      const curl = t > .72 ? Math.pow((t - .72) / .28, 2) : 0;
      for (let c = 0; c < cols; c++) {
        const lx = -halfW + (c + .5) * (2 * halfW / cols) + (row % 2 ? .12 : 0);
        const edge = Math.abs(lx) / halfW;
        const lift = curl * (.18 + edge * edge * 1.15);
        const stagger = (row % 2) * .25;
        const col = c % 5 === 0 ? C.tileDark : (c % 3 === 0 ? C.tileWarm : C.tileMid);
        // half-cylinder axis runs down-slope; length overlaps the next row by ~35%
        put(lx, dy + lift, dz + stagger * .05, slope, rot, 0,
          tileR / .09, .5 / .5, (halfD / rows * 1.45) / .5, col);
      }
    }
    // hip end slopes (triangular gable at each X end) — short tile rows
    for (const xs of [-1, 1]) {
      for (let row = 0; row < Math.max(3, (rows / 2) | 0); row++) {
        const t = row / (Math.max(3, (rows / 2) | 0) - 1);
        const span = (halfD) * (1 - t) * .92;
        for (let c = 0; c < 5; c++) {
          const lz = sign * (t * halfD * .85);
          const lx = xs * (halfW - .3 - c * .28);
          put(lx, h * (1 - t) + .1 + (t > .7 ? .5 : 0), lz, sign * pitch, rot, 0, .9, 1, .9,
            c % 2 ? C.tileDark : C.tileWarm);
        }
        if (span < .25) break;
      }
    }
    // under-eave horizontal beam + brackets
    const beam = new THREE.Matrix4().compose(new THREE.Vector3(0, .02, sign * (halfD + .1)), new THREE.Quaternion(), new THREE.Vector3(w + 1.0, .16, .16));
    beam.premultiply(new THREE.Matrix4().makeRotationY(rot));
    beam.premultiply(new THREE.Matrix4().makeTranslation(x, y, z));
    kit.add('dark', beam);
    for (let c = 0; c < Math.min(cols, 12); c++) {
      const lx = -halfW + (c + .5) * (2 * halfW / 12);
      const bm = new THREE.Matrix4().compose(new THREE.Vector3(lx, .28, sign * (halfD - .12)), new THREE.Quaternion(), new THREE.Vector3(.09, .5, .5));
      bm.premultiply(new THREE.Matrix4().makeRotationY(rot));
      bm.premultiply(new THREE.Matrix4().makeTranslation(x, y, z));
      kit.add('red', bm);
    }
  }
  if (ridge) {
    const rm = new THREE.Matrix4().compose(new THREE.Vector3(0, h + .12, 0), new THREE.Quaternion(), new THREE.Vector3(w + 1.1, 1, 1));
    rm.premultiply(new THREE.Matrix4().makeRotationY(rot));
    rm.premultiply(new THREE.Matrix4().makeTranslation(x, y, z));
    kit.add('ridge', rm, C.tileDark);
    if (finials) for (const s of [-1, 1]) {
      const m = new THREE.Matrix4().compose(new THREE.Vector3(s * (w / 2 + .55), h + .22, 0), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
      m.premultiply(new THREE.Matrix4().makeRotationY(rot));
      m.premultiply(new THREE.Matrix4().makeTranslation(x, y, z));
      kit.add('dragon', m);
      const hm = new THREE.Matrix4().compose(new THREE.Vector3(s * (w / 2 + .45), h + .5, 0), new THREE.Quaternion(), new THREE.Vector3(1, 1, 1));
      hm.multiply(new THREE.Matrix4().makeRotationZ(s * .5));
      hm.premultiply(new THREE.Matrix4().makeRotationY(rot));
      hm.premultiply(new THREE.Matrix4().makeTranslation(x, y, z));
      kit.add('horn', hm);
    }
  }
  // two pitched boards under the tiles so the roof reads as a solid surface
  const boards = new THREE.Group(); boards.position.set(x, y, z); boards.rotation.y = rot;
  for (const s of [-1, 1]) {
    const b = box(w + .7, .1, halfD + .2, darkWood, 0, h / 2 - .14, s * halfD / 2);
    b.rotation.x = s * pitch;
    boards.add(b);
  }
  return boards;
}

// ---------------------------------------------------------------- arch of wedge voussoirs
function arch(kit, rand, cx, cy, cz, radius, thick, yaw = 0, tone = 'stone') {
  const n = 15;
  const ca = Math.cos(yaw), sa = Math.sin(yaw);
  for (let i = 0; i < n; i++) {
    const a = Math.PI * i / (n - 1);
    const lx = cx + Math.cos(a) * radius;
    const ly = cy + Math.sin(a) * radius;
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(lx * ca + cz * sa, ly, -lx * sa + cz * ca),
      new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), yaw),
      new THREE.Vector3(1, 1, thick));
    m.multiply(new THREE.Matrix4().makeRotationZ(a - Math.PI / 2));
    kit.add('brick', m, pick([C.stoneWarm, C.stonePale, C.stoneMoss], rand));
  }
}
function wallBlocks(kit, rand, x, y, z, w, h, d, cols, rows, yaw = 0) {
  const bw = w / cols, bh = h / rows;
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const lx = -w / 2 + (c + .5 + (r % 2 ? .5 : 0)) * bw;
    const m = new THREE.Matrix4().compose(new THREE.Vector3(lx, y + (r + .5) * bh, z), new THREE.Quaternion(),
      new THREE.Vector3(bw / .52 * .96, bh / .26 * .94, d / .42));
    m.premultiply(new THREE.Matrix4().makeRotationY(yaw));
    m.premultiply(new THREE.Matrix4().makeTranslation(x, 0, 0));
    kit.add('brick', m, pick([C.stoneWarm, C.stonePale, C.stoneMoss], rand));
  }
}

function lanternAt(kit, x, y, z, lights, big = false) {
  const s = big ? 1.3 : 1;
  kit.add('lamp', place(x, y, z, 0, s, s, s));
  kit.add('cable', place(x, y + .4 * s + .28, z, 0, s, 1, s));
  if (y > 3.2 && lights.length < 10) {
    const l = new THREE.PointLight('#ff9a54', 0, 12, 2);
    l.position.set(x, y, z); l.userData.candela = 30; lights.push(l);
  }
}

// ---------------------------------------------------------------- landmarks
function tamQuan(kit, rand, lights) {
  const x = -20, z = 26, yaw = .22;
  const ca = Math.cos(yaw), sa = Math.sin(yaw);
  const put = (o, lx, ly, lz) => { o.position.set(x + lx * ca + lz * sa, ly, z - lx * sa + lz * ca); o.rotation.y = yaw; return o; };
  // stone wall base with three arches
  const wall = put(box(13.6, 4.4, 2.4, stone), 0, 2.2, 0); kit.group.add(wall);
  wallBlocks(kit, rand, x, 0, z, 13.6, 4.2, 2.5, 26, 8, yaw);
  for (let i = -1; i <= 1; i++) {
    const cx = i * 4.4;
    // opening: dark recess (geometry, no texture)
    const recess = put(box(2.9, 3.3, .2, darkWood), cx, 1.7, 1.28); kit.group.add(recess);
    arch(kit, rand, x + cx * ca + sa * 1.3, 3.35, z - cx * sa + ca * 1.3, 1.48, 1.4, yaw);
    for (const s of [-1, 1]) {
      const p = put(new THREE.Mesh(column(4.4, .7), stone), cx + s * 1.68, 0, 1.35); kit.group.add(p);
      const b = put(new THREE.Mesh(G.urn, stone), cx + s * 1.68, 4.5, 1.35); b.scale.setScalar(2.2); kit.group.add(b);
    }
    const beam = put(box(4.3, .5, 1.8, red), cx, 4.85, 0); kit.group.add(beam);
    kit.group.add(roof(kit, rand, { x: x + cx * ca, y: 5.12, z: z - cx * sa, w: 4.9, d: 2.9, h: 1.25, rot: yaw, rows: 7, cols: 14 }));
    lanternAt(kit, x + (cx - 1.15) * ca + 1.5 * sa, 3.7, z - (cx - 1.15) * sa + 1.5 * ca, lights);
    lanternAt(kit, x + (cx + 1.15) * ca + 1.5 * sa, 3.7, z - (cx + 1.15) * sa + 1.5 * ca, lights);
  }
  // upper timber storey: columns, lattice windows, balustrade, two-tier roof
  const deckY = 6.5;
  kit.group.add(put(box(9.2, .3, 3.4, darkWood), 0, deckY, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    kit.group.add(put(new THREE.Mesh(column(2.4, .38), red), sx * 3.6, deckY + .15, sz * 1.25));
  }
  for (let i = 0; i < 9; i++) {
    const lx = -3.3 + i * .82;
    kit.group.add(put(box(.1, 1.8, .1, darkWood), lx, deckY + 1.2, 1.3));
  }
  kit.group.add(put(box(6.8, 1.5, .08, darkWood), 0, deckY + 1.3, 1.3));
  // balustrade with urn finials
  for (let i = 0; i <= 14; i++) {
    const lx = -4.3 + i * .62;
    const b = put(new THREE.Mesh(G.urn, stone), lx, deckY + .15, 1.6); b.scale.setScalar(1.1); kit.group.add(b);
  }
  kit.group.add(put(box(8.8, .12, .12, red), 0, deckY + .62, 1.6));
  kit.group.add(roof(kit, rand, { x, y: deckY + 2.55, z, w: 9.4, d: 4.4, h: 2.1, rot: yaw, rows: 11, cols: 30 }));
  // small uppermost roof tier
  kit.group.add(roof(kit, rand, { x, y: deckY + 4.55, z, w: 5.4, d: 2.8, h: 1.5, rot: yaw, rows: 8, cols: 20 }));
}

function lattice(kit, x, y, z, w, h, yaw = 0) {
  const ca = Math.cos(yaw), sa = Math.sin(yaw);
  for (let i = 0; i < Math.round(w / .16); i++) {
    const lx = -w / 2 + i * .16;
    const m = place(x + lx * ca, y, z - lx * sa, yaw, 1, h, 1);
    kit.add('slat', m);
  }
  for (let i = 0; i < Math.round(h / .3); i++) {
    const ly = -h / 2 + i * .3;
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y + ly, z), new THREE.Quaternion(), new THREE.Vector3(w, 1, 1));
    m.premultiply(new THREE.Matrix4().makeRotationY(yaw));
    kit.add('hslat', m);
  }
}
function nhaBaGian(kit, rand, lights, x, z, ry = 0) {
  const ca = Math.cos(ry), sa = Math.sin(ry);
  const put = (o, lx, ly, lz) => { o.position.set(x + lx * ca + lz * sa, ly, z - lx * sa + lz * ca); o.rotation.y = ry; return o; };
  // mossy stone plinth
  kit.group.add(put(box(9.6, .85, 6.2, stone), 0, .42, 0));
  wallBlocks(kit, rand, x, 0, z, 9.6, .8, 6.2, 18, 2, ry);
  // yellow plaster walls
  kit.group.add(put(new THREE.Mesh(new THREE.BoxGeometry(9, 3.4, 5.6), plaster), 0, 2.5, 0));
  for (const sx of [-3, 0, 3]) {
    kit.group.add(put(new THREE.Mesh(column(3.4, .42), wood), sx, .85, 2.9));
    lattice(kit, x + (sx - 1.2) * ca + 2.95 * sa, 2.5, z - (sx - 1.2) * sa + 2.95 * ca, 2.3, 2.6, ry);
    // bamboo blind strips above the doors
    for (let i = 0; i < 12; i++) {
      const m = new THREE.Matrix4().compose(
        new THREE.Vector3(x + (sx - 1.2 + i * .2) * ca + 2.97 * sa, 4.0, z - (sx - 1.2 + i * .2) * sa + 2.97 * ca),
        new THREE.Quaternion(), new THREE.Vector3(.12, .45, .02));
      m.premultiply(new THREE.Matrix4().makeRotationY(ry));
      kit.add('cloth', m, C.bamboo);
    }
  }
  kit.group.add(put(box(9.8, .4, 6.4, darkWood), 0, 4.35, 0));
  kit.group.add(roof(kit, rand, { x, y: 4.65, z, w: 10.6, d: 7.0, h: 2.6, rot: ry, rows: 14, cols: 34 }));
  // steps + jars + lanterns
  for (let i = 0; i < 3; i++) kit.group.add(put(box(4.2, .22, .55, stone), 0, .11 + i * .2, 3.4 + i * .5));
  for (const s of [-1, 1]) {
    const jar = put(new THREE.Mesh(G.jar, darkWood), s * 4.4, .85, 3.6); jar.scale.setScalar(.85); kit.group.add(jar);
    lanternAt(kit, x + s * 3.4 * ca + 3.4 * sa, 3.5, z - s * 3.4 * sa + 3.4 * ca, lights);
  }
}

function cauNgoi(kit, rand, x, z, ry = 0) {
  const ca = Math.cos(ry), sa = Math.sin(ry);
  const put = (o, lx, ly, lz) => { o.position.set(x + lx * ca + lz * sa, ly, z - lx * sa + lz * ca); o.rotation.y = ry; return o; };
  // stone arch springing above water
  for (const s of [-1, 1]) {
    const abut = put(new THREE.Mesh(new THREE.BoxGeometry(4.8, 2.0, 2.6), stone), 0, 1.1, s * 5.6); kit.group.add(abut);
    wallBlocks(kit, rand, x + s * 5.6 * sa, 0, z + s * 5.6 * ca, 4.8, 2.0, 2.6, 10, 4, ry);
  }
  arch(kit, rand, x + sa * 0, -1.7, z + ca * 0, 4.1, 3.6, ry + Math.PI / 2);
  arch(kit, rand, x + sa * .5, -1.7, z + ca * .5, 4.1, 3.6, ry + Math.PI / 2);
  // spandrel masonry: stone courses beside the arch, up to the deck
  for (const s of [-1, 1]) for (let r = 0; r < 5; r++) for (let c = 0; c < 5; c++) {
    const lz = s * (3.3 + c * .62), ly = .4 + r * .42;
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x + lz * sa, ly, z + lz * ca), new THREE.Quaternion(),
      new THREE.Vector3(.62 / .52, .42 / .26, 3.6 / .42));
    m.premultiply(new THREE.Matrix4().makeRotationY(ry));
    kit.add('brick', m, pick([C.stoneWarm, C.stonePale, C.stoneMoss], rand));
  }
  const deck = put(box(4.8, .4, 13.4, stone), 0, 2.4, 0); kit.group.add(deck);
  // covered pavilion: columns + balustrades + hanging lanterns
  for (const s of [-1, 1]) for (let i = 0; i < 7; i++) {
    kit.group.add(put(new THREE.Mesh(column(1.3, .26), red), s * 2.15, 2.6, -5.5 + i * 1.83));
  }
  for (const s of [-1, 1]) {
    const rail = sweep([[0, 0], [.12, .12], [.12, .95], [0, 1.05]], [[s * 2.15, -6.4], [s * 2.15, 6.4]], { y: 2.6, uvScale: 1 });
    const m = new THREE.Mesh(rail, wood); m.position.set(x, 0, z); m.rotation.y = ry; kit.group.add(m);
  }
  for (let i = 0; i < 8; i++) {
    const lz = -5 + i * 1.42;
    lanternAt(kit, x + sa * lz, 3.2, z + ca * lz, kit.lights);
  }
  kit.group.add(roof(kit, rand, { x, y: 3.85, z, w: 5.4, d: 14.2, h: 2.0, rot: ry, rows: 15, cols: 40 }));
}

function mieuCo(kit, rand, lights, x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  wallBlocks(kit, rand, x, 0, z, 5.8, .9, 4.8, 12, 2, 0);
  g.add(box(5.6, 1.1, 4.6, stone, 0, .55, 0));
  g.add(box(4.2, 3.0, 3.4, plaster, 0, 2.6, 0));
  for (const s of [-1, 1]) g.add(new THREE.Mesh(column(3.0, .3), red));
  const door = box(1.5, 2.3, .16, darkWood, 0, 2.1, 1.75); g.add(door);
  // engraved stele + turtle on a stone plinth
  const turtle = new THREE.Mesh(G.turtle, stone); turtle.scale.set(1.25, .48, .9); turtle.position.set(0, 1.75, 3.1); g.add(turtle);
  const stele = box(1.0, 2.3, .28, stone, 0, 3.1, 3.1); g.add(stele);
  const disc = new THREE.Mesh(new THREE.TorusGeometry(.44, .1, 8, 20), gold); disc.position.set(0, 2.05, 3.95); g.add(disc);
  // stone pillars with urn finials
  for (const s of [-1, 1]) {
    const p = new THREE.Mesh(column(2.6, .3), stone); p.position.set(s * 2.6, 1.1, 2.0); g.add(p);
    const u = new THREE.Mesh(G.urn, stone); u.scale.setScalar(1.7); u.position.set(s * 2.6, 3.75, 2.0); g.add(u);
  }
  // vines: thin tubes drooping from the eaves
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const len = .5 + (i % 4) * .35;
    const v = new THREE.Mesh(new THREE.CylinderGeometry(.018, .01, len, 4), leaf);
    v.position.set(Math.sin(a) * 2.5, 4.6 - len / 2, Math.cos(a) * 2.0); g.add(v);
  }
  kit.group.add(g);
  kit.group.add(roof(kit, rand, { x, y: 4.8, z, w: 6.4, d: 5.6, h: 2.0, rows: 10, cols: 22 }));
  lanternAt(kit, x - 2.4, 3.6, z + 2.4, lights);
}

function coiXayGio(kit, rand, x, z) {
  // octagonal stone tower (lathe, 8 segments) + balcony ring + 4 latticed sails
  const tower = new THREE.Mesh(lathe([[.001, 0], [2.5, 0], [2.15, 1], [1.85, 4], [1.6, 8], [1.45, 10], [1.6, 10.6], [.001, 10.7]], 8), stone);
  tower.position.set(x, 0, z); tower.castShadow = true; kit.group.add(tower);
  wallBlocks(kit, rand, x, 0, z, 4.2, 8, 4.2, 9, 16, 0);
  const balcony = new THREE.Mesh(new THREE.TorusGeometry(2.05, .18, 6, 16), red);
  balcony.rotation.x = Math.PI / 2; balcony.position.set(x, 10.2, z); kit.group.add(balcony);
  // red timber upper storey with lattice windows on all four sides
  for (const s of [-1, 1]) {
    lattice(kit, x, 10.6, z + s * 1.75, 3.2, 1.5, 0);
    lattice(kit, x + s * 1.75, 10.6, z, 3.2, 1.5, Math.PI / 2);
    for (const t of [-1, 1]) {
      const p = new THREE.Mesh(column(1.7, .22), red); p.position.set(x + s * 1.7, 10.1, z + t * 1.7); kit.group.add(p);
    }
  }
  kit.group.add(roof(kit, rand, { x, y: 10.7, z, w: 4.6, d: 4.6, h: 1.9, rows: 9, cols: 18 }));
  // sails: bamboo frame + MANY thin woven slats, not a flat plane
  const hub = new THREE.Group(); hub.position.set(x, 11.8, z + 2.0);
  for (let k = 0; k < 4; k++) {
    const sail = new THREE.Group(); sail.rotation.z = k * Math.PI / 2 + .3;
    const L = 4.2, wid = 1.5;
    const spine = new THREE.Mesh(new THREE.BoxGeometry(.09, L, .09), darkWood); spine.position.y = L / 2; sail.add(spine);
    for (let j = 0; j <= 8; j++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(wid, .05, .05), wood);
      rib.position.set(0, .3 + j * (L / 8), .03); sail.add(rib);
    }
    for (let r = 0; r < 26; r++) {
      for (let c = 0; c < 8; c++) {
        const m = new THREE.Matrix4().compose(
          new THREE.Vector3((c - 3.5) * .19, .3 + r * (L / 27), .02),
          new THREE.Quaternion(), new THREE.Vector3(.5, .09, .04));
        m.premultiply(new THREE.Matrix4().makeRotationZ(k * Math.PI / 2 + .3));
        m.premultiply(new THREE.Matrix4().makeTranslation(x, 11.8, z + 2.0));
        kit.add('cloth', m, r % 3 ? C.clothA : C.clothB);
      }
    }
    hub.add(sail);
  }
  kit.group.add(hub);
  // Baked woven slats share the frames' fixed orientation; keep the assembly static.
}

function haiDang(kit, rand, lights, x, z) {
  const tower = new THREE.Mesh(lathe([[.001, 0], [2.5, 0], [2.0, .8], [1.7, 3], [1.45, 8], [1.2, 12], [1.5, 12.8], [1.5, 13.2], [.001, 13.3]], 12), stone);
  tower.position.set(x, 0, z); tower.castShadow = true; kit.group.add(tower);
  // arched door
  const door = new THREE.Mesh(new THREE.BoxGeometry(1.0, 1.9, .3), darkWood); door.position.set(x, 1.0, z + 2.1); kit.group.add(door);
  arch(kit, rand, x, 1.9, z + 2.1, .55, .4, 0);
  for (const y of [4.5, 9.0, 12.9]) {
    const bal = new THREE.Mesh(new THREE.TorusGeometry(1.8 - y * .03, .16, 6, 16), red);
    bal.rotation.x = Math.PI / 2; bal.position.set(x, y, z); kit.group.add(bal);
    for (let i = 0; i < 16; i++) {
      const a = i / 16 * Math.PI * 2;
      const b = new THREE.Mesh(G.urn, stone); b.scale.setScalar(.9);
      b.position.set(x + Math.sin(a) * (1.8 - y * .03), y + .1, z + Math.cos(a) * (1.8 - y * .03)); kit.group.add(b);
    }
  }
  // upper red pavilion: columns, open arch bays, balustrade, then the tiled roof
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const p = new THREE.Mesh(column(2.2, .24), red); p.position.set(x + sx * 1.4, 13.3, z + sz * 1.4); kit.group.add(p);
  }
  for (let i = 0; i < 12; i++) {
    const a = i / 12 * Math.PI * 2;
    const u = new THREE.Mesh(G.urn, red); u.scale.setScalar(.9);
    u.position.set(x + Math.sin(a) * 1.7, 13.4, z + Math.cos(a) * 1.7); kit.group.add(u);
  }
  kit.group.add(roof(kit, rand, { x, y: 13.3, z, w: 4.4, d: 4.4, h: 2.2, rows: 10, cols: 20 }));
  const flame = new THREE.Mesh(new THREE.SphereGeometry(.55, 12, 8), glow); flame.position.set(x, 16.3, z); kit.group.add(flame);
  const l = new THREE.PointLight('#ffb061', 0, 40, 2); l.position.set(x, 16.3, z); l.userData.candela = 130; lights.push(l);
}

function thuyen(kit, rand, x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, .25, z); g.rotation.y = ry;
  // hull: extruded curved cross-section
  const hullShape = new THREE.Shape();
  hullShape.moveTo(-3.6, 0); hullShape.quadraticCurveTo(-3.9, .7, -2.4, .95);
  hullShape.lineTo(2.6, .95); hullShape.quadraticCurveTo(3.9, .7, 3.6, 0);
  hullShape.quadraticCurveTo(0, -.55, -3.6, 0);
  const hullGeo = new THREE.ExtrudeGeometry(hullShape, { depth: 1.9, bevelEnabled: true, bevelSize: .08, bevelThickness: .08, bevelSegments: 2, curveSegments: 8 });
  hullGeo.rotateY(Math.PI / 2); hullGeo.translate(-.95, 0, 0);
  const hull = new THREE.Mesh(hullGeo, darkWood); hull.castShadow = true; g.add(hull);
  // hull planks: rows of thin wooden strips following the curved cross-section
  for (let i = 0; i < 7; i++) {
    const plank = new THREE.Mesh(new THREE.BoxGeometry(.08, .13, 7.0), i % 2 ? wood : darkWood);
    plank.position.set(-.85 + i * .27, .35 + Math.sin(i / 6 * Math.PI) * .45, 0);
    plank.rotation.z = (i - 3) * .12; g.add(plank);
  }
  g.add(box(1.7, .12, 3.5, wood, 0, 1.0, 0));
  const gunwale = new THREE.Mesh(new THREE.BoxGeometry(.12, .18, 7.2), wood);
  gunwale.position.set(-.9, .95, 0); g.add(gunwale);
  const gunwale2 = gunwale.clone(); gunwale2.position.x = .9; g.add(gunwale2);
  // cabin with tiny tiled roof
  g.add(box(1.5, .9, 1.2, red, 0, 1.5, -1.0));
  // mast + bat-wing sail: bamboo ribs + many fabric panels
  const mast = box(.12, 5.2, .12, wood, 0, 2.8, 0); g.add(mast);
  const sailShape = new THREE.Shape();
  sailShape.moveTo(0, 0); sailShape.lineTo(2.9, .25); sailShape.lineTo(3.1, 3.6);
  sailShape.lineTo(1.4, 4.5); sailShape.lineTo(0, 4.2); sailShape.lineTo(0, 0);
  const ribs = 7, panels = 9;
  for (let r = 0; r <= ribs; r++) {
    const y = .2 + r * (4.2 / ribs);
    const xEnd = 3.0 - Math.pow(r / ribs, 1.4) * 1.9;
    const rib = new THREE.Mesh(new THREE.BoxGeometry(xEnd, .05, .05), wood);
    rib.position.set(xEnd / 2, y, .06); g.add(rib);
  }
  for (let c = 0; c <= panels; c++) {
    const x0 = c * (3.0 / panels);
    const rib = new THREE.Mesh(new THREE.BoxGeometry(.04, 4.2, .04), darkWood);
    rib.position.set(x0, 2.2, .06); g.add(rib);
  }
  for (let c = 0; c < panels; c++) for (let r = 0; r < ribs; r++) {
    const t = (r + .5) / ribs;
    const maxX = 3.0 - Math.pow(t, 1.4) * 1.9;     // bat-wing taper toward the top
    if (c + 1 > panels * (maxX / 3.0)) continue;
    const x = (c + .5) * (maxX / panels), y = .2 + t * 4.2;
    const w = maxX / panels * .95, h = 4.2 / ribs * .95;
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(w, h), cloth);
    panel.position.set(x, y, .02); g.add(panel);
  }
  const boom = box(.06, .06, 3.2, darkWood, 0, 4.4, 0); boom.rotation.y = Math.PI / 2; g.add(boom);
  kit.group.add(g);
}

function cayDa(kit, rand, lights, x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  const trunk = new THREE.Mesh(lathe([[.001, 0], [2.4, 0], [2.0, 2], [1.6, 5], [1.3, 8], [.7, 9.6], [.001, 10]], 14), darkWood);
  trunk.castShadow = true; g.add(trunk);
  // thick buttress roots spreading over the ground
  for (let i = 0; i < 16; i++) {
    const a = i / 16 * Math.PI * 2;
    const rr = 2.4 + rand() * 1.4;
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x + Math.sin(a) * 1.5, .2, z + Math.cos(a) * 1.5),
      new THREE.Quaternion(), new THREE.Vector3(.34, rr / 3, .34));
    m.multiply(new THREE.Matrix4().makeRotationZ(Math.cos(a) * 1.25));
    m.multiply(new THREE.Matrix4().makeRotationX(-Math.sin(a) * 1.25));
    kit.add('root', m);
  }
  // 28 hanging roots + surface roots
  for (let i = 0; i < 28; i++) {
    const a = rand() * 6.28, len = 3 + rand() * 5, rr = 1.2 + rand() * 2.6;
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(x + Math.sin(a) * rr, 1.1 + rand() * 4, z + Math.cos(a) * rr),
      new THREE.Quaternion(), new THREE.Vector3(.1 + rand() * .08, len / 3, .1 + rand() * .08));
    m.multiply(new THREE.Matrix4().makeRotationZ(Math.sin(a) * .32));
    m.multiply(new THREE.Matrix4().makeRotationX(-Math.cos(a) * .32));
    kit.add('root', m);
  }
  // canopy: instanced icosahedron clumps, varied size and colour
  for (let i = 0; i < 95; i++) {
    const a = rand() * 6.28, rr = Math.sqrt(rand()) * 7.5;
    const s = 1.1 + rand() * 1.6;
    const m = place(x + Math.sin(a) * rr, 9.5 + rand() * 3.8, z + Math.cos(a) * rr * .9, rand() * 6.28, s, s * (.6 + rand() * .4), s);
    kit.add('leaf', m, pick([C.leafA, C.leafB, C.leafC, C.leafD], rand));
  }
  // small shrine nestled in the roots with its own tiled roof
  const mieu = new THREE.Group(); mieu.position.set(2.9, 0, 2.4);
  mieu.add(box(2.6, 2.0, 2.2, red, 0, 1.1, 0));
  mieu.add(box(1.1, 1.4, .1, darkWood, 0, 1.1, 1.13));
  g.add(mieu);
  kit.group.add(g);
  kit.group.add(roof(kit, rand, { x: x + 2.9, y: 2.2, z: z + 2.4, w: 3.4, d: 3.0, h: 1.3, rows: 6, cols: 14 }));
  lanternAt(kit, x + 2.0, 1.9, z + 3.7, lights);
  lanternAt(kit, x + 3.8, 1.9, z + 3.7, lights);
}

// ---------------------------------------------------------------- pond, reeds, trees
function pond(kit, rand, lights) {
  const waterMat = new THREE.MeshStandardMaterial({ color: '#4d877e', roughness: .16, metalness: .42, transparent: true, opacity: .93 });
  waterMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.uTime;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      `#include <begin_vertex>
       transformed.y += sin(position.x * 0.9 + uTime * 1.4) * 0.035 + cos(position.y * 0.8 - uTime * 1.1) * 0.03;`);
  };
  const water = new THREE.Mesh(new THREE.CircleGeometry(WATER, 96), waterMat);
  water.rotation.x = -Math.PI / 2; water.position.y = .03; water.receiveShadow = true; kit.group.add(water);
  const greens = ['#3f7042', '#4f8250', '#356138'].map(c => new THREE.Color(c));
  const pinks = ['#f4b8cc', '#fff0f4', '#e88fb0'].map(c => new THREE.Color(c));
  for (let i = 0; i < 190; i++) {
    const a = rand() * 6.28, d = 3 + Math.sqrt(rand()) * (WATER - 3.5);
    const px = Math.sin(a) * d + 7, pz = Math.cos(a) * d - 6, s = .7 + rand() * .9;
    kit.add('pad', place(px, .055 + rand() * .02, pz, rand() * 6.28, s, 1, s), pick(greens, rand));
    if (rand() > .66) kit.add('bud', place(px + .1, .09, pz, rand() * 6.28, s * .8, s * .8, s * .8), pick(pinks, rand));
  }
  // reeds around the pond edge
  for (let i = 0; i < 260; i++) {
    const a = rand() * 6.28, d = WATER - 1.2 - rand() * 2.4;
    const px = Math.sin(a) * d + 7, pz = Math.cos(a) * d - 6;
    const s = .5 + rand() * .9;
    kit.add('reed', place(px, .04 + s * .5, pz, rand() * 6.28, s, s, s), pick(greens, rand));
  }
  kit.group.add(box(3.4, .3, 9, wood, -4, .35, 7));
  for (const z of [3, 7, 11]) kit.group.add(box(.3, 1.2, .3, darkWood, -5.4, -.3, z));
}

function trees(kit, rand) {
  const leafColors = ['#4f6e2c', '#5d7a33', '#46632a', '#6a8540'].map(c => new THREE.Color(c));
  const sway = `
    vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
    float ph = dot(wp.xz, vec2(0.13, 0.17));
    transformed.x += sin(uTime * 1.5 + ph) * 0.07 * uWind * (position.y + 1.0);
    transformed.z += cos(uTime * 1.2 + ph * 1.3) * 0.06 * uWind * (position.y + 1.0);`;
  const patch = (sh) => {
    sh.uniforms.uTime = U.uTime; sh.uniforms.uWind = U.uWind;
    sh.vertexShader = 'uniform float uTime, uWind;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>' + sway);
  };
  const leafMat = leaf.clone(); leafMat.onBeforeCompile = patch;
  const depth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }); depth.onBeforeCompile = patch;
  const clear = [
    [-20, 26, 12], [-14, 20, 11], [-12, -38, 10], [-3, -43, 10], [0, 15, 14], [0, 32, 15], [-30, 12, 10],
    [25, 18, 10], [25, 30, 12], [-34, -28, 10], [-34, -16, 12], [29, -27, 12], [29, -14, 14], [4, 1, 10], [14, 10, 12],
  ];
  for (let i = 0; i < 70; i++) {
    const s = .8 + rand() * .8;
    let x = 0, z = 0, tries = 0;
    do {
      const a = rand() * 6.28, d = 26 + rand() * 44;
      x = Math.sin(a) * d; z = Math.cos(a) * d;
    } while (clear.some(([cx, cz, r]) => Math.hypot(x - cx, z - cz) < r) && ++tries < 24);
    kit.add('trunk', place(x, 0, z, rand() * 6.28, s, s, s));
    // varied canopy: mix of cones and icospheres, not uniform balls
    const kind = i % 3;
    for (let k = 0; k < 6; k++) {
      const px = x + (rand() - .5) * 2.8, pz = z + (rand() - .5) * 2.8;
      const py = (3 + rand() * 2.4) * s, sc = (1.0 + rand()) * s;
      const col = pick([C.leafA, C.leafB, C.leafC, C.leafD], rand);
      if (kind === 0) kit.add('leaf', place(px, py, pz, rand() * 6.28, sc, sc * .8, sc), col);
      // layered canopy: four leaf clumps instead of a cone
      for (let k = 0; k < 4; k++) {
        const cx = px + (rand() - .5) * sc * 1.4, cz = pz + (rand() - .5) * sc * 1.4;
        const cy = py + sc * (0.9 + k * 0.45), ls = sc * (1.15 - k * 0.13);
        kit.add('leaf', place(cx, cy, cz, rand() * 6.28, ls, ls * .8, ls), leafColors[(rand() * leafColors.length) | 0]);
      }
      if (kind === 2) kit.add('leaf', place(px, py + .6, pz, rand() * 6.28, sc * .8, sc * 1.2, sc * .8), col);
    }
  }
}

function marketArcade(kit) {
  for (const rowZ of [8.2, 10.6]) {
    for (let x = -9; x <= 9; x += 3) kit.group.add(box(.12, 4.2, .12, wood, x, 2.1, rowZ));
    kit.group.add(box(18.6, .18, .18, darkWood, 0, 4.2, rowZ));
  }
}

// ---------------------------------------------------------------- build
export function buildScene() {
  geo();
  const group = new THREE.Group();
  const rand = rng(2026);
  const lights = [];
  const sails = [];
  const kit = new Kit().def('tile', G.tile, stone) // geometry/material swapped by colour below
    .def('ridge', G.ridge, stone).def('brick', G.brick, stone)
    .def('slat', G.slat, darkWood).def('hslat', G.hslat, darkWood)
    .def('leaf', G.leafIco, leaf).def('cone', G.cone, leaf)
    .def('urn', G.urn, stone).def('jar', G.jar, darkWood)
    .def('turtle', G.turtle, stone).def('lamp', G.lantern, lanternMat)
    .def('cable', new THREE.CylinderGeometry(.025, .025, .55, 5), darkWood, { cast: false })
    .def('pad', G.leafPad, lotusLeaf).def('bud', G.bud, petal)
    .def('root', G.root, darkWood).def('trunk', G.trunk, darkWood)
    .def('reed', G.reed, leaf)
    .def('cloth', G.slTile, cloth)
    .def('dragon', new THREE.SphereGeometry(.19, 8, 6), gold)
    .def('horn', G.dragonHorn, gold)
    .def('red', new THREE.BoxGeometry(1, 1, 1), red)
    .def('dark', new THREE.BoxGeometry(1, 1, 1), darkWood);
  kit.group = group; kit.lights = lights; kit.sails = sails;

  const ground = new THREE.Mesh(new THREE.CircleGeometry(320, 64), new THREE.MeshStandardMaterial({ map: groundMap, roughness: .96 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -.2; ground.receiveShadow = true; group.add(ground);
  const road = sweep([[-2.2, .02], [2.2, .02]], arc(0, 0, R, 0, Math.PI * 2, 96), { closed: true });
  const roadMesh = new THREE.Mesh(road, stone); roadMesh.receiveShadow = true; group.add(roadMesh);

  // tile material must be the warm roof material, not stone — override after def
  tileGeoMaterial(kit);
  const landmarkGroups = [...addA(group), ...addB(group, { night: false })];
  pond(kit, rand, lights);
  trees(kit, rand);
  marketArcade(kit);
  for (let i = 0; i < 7; i++) {
    lanternAt(kit, -9 + i * 3, 3.45 - Math.sin(i / 6 * Math.PI) * .2, 9.4, lights);
  }
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * 6.28, d = R + 2.5;
    kit.add('urn', place(Math.sin(a) * d, 0, Math.cos(a) * d, a, 1.4, 1.4, 1.4), C.stoneWarm);
  }
  kit.build(group);

  // No refs to load: tell main.js the loader can close immediately.
  window.__refsLoaded = true; window.__refTotal = window.__refLoaded = 0;

  return {
    group,
    center: new THREE.Vector3(0, 3.6, 0),
    update(now) {
      const night = U.uNight.value;
      glow.emissiveIntensity = night * 4.2;
      lanternMat.emissiveIntensity = night * 1.7;
      wood.emissiveIntensity = .25 * night;
      for (const l of lights) { l.intensity = night * l.userData.candela; l.visible = night > .01; }
    },
  };
}
function tileGeoMaterial(kit) {
  // tiles are the only kit part using the red tile material (per-instance colour still applies)
  kit.parts.get('tile').material = new THREE.MeshStandardMaterial({ color: '#ffffff', roughness: .8 });
}
