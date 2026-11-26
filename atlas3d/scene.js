// Đại Việt Anime Atlas — a code-built, metric-scale open-world diorama.
// References: regional_atlas (73 bản đồ) + multiview_3d_studio (8 công trình × 6 góc)
// and the Nghịch Thủy Hàn reel: lotus water, tiled roofs, lanterns, warm stone.
import * as THREE from 'three';
import { Kit, place, lathe, arc, sweep, canvasTex, rng } from './kit.js';
import { U } from './env.js';

const R = 13;                 // village square radius, m
const WATER = 22;             // lotus pond radius, m
const ROOF_RED = '#8f3327';   // son-red timber / âm-dương tiles
const TIMBER = '#5a3327';
const STONE_C = '#9a9787';

// ---------------------------------------------------------------- canvas textures
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
const tileMap = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = ROOF_RED; g.fillRect(0, 0, w, h);
  for (let y = 0; y < h; y += 14) for (let x = 0; x < w; x += 12) {
    const o = (y / 14) % 2 ? 6 : 0;
    g.fillStyle = (x + y) % 3 ? '#9b3b2d' : '#7a2a20';
    g.beginPath(); g.ellipse(x + o, y, 6, 8, 0, 0, Math.PI * 2); g.fill();
    g.strokeStyle = 'rgba(35,16,12,.5)'; g.lineWidth = 1; g.stroke();
  }
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

const stone = new THREE.MeshStandardMaterial({ map: stoneMap, color: '#ffffff', roughness: .9 });
const tile = new THREE.MeshStandardMaterial({ map: tileMap, roughness: .8, emissive: '#1a0805', emissiveIntensity: 0 });
const wood = new THREE.MeshStandardMaterial({ map: woodMap, roughness: .75, emissive: '#1a0805', emissiveIntensity: 0 });
const red = new THREE.MeshStandardMaterial({ color: ROOF_RED, roughness: .65 });
const gold = new THREE.MeshStandardMaterial({ color: '#d6a24b', metalness: .55, roughness: .35 });
const darkWood = new THREE.MeshStandardMaterial({ color: '#3d2b22', roughness: .85 });
const leaf = new THREE.MeshStandardMaterial({ color: '#54702e', roughness: .9, flatShading: true });
const lotusLeaf = new THREE.MeshLambertMaterial({ color: '#4e8a55', side: THREE.DoubleSide, emissive: '#162a19' });
const petal = new THREE.MeshStandardMaterial({ color: '#f4b8cc', roughness: .8, side: THREE.DoubleSide });
const glow = new THREE.MeshStandardMaterial({ color: '#fff2d4', emissive: '#ffb654', emissiveIntensity: 0 });
const lanternMat = new THREE.MeshStandardMaterial({ color: '#d94f38', roughness: .6, emissive: '#ff7a3c', emissiveIntensity: 0 });

// ---------------------------------------------------------------- helpers
const box = (w, h, d, m, x = 0, y = 0, z = 0) => {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; return o;
};
// Đại Việt roof: two rotated plane-like slopes meeting at a ridge. Returns a Group.
function roof(w, d, h, mat = tile) {
  const g = new THREE.Group();
  const pitch = Math.atan2(h, d / 2);
  for (const sign of [1, -1]) {
    const slope = box(w + 0.9, 0.16, d / 2 + 0.5, mat, 0, h / 2 + 0.08, sign * (d / 4 + 0.2));
    slope.rotation.x = sign * pitch;
    slope.castShadow = slope.receiveShadow = true; g.add(slope);
  }
  const ridgeBeam = box(w + 1.0, 0.18, 0.22, red, 0, h + 0.02, 0);
  ridgeBeam.castShadow = true; g.add(ridgeBeam);
  for (const sign of [1, -1]) {
    const fascia = box(w + 1.0, 0.14, 0.18, red, 0, h * 0.06, sign * (d / 2 + 0.4));
    fascia.castShadow = true; g.add(fascia);
  }
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const finial = new THREE.Mesh(new THREE.ConeGeometry(.16, .42, 8), gold);
    finial.position.set(sx * (w / 2 + 0.3), h * 0.12, sz * (d / 2 + 0.4));
    finial.castShadow = true; g.add(finial);
  }
  return g;
}
function marketArcade(root) {
  // waterfront market arcade: two rows of slim posts carrying a beam at y=4.2
  for (const rowZ of [8.2, 10.6]) {
    for (let x = -9; x <= 9; x += 3) root.add(box(.12, 4.2, .12, wood, x, 2.1, rowZ));
    root.add(box(18.6, .18, .18, darkWood, 0, 4.2, rowZ));
  }
}
function lantern(x, y, z, kit, lights) {
  kit.add('cable', place(x, y + .26, z));
  kit.add('body', place(x, y, z));
  if (y > 3.2 && lights.length < 8) {
    const l = new THREE.PointLight('#ff9a54', 0, 12, 2);
    l.position.set(x, y, z); l.userData.candela = 30; lights.push(l);
  }
}
function column(H, D) {
  const r = D / 2;
  return lathe([[.001, 0], [r * 1.4, 0], [r * 1.4, .1], [r * 1.15, .18], [r, .3],
    [r, H - .3], [r * 1.3, H - .22], [r * 1.5, H - .08], [r * 1.5, H], [.001, H]], 12);
}

