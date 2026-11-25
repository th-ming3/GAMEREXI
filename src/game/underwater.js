/* Tầng khám phá dưới nước: tàn tích, thảm thực vật, tinh thể và chuyển động. */
window.__createUnderwaterWorld = function (context) {
  var gardenRoot = context.gardenRoot, LAKE = context.LAKE, LAKE_DEPTH = context.LAKE_DEPTH;
  var hillY = context.hillY, LOW = context.LOW, lakeBaseY = context.lakeBaseY;
  var underwaterRoot = new THREE.Group();
  var underwaterCrystals = [], underwaterPlants = [];
  window.__underwaterRoot = underwaterRoot;
  window.__underwaterCrystals = underwaterCrystals;
  gardenRoot.add(underwaterRoot);

  var weedMat = new THREE.MeshStandardMaterial({ color: 0x2e8b68, roughness: 0.72, side: THREE.DoubleSide });
  var crystalMat = new THREE.MeshStandardMaterial({ color: 0x9af5e6, emissive: 0x35d9c8, emissiveIntensity: 1.35, roughness: 0.18, metalness: 0.08 });
  var floorY = hillY(LAKE.x, LAKE.z);
  if (window.__REAL_ASSETS) {
    var ruinModel = window.__REAL_ASSETS.makeModel('ruins', { x: 7.2, y: 4, z: 4.9 });
    ruinModel.position.set(LAKE.x, floorY, LAKE.z);
    underwaterRoot.add(ruinModel);
  }

  var crystalSpots = [[-1.25, -0.4], [1.35, 0.65], [-0.2, 1.45], [2.35, -1.35], [-2.45, 1.15]];
  crystalSpots.forEach(function (spot, index) {
    var cx = LAKE.x + spot[0], cz = LAKE.z + spot[1], cy = hillY(cx, cz);
    var crystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.24, 0), crystalMat.clone());
    crystal.scale.set(0.72, 1.65, 0.72);
    crystal.position.set(cx, cy + 0.48, cz);
    crystal.userData = { underwaterCrystal: true, id: index, baseY: cy + 0.48, phase: index * 1.3 };
    underwaterRoot.add(crystal); underwaterCrystals.push(crystal);
    var glow = new THREE.PointLight(0x52e4d2, LOW ? 0.35 : 0.65, 4.5, 2);
    glow.position.set(cx, cy + 0.75, cz); underwaterRoot.add(glow);
  });
  for (var wi = 0; wi < 20; wi++) {
    var wa = wi * 2.39996, wr = 2.6 + (wi % 4) * 0.65;
    var wx = LAKE.x + Math.cos(wa) * wr, wz = LAKE.z + Math.sin(wa) * wr * 0.78;
    var plant = new THREE.Group();
    for (var li = 0; li < 3; li++) {
      var leaf = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.65 + li * 0.18, 5), weedMat);
      leaf.position.set((li - 1) * 0.09, 0.35 + li * 0.08, 0);
      leaf.rotation.z = (li - 1) * 0.25; plant.add(leaf);
    }
    plant.position.set(wx, hillY(wx, wz), wz);
    plant.userData.phase = wi * 0.7;
    underwaterRoot.add(plant); underwaterPlants.push(plant);
  }
  for (var si = 0; si < 5; si++) {
    var lightShaft = new THREE.Mesh(new THREE.PlaneGeometry(0.65, LAKE_DEPTH + 1.2), new THREE.MeshBasicMaterial({ color: 0x8be6d8, transparent: true, opacity: 0.055, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
    lightShaft.position.set(LAKE.x - 3 + si * 1.5, lakeBaseY - LAKE_DEPTH * 0.45, LAKE.z - 1.5 + (si % 2) * 2.4);
    lightShaft.rotation.z = -0.16; lightShaft.rotation.y = 0.35;
    underwaterRoot.add(lightShaft);
  }

  return function updateUnderwater(dt, elapsed) {
    for (var i = 0; i < underwaterCrystals.length; i++) {
      var crystal = underwaterCrystals[i];
      if (!crystal.visible) continue;
      crystal.rotation.y += dt * 0.85;
      crystal.position.y = crystal.userData.baseY + Math.sin(elapsed * 1.4 + crystal.userData.phase) * 0.08;
    }
    for (var j = 0; j < underwaterPlants.length; j++) {
      var plant = underwaterPlants[j];
      plant.rotation.z = Math.sin(elapsed * 0.8 + plant.userData.phase) * 0.10;
    }
  };
};
