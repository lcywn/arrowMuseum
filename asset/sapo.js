'use strict';

// sapo.createMesh(gap) returns triangles as interleaved Float32Array vertices:
// position (xyz), normal (xyz), color (rgb). The reference bamboo axis is Y.
// gap is the non-negative distance from the paper to the reference bamboo.
function createSapoMesh(gap) {
  if (!Number.isFinite(gap) || gap < 0) {
    throw new RangeError('sapo.createMesh requires a non-negative finite gap.');
  }
  const vertices = [];
  const width = 0.6;
  const height = 0.6;
  const bendStart = 0.18;
  const progress = Math.max(0, Math.min(1, 1 - gap / bendStart));
  const bend = progress * progress * (3 - 2 * progress);
  const wrapRadius = 0.058;
  const xDivisions = 60;
  const yDivisions = 60;
  const backing = [0.70, 0.56, 0.38];
  const abrasive = [0.25, 0.26, 0.25];

  function point(x, y, depth = 0) {
    const theta = x * bend / wrapRadius;
    const layerOffset = 0.006 * (theta + width * bend / (2 * wrapRadius)) / (Math.PI * 2);
    const curvedX = bend > 0.00001 ? (wrapRadius / bend + layerOffset) * Math.sin(theta) : x;
    const curvedZ = bend > 0.00001 ? (wrapRadius / bend + layerOffset) * Math.cos(theta) - wrapRadius / bend : 0;
    const normal = [Math.sin(theta), 0, Math.cos(theta)];
    return {
      position: [curvedX + normal[0] * depth, y, wrapRadius + gap + curvedZ + normal[2] * depth],
      normal
    };
  }

  function vertex(p, normal, color) {
    vertices.push(...p, ...normal, ...color);
  }

  function face(a, b, c, normalSign, color) {
    for (const p of [a, b, c]) {
      vertex(p.position, p.normal.map(value => value * normalSign), color);
    }
  }

  function grainFace(a, b, c, color) {
    const u = a.position.map((value, i) => b.position[i] - value);
    const v = a.position.map((value, i) => c.position[i] - value);
    const normal = [
      u[1] * v[2] - u[2] * v[1],
      u[2] * v[0] - u[0] * v[2],
      u[0] * v[1] - u[1] * v[0]
    ];
    const magnitude = Math.hypot(...normal);
    for (const p of [a, b, c]) vertex(p.position, normal.map(value => value / magnitude), color);
  }

  for (let x = 0; x < xDivisions; x++) {
    for (let y = 0; y < yDivisions; y++) {
      const x0 = (x / xDivisions - 0.5) * width;
      const x1 = ((x + 1) / xDivisions - 0.5) * width;
      const y0 = (y / yDivisions - 0.5) * height;
      const y1 = ((y + 1) / yDivisions - 0.5) * height;
      const a = point(x0, y0);
      const b = point(x1, y0);
      const c = point(x1, y1);
      const d = point(x0, y1);
      face(a, b, c, 1, backing);
      face(a, c, d, 1, backing);
      const ia = point(x0, y0, -0.0015);
      const ib = point(x1, y0, -0.0015);
      const ic = point(x1, y1, -0.0015);
      const id = point(x0, y1, -0.0015);
      face(ia, ic, ib, -1, abrasive);
      face(ia, id, ic, -1, abrasive);
    }
  }

  // Small geometric grains protrude toward the bamboo on the abrasive face.
  const grainColumns = 40;
  const grainRows = 40;
  const spacing = width / grainColumns;
  for (let x = 0; x < grainColumns; x++) {
    for (let y = 0; y < grainRows; y++) {
      const cx = (x + 0.5) * spacing - width / 2;
      const cy = (y + 0.5) * spacing - height / 2;
      const r = spacing * 0.28;
      const a = point(cx - r, cy - r, -0.0015);
      const b = point(cx + r, cy - r, -0.0015);
      const c = point(cx + r, cy + r, -0.0015);
      const d = point(cx - r, cy + r, -0.0015);
      const peak = point(cx, cy, -0.0035 - ((x * 7 + y * 11) % 4) * 0.0003);
      const shade = 0.9 + ((x * 13 + y * 7) % 5) * 0.05;
      const color = abrasive.map(value => value * shade);
      grainFace(a, peak, b, color);
      grainFace(b, peak, c, color);
      grainFace(c, peak, d, color);
      grainFace(d, peak, a, color);
    }
  }
  return new Float32Array(vertices);
}

globalThis.sapo = Object.freeze({ createMesh: createSapoMesh });