// ---------------------------------------------------------------- landmarks
function tamQuan(root, kit, lights) {
  const g = new THREE.Group(); g.position.set(-14, 0, 20); g.rotation.y = .22;
  for (let i = -1; i <= 1; i++) {
    const cx = i * 4.4;
    for (const sx of [-1, 1]) {
      const p = new THREE.Mesh(column(4.2, .62), stone);
      p.position.set(cx + sx * 1.65, 0, 0); g.add(p);
      const base = box(1.7, .4, 1.7, stone, cx + sx * 1.65, .2, 0); g.add(base);
    }
    // arch: a half-ring voussoir band
    const arch = new THREE.Mesh(new THREE.TorusGeometry(1.75, .34, 8, 24, Math.PI), stone);
    arch.position.set(cx, 4.2, 0); arch.rotation.z = 0; arch.castShadow = true; g.add(arch);
    // beam + small tiled canopy per bay
    g.add(box(4.3, .55, 1.5, red, cx, 4.85, 0));
    const r = roof(4.8, 2.2, 1.15); r.position.set(cx, 5.1, 0); g.add(r);
    lantern(cx - 1.1, 3.5, 1.6, kit, lights);
    lantern(cx + 1.1, 3.5, 1.6, kit, lights);
  }
  // upper pavilion over the central bay
  g.add(box(8.2, .3, 3.2, darkWood, 0, 6.3, 0));
  for (const sx of [-1, 1]) for (const sz of [-1, 1]) {
    const c = new THREE.Mesh(column(2.2, .34), red);
    c.position.set(sx * 3.4, 6.45, sz * 1.2); g.add(c);
  }
  const r = roof(9.2, 4.2, 2.0); r.position.set(0, 8.7, 0); g.add(r);
  root.add(g);
}
function nhaBaGian(root, kit, lights, x, z, ry = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
  g.add(box(9, 3.5, 5.6, new THREE.MeshStandardMaterial({ color: '#d8c79b', roughness: .95 }), 0, 2.05, 0));
  for (const sx of [-2.8, 0, 2.8]) g.add(box(.4, 3.6, .4, wood, sx, 2.05, 2.85));
  for (let i = 0; i < 5; i++) g.add(box(1.2, 2.5, .18, darkWood, -2.8 + i * 1.4, 1.75, 2.9));
  g.add(box(9.8, .5, 6.4, darkWood, 0, 3.95, 0));
  const r = roof(10.4, 6.8, 2.5); r.position.set(0, 4.2, 0); g.add(r);
  for (const sx of [-3.1, 3.1]) lantern(sx, 3.2, 3.4, kit, lights);
  const step = box(9.6, .28, 1.6, stone, 0, .14, 3.7); g.add(step);
  root.add(g);
}
function cauNgói(root, x, z, ry = 0) {
  const g = new THREE.Group(); g.position.set(x, 0, z); g.rotation.y = ry;
  const deck = box(4.6, .35, 13, stone, 0, 2.3, 0); g.add(deck);
  for (const s of [-1, 1]) for (let i = 0; i < 7; i++) {
    const p = new THREE.Mesh(column(1.1, .22), red);
    p.position.set(s * 2.1, 2.5, -5.4 + i * 1.8); g.add(p);
  }
  for (const s of [-1, 1]) {
    const rail = sweep([[0, 0], [.12, .12], [.12, .95], [0, 1.05]], [[s * 2.1, -6.5], [s * 2.1, 6.5]], { y: 2.45, uvScale: 1 });
    g.add(new THREE.Mesh(rail, wood));
  }
  const r = roof(5.2, 14.2, 1.9); r.position.set(0, 3.6, 0); g.add(r);
  root.add(g);
}
function mieuCo(root, kit, lights, x, z) {
  const g = new THREE.Group(); g.position.set(x, 0, z);
  g.add(box(5.2, 3.1, 4.2, stone, 0, 1.7, 0));
  const r = roof(6.2, 5.2, 1.9); r.position.set(0, 3.25, 0); g.add(r);
  const door = box(1.6, 2.2, .2, darkWood, 0, 1.4, 2.16); g.add(door);
  // bia rùa (turtle stele)
  const turtle = new THREE.Mesh(new THREE.SphereGeometry(1.1, 16, 10), stone);
  turtle.scale.set(1.4, .55, 1.1); turtle.position.set(2.8, .6, 2.5); g.add(turtle);
  const stele = box(1.1, 2.4, .34, stone, 2.8, 2.1, 2.5); g.add(stele);
  lantern(-1.8, 2.8, 2.3, kit, lights);
  root.add(g);
}
function thuyen(root, x, z, ry) {
  const g = new THREE.Group(); g.position.set(x, .25, z); g.rotation.y = ry;
  const hullGeo = lathe([[.001, 0], [1.0, .05], [1.35, .35], [1.1, .8], [.6, 1.0], [.001, 1.02]], 16);
  hullGeo.rotateX(Math.PI / 2);
  const hull = new THREE.Mesh(hullGeo, darkWood);
  hull.scale.set(1, .42, 3.4); hull.castShadow = true; g.add(hull);
  const mast = box(.12, 4.2, .12, wood, 0, 2.2, 0); g.add(mast);
  const sailShape = new THREE.Shape();
  sailShape.moveTo(0, 0); sailShape.quadraticCurveTo(2.6, .5, 3.1, 2.5);
  sailShape.quadraticCurveTo(1.5, 3.3, 0, 3.4); sailShape.lineTo(0, 0);
  const sail = new THREE.Mesh(new THREE.ShapeGeometry(sailShape), new THREE.MeshStandardMaterial({ color: '#8c5a35', side: THREE.DoubleSide, roughness: .9 }));
  sail.position.set(.05, 1.2, 0); sail.rotation.y = Math.PI / 2; sail.castShadow = true; g.add(sail);
  root.add(g);
}
function cayDa(root, kit, rand) {
  const g = new THREE.Group(); g.position.set(26, 0, -22);
  const trunk = new THREE.Mesh(lathe([[.001, 0], [2.2, 0], [1.9, 2], [1.5, 5], [1.3, 8], [.7, 9.4], [.001, 9.8]], 14), darkWood);
  trunk.castShadow = true; g.add(trunk);
  for (let i = 0; i < 26; i++) {
    const a = rand() * 6.28, len = 4 + rand() * 5;
    const root = new THREE.Mesh(lathe([[.001, 0], [.1, 0], [.06, len], [.001, len]], 6), darkWood);
    root.position.set(Math.sin(a) * 1.4, 1.2 + rand() * 4, Math.cos(a) * 1.4);
    root.rotation.z = Math.sin(a) * .42; root.rotation.x = -Math.cos(a) * .42; g.add(root);
  }
  const crown = new THREE.Mesh(new THREE.IcosahedronGeometry(4.6, 2), leaf);
  crown.scale.set(1.4, .7, 1.3); crown.position.y = 10.2; crown.castShadow = true; g.add(crown);
  const mieu = new THREE.Group(); mieu.position.set(3.2, 0, 2.4);
  mieu.add(box(3.2, 2.6, 2.8, red, 0, 1.4, 0));
  mieu.add(roof(4.0, 3.6, 1.4)); mieu.children[mieu.children.length - 1].position.y = 2.7;
  g.add(mieu);
  root.add(g);
}
function haiDang(root, kit, lights) {
  const g = new THREE.Group(); g.position.set(-30, 0, -24);
  const tower = new THREE.Mesh(lathe([[.001, 0], [2.5, 0], [2.0, 1], [1.7, 3], [1.5, 8], [1.25, 13], [1.5, 14], [1.5, 14.5], [.001, 14.5]], 8), stone);
  tower.castShadow = true; g.add(tower);
  for (const y of [4, 9, 13.4]) {
    const bal = new THREE.Mesh(new THREE.TorusGeometry(1.85 + (13.4 - y) * .05, .16, 6, 14), red);
    bal.rotation.x = Math.PI / 2; bal.position.y = y; g.add(bal);
  }
  const r = roof(4.4, 4.4, 2.2); r.position.y = 14.5; g.add(r);
  const flame = new THREE.Mesh(new THREE.SphereGeometry(.55, 12, 8), glow); flame.position.y = 17.4; g.add(flame);
  const l = new THREE.PointLight('#ffb061', 0, 40, 2); l.position.set(0, 17.4, 0); l.userData.candela = 130; lights.push(l);
  root.add(g);
}

