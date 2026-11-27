// geo_a.js — Part A landmarks: Vietnamese gate, house, bridge, shrine.
// Pure 3D mesh geometry only. No image textures, no alpha planes, no photos.
import * as THREE from 'three';
import { Kit, place, lathe, arc, sweep, canvasTex, rng } from './kit.js';

const UP = new THREE.Vector3(0, 1, 0);
const C = (h) => new THREE.Color(h);

const STONE = [0x8d8d80, 0x9a9382, 0x7d826f, 0xa39b86, 0x6f7765, 0x8a9482];
const TILE = [0xb3623f, 0x9e5335, 0xc07a4e, 0x8d4d33, 0xa85c3c];
const WOOD = 0x7a2e22, DARKWOOD = 0x4a1f18, RED = 0x9d3326, GOLD = 0xd9a83c;

function mat(color, extra = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.02, ...extra });
  if (extra.map) { m.bumpMap = extra.map; m.bumpScale = 0.025; }
  return m;
}

// Per-call canvas textures (painted in code, no files).
let _plasterTex = null, _stoneTex = null;
function plasterTex() {
  if (_plasterTex) return _plasterTex;
  _plasterTex = canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#d8c48f'; ctx.fillRect(0, 0, w, h);
    const r = rng(11);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = r() > 0.5 ? 'rgba(160,140,95,0.18)' : 'rgba(240,225,180,0.22)';
      ctx.fillRect(r() * w, r() * h, 2 + r() * 4, 2 + r() * 4);
    }
  }, { repeat: [3, 2] });
  return _plasterTex;
}
function mossStoneTex() {
  if (_stoneTex) return _stoneTex;
  _stoneTex = canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#b4b2a2'; ctx.fillRect(0, 0, w, h);
    const r = rng(23);
    for (let i = 0; i < 1200; i++) {
      const g = r();
      ctx.fillStyle = g > 0.7 ? 'rgba(105,130,82,0.30)' : g > 0.4 ? 'rgba(80,84,72,0.22)' : 'rgba(200,200,180,0.25)';
      ctx.fillRect(r() * w, r() * h, 1 + r() * 5, 1 + r() * 4);
    }
  }, { repeat: [2, 2] });
  return _stoneTex;
}

// Shared geometry cache.
const _geo = {};
function g(name) {
  if (_geo[name]) return _geo[name];
  switch (name) {
    case 'unitBox': return (_geo[name] = new THREE.BoxGeometry(1, 1, 1));
    case 'tile': return (_geo[name] = new THREE.CylinderGeometry(0.11, 0.11, 0.3, 6, 1, false, 0, Math.PI));
    case 'ridge': return (_geo[name] = new THREE.CylinderGeometry(0.1, 0.1, 1, 8));
    case 'finial': return (_geo[name] = new THREE.ConeGeometry(0.18, 0.55, 8));
    case 'horn': return (_geo[name] = new THREE.ConeGeometry(0.07, 0.4, 6));
    case 'urn': return (_geo[name] = lathe([[0.12, 0], [0.2, 0.1], [0.24, 0.35], [0.18, 0.6], [0.1, 0.72], [0.14, 0.8], [0, 0.86]], 12));
    case 'baluster': return (_geo[name] = lathe([[0.07, 0], [0.11, 0.1], [0.06, 0.2], [0.1, 0.42], [0.06, 0.55], [0.11, 0.68], [0.07, 0.78]], 10));
    case 'column': return (_geo[name] = lathe([[0.17, 0], [0.16, 0.15], [0.145, 1.0], [0.14, 2.0], [0.155, 2.9], [0.17, 3.0]], 14));
    case 'lampBody': return (_geo[name] = new THREE.SphereGeometry(0.22, 12, 10));
    case 'jar': return (_geo[name] = lathe([[0.05, 0], [0.22, 0.08], [0.32, 0.3], [0.28, 0.55], [0.16, 0.7], [0.18, 0.76]], 14));
    case 'steleDisc': return (_geo[name] = new THREE.CylinderGeometry(0.55, 0.55, 0.08, 24));
    case 'turtleShell': return (_geo[name] = new THREE.SphereGeometry(1, 18, 12));
    default: throw new Error('unknown geo ' + name);
  }
}

