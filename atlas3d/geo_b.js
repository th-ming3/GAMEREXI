// geo_b.js — Part B landmarks: bamboo windmill, pagoda lighthouse, bat-wing junk,
// banyan tree shrine. Pure 3D mesh geometry only. No image textures, no alpha planes,
// no photos. Canvas textures are painted in code. Units are metres; +Y up.
import * as THREE from 'three';
import { Kit, place, lathe, arc, sweep, canvasTex, rng } from './kit.js';
import { tileRoof } from './geo_a.js';

const UP = new THREE.Vector3(0, 1, 0);
const C = (h) => new THREE.Color(h);

const STONE = [0x8d8d80, 0x9a9382, 0x7d826f, 0xa39b86, 0x6f7765, 0x8a9482];
const TILE = [0xb3623f, 0x9e5335, 0xc07a4e, 0x8d4d33, 0xa85c3c];
const WOOD = 0x7a2e22, DARKWOOD = 0x4a1f18, RED = 0x9d3326, GOLD = 0xd9a83c;

function mat(color, extra = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: 0.9, metalness: 0.02, ...extra });
}

// ---- Painted canvas textures (code only) ----------------------------------
let _stoneTex = null, _woodTex = null, _plasterTex = null, _matTex = null, _canvasTex = null;
function stoneTex() {
  if (_stoneTex) return _stoneTex;
  _stoneTex = canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#b4b2a2'; ctx.fillRect(0, 0, w, h);
    const r = rng(31);
    for (let i = 0; i < 1400; i++) {
      const g = r();
      ctx.fillStyle = g > 0.72 ? 'rgba(95,120,72,0.42)' : g > 0.4 ? 'rgba(55,60,52,0.30)' : 'rgba(210,208,190,0.22)';
      ctx.fillRect(r() * w, r() * h, 1 + r() * 6, 1 + r() * 5);
    }
    ctx.strokeStyle = 'rgba(40,45,38,0.25)'; ctx.lineWidth = 1;
    for (let y = 0; y < h; y += 16) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  }, { repeat: [2, 3] });
  return _stoneTex;
}
function woodTex() {
  if (_woodTex) return _woodTex;
  _woodTex = canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#7a3a26'; ctx.fillRect(0, 0, w, h);
    const r = rng(47);
    for (let i = 0; i < 70; i++) {
      ctx.strokeStyle = r() > 0.5 ? 'rgba(40,18,14,0.35)' : 'rgba(190,120,80,0.22)';
      ctx.lineWidth = 0.5 + r() * 2;
      const y = r() * h;
      ctx.beginPath(); ctx.moveTo(0, y);
      ctx.bezierCurveTo(w * 0.3, y + r() * 6 - 3, w * 0.6, y + r() * 6 - 3, w, y + r() * 4 - 2);
      ctx.stroke();
    }
  }, { repeat: [1, 2] });
  return _woodTex;
}
function plasterTex() {
  if (_plasterTex) return _plasterTex;
  _plasterTex = canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#c8ac7a'; ctx.fillRect(0, 0, w, h);
    const r = rng(59);
    for (let i = 0; i < 900; i++) {
      ctx.fillStyle = r() > 0.5 ? 'rgba(150,125,85,0.18)' : 'rgba(235,220,175,0.20)';
      ctx.fillRect(r() * w, r() * h, 2 + r() * 4, 2 + r() * 4);
    }
  }, { repeat: [2, 2] });
  return _plasterTex;
}
function wovenMatTex() {
  if (_matTex) return _matTex;
  _matTex = canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#c8a86a'; ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < h; y += 5) {
      ctx.fillStyle = y % 10 === 0 ? 'rgba(120,92,50,0.35)' : 'rgba(235,210,150,0.30)';
      ctx.fillRect(0, y, w, 2);
    }
    for (let x = 0; x < w; x += 9) {
      ctx.fillStyle = 'rgba(100,78,45,0.22)'; ctx.fillRect(x, 0, 1.5, h);
    }
  }, { repeat: [1, 1] });
  return _matTex;
}
function sailCanvasTex() {
  if (_canvasTex) return _canvasTex;
  _canvasTex = canvasTex(128, 128, (ctx, w, h) => {
    ctx.fillStyle = '#d2a86a'; ctx.fillRect(0, 0, w, h);
    const r = rng(73);
    for (let i = 0; i < 500; i++) {
      ctx.fillStyle = r() > 0.5 ? 'rgba(140,100,55,0.18)' : 'rgba(245,220,170,0.20)';
      ctx.fillRect(r() * w, r() * h, 3 + r() * 8, 2 + r() * 5);
    }
    ctx.strokeStyle = 'rgba(110,75,40,0.25)'; ctx.lineWidth = 1;
    for (let y = 0; y < h; y += 16) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); }
  }, { repeat: [1, 1] });
  return _canvasTex;
}