// ---------------------------------------------------------------- pond & lotus
function pond(root, kit, rand, lights) {
  const waterMat = new THREE.MeshStandardMaterial({ color: '#4d877e', roughness: .16, metalness: .42, transparent: true, opacity: .93 });
  waterMat.onBeforeCompile = (sh) => {
    sh.uniforms.uTime = U.uTime;
    sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <begin_vertex>',
      `#include <begin_vertex>
       transformed.y += sin(position.x * 0.9 + uTime * 1.4) * 0.035 + cos(position.y * 0.8 - uTime * 1.1) * 0.03;`);
  };
  const water = new THREE.Mesh(new THREE.CircleGeometry(WATER, 96), waterMat);
  water.rotation.x = -Math.PI / 2; water.position.y = 0.03; water.receiveShadow = true; root.add(water);
  // lily pads + blossoms, instanced
  const padGeo = new THREE.CircleGeometry(.52, 12); padGeo.rotateX(-Math.PI / 2);
  const budGeo = lathe([[.001, 0], [.16, .06], [.24, .3], [.16, .55], [.001, .72]], 8);
  const greens = ['#3f7042', '#4f8250', '#356138'].map(c => new THREE.Color(c));
  const pinks = ['#f4b8cc', '#fff0f4', '#e88fb0'].map(c => new THREE.Color(c));
  const kit2 = new Kit()
    .def('pad', padGeo, lotusLeaf)
    .def('bud', budGeo, petal);
  for (let i = 0; i < 190; i++) {
    const a = rand() * 6.28, d = 3 + Math.sqrt(rand()) * (WATER - 3.5);
    const x = Math.sin(a) * d + 7, z = Math.cos(a) * d - 6;
    const s = .7 + rand() * .9;
    kit2.add('pad', place(x, 0.055 + rand() * .02, z, rand() * 6.28, s, 1, s), greens[(rand() * 3) | 0]);
    if (rand() > .66) kit2.add('bud', place(x + .1, 0.09, z, rand() * 6.28, s * .8, s * .8, s * .8), pinks[(rand() * 3) | 0]);
  }
  kit2.build(root);
  // wooden pier and two boats
  const pier = box(3.4, .3, 9, wood, -4, .35, 7); root.add(pier);
  for (const z of [3, 7, 11]) root.add(box(.3, 1.2, .3, darkWood, -5.4, -.3, z));
  thuyen(root, 4, 1, .6); thuyen(root, 13, -5, -.9);
}