// A matrix that tilts a tile to lie flush on a roof slope.
function tileM(x, y, z, slope, spin) {
  const q = new THREE.Quaternion().setFromAxisAngle(UP, spin);
  q.multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2));
  const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), slope);
  q.multiply(tilt);
  return new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), q, new THREE.Vector3(1, 1, 1));
}

/**
 * Build a complete tiled hip roof from instanced half-cylinder tiles + ridge + finials.
 * w = width (X), d = depth (Z), h = rise of roof above eave. Roof centred at local origin,
 * eave line at y=0. Colors chosen from palette (array of hex ints).
 * Returns the Kit meshes created (adds them into `group`).
 */
export function tileRoof(group, w, d, h, palette = TILE, seed = 7) {
  const kit = new Kit();
  const r = rng(seed);
  const colors = palette.map(C);
  const step = 0.22, halfW = w / 2, halfD = d / 2;
  const run = Math.min(halfW, halfD);                 // horizontal run of each slope
  const slope = Math.atan2(h, run);                   // incline angle
  const cosS = Math.cos(slope), sinS = Math.sin(slope);
  // solid roof deck under the tiles: 4 inclined planes so no sky shows through
  const deck = new THREE.MeshStandardMaterial({ color: 0x5e2b20, roughness: 0.9, side: THREE.DoubleSide });
  {
    const rise = h, len = Math.hypot(run, rise);
    for (const axis of ['z', 'x']) {
      const span = axis === 'z' ? w : d;
      for (const sign of [-1, 1]) {
        const plane = new THREE.Mesh(new THREE.PlaneGeometry(span + 0.1, len + 0.05), deck);
        plane.rotation.order = 'YXZ';
        if (axis === 'z') { plane.rotation.y = sign > 0 ? 0 : Math.PI; plane.rotation.x = -slope; plane.position.set(0, rise / 2, sign * (run * cosS / 2)); }
        else { plane.rotation.y = Math.PI / 2; plane.rotation.z = sign * slope; plane.position.set(sign * (run * cosS / 2), rise / 2, 0); }
        plane.castShadow = plane.receiveShadow = true;
        group.add(plane);
      }
    }
  }
  kit.def('tile', g('tile'), mat(0xa85c3c));
  // Four slopes: front (+Z), back (-Z), left (+X), right (-X).
  const slopes = [
    { axis: 'z', sign: 1, span: w },
    { axis: 'z', sign: -1, span: w },
    { axis: 'x', sign: 1, span: d },
    { axis: 'x', sign: -1, span: d },
  ];
  for (const s of slopes) {
    const rows = Math.max(2, Math.floor(run / step));
    for (let row = 0; row < rows; row++) {
      const t = row / (rows - 1 || 1);
      const along = run * t;                          // distance from ridge outward
      const y = h - along * Math.tan(slope) + 0.03;
      const outer = t > 0.8 ? 0.25 : 0;               // upturned eave corners
        const count = Math.floor((s.span - 0.2) / 0.22);
        for (let i = 0; i < count; i++) {
          const u = -s.span / 2 + 0.15 + i * 0.22;
        const edge = Math.abs(u) / (s.span / 2);
        const lift = outer * edge * edge;
        const yy = y + lift;
        const col = colors[Math.floor(r() * colors.length)];
        if (s.axis === 'z') {
          kit.add('tile', tileM(u, yy, s.sign * (along * cosS + 0.05), s.sign * slope, 0), col);
        } else {
          kit.add('tile', tileM(s.sign * (along * cosS + 0.05), yy, u, 0, s.sign * Math.PI / 2 + slope * 0), col);
        }
      }
    }
  }
  // Ridge beam + dragon finials at the two ends.
  kit.def('ridge', g('ridge'), mat(0x6b3123));
  kit.add('ridge', new THREE.Matrix4().compose(new THREE.Vector3(0, h + 0.12, 0), new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2), new THREE.Vector3(Math.max(w, d) * 0.98, 1, 1)));
  kit.def('finial', g('finial'), mat(0xc28a3a, { metalness: 0.4, roughness: 0.5 }));
  kit.def('horn', g('horn'), mat(0xd8a94a, { metalness: 0.4 }));
  const fx = Math.max(w, d) / 2;
  for (const sx of [-1, 1]) {
    kit.add('finial', place(sx * fx, h + 0.4, 0));
    kit.add('horn', place(sx * fx - 0.18 * sx, h + 0.72, 0.1, 0, 1, 1, 1));
    kit.add('horn', place(sx * fx - 0.18 * sx, h + 0.72, -0.1, 0, 1, 1, 1));
  }
  return kit.build(group);
}