// Shared geometry cache.
const _geo = {};
function g(name) {
  if (_geo[name]) return _geo[name];
  switch (name) {
    case 'unitBox': return (_geo[name] = new THREE.BoxGeometry(1, 1, 1));
    case 'unitCyl': return (_geo[name] = new THREE.CylinderGeometry(1, 1, 1, 10));
    case 'unitCyl6': return (_geo[name] = new THREE.CylinderGeometry(1, 1, 1, 6));
    case 'sphere': return (_geo[name] = new THREE.SphereGeometry(1, 12, 10));
    case 'icosa': return (_geo[name] = new THREE.IcosahedronGeometry(1, 0));
    case 'icosa1': return (_geo[name] = new THREE.IcosahedronGeometry(1, 1));
    case 'cone': return (_geo[name] = new THREE.ConeGeometry(1, 1, 8));
    case 'baluster': return (_geo[name] = lathe([[0.07, 0], [0.11, 0.1], [0.06, 0.2], [0.1, 0.42], [0.06, 0.55], [0.11, 0.68], [0.07, 0.78]], 10));
    case 'column': return (_geo[name] = lathe([[0.17, 0], [0.16, 0.15], [0.145, 1.0], [0.14, 2.0], [0.155, 2.9], [0.17, 3.0]], 14));
    case 'finial': return (_geo[name] = new THREE.ConeGeometry(0.18, 0.55, 8));
    default: throw new Error('unknown geo ' + name);
  }
}

function boxAt(x, y, z, sx, sy, sz, angle = 0) {
  return place(x, y, z, angle, sx, sy, sz);
}

// Wedge blocks around a semicircular arch in the X-Y plane.
function stoneArch(kit, cx, cy, cz, radius, thickness, seed) {
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

// Octagonal stone balcony ring with red railing posts + horizontal rail.
function balconyRing(kit, y, radius, seed, n = 24) {
  const r = rng(seed);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const px = Math.sin(a) * radius, pz = Math.cos(a) * radius;
    kit.add('railPost', place(px, y + 0.5, pz, a, 1, 1, 1));
    if (i < n - 1 || true) {
      const a2 = ((i + 1) / n) * Math.PI * 2;
      const mx = (px + Math.sin(a2) * radius) / 2, mz = (pz + Math.cos(a2) * radius) / 2;
      const segLen = 2 * radius * Math.sin(Math.PI / n);
      kit.add('railBar', place(mx, y + 0.95, mz, a + Math.PI / 2, segLen, 0.08, 0.08));
    }
  }
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    kit.add('deckStone', place(Math.sin(a) * radius * 0.97, y - 0.08, Math.cos(a) * radius * 0.97, a, 1, 1, 1),
      C(STONE[Math.floor(r() * STONE.length)]));
  }
}

// Small hanging lantern built from instanced frame boxes + a glowing body.
function lantern(kit, x, y, z, seed) {
  kit.add('lampBody', place(x, y, z), C(0xffca55));
  kit.add('lampFrame', place(x, y + 0.26, z, 0, 0.34, 0.08, 0.34));
  kit.add('lampFrame', place(x, y - 0.26, z, 0, 0.34, 0.08, 0.34));
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2;
    kit.add('lampFrame', place(x + Math.sin(a) * 0.2, y, z + Math.cos(a) * 0.2, a, 0.04, 0.55, 0.04));
  }
}