// ---------------------------------------------------------------- sky-facing life
function trees(root, rand) {
  const trunkGeo = lathe([[.001, 0], [.22, 0], [.16, 1.4], [.12, 2.8], [.001, 3.0]], 8);
  const leafGeo = new THREE.IcosahedronGeometry(1, 2);
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
  const kit = new Kit()
    .def('trunk', trunkGeo, new THREE.MeshStandardMaterial({ color: '#4a3a2c', roughness: .95 }))
    .def('leaves', leafGeo, leafMat, { depth });
  const greens = ['#54702e', '#658237', '#46632a', '#789646'].map(c => new THREE.Color(c));
  for (let i = 0; i < 70; i++) {
    const a = rand() * 6.28, d = 26 + rand() * 44;
    const x = Math.sin(a) * d, z = Math.cos(a) * d;
    const s = .8 + rand() * .8;
    kit.add('trunk', place(x, 0, z, rand() * 6.28, s, s, s));
    for (let k = 0; k < 5; k++) {
      const ls = (1.1 + rand()) * s;
      kit.add('leaves', place(x + (rand() - .5) * 2.4, (3 + rand() * 2) * s, z + (rand() - .5) * 2.4, rand() * 6.28, ls, ls * .8, ls), greens[(rand() * 4) | 0]);
    }
  }
  kit.build(root);
}
function stoneLanterns(kit) {
  for (let i = 0; i < 18; i++) {
    const a = (i / 18) * 6.28, d = R + 2.5;
    kit.add('sl', place(Math.sin(a) * d, 0, Math.cos(a) * d, a, .8, .8, .8));
  }
}

