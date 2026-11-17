// 1단계 과정이 끝난 대나무
'use strict';

// Load bamboo.js first. The mesh uses position (xyz), normal (xyz), color (rgb).
// The finished shaft is 4.8 units long along Y.
function createEndBambooMesh() {
  const mesh = bamboo.createMesh();
  for (let i = 0; i < mesh.length; i += 9) {
    mesh[i] -= bamboo.centerOffset(mesh[i + 1]);
    mesh[i + 1] *= 0.8;
    mesh[i + 4] *= 0.8;
    mesh[i + 6] *= 0.82;
    mesh[i + 7] *= 0.70;
    mesh[i + 8] *= 0.60;
  }
  return mesh;
}

globalThis.endBamboo = Object.freeze({ createMesh: createEndBambooMesh });