// ---- Shared small builders -------------------------------------------------

function stoneArch(kit, cx, cy, cz, radius, thickness, seed) {
  // Semi-circular arch of wedge blocks standing in the X-Y plane.
  const r = rng(seed);
  const N = 12;
  for (let j = 0; j < N; j++) {
    const a = Math.PI - (j + 0.5) * Math.PI / N;
    const x = cx + Math.cos(a) * radius;
    const y = cy + Math.sin(a) * radius;
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), -a + Math.PI / 2);
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, cz), q, new THREE.Vector3(thickness, 0.5, thickness));
    kit.add('wedge', m, C(STONE[Math.floor(r() * STONE.length)]));
  }
}

function lantern(kit, x, y, z, seed) {
  kit.add('lampBody', place(x, y, z), C(0xffca55));
  kit.add('lampFrame', place(x, y + 0.26, z, 0, 0.34, 0.08, 0.34));
  kit.add('lampFrame', place(x, y - 0.26, z, 0, 0.34, 0.08, 0.34));
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    kit.add('lampFrame', place(x + Math.sin(a) * 0.2, y, z + Math.cos(a) * 0.2, a, 0.04, 0.55, 0.04));
  }
}

function carvedPillars(kit, xs, y, z, h) {
  kit.def('column', g('column'), mat(WOOD));
  for (const x of xs) kit.add('column', place(x, y, z, 0, 1, h / 3, 1));
}

function urnBalustrade(kit, x0, x1, y, z, step = 0.85) {
  kit.def('urn', g('urn'), mat(0x9a9484));
  for (let x = x0; x <= x1 + 0.01; x += step) kit.add('urn', place(x, y, z));
}

// ---- 1. Cổng tam quan ------------------------------------------------------

function addGate(group) {
  const gate = new THREE.Group();
  gate.name = 'tam_quan_gate';
  gate.position.set(-14, 0.35, 20);
  gate.rotation.y = 0.2;
  group.add(gate);
  const kit = new Kit();
  const r = rng(101);
  kit.def('wedge', g('unitBox'), mat(0xffffff, { map: mossStoneTex() }));
  kit.def('pillarBase', g('unitBox'), mat(0x8b8f7c, { map: mossStoneTex() }));
  kit.def('stoneWall', g('unitBox'), mat(0x8d8f80, { map: mossStoneTex() }));
  kit.def('beam', g('unitBox'), mat(RED));
  kit.def('darkWood', g('unitBox'), mat(DARKWOOD));
  kit.def('post', g('unitBox'), mat(WOOD));
  kit.def('lampBody', g('lampBody'), mat(0xffffff, { emissive: 0xffaa22, emissiveIntensity: 0.8 }));
  kit.def('lampFrame', g('unitBox'), mat(GOLD, { metalness: 0.5 }));

  // Stone base: 3 arches on a 12m-wide plinth.
  kit.add('stoneWall', place(0, 1.7, -0.6, 0, 12, 3.4, 1.6));
  for (const cx of [-3.7, 0, 3.7]) {
    stoneArch(kit, cx, 2.0, 0.25, 1.6, 0.55, 100 + Math.round(cx * 10));
    // pillars flanking each arch
    for (const s of [-1, 1]) {
      const px = cx + s * 1.85;
      kit.add('pillarBase', place(px, 0.6, 0.25, 0, 0.5, 1.2, 0.55));
      kit.add('pillarBase', place(px, 1.25, 0.25, 0, 0.62, 0.18, 0.62));
    }
  }
  // Upper red timber pavilion, first storey at y=3.5.
  kit.add('beam', place(0, 3.55, 0, 0, 11.5, 0.32, 1.7));
  const cols = [-4.9, -3.3, -1.6, 0, 1.6, 3.3, 4.9];
  carvedPillars(kit, cols, 3.7, 0.55, 3.0);
  kit.add('beam', place(0, 6.75, 0.55, 0, 11.5, 0.3, 1.7));
  // lower roof (wide)
  tileRoof(gate, 12.4, 3.6, 1.5, TILE, 201);
  gate.children[gate.children.length - 1].position.y = 6.9;
  // Second storey: smaller pavilion + second roof.
  kit.add('beam', place(0, 8.2, 0.2, 0, 7.0, 0.28, 1.5));
  carvedPillars(kit, [-2.8, -1.4, 0, 1.4, 2.8], 8.3, 0.2, 1.6);
  const roof2 = new THREE.Group();
  tileRoof(roof2, 7.8, 2.8, 1.2, TILE, 202);
  roof2.position.y = 9.9;
  gate.add(roof2);
  // Balustrade + urn finials on the stone deck.
  urnBalustrade(kit, -5.6, 5.6, 3.5, 1.35);
  // Hanging lanterns.
  for (let i = 0; i < 6; i++) lantern(kit, -4.6 + i * 1.85, 6.0, 1.5, i);
  kit.build(gate);
  return gate;
}