// ---- 1. Cối xay gió (bamboo windmill) --------------------------------------
// metrics: octagonal ~5m wide, 9m tall tower, hub at y=7, 4 trapezoid sails,
// balcony ring at y=4 with red railing, tiled cap roof.
function addWindmill(group) {
  const wm = new THREE.Group();
  wm.name = 'coi_xay_gio_tre';
  wm.position.set(20, 0, -16);
  group.add(wm);

  // Octagonal tapered stone tower via LatheGeometry(points, 8).
  const towerProfile = [
    [2.5, 0], [2.45, 0.6], [2.3, 2.0], [2.15, 4.0],
    [2.0, 6.0], [1.85, 8.0], [1.8, 9.0],
  ];
  const tower = new THREE.Mesh(new THREE.LatheGeometry(
    towerProfile.map(([r, y]) => new THREE.Vector2(r, y)), 8),
    mat(0xffffff, { map: stoneTex() }));
  tower.castShadow = true; tower.receiveShadow = true; tower.name = 'tower_stone';
  wm.add(tower);

  const kit = new Kit();
  kit.def('wedge', g('unitBox'), mat(0xffffff, { map: stoneTex() }));
  kit.def('deckStone', g('unitBox'), mat(0xffffff, { map: stoneTex() }));
  kit.def('railPost', g('baluster'), mat(RED));
  kit.def('railBar', g('unitBox'), mat(RED));
  kit.def('doorFrame', g('unitBox'), mat(DARKWOOD));
  kit.def('door', g('unitBox'), mat(0x5a271c));
  kit.def('hub', g('unitCyl'), mat(0x5b3a24));
  kit.def('sailSpar', g('unitBox'), mat(0xb59a5c));
  kit.def('sailRib', g('unitBox'), mat(0xc2a468));
  kit.def('sailSlat', g('unitBox'), mat(0xffffff, { map: wovenMatTex() }));
  kit.def('lampBody', g('sphere'), mat(0xffffff, { emissive: 0xffaa22, emissiveIntensity: 0.8 }));
  kit.def('lampFrame', g('unitBox'), mat(GOLD, { metalness: 0.5 }));

  // Arched base door at +Z face with wedge voussoirs and flanking jambs.
  stoneArch(kit, 0, 1.25, 2.45, 1.05, 0.42, 111);
  kit.add('door', boxAt(0, 0.95, 2.5, 1.5, 1.9, 0.12));
  kit.add('doorFrame', boxAt(-0.82, 0.95, 2.52, 0.16, 2.0, 0.16));
  kit.add('doorFrame', boxAt(0.82, 0.95, 2.52, 0.16, 2.0, 0.16));
  kit.add('doorFrame', boxAt(0, 1.95, 2.52, 1.8, 0.14, 0.16));

  // Balcony ring at y=4 with red railing.
  balconyRing(kit, 4.0, 2.35, 112, 24);
  lantern(kit, -1.6, 3.2, 1.9, 113);

  // Central hub where the sails meet, projected out the +Z face.
  kit.add('hub', new THREE.Matrix4().compose(
    new THREE.Vector3(0, 7, 2.55),
    new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2),
    new THREE.Vector3(0.45, 0.9, 0.45)));
  kit.build(wm);

  // Four sails, rotated 45° apart around the hub. Each sail is built in local
  // coordinates (long axis +X, width in Y) then rotated about Z into place.
  const sailR = rng(121);
  const sailMats = [
    mat(0xffffff, { map: wovenMatTex(), side: THREE.DoubleSide }),
    mat(0xb59a5c), mat(0xc2a468),
  ];
  for (let s = 0; s < 4; s++) {
    const sail = new THREE.Group();
    sail.name = 'sail_' + s;
    const hubLocal = new THREE.Group();
    hubLocal.position.set(0, 7, 2.7);
    hubLocal.rotation.z = (s * Math.PI / 2) + Math.PI / 4;
    hubLocal.add(sail);
    wm.add(hubLocal);

    const sailKit = new Kit();
    sailKit.def('slat', g('unitBox'), sailMats[0]);
    sailKit.def('spar', g('unitBox'), sailMats[1]);
    sailKit.def('rib', g('unitBox'), sailMats[2]);

    // Bamboo frame: main spar along the sail's length + 3 cross ribs.
    const L = 6.2;
    sailKit.add('spar', boxAt(L / 2, 0, 0, L, 0.09, 0.09));
    // Woven mat panel: ~25 thin slats forming a trapezoid. The panel widens
    // away from the hub: half-width goes from 0.35 to 1.35. Each slat is a
    // thin board whose long axis lies in the sail's width (local Y).
    const N = 25;
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);
      const x = 0.55 + t * (L - 0.7);
      const halfW = 0.35 + t * 1.0;
      const qz = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
      const mm = new THREE.Matrix4().compose(new THREE.Vector3(x, 0, 0), qz, new THREE.Vector3(0.13, halfW * 2, 0.5));
      sailKit.add('slat', mm, C(new THREE.Color(0xcaa469).lerp(new THREE.Color(0xe8cd92), sailR())));
    }
    for (let k = 0; k < 3; k++) {
      const rx = 1.0 + k * 2.1;
      const halfW = 0.35 + ((rx - 0.55) / (L - 0.7)) * 1.0;
      const qz = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
      sailKit.add('rib', new THREE.Matrix4().compose(new THREE.Vector3(rx, 0, 0.13), qz, new THREE.Vector3(0.06, halfW * 2, 0.06)));
    }
    sailKit.add('rib', boxAt(L / 2, 1.35, 0.02, L, 0.07, 0.07));
    sailKit.add('rib', boxAt(L / 2, -1.35, 0.02, L, 0.07, 0.07));
    sailKit.build(sail);
  }

  // Tiled pagoda-style cap roof above the tower at y=9.1.
  const roof = new THREE.Group();
  tileRoof(roof, 5.6, 5.6, 1.9, TILE, 131);
  roof.position.y = 9.1;
  wm.add(roof);
  return wm;
}

