// Đại Việt Open-World Atlas — world map rebuilt from anatomy of the reference painting.
// 8 regions, real terrain mesh + geometry landmarks. No photo planes, no image textures.
import * as THREE from 'three';
import { Kit, place, lathe, arc, sweep, canvasTex, rng } from './kit.js';
import { U } from './env.js';
import { DETAILS } from './map_details.js';

const OUTLINE = [[32.34, 121.57], [30.9, 120.89], [29.15, 119.58], [28.0, 119.17], [26.65, 119.09], [21.39, 120.36], [19.23, 120.56], [10.08, 120.26], [4.94, 120.7], [4.36, 120.65], [3.87, 120.26], [3.48, 119.07], [3.64, 117.55], [4.86, 116.36], [6.55, 115.34], [12.62, 112.93], [13.98, 112.7], [17.08, 112.98], [18.13, 112.86], [21.28, 111.53], [22.73, 110.16], [23.54, 108.66], [23.59, 107.66], [22.71, 107.12], [18.76, 107.06], [14.26, 107.7], [12.55, 107.7], [8.89, 106.59], [6.34, 106.1], [1.59, 104.55], [-0.96, 104.21], [-4.53, 104.46], [-8.44, 105.07], [-10.03, 104.39], [-10.75, 104.4], [-18.41, 107.06], [-21.47, 107.31], [-23.97, 106.59], [-26.85, 104.56], [-29.01, 104.16], [-29.71, 103.06], [-29.82, 100.64], [-30.24, 99.0], [-36.99, 90.16], [-40.29, 84.25], [-46.51, 74.51], [-46.9, 73.6], [-47.14, 72.01], [-52.11, 69.67], [-54.32, 67.95], [-54.53, 67.34], [-53.81, 66.52], [-53.74, 65.76], [-55.14, 63.93], [-55.96, 62.2], [-56.84, 61.39], [-57.71, 59.87], [-59.27, 58.75], [-60.6, 58.82], [-62.74, 60.48], [-64.38, 61.3], [-65.27, 61.55], [-67.9, 61.42], [-71.68, 60.5], [-75.91, 58.94], [-78.03, 57.5], [-78.19, 56.54], [-78.87, 56.28], [-80.06, 56.77], [-80.9, 57.57], [-81.25, 58.99], [-81.97, 60.02], [-83.65, 61.06], [-85.5, 61.74], [-88.27, 59.95], [-89.6, 60.32], [-92.42, 60.59], [-96.72, 60.34], [-101.94, 59.54], [-105.59, 60.04], [-109.59, 59.5], [-111.53, 59.6], [-114.71, 58.27], [-117.14, 57.84], [-119.33, 56.96], [-120.29, 56.93], [-121.38, 57.22], [-123.41, 58.4], [-124.67, 58.87], [-135.47, 60.78], [-138.86, 61.58], [-144.51, 61.29], [-146.51, 61.41], [-148.05, 61.07], [-148.7, 61.16], [-154.0, 65.52], [-155.54, 66.25], [-156.91, 66.13], [-158.16, 64.58], [-164.99, 66.25], [-165.43, 66.03], [-165.72, 65.35], [-165.86, 61.81], [-168.81, 60.78], [-171.27, 59.55], [-175.3, 56.51], [-178.41, 53.32], [-180.35, 52.24], [-180.83, 51.45], [-180.93, 49.84], [-179.64, 49.23], [-179.3, 48.58], [-180.48, 46.57], [-184.69, 40.6], [-186.6, 37.33], [-188.02, 33.37], [-188.79, 29.31], [-188.77, 25.64], [-189.16, 22.73], [-187.3, 17.19], [-186.69, 14.04], [-186.02, 12.13], [-185.81, 10.26], [-186.11, 4.83], [-185.67, 2.24], [-184.69, -0.05], [-182.49, -2.71], [-181.05, -3.85], [-171.31, -5.49], [-170.5, -6.28], [-169.91, -7.33], [-169.05, -7.96], [-161.52, -8.42], [-157.25, -8.98], [-153.88, -9.75], [-144.99, -13.76], [-142.75, -15.33], [-141.0, -17.38], [-137.13, -24.67], [-137.15, -25.36], [-137.48, -25.9], [-138.44, -26.56], [-139.81, -28.21], [-141.49, -28.72], [-142.64, -29.51], [-144.71, -32.39], [-147.23, -33.62], [-149.27, -35.56], [-153.61, -38.52], [-155.8, -41.09], [-158.85, -45.55], [-162.24, -46.81], [-163.27, -47.6], [-166.3, -50.94], [-171.83, -59.22], [-172.04, -60.41], [-171.78, -62.44], [-170.4, -65.43], [-167.12, -70.09], [-165.94, -71.28], [-163.57, -72.75], [-160.18, -74.41], [-158.66, -75.74], [-157.53, -77.68], [-156.36, -81.88], [-155.8, -82.32], [-155.05, -82.51], [-152.55, -82.65], [-150.8, -83.7], [-146.81, -84.94], [-144.31, -86.1], [-143.45, -86.85], [-142.4, -88.48], [-142.03, -89.72], [-141.94, -91.37], [-136.43, -92.38], [-135.24, -92.78], [-132.44, -94.38], [-131.25, -94.62], [-126.03, -94.32], [-125.07, -94.1], [-122.76, -92.56], [-119.72, -90.12], [-118.35, -88.64], [-117.39, -88.29], [-115.13, -88.01], [-111.49, -86.66], [-110.0, -85.29], [-109.25, -83.81], [-108.39, -82.7], [-97.54, -81.72], [-93.29, -79.48], [-84.17, -75.55], [-81.66, -73.87], [-80.29, -73.59], [-77.12, -70.3], [-74.06, -68.11], [-73.29, -67.88], [-72.01, -68.09], [-70.11, -69.41], [-68.36, -69.77], [-63.09, -68.32], [-61.18, -68.37], [-59.29, -69.07], [-56.96, -70.75], [-52.71, -71.49], [-51.36, -73.11], [-49.58, -74.15], [-49.49, -74.62], [-50.54, -76.84], [-50.12, -80.06], [-48.74, -83.02], [-46.32, -86.52], [-44.03, -90.47], [-40.46, -99.24], [-38.97, -100.1], [-34.88, -101.61], [-33.72, -102.27], [-29.91, -105.56], [-25.22, -107.89], [-23.38, -108.45], [-19.35, -109.18], [-15.82, -109.53], [-10.87, -109.6], [-7.33, -109.99], [-3.71, -109.53], [2.87, -109.36], [7.25, -108.92], [9.08, -108.48], [12.85, -107.03], [13.81, -106.21], [14.49, -102.86], [15.91, -101.38], [20.3, -97.56], [24.1, -95.23], [26.83, -92.63], [30.35, -90.42], [31.87, -88.92], [33.77, -86.48], [35.61, -84.91], [36.49, -84.47], [37.2, -84.47], [40.64, -85.72], [45.83, -83.41], [50.52, -80.55], [52.1, -80.11], [54.62, -80.03], [58.08, -80.64], [60.02, -81.41], [62.46, -81.39], [63.74, -82.02], [66.52, -84.07], [68.2, -84.14], [70.82, -83.68], [72.1, -83.68], [73.22, -84.0], [74.16, -84.63], [76.32, -86.82], [77.35, -87.31], [78.56, -87.17], [81.78, -85.96], [84.52, -85.82], [86.05, -85.4], [89.79, -82.74], [90.39, -83.19], [91.7, -84.93], [92.05, -84.98], [93.76, -84.21], [99.49, -87.1], [105.49, -89.25], [108.5, -90.81], [112.77, -89.88], [115.36, -90.6], [117.42, -90.74], [122.05, -89.65], [127.1, -87.78], [131.69, -87.25], [132.81, -86.92], [138.21, -84.31], [144.65, -82.34], [149.85, -80.06], [153.47, -79.22], [153.75, -78.94], [153.56, -78.19], [151.29, -74.72], [151.55, -74.08], [152.32, -73.71], [153.67, -73.64], [155.1, -74.09], [156.2, -75.06], [159.23, -78.7], [160.44, -79.15], [161.32, -78.89], [162.96, -77.75], [164.27, -76.19], [167.93, -73.55], [168.84, -72.57], [168.09, -67.46], [168.65, -66.36], [169.4, -65.92], [170.4, -66.06], [172.08, -67.3], [173.6, -67.88], [177.08, -67.66], [178.57, -69.91], [180.41, -70.82], [187.02, -70.37], [188.21, -70.07], [190.0, -66.85], [191.1, -63.66], [190.54, -62.54], [187.35, -59.95], [186.36, -57.42], [186.48, -56.14], [187.88, -53.11], [189.19, -46.22], [190.15, -44.13], [192.32, -40.93], [192.82, -39.69], [193.65, -35.74], [194.83, -34.05], [196.26, -33.18], [196.73, -32.62], [194.55, -31.5], [194.25, -31.19], [194.27, -30.87], [194.98, -30.4], [198.34, -29.64], [198.68, -29.29], [195.82, -24.13], [193.36, -20.42], [191.68, -18.92], [190.77, -18.88], [189.88, -20.28], [187.46, -27.69], [186.74, -27.82], [184.9, -27.47], [184.26, -26.72], [183.96, -25.71], [183.63, -18.78], [182.59, -13.72], [181.65, -12.04], [179.62, -10.19], [177.42, -8.94], [175.7, -8.61], [166.42, -9.75], [160.97, -11.13], [159.77, -11.2], [157.9, -10.55], [155.03, -8.49], [153.35, -7.58], [146.77, -7.16], [144.43, -6.6], [140.89, -4.71], [138.58, -3.03], [138.09, -1.59], [137.55, 1.71], [136.53, 3.54], [135.4, 4.18], [131.76, 5.18], [130.46, 5.79], [128.43, 9.64], [126.93, 13.65], [126.03, 13.79], [124.13, 12.6], [122.73, 12.72], [119.39, 13.95], [118.81, 14.56], [118.44, 15.71], [118.32, 18.81], [118.98, 21.12], [119.7, 22.14], [122.05, 24.31], [123.15, 24.73], [124.39, 24.46], [126.91, 21.98], [128.4, 23.59], [131.02, 24.87], [132.04, 25.88], [132.2, 26.42], [131.48, 27.12], [130.22, 27.37], [126.44, 27.3], [124.93, 28.0], [124.37, 28.7], [125.25, 29.57], [128.57, 31.81], [129.29, 32.62], [129.69, 33.41], [130.18, 35.89], [130.97, 36.99], [134.28, 38.43], [136.11, 39.83], [137.74, 40.13], [139.9, 40.04], [147.07, 38.54], [148.98, 37.5], [151.78, 35.49], [154.26, 34.25], [155.22, 33.18], [156.22, 31.22], [159.69, 29.36], [161.49, 28.74], [165.39, 29.01], [168.89, 29.94], [171.22, 32.24], [173.79, 35.89], [174.23, 36.96], [174.35, 38.71], [174.07, 39.71], [173.42, 40.6], [171.78, 40.88], [165.52, 40.76], [160.56, 41.28], [157.97, 39.57], [156.83, 40.41], [156.4, 41.7], [156.99, 49.0], [157.55, 50.4], [158.5, 51.55], [159.84, 52.57], [161.1, 52.9], [163.55, 51.69], [164.87, 51.75], [165.85, 52.55], [167.55, 54.79], [172.97, 56.52], [175.52, 57.94], [178.6, 60.53], [177.12, 62.56], [176.7, 63.63], [177.45, 64.4], [180.9, 66.27], [179.57, 68.32], [178.29, 69.35], [174.75, 68.69], [174.04, 68.77], [171.95, 69.69], [171.08, 69.77], [167.05, 69.07], [166.6, 69.56], [166.02, 71.1], [165.48, 71.5], [164.83, 71.1], [165.11, 69.11], [164.9, 68.06], [163.64, 66.62], [162.61, 65.99], [161.65, 65.96], [160.25, 66.38], [156.83, 67.95], [156.24, 68.51], [156.55, 69.37], [158.99, 70.31], [159.6, 71.09], [159.44, 72.82], [158.57, 74.25], [158.25, 75.32], [158.71, 77.12], [159.53, 78.31], [160.46, 78.73], [162.47, 79.0], [164.43, 80.15], [165.18, 80.32], [166.06, 80.13], [169.08, 78.15], [170.33, 77.66], [171.71, 78.52], [172.78, 79.66], [172.62, 80.46], [170.68, 81.5], [169.72, 82.62], [168.91, 86.17], [167.86, 88.48], [167.75, 89.04], [168.02, 89.79], [168.68, 90.28], [170.48, 90.9], [171.15, 91.73], [170.82, 93.33], [169.68, 95.45], [168.89, 96.2], [168.07, 96.3], [165.74, 95.22], [163.15, 95.27], [161.38, 94.19], [160.18, 92.91], [159.13, 91.35], [158.8, 89.95], [158.87, 87.89], [158.2, 86.76], [156.61, 85.19], [152.32, 82.37], [152.41, 81.53], [153.32, 79.35], [153.33, 78.63], [153.09, 78.26], [150.06, 76.47], [148.73, 76.04], [147.86, 76.02], [147.14, 76.53], [146.81, 78.07], [146.86, 84.14], [145.67, 86.76], [145.13, 88.6], [142.26, 91.07], [142.08, 92.07], [142.43, 94.78], [142.03, 96.02], [141.21, 96.37], [138.9, 95.95], [135.84, 96.09], [132.75, 95.06], [131.74, 94.97], [129.29, 96.77], [127.42, 97.04], [126.58, 97.72], [123.9, 100.96], [123.45, 102.32], [122.99, 105.1], [119.25, 107.61], [117.74, 111.3], [116.48, 112.02], [114.71, 111.88], [112.33, 110.5], [110.56, 108.85], [109.92, 107.92], [108.11, 104.09], [106.22, 102.04], [105.56, 100.55], [105.19, 98.93], [102.43, 94.25], [102.02, 90.91], [101.57, 89.77], [100.05, 88.69], [98.42, 88.23], [95.32, 88.23], [92.49, 88.83], [91.3, 88.8], [90.75, 87.8], [90.3, 84.66], [90.6, 83.18], [91.42, 81.5], [90.91, 80.19], [88.99, 78.61], [87.8, 78.44], [86.27, 78.77], [85.65, 78.7], [85.15, 78.31], [84.4, 75.77], [84.02, 75.16], [81.55, 73.92], [82.32, 70.89], [82.3, 70.1], [81.78, 68.53], [81.23, 67.74], [77.42, 64.54], [76.44, 63.42], [73.85, 59.45], [73.03, 58.62], [72.26, 58.14], [70.23, 57.54], [68.65, 56.51], [67.97, 56.4], [67.32, 56.8], [67.15, 57.19], [66.9, 60.34], [66.38, 61.69], [64.96, 62.98], [63.14, 63.72], [61.58, 64.73], [60.15, 64.87], [55.44, 63.4], [54.29, 63.42], [53.51, 63.84], [53.11, 64.68], [52.8, 66.75], [52.27, 68.21], [50.38, 70.73], [50.52, 71.12], [52.17, 72.62], [52.67, 73.4], [52.34, 73.73], [50.63, 74.25], [50.0, 74.97], [51.35, 78.31], [50.1, 81.5], [50.05, 82.15], [50.73, 84.25], [50.15, 86.52], [50.22, 87.57], [51.43, 88.88], [56.25, 91.26], [58.41, 93.06], [59.11, 93.94], [59.31, 94.62], [59.24, 95.94], [58.85, 96.77], [57.5, 97.86], [54.06, 99.7], [51.35, 100.48], [50.03, 100.57], [47.56, 100.24], [42.66, 98.37], [41.02, 98.3], [39.57, 98.75], [38.25, 99.68], [37.33, 100.71], [37.55, 101.27], [38.55, 102.22], [38.89, 102.94], [38.66, 104.11], [38.19, 104.69], [26.48, 108.75], [25.41, 109.59], [24.9, 110.55], [25.01, 111.6], [25.9, 112.28], [29.36, 111.88], [37.92, 109.67], [42.7, 108.01], [47.72, 105.93], [48.46, 106.54], [48.72, 108.6], [49.23, 109.62], [51.78, 110.83], [54.06, 112.33], [54.58, 113.31], [54.3, 114.27], [53.69, 115.19], [52.59, 116.06], [49.39, 117.46], [42.14, 119.42], [32.6, 121.61]];
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