// ---- 2. Nhà ba gian --------------------------------------------------------

function addHouse(group, x, z, seed) {
  const house = new THREE.Group();
  house.name = 'nha_ba_gian';
  house.position.set(x, 0, z);
  group.add(house);
  const kit = new Kit();
  const r = rng(seed);
  kit.def('plinth', g('unitBox'), mat(0x9a9787, { map: mossStoneTex() }));
  kit.def('wall', g('unitBox'), mat(0xffffff, { map: plasterTex() }));
  kit.def('post', g('unitBox'), mat(WOOD));
  kit.def('beam', g('unitBox'), mat(DARKWOOD));
  kit.def('door', g('unitBox'), mat(0x6e2d20));
  kit.def('slat', g('unitBox'), mat(0x8a4a2e));
  kit.def('bamboo', g('unitBox'), mat(0xb59a5c));
  kit.def('jar', g('jar'), mat(0x3a3733));
  kit.def('lampBody', g('lampBody'), mat(0xffffff, { emissive: 0xffaa22, emissiveIntensity: 0.8 }));
  kit.def('lampFrame', g('unitBox'), mat(GOLD, { metalness: 0.5 }));

  // Mossy stone plinth + 4 steps at front (+Z).
  kit.add('plinth', place(0, 0.3, 0, 0, 9.2, 0.6, 5.2));
  for (let i = 0; i < 4; i++) kit.add('plinth', place(0, 0.075 + i * 0.13, 2.8 + i * 0.36, 0, 2.6, 0.15, 0.5));
  // Yellow plaster walls, 3 bays, depth 4.6.
  kit.add('wall', place(0, 2.0, -0.3, 0, 8.6, 2.8, 0.3));           // back
  kit.add('wall', place(-4.3, 2.0, 0, 0, 0.3, 2.8, 4.8));           // side walls
  kit.add('wall', place(4.3, 2.0, 0, 0, 0.3, 2.8, 4.8));
  // Columns and beams.
  const cols = [-4.2, -1.4, 1.4, 4.2];
  for (const cx of cols) kit.add('post', place(cx, 2.05, 2.3, 0, 0.26, 2.9, 0.26));
  kit.add('beam', place(0, 3.5, 2.3, 0, 9.0, 0.3, 0.3));
  // Wooden lattice doors in each bay: crossed slats instanced.
  for (let b = 0; b < 3; b++) {
    const bx = -2.85 + b * 2.85;
    kit.add('door', place(bx, 1.9, 2.28, 0, 2.4, 2.6, 0.08));
    for (let s = 0; s < 6; s++) {
      const sx = bx - 1.1 + s * 0.44;
      kit.add('slat', place(sx, 1.9, 2.34, 0, 0.06, 2.4, 0.05));
      kit.add('slat', place(sx, 1.9, 2.36, 0.5, 0.06, 2.4, 0.05));
    }
  }
  // Bamboo blinds beneath the eave.
  for (let i = 0; i < 26; i++) kit.add('bamboo', place(-4.2 + i * 0.34, 3.3, 2.5, 0, 0.05, 0.5, 0.03));
  // Two dark jars + two lanterns by the steps.
  kit.add('jar', place(-3.5, 0.6, 2.9));
  kit.add('jar', place(3.5, 0.6, 2.9));
  lantern(kit, -2.9, 2.9, 2.65, seed);
  lantern(kit, 2.9, 2.9, 2.65, seed + 1);
  kit.build(house);
  // Tiled hip roof with upturned eaves.
  const roof = new THREE.Group();
  tileRoof(roof, 10.2, 6.0, 1.8, TILE, seed + 300);
  roof.position.y = 3.7;
  house.add(roof);
  return house;
}

