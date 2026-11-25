/* Tầng vật lý người chơi và collider; không phụ thuộc render/camera/quest. */
window.__createPlayerPhysics = function (context) {
  var garden = context.garden, landmarks = context.landmarks || {};
  var physWorld = null, playerBody = null, staticBodies = [];

  function init() {
    if (typeof CANNON === 'undefined' || physWorld) return;
    /* Cao độ/jump do controller giữ; cannon-es xử lý contact ngang thật. */
    physWorld = new CANNON.World({ gravity: new CANNON.Vec3(0, 0, 0) });
    physWorld.solver.iterations = 8;
    playerBody = new CANNON.Body({
      mass: 1,
      type: CANNON.Body.DYNAMIC,
      shape: new CANNON.Sphere(0.42),
      fixedRotation: true,
      allowSleep: false,
      linearDamping: 0
    });
    playerBody.updateMassProperties();
    physWorld.addBody(playerBody);

    if (landmarks.tomb) addStatic(landmarks.tomb.x, landmarks.tomb.z, 1.2, 2.6);
    if (landmarks.bigTree) addStatic(landmarks.bigTree.x, landmarks.bigTree.z, 0.55, 5);
    if (landmarks.well) addStatic(landmarks.well.x, landmarks.well.z, 0.75, 1.5);
    if (landmarks.cabin) addStatic(landmarks.cabin.x, landmarks.cabin.z, 1.9, 3.4);
    window.__physics = { world: physWorld, player: playerBody, statics: staticBodies, steps: 0 };
  }

  function addStatic(x, z, radius, height) {
    if (!physWorld) return null;
    var body = new CANNON.Body({ mass: 0, type: CANNON.Body.STATIC });
    body.addShape(new CANNON.Cylinder(radius, radius, height || 3, 12));
    var worldPos = garden.localToWorld(new THREE.Vector3(x, 0, z));
    body.position.set(worldPos.x, (height || 3) / 2, worldPos.z);
    physWorld.addBody(body); staticBodies.push(body);
    return body;
  }

  function removeStatic(body) {
    if (!body || !physWorld) return;
    physWorld.removeBody(body);
    var index = staticBodies.indexOf(body);
    if (index >= 0) staticBodies.splice(index, 1);
  }

  function resolve(pos, dt, vx, vz, enabled) {
    if (!physWorld || !playerBody) return;
    if (enabled === false) { pos.x += (vx || 0) * dt; pos.z += (vz || 0) * dt; return; }
    playerBody.position.set(pos.x, 0.42, pos.z);
    playerBody.velocity.set(vx || 0, 0, vz || 0);
    physWorld.step(1 / 60, Math.max(1 / 240, Math.min(dt || 1 / 60, 0.05)), 3);
    pos.x = playerBody.position.x;
    pos.z = playerBody.position.z;
    window.__physics.steps++;
    window.__physics.contacts = physWorld.contacts.length;
  }

  init();
  window.__physicsAddStatic = addStatic;
  window.__physicsRemoveStatic = removeStatic;
  return { resolve: resolve, addStatic: addStatic, removeStatic: removeStatic };
};