function inOutline(x, z) {
  // ray casting trong đa giác outline
  let inside = false;
  for (let i = 0, j = OUTLINE.length - 1; i < OUTLINE.length; j = i++) {
    const xi = OUTLINE[i][0], zi = OUTLINE[i][1], xj = OUTLINE[j][0], zj = OUTLINE[j][1];
    if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) inside = !inside;
  }
  return inside;
}

function terrainHeight(x, z) {
  if (!inOutline(x, z)) return SEA - 6;
  const d = Math.hypot(x, z);
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


const KIND_ALIAS = {
  palace: 'temple', gate2: 'gate', banyanVillage: 'banyan', seaside: 'boat', pondBridge: 'falls', bambooCave: 'cave', waterwheel: 'house', valleyGate: 'gate',
  treehouse: 'house', rootCave: 'cave', fallsShrine: 'falls', pondPagoda: 'temple', stiltHamlet: 'house', rockArches: 'cave', towerBridge: 'temple', bambooGarden: 'house',
  chamCliff: 'cham', cliffStream: 'falls', oasis: 'lake', cliffMarket: 'house', beachShips: 'boat', desertRuins: 'house', lighthouse: 'peak', cliffRuins: 'cham',
  stoneGatePond: 'lake', chalets: 'house', roundTemple: 'temple', treeIsland: 'banyan', stoneBridge: 'falls', lightTower: 'peak', rootPond: 'lake', templePond: 'temple',
  iceLake: 'lake', snowPagoda: 'peak', goldPalace: 'sky', peakStele: 'stele',
  volcanoVillage: 'volcano', lavaFalls: 'volcano', craterLake: 'lake', cloudTemple: 'sky', lavaBridge: 'volcano', longBridge: 'falls', floatingRock: 'sky',
  fallsIsland: 'falls', rainbowFalls: 'falls', glowCave: 'cave', cliffPlatforms: 'house', koiPond: 'lake', sandBay: 'boat', cliffPagoda: 'temple', cliffTemple: 'temple',
  skyTemple: 'sky', skyStream: 'sky', blossomIsle: 'sky', skyShip: 'boat', toriiIsle: 'sky', gateIsle: 'sky', archBridge: 'falls', junkShip: 'boat',
};

const FILE_KIND = {
  r01_01:'palace', r01_02:'gate2', r01_03:'banyanVillage', r01_04:'seaside', r01_05:'pondBridge', r01_06:'bambooCave', r01_07:'waterwheel', r01_08:'valleyGate',
  r02_01:'treehouse', r02_02:'rootCave', r02_03:'fallsShrine', r02_04:'pondPagoda', r02_05:'stiltHamlet', r02_06:'rockArches', r02_07:'towerBridge', r02_08:'bambooGarden',
  r03_01:'chamCliff', r03_02:'cliffStream', r03_03:'oasis', r03_04:'cliffMarket', r03_05:'beachShips', r03_06:'desertRuins', r03_07:'lighthouse', r03_08:'cliffRuins',
  r04_01:'stoneGatePond', r04_02:'chalets', r04_03:'roundTemple', r04_04:'treeIsland', r04_05:'stoneBridge', r04_06:'lightTower', r04_07:'rootPond', r04_08:'templePond',
  r05_05:'iceLake', r05_06:'snowPagoda', r05_07:'goldPalace', r05_08:'peakStele',
  r06_01:'volcanoVillage', r06_02:'lavaFalls', r06_03:'craterLake', r06_04:'cloudTemple', r06_05:'lavaBridge', r06_06:'longBridge', r06_07:'floatingRock', r06_08:'volcanoVillage',
  r07_01:'fallsIsland', r07_02:'rainbowFalls', r07_03:'glowCave', r07_04:'cliffPlatforms', r07_05:'koiPond', r07_06:'sandBay', r07_07:'cliffPagoda', r07_08:'cliffTemple',
  r08_01:'skyTemple', r08_02:'skyStream', r08_03:'blossomIsle', r08_04:'skyShip', r08_05:'toriiIsle', r08_06:'gateIsle', r08_07:'archBridge', r08_08:'junkShip',
};

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
  const key = d.region + '_' + String(d.num).padStart(2, '0');
  const kind = KIND_ALIAS[FILE_KIND[key]] || FILE_KIND[key] || kw(d.name);
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
function landmarkAtKind(g, kit, kind, d) { /* fallback re-dispatch */ }
function simpleTileRoof(group, w, d, h) {
  const geo = new THREE.CylinderGeometry(.01, Math.min(w, d) / Math.SQRT2, h, 4, 1);
  const m = new THREE.Mesh(geo, M.tile);
  m.rotation.y = Math.PI / 4; m.scale.set(1, 1, d / w); m.position.y = h / 2;
  m.castShadow = true; group.add(m);
}


function regionTint(group) {
  const zones = [
    [-120, -90, '#4e9440'], [-70, -30, '#a9bb68'], [0, -10, '#8d8775'], [30, 60, '#a4513f'],
    [130, -40, '#eef3f4'], [-50, 95, '#3f7e46'], [-10, 130, '#7a4a30'], [60, 110, '#caa46a'],
  ];
  for (const [x, z, c] of zones) {
    const m = new THREE.Mesh(new THREE.CircleGeometry(26, 24), new THREE.MeshStandardMaterial({ color: c, transparent: true, opacity: .32, roughness: 1 }));
    m.rotation.x = -Math.PI / 2; m.position.set(x, terrainHeight(x, z) + .3, z); group.add(m);
  }
}
function lanterns(group) {
  const kit = new Kit()
    .def('body', new THREE.SphereGeometry(.22, 10, 8), new THREE.MeshStandardMaterial({ color: '#d94f38', emissive: '#ff7a3c', emissiveIntensity: .6 }))
    .def('frame', new THREE.CylinderGeometry(.3, .3, .5, 6), M.wood);
  const r = rng(77);
  for (let i = 0; i < 60; i++) {
    const a = r() * 6.28, d = 20 + r() * 150;
    const x = Math.sin(a) * d, z = Math.cos(a) * d, y = terrainHeight(x, z);
    if (y < SEA + 1) continue;
    kit.add('frame', place(x, y + .5, z)); kit.add('body', place(x, y + .28, z));
  }
  kit.build(group);
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
  regionTint(group);
  lanterns(group);
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