// ---- 3. Cầu ngói -----------------------------------------------------------

function addBridge(group) {
  const bridge = new THREE.Group();
  bridge.name = 'cau_ngoi';
  bridge.position.set(0, 0.55, 15);
  bridge.rotation.y = 0;
  group.add(bridge);
  const kit = new Kit();
  kit.def('wedge', g('unitBox'), mat(0xffffff, { map: mossStoneTex() }));
  kit.def('stone', g('unitBox'), mat(0x83897c, { map: mossStoneTex() }));
  kit.def('redPost', g('unitBox'), mat(RED));
  kit.def('beam', g('unitBox'), mat(DARKWOOD));
  kit.def('baluster', g('baluster'), mat(0x9a9484));
  kit.def('lampBody', g('lampBody'), mat(0xffffff, { emissive: 0xffaa22, emissiveIntensity: 0.8 }));
  kit.def('lampFrame', g('unitBox'), mat(GOLD, { metalness: 0.5 }));

  // Span 12m along local X; arch rises above water (base y=0.4).
  kit.add('stone', place(-5.0, 1.4, 0, 0, 2.0, 2.8, 3.2));
  kit.add('stone', place(5.0, 1.4, 0, 0, 2.0, 2.8, 3.2));
  stoneArch(kit, 0, 0.4, 1.62, 2.3, 0.6, 303);
  stoneArch(kit, 0, 0.4, -1.62, 2.3, 0.6, 304);
  // Deck + red covered pavilion on top at y=3.0.
  kit.add('stone', place(0, 3.0, 0, 0, 12.0, 0.4, 3.4));
  for (let i = 0; i < 8; i++) {
    const px = -5.2 + i * (10.4 / 7);
    const pz = i % 2 === 0 ? 1.35 : -1.35;
    kit.add('redPost', place(px, 4.0, pz, 0, 0.24, 2.0, 0.24));
  }
  kit.add('beam', place(0, 5.0, 0, 0, 11.4, 0.28, 3.2));
  // Balustrades with lathed balusters.
  for (const s of [-1, 1]) {
    for (let i = 0; i <= 20; i++) kit.add('baluster', place(-5.6 + i * 0.56, 3.2, s * 1.7, 0, 0.7, 0.7, 0.7));
    kit.add('beam', place(0, 3.9, s * 1.7, 0, 11.4, 0.12, 0.12));
  }
  for (let i = 0; i < 8; i++) lantern(kit, -5.0 + i * 1.44, 4.3, 0, i);
  kit.build(bridge);
  const roof = new THREE.Group();
  tileRoof(roof, 11.6, 3.8, 1.5, TILE, 305);
  roof.position.y = 5.1;
  bridge.add(roof);
  return bridge;
}

// ---- 4. Miếu + bia rùa -----------------------------------------------------

