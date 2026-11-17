'use strict';

// bamboo.createMesh() returns triangles as interleaved Float32Array vertices:
// position (xyz), normal (xyz), color (rgb). The shaft is 6 units long along Y.
function bambooCenterOffset(y) {
  return 0.016 * Math.sin((y / 6 + 0.5) * Math.PI * 1.5);
}

function createBambooMesh() {
  const length = 6;
  const segments = 240;
  const sides = 24;
  const nodes = [0.19, 0.42, 0.65, 0.86];
  const vertices = [];

  function point(row, side, inner = false) {
    const t = row / segments;
    const angle = side / sides * Math.PI * 2;
    const nodeDistance = Math.min(...nodes.map(node => Math.abs(t - node)));
    const ridge = Math.exp(-Math.pow(nodeDistance / 0.004, 2));
    const radius = (0.047 - t * 0.005) * (1 + ridge * 0.12) * (inner ? 0.65 : 1);
    const centerX = bambooCenterOffset((t - 0.5) * length);
    const grain = 0.96 + 0.04 * Math.sin(angle * 5 + t * 8);
    const nodeShade = 1 - ridge * 0.15;

    const direction = inner ? -1 : 1;
    const shade = inner ? 0.7 : 1;
    return [
      centerX + Math.cos(angle) * radius, (t - 0.5) * length, Math.sin(angle) * radius,
      direction * Math.cos(angle), 0, direction * Math.sin(angle),
      0.78 * grain * nodeShade * shade, 0.65 * grain * nodeShade * shade, 0.36 * grain * nodeShade * shade
    ];
  }

  for (let row = 0; row < segments; row++) {
    for (let side = 0; side < sides; side++) {
      const a = point(row, side);
      const b = point(row + 1, side);
      const c = point(row, side + 1);
      const d = point(row + 1, side + 1);
      vertices.push(...a, ...b, ...c, ...c, ...b, ...d);
      const innerA = point(row, side, true);
      const innerB = point(row + 1, side, true);
      const innerC = point(row, side + 1, true);
      const innerD = point(row + 1, side + 1, true);
      vertices.push(...innerA, ...innerC, ...innerB, ...innerC, ...innerD, ...innerB);
    }
  }

  for (const [row, normal] of [[0, -1], [segments, 1]]) {
    for (let side = 0; side < sides; side++) {
      const a = point(row, side);
      const b = point(row, side + 1);
      const c = point(row, side, true);
      const d = point(row, side + 1, true);
      for (const vertex of [a, b, c, d]) {
        vertex.splice(3, 6, 0, normal, 0, 0.63, 0.51, 0.28);
      }
      if (normal === 1) {
        vertices.push(...a, ...c, ...b, ...b, ...c, ...d);
      } else {
        vertices.push(...a, ...b, ...c, ...b, ...d, ...c);
      }
    }
  }

  return new Float32Array(vertices);
}

globalThis.bamboo = Object.freeze({ createMesh: createBambooMesh, centerOffset: bambooCenterOffset });