// ---- 2. Hải đăng bảo tháp (pagoda lighthouse) -------------------------------
// metrics: tapered 8-sided stone tower ~14m tall, arched door, 3 stone balcony
// rings, upper red timber pavilion with columns + tiled roof, glowing flame.
function addLighthouse(group) {
  const lh = new THREE.Group();
  lh.name = 'hai_dang_bao_thap';
  lh.position.set(-30, 0, -24);
  group.add(lh);

  const towerProfile = [
    [3.0, 0], [2.95, 0.8], [2.7, 3.0], [2.45, 6.0],
    [2.2, 9.0], [2.0, 11.5], [1.9, 13.2], [1.85, 14.0],
  ];
  const tower = new THREE.Mesh(new THREE.LatheGeometry(
    towerProfile.map(([r, y]) => new THREE.Vector2(r, y)), 8),
    mat(0xffffff, { map: stoneTex() }));
  tower.castShadow = true; tower.receiveShadow = true; tower.name = 'lh_stone_tower';
  lh.add(tower);

  const kit = new Kit();
  kit.def('wedge', g('unitBox'), mat(0xffffff, { map: stoneTex() }));
  kit.def('door', g('unitBox'), mat(0x4a1f18));
  kit.def('doorFrame', g('unitBox'), mat(DARKWOOD));
  kit.def('smallWindow', g('unitBox'), mat(0x2b2622));
  kit.def('deckStone', g('unitBox'), mat(0xffffff, { map: stoneTex() }));
  kit.def('railPost', g('baluster'), mat(RED));
  kit.def('railBar', g('unitBox'), mat(RED));
  kit.def('column', g('column'), mat(WOOD, { map: woodTex() }));
  kit.def('beam', g('unitBox'), mat(RED));
  kit.def('floor', g('unitBox'), mat(0x9a9382, { map: stoneTex() }));
  kit.def('lanternBody', g('sphere'), mat(0xffffff, { emissive: 0xffb347, emissiveIntensity: 1.4 }));
  kit.def('lampFrame', g('unitBox'), mat(GOLD, { metalness: 0.5 }));

  // Arched base door at +Z.
  stoneArch(kit, 0, 1.6, 3.0, 1.15, 0.5, 211);
  kit.add('door', boxAt(0, 1.15, 3.02, 1.6, 2.3, 0.12));
  kit.add('doorFrame', boxAt(-0.9, 1.15, 3.04, 0.16, 2.4, 0.16));
  kit.add('doorFrame', boxAt(0.9, 1.15, 3.04, 0.16, 2.4, 0.16));
  kit.add('doorFrame', boxAt(0, 2.3, 3.04, 1.96, 0.14, 0.16));

  // Narrow slit windows on upper tower faces.
  for (let i = 0; i < 4; i++) {
    const a = i * Math.PI / 2 + Math.PI / 4;
    kit.add('smallWindow', place(Math.sin(a) * 2.35, 8.2, Math.cos(a) * 2.35, a, 0.28, 0.8, 0.12));
  }

  // Three stone balcony rings up the tower.
  balconyRing(kit, 3.2, 2.75, 212, 24);
  balconyRing(kit, 7.0, 2.45, 213, 24);
  balconyRing(kit, 10.6, 2.15, 214, 24);

  // Upper red timber pavilion at y=14.2.
  kit.add('floor', boxAt(0, 14.1, 0, 3.5, 0.28, 3.5));
  for (const sx of [-1.25, 0, 1.25]) for (const sz of [-1.25, 0, 1.25]) {
    if (sx === 0 && sz === 0) continue;
    kit.add('column', place(sx, 14.25, sz, 0, 1, 0.95, 1));
  }
  kit.add('beam', boxAt(0, 17.15, 0, 3.2, 0.24, 3.2));
  kit.add('beam', boxAt(0, 15.0, 1.3, 3.0, 0.12, 0.1));

  // Glowing lamp/flame sphere centered in the pavilion.
  const flame = new THREE.Mesh(g('sphere'), mat(0xffd27a, {
    emissive: 0xff9a2e, emissiveIntensity: ctxNight() ? 2.6 : 1.5,
  }));
  flame.scale.set(0.45, 0.6, 0.45);
  flame.position.set(0, 15.7, 0);
  flame.name = 'beacon_flame';
  lh.add(flame);
  kit.add('lampFrame', boxAt(0, 15.7, 0, 1.1, 0.08, 1.1));
  kit.build(lh);

  // Tiled roof of the pavilion + a finial on top.
  const roof = new THREE.Group();
  tileRoof(roof, 4.0, 4.0, 1.5, TILE, 215);
  roof.position.y = 17.2;
  lh.add(roof);
  const finial = new THREE.Mesh(g('finial'), mat(GOLD, { metalness: 0.45, roughness: 0.5 }));
  finial.position.y = 18.9; finial.scale.setScalar(1.1);
  lh.add(finial);
  return lh;
}