function addShrine(group) {
  const shrine = new THREE.Group();
  shrine.name = 'mieu_bia_rua';
  shrine.position.set(-19, 0, 8);
  group.add(shrine);
  const kit = new Kit();
  const r = rng(404);
  kit.def('stone', g('unitBox'), mat(0x8d9482, { map: mossStoneTex() }));
  kit.def('redPost', g('unitBox'), mat(RED));
  kit.def('stele', g('unitBox'), mat(0x9ba394, { map: mossStoneTex() }));
  kit.def('turtleShell', g('turtleShell'), mat(0x6c7766));
  kit.def('leg', g('unitBox'), mat(0x6c7766));
  kit.def('disc', g('steleDisc'), mat(0xb0aa90));
  kit.def('pillar', g('urn'), mat(0x9a9d8c));

  // Stepped stone platform, 5m wide.
  for (let i = 0; i < 3; i++) kit.add('stone', place(0, 0.18 + i * 0.26, 0, 0, 5.0 - i * 0.3, 0.26, 3.4 - i * 0.2));
  // Turtle stele: flattened shell + head + 4 legs + engraved disc.
  kit.add('turtleShell', place(0, 1.05, 0, 0, 1.15, 0.45, 0.95));
  kit.add('turtleShell', place(0, 1.35, 0.95, 0, 0.32, 0.28, 0.38));  // head
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.add('leg', place(sx * 0.85, 0.75, sz * 0.6, 0, 0.35, 0.28, 0.35));
  // Upright engraved stone stele on the turtle's back.
  kit.add('stele', place(0, 2.5, -0.1, 0, 1.5, 2.1, 0.35));
  kit.add('disc', place(0, 2.7, 0.12, 0, 1, 1, 1));
  // Small shrine roof over the stele (4 red posts + tiled roof).
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) kit.add('redPost', place(sx * 1.7, 2.6, sz * 1.2, 0, 0.18, 2.4, 0.18));
  // Two carved stone pillars flanking the platform.
  for (const sx of [-1, 1]) kit.add('pillar', place(sx * 2.35, 0.7, 1.3, 0, 1.1, 1.3, 1.1));
  kit.build(shrine);
  const roof = new THREE.Group();
  tileRoof(roof, 4.6, 3.2, 1.2, TILE, 406);
  roof.position.y = 4.9;
  shrine.add(roof);
  // Hanging vines: TubeGeometry along seeded catenary curves from the eaves.
  const vineMat = mat(0x4f7a3a);
  for (let v = 0; v < 14; v++) {
    const sx = -2.0 + r() * 4.0;
    const sz = (r() > 0.5 ? 1 : -1) * 1.4;
    const len = 0.6 + r() * 1.2;
    const pts = [];
    for (let k = 0; k <= 6; k++) {
      const t = k / 6;
      pts.push(new THREE.Vector3(sx + Math.sin(t * 4 + v) * 0.1, 4.9 - t * len, sz + Math.sin(t * 3 + v) * 0.12));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    shrine.add(new THREE.Mesh(new THREE.TubeGeometry(curve, 8, 0.025, 5, false), vineMat));
  }
  return shrine;
}

/**
 * Add all four landmarks to the provided THREE.Group.
 * @param {THREE.Group} group destination group
 * @param {object} ctx optional context (unused, accepted for harness compatibility)
 * @returns {THREE.Group[]} array of landmark groups
 */
export function addA(group, ctx) {
  return [
    addGate(group),
    addHouse(group, -9, -34, 501),
    addHouse(group, -2, -39, 502),
    addBridge(group),
    addShrine(group),
  ];
}

/** Alternate API: build into a fresh group and return landmark records. */
export function buildLandmarksA(kitRoot = new THREE.Group()) {
  const parts = addA(kitRoot, {});
  const meta = [
    { name: 'tam_quan_gate', baseY: 0, center: [-14, 4.5, 20] },
    { name: 'nha_ba_gian_1', baseY: 0, center: [-9, 2.5, -34] },
    { name: 'nha_ba_gian_2', baseY: 0, center: [-2, 2.5, -39] },
    { name: 'cau_ngoi', baseY: 0.4, center: [0, 3.0, 15] },
    { name: 'mieu_bia_rua', baseY: 0, center: [-19, 2.5, 8] },
  ];
  return parts.map((g, i) => ({ ...meta[i], group: g }));
}
