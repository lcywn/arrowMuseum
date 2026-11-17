'use strict';

// hearth.createMesh() returns triangle vertices as interleaved Float32Array data:
// position (xyz), normal (xyz), color (rgb). The tunnel runs along Z.

function createHearthMesh() {
  const vertices = [];
  const frontZ = 0.62;
  const backZ = -0.62;
  const holeY = -0.22;
  const radius = 0.25;
  const sides = 64;

  function vertex(position, normal, color) {
    return [...position, ...normal, ...color];
  }

  function quad(a, b, c, d, normal, color) {
    for (const point of [a, b, c, a, c, d]) {
      vertices.push(...vertex(point, normal, color));
    }
  }

  const body = [0.48, 0.42, 0.37];
  const top = [0.24, 0.24, 0.25];
  const topEdge = [0.41, 0.36, 0.32];
  const recessWall = [0.28, 0.25, 0.23];
  const inner = [0.17, 0.12, 0.10];
  const rim = [0.36, 0.30, 0.26];

  quad([-1, -1.1, backZ], [-1, -1.1, frontZ], [-1, 1.1, frontZ], [-1, 1.1, backZ], [-1, 0, 0], body);
  quad([1, -1.1, frontZ], [1, -1.1, backZ], [1, 1.1, backZ], [1, 1.1, frontZ], [1, 0, 0], body);
  const insetX = 0.88;
  const insetZ = 0.49;
  const topY = 1.1;
  const plateY = 0.98;
  quad([-1, topY, frontZ], [1, topY, frontZ], [1, topY, insetZ], [-1, topY, insetZ], [0, 1, 0], topEdge);
  quad([-1, topY, -insetZ], [1, topY, -insetZ], [1, topY, backZ], [-1, topY, backZ], [0, 1, 0], topEdge);
  quad([-1, topY, insetZ], [-insetX, topY, insetZ], [-insetX, topY, -insetZ], [-1, topY, -insetZ], [0, 1, 0], topEdge);
  quad([insetX, topY, insetZ], [1, topY, insetZ], [1, topY, -insetZ], [insetX, topY, -insetZ], [0, 1, 0], topEdge);
  quad([-insetX, topY, insetZ], [insetX, topY, insetZ], [insetX, plateY, insetZ], [-insetX, plateY, insetZ], [0, 0, -1], recessWall);
  quad([insetX, topY, -insetZ], [-insetX, topY, -insetZ], [-insetX, plateY, -insetZ], [insetX, plateY, -insetZ], [0, 0, 1], recessWall);
  quad([-insetX, topY, -insetZ], [-insetX, topY, insetZ], [-insetX, plateY, insetZ], [-insetX, plateY, -insetZ], [1, 0, 0], recessWall);
  quad([insetX, topY, insetZ], [insetX, topY, -insetZ], [insetX, plateY, -insetZ], [insetX, plateY, insetZ], [-1, 0, 0], recessWall);
  quad([-insetX, plateY, insetZ], [insetX, plateY, insetZ], [insetX, plateY, -insetZ], [-insetX, plateY, -insetZ], [0, 1, 0], top);
  const metal = [0.27, 0.28, 0.29];
  const metalEdge = [0.20, 0.21, 0.22];
  const metalX = 0.94;
  const metalZ = 0.55;
  const metalY = 1.135;
  quad([-metalX, metalY, metalZ], [metalX, metalY, metalZ], [metalX, metalY, -metalZ], [-metalX, metalY, -metalZ], [0, 1, 0], metal);
  quad([-metalX, topY, metalZ], [metalX, topY, metalZ], [metalX, metalY, metalZ], [-metalX, metalY, metalZ], [0, 0, 1], metalEdge);
  quad([metalX, topY, -metalZ], [-metalX, topY, -metalZ], [-metalX, metalY, -metalZ], [metalX, metalY, -metalZ], [0, 0, -1], metalEdge);
  quad([-metalX, topY, -metalZ], [-metalX, topY, metalZ], [-metalX, metalY, metalZ], [-metalX, metalY, -metalZ], [-1, 0, 0], metalEdge);
  quad([metalX, topY, metalZ], [metalX, topY, -metalZ], [metalX, metalY, -metalZ], [metalX, metalY, metalZ], [1, 0, 0], metalEdge);
  quad([-1, -1.1, backZ], [1, -1.1, backZ], [1, -1.1, frontZ], [-1, -1.1, frontZ], [0, -1, 0], body);

  // Include corner angles so both radial face meshes follow the rectangular outline.
  const angles = [];
  for (let i = 0; i < sides; i++) angles.push(i * Math.PI * 2 / sides);
  for (const x of [-1, 1]) {
    for (const y of [-1.1, 1.1]) {
      angles.push((Math.atan2(y - holeY, x) + Math.PI * 2) % (Math.PI * 2));
    }
  }
  angles.sort((a, b) => a - b);

  function circle(angle, r, z) {
    return [Math.cos(angle) * r, holeY + Math.sin(angle) * r, z];
  }

  function boundary(angle, z) {
    const x = Math.cos(angle);
    const y = Math.sin(angle);
    const tx = Math.abs(x) < 1e-10 ? Infinity : 1 / Math.abs(x);
    const ty = Math.abs(y) < 1e-10 ? Infinity : (y > 0 ? 1.1 - holeY : -1.1 - holeY) / y;
    const t = Math.min(tx, ty);
    return [x * t, holeY + y * t, z];
  }

  for (let i = 0; i < angles.length; i++) {
    const a = angles[i];
    const b = angles[(i + 1) % angles.length];
    for (const [z, direction] of [[frontZ, 1], [backZ, -1]]) {
      const outerA = circle(a, radius * 1.18, z);
      const outerB = circle(b, radius * 1.18, z);
      const openingA = circle(a, radius, z + direction * 0.015);
      const openingB = circle(b, radius, z + direction * 0.015);
      const normal = [0, 0, direction];
      if (direction === 1) {
        quad(boundary(a, z), boundary(b, z), outerB, outerA, normal, body);
        quad(outerA, outerB, openingB, openingA, normal, rim);
      } else {
        quad(boundary(b, z), boundary(a, z), outerA, outerB, normal, body);
        quad(outerB, outerA, openingA, openingB, normal, rim);
      }
    }
    const mid = (a + (b < a ? b + Math.PI * 2 : b)) / 2;
    quad(circle(a, radius, frontZ + 0.015), circle(b, radius, frontZ + 0.015),
      circle(b, radius, backZ - 0.015), circle(a, radius, backZ - 0.015),
      [-Math.cos(mid), -Math.sin(mid), 0], inner);
  }
  for (const y of [0.30, -0.80]) {
    quad([-1, y, frontZ + 0.001], [1, y, frontZ + 0.001],
      [1, y + 0.012, frontZ + 0.001], [-1, y + 0.012, frontZ + 0.001], [0, 0, 1], rim);
    quad([1, y, backZ - 0.001], [-1, y, backZ - 0.001],
      [-1, y + 0.012, backZ - 0.001], [1, y + 0.012, backZ - 0.001], [0, 0, -1], rim);
    quad([-1.001, y, backZ], [-1.001, y, frontZ],
      [-1.001, y + 0.012, frontZ], [-1.001, y + 0.012, backZ], [-1, 0, 0], rim);
    quad([1.001, y, frontZ], [1.001, y, backZ],
      [1.001, y + 0.012, backZ], [1.001, y + 0.012, frontZ], [1, 0, 0], rim);
  }
  return new Float32Array(vertices);
}


globalThis.hearth = Object.freeze({ createMesh: createHearthMesh });
