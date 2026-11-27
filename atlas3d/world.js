// Đại Việt Open-World Atlas — world map rebuilt from anatomy of the reference painting.
// 8 regions, real terrain mesh + geometry landmarks. No photo planes, no image textures.
import * as THREE from 'three';
import { Kit, place, lathe, arc, sweep, canvasTex, rng } from './kit.js';
import { U } from './env.js';
import { DETAILS } from './map_details.js';

const R = 210;                 // main island radius, metres
const SEA = 4;                // sea level y
const rand = rng(2026);

// ---------------------------------------------------------------- palettes / code textures
const P = {
  sea: '#5ec8c9', shallow: '#8fe0da', grass: '#6d9e4f', jungle: '#3f7e46',
  rock: '#8d8775', redRock: '#a4513f', sand: '#d8c089', snow: '#eef3f4',
  lava: '#ff8a2b', cloud: '#f4f6f4', moss: '#5d7f4e', terrace: '#a9bb68',
  tile: '#a24a34', gold: '#e0b45a', water: '#aef0ea',
};
function speckle(g, w, h, n, colors, r) {
  for (let i = 0; i < n; i++) {
    g.fillStyle = colors[(r() * colors.length) | 0];
    g.globalAlpha = .08 + r() * .18;
    g.beginPath(); g.arc(r() * w, r() * h, 1 + r() * 7, 0, 6.28); g.fill();
  }
  g.globalAlpha = 1;
}
const grassTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#6d9e4f'; g.fillRect(0, 0, w, h);
  speckle(g, w, h, 6000, ['#7fb05c', '#5b8c43', '#8dbb6b', '#4d7b3a'], rand);
}, { repeat: [18, 18] });
const rockTex = canvasTex(512, 512, (g, w, h) => {
  g.fillStyle = '#8d8775'; g.fillRect(0, 0, w, h);
  speckle(g, w, h, 4000, ['#a09a88', '#736e60', '#b3ad99', '#5f5b50'], rand);
  for (let i = 0; i < 140; i++) {
    g.strokeStyle = 'rgba(45,40,32,.25)'; g.lineWidth = 1 + rand() * 2;
    g.beginPath(); g.moveTo(rand() * w, rand() * h); g.lineTo(rand() * w, rand() * h); g.stroke();
  }
}, { repeat: [6, 6] });
const sandTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#d8c089'; g.fillRect(0, 0, w, h);
  speckle(g, w, h, 5000, ['#e6d2a2', '#c6aa75', '#f0dfb8'], rand);
}, { repeat: [8, 8] });
const snowTex = canvasTex(256, 256, (g, w, h) => {
  g.fillStyle = '#eef3f4'; g.fillRect(0, 0, w, h);
  speckle(g, w, h, 3000, ['#ffffff', '#d7e4e8', '#c9d8dd'], rand);
}, { repeat: [4, 4] });

const M = {
  grass: new THREE.MeshStandardMaterial({ map: grassTex, roughness: .95, vertexColors: true }),
  rock: new THREE.MeshStandardMaterial({ map: rockTex, roughness: .92 }),
  redRock: new THREE.MeshStandardMaterial({ color: P.redRock, roughness: .9 }),
  sand: new THREE.MeshStandardMaterial({ map: sandTex, roughness: 1 }),
  snow: new THREE.MeshStandardMaterial({ map: snowTex, roughness: .85 }),
  water: new THREE.MeshStandardMaterial({ color: P.water, roughness: .2, metalness: .4, transparent: true, opacity: .9 }),
  sea: new THREE.MeshStandardMaterial({ color: P.sea, roughness: .22, metalness: .35 }),
  leaf: new THREE.MeshStandardMaterial({ color: '#5da34a', roughness: .9, flatShading: true }),
  wood: new THREE.MeshStandardMaterial({ color: '#6b452d', roughness: .85 }),
  tile: new THREE.MeshStandardMaterial({ color: P.tile, roughness: .8 }),
  gold: new THREE.MeshStandardMaterial({ color: P.gold, metalness: .5, roughness: .4 }),
  lava: new THREE.MeshStandardMaterial({ color: P.lava, emissive: '#ff5a12', emissiveIntensity: 1.2, roughness: .6 }),
  cloud: new THREE.MeshStandardMaterial({ color: P.cloud, transparent: true, opacity: .42, roughness: 1 }),
};