// ctx.night helper (safe: lighthouse built before ctx is threaded explicitly).
let _night = false;
function ctxNight() { return _night; }

// ---- 3. Thuyền cánh dơi (bat-wing junk boat) -------------------------------
// metrics: ~8m long hull from ExtrudeGeometry of a curved boat section,
// instanced deck planks, mast, bat-wing sail from many thin triangle meshes over
// bamboo ribs, cabin at stern with tiled roof, two eye spheres on the bow.
function addJunk(group) {
  const boat = new THREE.Group();
  boat.name = 'thuyen_canh_doi';
  boat.position.set(4, 0, 1);
  boat.rotation.y = -0.35;
  group.add(boat);

  // Hull: extrude a curved boat cross-section along Z. Shape described in X-Y
  // (beam x depth); extruded length ~8m along Z. Bow/stern taper is added by
  // two pinch wedges at the ends of the deck.
  const hullShape = new THREE.Shape();
  hullShape.moveTo(-1.6, 0.9);
  hullShape.bezierCurveTo(-1.7, 0.2, -1.2, -0.6, 0, -0.85);
  hullShape.bezierCurveTo(1.2, -0.6, 1.7, 0.2, 1.6, 0.9);
  hullShape.lineTo(1.35, 0.95);
  hullShape.bezierCurveTo(1.2, 0.35, 0.8, -0.3, 0, -0.5);
  hullShape.bezierCurveTo(-0.8, -0.3, -1.2, 0.35, -1.35, 0.95);
  hullShape.closePath();
  const hullGeo = new THREE.ExtrudeGeometry(hullShape, {
    depth: 8, bevelEnabled: true, bevelThickness: 0.08, bevelSize: 0.06, bevelSegments: 1, curveSegments: 8,
  });
  // Extrude goes along +Z; centre it and orient length along X for the scene.
  hullGeo.translate(0, 0, -4);
  hullGeo.rotateY(Math.PI / 2);
  const hull = new THREE.Mesh(hullGeo, mat(0x6b3526, { map: woodTex() }));
  hull.position.y = 0.55;
  hull.castShadow = true; hull.receiveShadow = true; hull.name = 'junk_hull';
  boat.add(hull);

  // Painted bow/stern waterline strake (thin dark band).
  const strake = new THREE.Mesh(new THREE.BoxGeometry(7.6, 0.16, 3.1), mat(0x3a241c));
  strake.position.y = 0.18; strake.name = 'waterline';
  boat.add(strake);

  const kit = new Kit();
  kit.def('plank', g('unitBox'), mat(0x8a4a2e, { map: woodTex() }));
  kit.def('gunwale', g('unitBox'), mat(DARKWOOD));
  kit.def('ribBamboo', g('unitCyl6'), mat(0xb59a5c));
  kit.def('cabinWall', g('unitBox'), mat(0x7a2e22));
  kit.def('cabinFrame', g('unitBox'), mat(DARKWOOD));
  kit.def('eyeWhite', g('sphere'), mat(0xf0e6c8));
  kit.def('eyePupil', g('sphere'), mat(0x1b1712));
  kit.def('rope', g('unitCyl6'), mat(0x9a8256));

  // Deck planks: instanced boxes running the length of the boat.
  for (let i = 0; i < 12; i++) {
    const z = -1.4 + i * 0.255;
    kit.add('plank', boxAt(0, 1.12, z, 7.4, 0.06, 0.22));
  }
  // Gunwale rails along both sides.
  for (const s of [-1, 1]) kit.add('gunwale', boxAt(0, 1.2, s * 1.62, 7.6, 0.16, 0.18));

  // Mast: a tapered cylinder standing near midships.
  const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.16, 6.8, 10), mat(0x6b4526, { map: woodTex() }));
  mast.position.set(-0.3, 4.5, 0); mast.name = 'junk_mast'; mast.castShadow = true;
  boat.add(mast);

  // Stern cabin (a small box + red frame) under a tiled roof.
  kit.add('cabinWall', boxAt(-2.5, 1.75, 0, 1.8, 1.25, 2.4));
  kit.add('cabinFrame', boxAt(-2.5, 1.75, 1.22, 1.9, 1.3, 0.12));
  kit.add('cabinFrame', boxAt(-2.5, 1.75, -1.22, 1.9, 1.3, 0.12));
  for (const sx of [-3.35, -1.65]) kit.add('cabinFrame', boxAt(sx, 1.75, 0, 0.12, 1.3, 2.4));

  // Painted eyes on the bow (+X end).
  for (const s of [-1, 1]) {
    kit.add('eyeWhite', place(3.55, 0.95, s * 0.55, 0, 0.26, 0.26, 0.12));
    kit.add('eyePupil', place(3.62, 0.95, s * 0.55, 0, 0.12, 0.12, 0.08));
  }
  kit.build(boat);

  // Cabin tiled roof.
  const cabinRoof = new THREE.Group();
  tileRoof(cabinRoof, 2.3, 2.9, 0.8, TILE, 311);
  cabinRoof.position.set(-2.5, 2.45, 0);
  boat.add(cabinRoof);

  // Bat-wing sail: curved fabric panels as many thin triangles stretched over
  // bamboo battens. The sail lies in the X-Y plane (height Y, chord +Z of boat).
  const sailMat = new THREE.MeshStandardMaterial({ color: 0xffffff, map: sailCanvasTex(), roughness: 0.95, side: THREE.DoubleSide });
  const sailGroup = new THREE.Group();
  sailGroup.name = 'batwing_sail';
  sailGroup.position.set(-0.3, 0, 0);
  boat.add(sailGroup);

  const COLS = 8, ROWS = 10;
  const ribPositions = [];
  for (let c = 0; c <= COLS; c++) {
    const z = -1.9 + c * (3.8 / COLS);
    ribPositions.push(z);
  }
  // Vertex grid: each row is a horizontal batten; chord tapers toward the top
  // (bat-wing silhouette) and bows outward in Z for a filled, taut look.
  const grid = [];
  for (let r = 0; r <= ROWS; r++) {
    const t = r / ROWS;
    const y = 1.4 + t * 5.0;
    const spanScale = 1 - 0.45 * t * t;           // narrows near the top
    const row = [];
    for (let c = 0; c <= COLS; c++) {
      const z = ribPositions[c] * spanScale;
      const bow = Math.sin((c / COLS) * Math.PI) * 0.25 * (1 - t * 0.5);
      row.push(new THREE.Vector3(bow, y, z));
    }
    grid.push(row);
  }
  // Single BufferGeometry containing two triangles per grid cell.
  const pos = [], uvArr = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const a = grid[r][c], b = grid[r][c + 1], d = grid[r + 1][c], e = grid[r + 1][c + 1];
      const push = (v, u, w) => { pos.push(v.x, v.y, v.z); uvArr.push(u, w); };
      push(a, c / COLS, r / ROWS); push(b, (c + 1) / COLS, r / ROWS); push(e, (c + 1) / COLS, (r + 1) / ROWS);
      push(a, c / COLS, r / ROWS); push(e, (c + 1) / COLS, (r + 1) / ROWS); push(d, c / COLS, (r + 1) / ROWS);
    }
  }
  const sailGeo = new THREE.BufferGeometry();
  sailGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  sailGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uvArr, 2));
  sailGeo.computeVertexNormals();
  const sail = new THREE.Mesh(sailGeo, sailMat);
  sail.name = 'batwing_fabric'; sail.castShadow = true; sail.receiveShadow = true;
  sailGroup.add(sail);

  // Bamboo ribs across the sail, instanced cylinders aligned with Z.
  const ribKit = new Kit();
  ribKit.def('batten', g('unitCyl6'), mat(0xb59a5c));
  for (let r = 0; r <= ROWS; r += 2) {
    const t = r / ROWS;
    const y = 1.4 + t * 5.0;
    const spanScale = 1 - 0.45 * t * t;
    const half = 1.9 * spanScale;
    // cylinder default axis is Y; rotate about X to lie along Z, scaled by length.
    const qx = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
    const m = new THREE.Matrix4().compose(new THREE.Vector3(0.12, y, 0), qx, new THREE.Vector3(0.04, half * 2, 0.04));
    ribKit.add('batten', m);
  }
  // Vertical edge battens along the mast side and outer edge.
  for (const zEnd of [-1.9, 1.9]) {
    ribKit.add('batten', new THREE.Matrix4().compose(
      new THREE.Vector3(0.12, 3.9, zEnd * 0.7), new THREE.Quaternion(), new THREE.Vector3(0.045, 5.0, 0.045)));
  }
  ribKit.build(sailGroup);

  // Two thin rigging ropes from mast top to bow/stern.
  const ropeKit = new Kit();
  ropeKit.def('rope', g('unitCyl6'), mat(0x9a8256));
  for (const ex of [3.4, -3.4]) {
    const a = new THREE.Vector3(-0.3, 7.7, 0), b = new THREE.Vector3(ex, 1.2, 0);
    const dir = new THREE.Vector3().subVectors(b, a);
    const len = dir.length();
    const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
    const q = new THREE.Quaternion().setFromUnitVectors(UP, dir.normalize());
    ropeKit.add('rope', new THREE.Matrix4().compose(mid, q, new THREE.Vector3(0.02, len, 0.02)));
  }
  ropeKit.build(boat);
  return boat;
}