// ---------------------------------------------------------------- build
export function buildScene() {
  const group = new THREE.Group();
  const rand = rng(2026);
  const lights = [];

  const ground = new THREE.Mesh(new THREE.CircleGeometry(320, 64), new THREE.MeshStandardMaterial({ map: groundMap, roughness: .96 }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -0.2; ground.receiveShadow = true; group.add(ground);

  // stone road ring around the square
  const road = sweep([[-2.2, .02], [2.2, .02]], arc(0, 0, R, 0, Math.PI * 2, 96), { closed: true });
  const roadMesh = new THREE.Mesh(road, stone); roadMesh.receiveShadow = true; group.add(roadMesh);

  const lanternSlGeo = lathe([[.001, 0], [.35, 0], [.35, .18], [.16, .3], [.16, .9], [.42, 1.05], [.42, 1.25], [.001, 1.4]], 8);
  const lanternKit = new Kit().def('cable', new THREE.CylinderGeometry(.025, .025, .55, 5), darkWood, { cast: false })
    .def('body', lathe([[.001, 0], [.24, 0], [.3, .32], [.24, .64], [.001, .64]], 10), lanternMat, { cast: false })
    .def('sl', lanternSlGeo, stone);
  stoneLanterns(lanternKit);

  tamQuan(group, lanternKit, lights);
  nhaBaGian(group, lanternKit, lights, -9, -34, .12);
  nhaBaGian(group, lanternKit, lights, -2, -39, -.1);
  cauNgói(group, 0, 15, Math.PI / 2);
  mieuCo(group, lanternKit, lights, -19, 8);
  cayDa(group, lanternKit, rand);
  haiDang(group, lanternKit, lights);
  pond(group, lanternKit, rand, lights);
  trees(group, rand);

  // lantern-lined arcade: posts + beam support the hanging lanterns across the square
  marketArcade(group);
  for (let i = 0; i < 7; i++) {
    const x = -9 + i * 3;
    lantern(x, 3.45 - Math.sin(i / 6 * Math.PI) * .2, 9.4, lanternKit, lights);
  }
  // build the kit exactly once, after every add, so no instances are duplicated or missed
  lanternKit.build(group);

  return {
    group,
    center: new THREE.Vector3(0, 3.6, 0),
    update(now) {
      const night = U.uNight.value;
      glow.emissiveIntensity = night * 4.2;
      lanternMat.emissiveIntensity = night * 1.7;
      tile.emissiveIntensity = .25 * night;
      wood.emissiveIntensity = .25 * night;
      for (const l of lights) l.intensity = night * l.userData.candela;
      for (const l of lights) l.visible = night > .01;
    },
  };
}