// ---------------------------------------------------------------- helpers
const box = (w, h, d, m, x=0, y=0, z=0) => {
  const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), m);
  o.position.set(x, y, z); o.castShadow = o.receiveShadow = true; return o;
};
function cone(r, h, m, x, y, z, seg = 9) {
  const o = new THREE.Mesh(new THREE.ConeGeometry(r, h, seg), m);
  o.position.set(x, y + h / 2, z); o.castShadow = o.receiveShadow = true; return o;
}
function tree(x, y, z, s, kit) {
  kit.add('trunk', place(x, y, z, rand()*6.28, s, s, s));
  for (let k = 0; k < 4; k++) {
    const ls = s * (1.2 + rand()*.7);
    kit.add('leaf', place(x + (rand()-.5)*2*s, y + s*(2.6+k*.6), z + (rand()-.5)*2*s,
      rand()*6.28, ls, ls*.8, ls), leafColors[(rand()*leafColors.length)|0]);
  }
}
const leafColors = ['#5da34a','#6fbf58','#4e9440','#83cc6b'].map(c => new THREE.Color(c));

// ---------------------------------------------------------------- terrain heightfield
function terrainHeight(x, z) {
  const d = Math.hypot(x, z);
  if (d > R) return SEA - 6;
  const fall = Math.max(0, 1 - Math.pow(d / R, 4));
  let h = 10 + fall * 10;
  // region hills
  const hills = [
    [-120, -90, 30, 30],   // banyan cliff (top-left)
    [-70, -30, 14, 34],    // terraces mid-left
    [0, -10, 26, 36],      // central waterfall cliff
    [30, 60, 12, 30],      // red ruins bottom-mid
    [120, -60, 40, 34],    // snow range right
    [-40, 90, 16, 26],     // mangrove islets bottom-left
  ];
  for (const [hx, hz, hh, hr] of hills) {
    const dd = Math.hypot(x - hx, z - hz);
    if (dd < hr) h += hh * Math.pow(1 - dd / hr, 2);
  }
  // terraces in the west-south (region 1)
  if (x < -30 && z > 30) h += Math.floor((x + 140) / 9) * 1.4;
  return h;
}
function terrain(group) {
  const N = 96, size = 400, geo = new THREE.PlaneGeometry(size, size, N, N);
  geo.rotateX(-Math.PI / 2);
  const pos = geo.attributes.position, col = [];
  const c = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i);
    const y = terrainHeight(x, z);
    pos.setY(i, y);
    if (y < SEA + 2) c.set(P.sand);
    else if (y > 34) c.set(P.snow);
    else if (y > 24) c.set(P.rock);
    else c.set(P.grass);
    col.push(c.r, c.g, c.b);
  }
  geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  geo.computeVertexNormals();
  const land = new THREE.Mesh(geo, M.grass);
  land.receiveShadow = true; group.add(land);

  const sea = new THREE.Mesh(new THREE.CircleGeometry(600, 96), M.sea);
  sea.rotation.x = -Math.PI/2; sea.position.y = SEA; sea.receiveShadow = true; group.add(sea);
  // shallows ring
  const shall = new THREE.Mesh(new THREE.RingGeometry(R - 26, R + 14, 96), M.water);
  shall.rotation.x = -Math.PI/2; shall.position.y = SEA + .15; group.add(shall);
}