// ---- 4. Cây đa + miếu (banyan tree shrine) ---------------------------------
// metrics: thick lathe trunk with irregular profile, 20+ TubeGeometry hanging
// roots, ~40 instanced leaf clumps with per-instance green, small red shrine
// with tiled roof and a golden altar nestled in the roots.
function addBanyan(group) {
  const tree = new THREE.Group();
  tree.name = 'cay_da_mieu';
  tree.position.set(26, 0, -22);
  group.add(tree);

  const r = rng(401);

  // Irregular trunk: lathe with a knobbly profile, plus a few flared buttresses.
  const trunkProfile = [
    [1.9, 0], [1.55, 0.5], [1.35, 1.2], [1.25, 2.0], [1.1, 2.8],
    [1.18, 3.4], [0.95, 4.2], [0.85, 4.8], [0.95, 5.4], [0.7, 6.0], [0.0, 6.4],
  ];
  const trunk = new THREE.Mesh(new THREE.LatheGeometry(
    trunkProfile.map(([rad, y]) => new THREE.Vector2(rad, y)), 12),
    mat(0xffffff, { map: woodTex() }));
  trunk.castShadow = true; trunk.receiveShadow = true; trunk.name = 'banyan_trunk';
  tree.add(trunk);

  const kit = new Kit();
  kit.def('buttress', g('unitBox'), mat(0xffffff, { map: woodTex() }));
  kit.def('branch', g('unitCyl6'), mat(0xffffff, { map: woodTex() }));
  kit.def('leaf', g('icosa1'), mat(0xffffff, { roughness: 1.0 }));
  kit.def('shrineWall', g('unitBox'), mat(RED));
  kit.def('shrineFrame', g('unitBox'), mat(DARKWOOD));
  kit.def('altar', g('unitBox'), mat(GOLD, { metalness: 0.5, roughness: 0.4 }));
  kit.def('lampBody', g('sphere'), mat(0xffffff, { emissive: 0xffaa22, emissiveIntensity: 0.9 }));
  kit.def('lampFrame', g('unitBox'), mat(GOLD, { metalness: 0.5 }));

  // Flared buttress roots around the trunk base.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rad = 1.5 + r() * 0.5;
    kit.add('buttress', place(Math.sin(a) * rad, 0.5, Math.cos(a) * rad, a, 0.5, 1.1, 1.6));
  }

  // 20+ hanging roots: TubeGeometry along CatmullRom curves, slightly tapered
  // by scaling (one mesh per root is acceptable; roots are the signature look).
  const rootMat = mat(0x6b4a30, { map: woodTex() });
  const rootCount = 24;
  for (let i = 0; i < rootCount; i++) {
    const a = r() * Math.PI * 2;
    const startR = 0.9 + r() * 0.7;
    const startY = 5.4 + r() * 0.9;
    const endR = 1.6 + r() * 1.9;
    const pts = [];
    for (let k = 0; k <= 6; k++) {
      const t = k / 6;
      const rad = startR + (endR - startR) * t + Math.sin(t * 5 + i) * 0.18;
      const y = startY * (1 - t) + 0.05;
      pts.push(new THREE.Vector3(Math.sin(a) * rad, y, Math.cos(a) * rad));
    }
    const curve = new THREE.CatmullRomCurve3(pts);
    const root = new THREE.Mesh(new THREE.TubeGeometry(curve, 10, 0.06 + r() * 0.05, 5, false), rootMat);
    root.name = 'hanging_root_' + i; root.castShadow = true;
    tree.add(root);
  }

  // A few upward branches to support the canopy.
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2 + r() * 0.3;
    const len = 2.4 + r() * 1.6;
    const dir = new THREE.Vector3(Math.sin(a) * 0.7, 0.75, Math.cos(a) * 0.7).normalize();
    const mid = new THREE.Vector3(dir.x * len * 0.45, 5.8 + dir.y * len * 0.45, dir.z * len * 0.45);
    const q = new THREE.Quaternion().setFromUnitVectors(UP, dir);
    kit.add('branch', new THREE.Matrix4().compose(mid, q, new THREE.Vector3(0.16, len, 0.16)));
  }

  // Canopy: ~40 instanced leaf clumps with varied green per-instance color.
  const greens = [0x2f6b34, 0x3d7d3a, 0x4a8f42, 0x276030, 0x559a48, 0x6ba854];
  for (let i = 0; i < 40; i++) {
    const a = r() * Math.PI * 2;
    const rad = r() * 4.2;
    const y = 6.2 + r() * 2.6;
    const x = Math.sin(a) * rad, z = Math.cos(a) * rad;
    const scale = 1.0 + r() * 1.1;
    kit.add('leaf', place(x, y, z, r() * Math.PI, scale, scale * (0.7 + r() * 0.4), scale),
      C(greens[Math.floor(r() * greens.length)]));
  }

  // Small red shrine nestled among the roots, at +Z.
  kit.add('shrineWall', place(0, 1.0, 3.0, 0, 2.2, 1.7, 1.6));
  kit.add('shrineFrame', place(0, 1.0, 3.82, 0, 2.3, 1.75, 0.12));
  for (const sx of [-1.15, 1.15]) kit.add('shrineFrame', place(sx, 1.0, 3.82, 0, 0.14, 1.7, 0.14));
  kit.add('altar', place(0, 0.5, 3.9, 0, 1.0, 0.6, 0.5));
  lantern(kit, -0.8, 1.5, 3.85, 402);
  lantern(kit, 0.8, 1.5, 3.85, 403);
  kit.build(tree);

  // Tiny tiled roof on the shrine.
  const roof = new THREE.Group();
  tileRoof(roof, 2.8, 2.2, 0.9, TILE, 404);
  roof.position.set(0, 2.0, 3.0);
  tree.add(roof);
  return tree;
}

/**
 * Add all four Part-B landmarks to the provided THREE.Group.
 * @param {THREE.Group} group destination group
 * @param {object} ctx optional context; ctx.night brightens the beacon flame
 * @returns {THREE.Group[]} array of landmark groups
 */
export function addB(group, ctx = {}) {
  _night = !!(ctx && ctx.night);
  return [
    addWindmill(group),
    addLighthouse(group),
    addJunk(group),
    addBanyan(group),
  ];
}

/** Alternate API: build into a fresh group and return landmark records. */
export function buildLandmarksB(kitRoot = new THREE.Group(), ctx = {}) {
  const parts = addB(kitRoot, ctx);
  const meta = [
    { name: 'coi_xay_gio_tre', baseY: 0, center: [20, 5, -16] },
    { name: 'hai_dang_bao_thap', baseY: 0, center: [-30, 9, -24] },
    { name: 'thuyen_canh_doi', baseY: 0, center: [4, 3, 1] },
    { name: 'cay_da_mieu', baseY: 0, center: [26, 5, -22] },
  ];
  return parts.map((g, i) => ({ ...meta[i], group: g }));
}