// ---------------------------------------------------------------- landmarks by region
function terraces(group) {                       // R1 ruộng bậc thang
  const kit = new Kit();
  for (let i = 0; i < 11; i++) {
    const r = 26 + i * 5.5;
    const path = arc(-92, 74, r, Math.PI * .1, Math.PI * .92, 48);
    const band = sweep([[-2.4, 0], [2.4, 0], [2.4, .22], [-2.4, .22]], path, { y: terrainHeight(-92 + r, 74) + 1.4 + i * 1.35 });
    const m = new THREE.Mesh(band, M.grass); m.receiveShadow = true; group.add(m);
  }
  kit.build(group);
}
function greatBanyan(group) {                     // R2 Đại Thụ
  const x = -120, z = -90, y = terrainHeight(x, z);
  const trunk = new THREE.Mesh(lathe([
    [0.001, 0], [7, 0], [6.4, 5], [4.6, 14], [3.2, 24], [1.8, 32], [.001, 34]
  ], 14), M.wood);
  trunk.position.set(x, y, z); trunk.castShadow = true; group.add(trunk);
  const kit = new Kit().def('root', new THREE.CylinderGeometry(.5, .12, 14, 6), M.wood)
    .def('leaf', new THREE.IcosahedronGeometry(1, 2), M.leaf);
  for (let i = 0; i < 40; i++) {
    const a = rand() * 6.28, d = 4 + rand() * 13;
    const rr = new THREE.Mesh(new THREE.CylinderGeometry(.6, .1, 14, 6), M.wood);
    rr.position.set(x + Math.sin(a) * d, y + 3 + rand() * 3, z + Math.cos(a) * d);
    rr.rotation.z = Math.sin(a) * .5; rr.rotation.x = -Math.cos(a) * .5;
    group.add(rr);
  }
  for (let i = 0; i < 140; i++) {
    const a = rand() * 6.28, d = 2 + rand() * 26;
    const ls = 4.5 + rand() * 5;
    kit.add('leaf', place(x + Math.sin(a)*d, y + 32 + rand()*8 - d*.2, z + Math.cos(a)*d,
      rand()*6.28, ls, ls*.7, ls), leafColors[(rand()*4)|0]);
  }
  kit.build(group);
}
function chamTowers(group) {                      // R3 tháp Chăm
  const kit = new Kit().def('finial', new THREE.ConeGeometry(.6, 1.4, 6), M.gold);
  for (const [x, z, h] of [[30, 70, 18], [44, 84, 14], [18, 88, 12]]) {
    const y = terrainHeight(x, z);
    const t = new THREE.Mesh(lathe([
      [.001,0],[5,0],[4.4,2],[3.6,h*.5],[3.2,h*.78],[4,h*.86],[3.4,h*.94],[.001,h]
    ], 8), M.redRock);
    t.position.set(x, y, z); t.castShadow = true; group.add(t);
    for (let k = 0; k < 3; k++) kit.add('finial', place(x, y + h + k*1.2, z, 0, 1,1,1));
  }
  kit.build(group);
}
function mangrove(group) {                        // R4 rừng đước
  const kit = new Kit().def('trunk', new THREE.CylinderGeometry(.28, .5, 5, 6), M.wood)
    .def('root', new THREE.CylinderGeometry(.1, .22, 3, 5), M.wood)
    .def('leaf', new THREE.IcosahedronGeometry(1, 1), M.leaf);
  for (let i = 0; i < 60; i++) {
    const a = rand() * 6.28, d = 10 + rand() * 48;
    const x = -50 + Math.sin(a)*d*0.8, z = 95 + Math.cos(a)*d*0.8;
    const y = SEA + .3 + rand()*1.5;
    kit.add('trunk', place(x, y+2.5, z));
    for (let k = 0; k < 5; k++) {
      const ra = k/5*6.28;
      kit.add('root', place(x + Math.sin(ra)*.7, y+1.3, z + Math.cos(ra)*.7, 0, 1,1,1));
    }
    const ls = 2 + rand()*2;
    kit.add('leaf', place(x, y+5.5, z, rand()*6.28, ls, ls*.7, ls), leafColors[(rand()*4)|0]);
  }
  kit.build(group);
}
function snowPeaks(group) {                       // R5 Hoàng Liên
  for (const [x, z, r, h] of [[130,-40,24,58],[152,-70,18,46],[110,-80,20,52]]) {
    const y = terrainHeight(x, z);
    group.add(cone(r, h, M.rock, x, y, z, 7));
    const cap = new THREE.Mesh(new THREE.ConeGeometry(r*.42, h*.34, 7), M.snow);
    cap.position.set(x, y + h*.83, z); group.add(cap);
    for (let i = 0; i < 5; i++) {
      const a = i/5*6.28, rr = r*.55;
      group.add(cone(3, 9, M.snow, x + Math.sin(a)*rr, y + h*.45, z + Math.cos(a)*rr, 6));
    }
  }
}
function volcano(group) {                         // R6 Hắc Sơn
  const x = -10, z = 130, y = SEA;
  const coneGeo = new THREE.CylinderGeometry(6, 26, 46, 9, 1, true);
  const v = new THREE.Mesh(coneGeo, M.rock); v.position.set(x, y+23, z); group.add(v);
  const crater = new THREE.Mesh(new THREE.CylinderGeometry(6, 4, 2, 9), M.lava);
  crater.position.set(x, y+46, z); group.add(crater);
  const glow = new THREE.PointLight('#ff6a20', 3, 90, 2); glow.position.set(x, y+48, z); group.add(glow);
  // lava flow
  const flow = sweep([[-2,0],[2,0]], [[x,y+45,z],[x+12,y+22,z+8],[x+28,y+4,z+16]], { y: 0 });
  const lavaMesh = new THREE.Mesh(flow, M.lava); group.add(lavaMesh);
}
function sinkhole(group) {                        // R7 Thiên Khanh
  const x = 0, z = -20, y = terrainHeight(x, z);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(34, 5, 8, 48), M.rock);
  rim.rotation.x = Math.PI/2; rim.position.set(x, y+2, z); group.add(rim);
  for (let i = 0; i < 3; i++) {
    const a = i/3*6.28;
    const fall = new THREE.Mesh(new THREE.PlaneGeometry(8, 34), M.water);
    fall.position.set(x + Math.sin(a)*20, y+18, z + Math.cos(a)*20);
    fall.rotation.y = a; fall.castShadow = true; group.add(fall);
  }
  const lake = new THREE.Mesh(new THREE.CircleGeometry(24, 48), M.water);
  lake.rotation.x = -Math.PI/2; lake.position.set(x, y+1, z); group.add(lake);
}
function meteorite(group) {
  const m = new THREE.Mesh(new THREE.IcosahedronGeometry(9, 2), M.rock);
  m.scale.set(1, .6, 1); m.position.set(90, 125, -60); m.rotation.set(.4, .8, .2);
  group.add(m);
  for (let i = 0; i < 8; i++) {
    const crack = new THREE.Mesh(new THREE.BoxGeometry(6, .35, .5), M.lava);
    crack.position.set(90 + (Math.random()-.5)*12, 125 + (Math.random()-.5)*7, -60 + (Math.random()-.5)*12);
    crack.rotation.set(Math.random(), Math.random()*6, Math.random());
    group.add(crack);
  }
}
function skyIslands(group) {                      // R8 Tiên Giới
  const kit = new Kit().def('rock', new THREE.IcosahedronGeometry(1, 1), M.rock)
    .def('leaf', new THREE.IcosahedronGeometry(1, 1), M.leaf)
    .def('roof', new THREE.ConeGeometry(1, 1, 4), M.gold);
  for (const [x, y, z, s] of [[-60,120,-60,14],[30,135,-90,10],[-110,105,-30,8],[60,110,-140,9]]) {
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(s, 2), M.rock);
    rock.scale.set(1, .55, 1); rock.position.set(x, y, z); group.add(rock);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(s*.7, s*.8, 1.6, 12), M.grass);
    cap.position.set(x, y + s*.5, z); group.add(cap);
    for (let i = 0; i < 6; i++) {
      const a = i/6*6.28;
      kit.add('leaf', place(x+Math.sin(a)*s*.6, y+s*.5+2, z+Math.cos(a)*s*.6, 0, 2.4, 2, 2.4), leafColors[(rand()*4)|0]);
    }
    // palace on top
    const p = box(s*.9, 3.2, s*.6, M.tile, x, y+s*.5+2.6, z); group.add(p);
    const rf = new THREE.Mesh(new THREE.ConeGeometry(s*1.1, 4.6, 4), M.gold);
    rf.rotation.y = Math.PI/4; rf.position.set(x, y+s*.5+6, z); group.add(rf);
    // waterfall into the void
    const w = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 22), M.water);
    w.position.set(x+s*.7, y-11, z); group.add(w);
  }
  kit.build(group);
}

// ---------------------------------------------------------------- per-point real landmarks
function kw(name) {
  const n = (name || '').toLowerCase();
  if (/cổng|thành|quan/.test(n)) return 'gate';
  if (/tháp|chăm/.test(n)) return 'cham';
  if (/đền|miếu|thánh|tự/.test(n)) return 'temple';
  if (/thuyền|bến|cảng/.test(n)) return 'boat';
  if (/hang|động/.test(n)) return 'cave';
  if (/thác/.test(n)) return 'falls';
  if (/tuyết|đỉnh|núi/.test(n)) return 'peak';
  if (/lửa|dung nham|hắc sơn/.test(n)) return 'volcano';
  if (/cây đa|đại thụ/.test(n)) return 'banyan';
  if (/ruộng|bậc thang/.test(n)) return 'terrace';
  if (/đảo bay|tiên giới|lầu/.test(n)) return 'sky';
  if (/chợ|làng|nhà/.test(n)) return 'house';
  if (/bia|rùa/.test(n)) return 'stele';
  if (/đền|đàn|tế/.test(n)) return 'altar';
  if (/suối|hồ|đầm/.test(n)) return 'lake';
  return 'house';
}
function landmarkAt(group, d) {
  const kind = kw(d.name);
  const y = terrainHeight(d.x, d.z);
  const g = new THREE.Group();
  g.position.set(d.x, Math.max(y, SEA + .2), d.z);
  const kit = new Kit();
  if (kind === 'gate') {
    kit.def('w', g_geo('unitBox'), M.rock);
    kit.add('w', place(0, 1.6, 0, 0, 8, 3.2, 1.2));
    for (const cx of [-2.6, 0, 2.6]) {
      const arch = new THREE.Mesh(new THREE.TorusGeometry(1.15, .26, 6, 16, Math.PI), M.rock);
      arch.position.set(cx, 3.2, 0); g.add(arch);
    }
    kit.add('w', place(0, 4.1, 0, 0, 8.4, .3, 1.4));           // beam
    const r = new THREE.Group();
    simpleTileRoof(r, 9, 2.4, 1.3);
    r.position.y = 4.25; g.add(r);
  } else if (kind === 'cham') {
    const t = new THREE.Mesh(lathe([[.001,0],[3.4,0],[2.8,1.6],[2.2,6],[2.0,8.4],[2.8,9.2],[2.2,10],[.001,10.2]], 8), M.redRock);
    t.castShadow = true; g.add(t);
  } else if (kind === 'temple' || kind === 'altar') {
    g.add(box(5, 2.6, 4, M.rock, 0, 1.5, 0));
    const r = new THREE.Group(); simpleTileRoof(r, 6, 5, 1.8); r.position.y = 2.8; g.add(r);
  } else if (kind === 'boat') {
    const hull = new THREE.Mesh(new THREE.BoxGeometry(2.2, .5, 6), M.wood);
    hull.position.y = .2; g.add(hull);
    const sail = new THREE.Mesh(new THREE.PlaneGeometry(3, 4), new THREE.MeshStandardMaterial({ color: '#d9b380', side: THREE.DoubleSide }));
    sail.position.set(0, 2.4, 0); g.add(sail);
  } else if (kind === 'cave') {
    const arch = new THREE.Mesh(new THREE.TorusGeometry(3, 1.4, 8, 20, Math.PI), M.rock);
    arch.position.y = 1.4; g.add(arch);
    g.add(box(6, .4, 6, M.rock, 0, .2, 0));
  } else if (kind === 'falls') {
    const f = new THREE.Mesh(new THREE.PlaneGeometry(4, 12), M.water);
    f.position.set(0, 5, 0); g.add(f);
    g.add(box(8, 1, 8, M.rock, 0, .5, 2));
  } else if (kind === 'peak') {
    g.add(cone(7, 16, M.rock, 0, 0, 0, 7));
    const cap = new THREE.Mesh(new THREE.ConeGeometry(3, 5.5, 7), M.snow);
    cap.position.y = 13; g.add(cap);
  } else if (kind === 'volcano') {
    const v = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 8, 14, 8, 1, true), M.rock);
    v.position.y = 7; g.add(v);
    const c = new THREE.Mesh(new THREE.CylinderGeometry(2.5, 1.8, 1.4, 8), M.lava);
    c.position.y = 14; g.add(c);
  } else if (kind === 'banyan') {
    const trunk = new THREE.Mesh(lathe([[.001,0],[2.6,0],[2.2,3],[1.6,7],[.9,9],[.001,9.4]], 10), M.wood);
    trunk.castShadow = true; g.add(trunk);
    kit.def('leaf', g_geo('leafIco'), M.leaf);
    for (let i = 0; i < 18; i++) {
      const a = i / 18 * 6.28, ls = 2.5 + (i % 3);
      kit.add('leaf', place(Math.sin(a) * 3.5, 9.5 + (i % 4) * 1.2, Math.cos(a) * 3.5, a, ls, ls * .7, ls), leafColors[i % 4]);
    }
  } else if (kind === 'terrace') {
    for (let i = 0; i < 4; i++) {
      const b = sweep([[-4, 0], [4, 0], [4, .3], [-4, .3]], [[-6, 4 + i * 2], [6, 4 + i * 2]], { y: i * 1.2 });
      const m = new THREE.Mesh(b, M.grass); g.add(m);
    }
  } else if (kind === 'sky') {
    const rock = new THREE.Mesh(new THREE.IcosahedronGeometry(5, 1), M.rock);
    rock.scale.set(1, .5, 1); rock.position.y = -2; g.add(rock);
    g.add(box(4, 2.4, 3, M.tile, 0, 1.4, 0));
    const rf = new THREE.Mesh(new THREE.ConeGeometry(3.4, 2.8, 4), M.gold);
    rf.rotation.y = Math.PI / 4; rf.position.y = 3.8; g.add(rf);
    g.position.y += 60;   // floating
  } else if (kind === 'stele') {
    const turtle = new THREE.Mesh(new THREE.SphereGeometry(1.2, 12, 8), M.rock);
    turtle.scale.set(1.3, .5, 1); turtle.position.y = .6; g.add(turtle);
    g.add(box(1, 2.6, .4, M.rock, 0, 1.8, 0));
  } else if (kind === 'lake') {
    const l = new THREE.Mesh(new THREE.CircleGeometry(5, 24), M.water);
    l.rotation.x = -Math.PI / 2; l.position.y = .1; g.add(l);
  } else {  // house
    g.add(box(5.5, 2.4, 4, new THREE.MeshStandardMaterial({ color: '#e0cf9e', roughness: .95 }), 0, 1.4, 0));
    const r = new THREE.Group(); simpleTileRoof(r, 6.4, 4.8, 1.6); r.position.y = 2.6; g.add(r);
  }
  kit.build(g);
  group.add(g);
}
function g_geo(n) { return new THREE.BoxGeometry(1, 1, 1); }
function simpleTileRoof(group, w, d, h) {
  const geo = new THREE.CylinderGeometry(.01, Math.min(w, d) / Math.SQRT2, h, 4, 1);
  const m = new THREE.Mesh(geo, M.tile);
  m.rotation.y = Math.PI / 4; m.scale.set(1, 1, d / w); m.position.y = h / 2;
  m.castShadow = true; group.add(m);
}

function detailBoards(group) {                   // 64 detail points as floating preview boards
  const loader = new THREE.TextureLoader();
  for (const d of DETAILS) {
    landmarkAt(group, d);
    const tex = loader.load(d.img);
    tex.colorSpace = THREE.SRGBColorSpace;
    const mat = new THREE.MeshStandardMaterial({ map: tex, transparent: true, alphaTest: .05, side: THREE.DoubleSide, roughness: .9 });
    const w = 6, h = 4;
    const board = new THREE.Mesh(new THREE.PlaneGeometry(w, h), mat);
    board.position.set(d.x, terrainHeight(d.x, d.z) + 5.5, d.z);
    board.lookAt(0, terrainHeight(d.x, d.z) + 8, 0);
    board.castShadow = true; group.add(board);
    // post + base
    const post = new THREE.Mesh(new THREE.CylinderGeometry(.14, .18, 8, 6), M.wood);
    post.position.set(d.x, terrainHeight(d.x, d.z) + 2.75, d.z); group.add(post);
    // name plate
    const cnv = document.createElement('canvas'); cnv.width = 512; cnv.height = 64;
    const g = cnv.getContext('2d');
    g.fillStyle = 'rgba(247,236,220,.92)'; g.fillRect(0, 0, 512, 64);
    g.fillStyle = '#68432d'; g.font = '600 26px Georgia'; g.textAlign = 'center';
    g.fillText(d.region.toUpperCase() + '-' + d.num + ' · ' + d.name, 256, 42);
    const t = new THREE.CanvasTexture(cnv); t.colorSpace = THREE.SRGBColorSpace;
    const plate = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.1), new THREE.MeshBasicMaterial({ map: t, transparent: true }));
    plate.position.set(d.x, terrainHeight(d.x, d.z) + 10.1, d.z);
    plate.lookAt(0, terrainHeight(d.x, d.z) + 14.6, 0);
    group.add(plate);
  }
}
function clouds(group) {
  const kit = new Kit().def('cloud', new THREE.IcosahedronGeometry(1, 1), M.cloud);
  for (let i = 0; i < 60; i++) {
    const a = rand()*6.28, d = 40 + rand()*220;
    const s = 5 + rand()*12;
    kit.add('cloud', place(Math.sin(a)*d, 60 + rand()*70, Math.cos(a)*d, rand()*6.28, s*2.2, s*.6, s), new THREE.Color('#ffffff'));
  }
  kit.build(group);
}
function bigWaterfalls(group) {
  for (const [x, z, w] of [[-6, -34, 9], [12, -28, 7], [-20, -22, 5]]) {
    const top = terrainHeight(x, z);
    const fall = new THREE.Mesh(new THREE.PlaneGeometry(w, top - SEA + 6), M.water);
    fall.position.set(x, SEA + (top - SEA) / 2, z);
    fall.rotation.x = 0; fall.castShadow = false;
    fall.material.transparent = true; fall.material.opacity = .8;
    group.add(fall);
    // foam ring at base
    const foam = new THREE.Mesh(new THREE.CircleGeometry(w * .9, 24), M.cloud);
    foam.rotation.x = -Math.PI / 2; foam.position.set(x, SEA + .3, z);
    group.add(foam);
  }
}
function waterfalls(group) {                     // central big falls (painting)
  for (const [x, z] of [[0, -30], [10, -18]]) {
    const y = terrainHeight(x, z);
    const w = new THREE.Mesh(new THREE.PlaneGeometry(10, 30), M.water);
    w.position.set(x, y+16, z); group.add(w);
  }
}
function boatsAndMarket(group) {                 // small boats + floating market
  const kit = new Kit().def('hull', new THREE.BoxGeometry(2.4, .5, 7), M.wood)
    .def('sail', new THREE.PlaneGeometry(4, 5), new THREE.MeshStandardMaterial({ color: '#d9b380', side: THREE.DoubleSide, roughness: .9 }));
  for (let i = 0; i < 14; i++) {
    const a = rand()*6.28, d = R + 12 + rand()*70;
    const x = Math.sin(a)*d, z = Math.cos(a)*d;
    kit.add('hull', place(x, SEA+.3, z, a, 1,1,1));
    kit.add('sail', place(x, SEA+3, z, a + Math.PI/2, 1,1,1));
  }
  kit.build(group);
}

// ---------------------------------------------------------------- build
export function buildWorld() {
  const group = new THREE.Group();
  terrain(group);
  terraces(group);
  greatBanyan(group);
  chamTowers(group);
  mangrove(group);
  snowPeaks(group);
  volcano(group);
  sinkhole(group);
  skyIslands(group);
  meteorite(group);
  waterfalls(group);
  bigWaterfalls(group);
  boatsAndMarket(group);
  detailBoards(group);
  clouds(group);
  return {
    group,
    center: new THREE.Vector3(0, 22, 0),
    update(now) {
      U.uTime.value = now;
    },
  };
}
