'use strict';

function startStage2() {
  const section = document.getElementById('stage2');
  const canvas = document.getElementById('stage2-canvas');
  const error = document.getElementById('stage2-error');
  try {
    const gl = canvas.getContext('webgl', { antialias: true });
    if (!gl) throw new Error('이 브라우저에서 WebGL을 사용할 수 없습니다.');
    createStage2(gl, canvas, section);
  } catch (cause) {
    console.error(cause);
    error.textContent = `2단계 화면을 시작하지 못했습니다: ${cause.message}`;
    error.hidden = false;
  }
}

function createStage2(gl, canvas, section) {
  const vertexSource = `
    attribute vec3 position;
    attribute vec3 normal;
    attribute vec3 color;
    uniform vec3 offset;
    uniform float yaw;
    uniform float pitch;
    uniform float halfHeight;
    uniform float aspect;
    varying vec3 vNormal;
    varying vec3 vColor;
    vec3 rotateCamera(vec3 v) {
      float cy = cos(yaw), sy = sin(yaw);
      float cp = cos(pitch), sp = sin(pitch);
      v = vec3(cy*v.x + sy*v.z, v.y, -sy*v.x + cy*v.z);
      return vec3(v.x, cp*v.y - sp*v.z, sp*v.y + cp*v.z);
    }
    void main() {
      vec3 p = rotateCamera(position + offset);
      gl_Position = vec4(p.x / (halfHeight * aspect), p.y / halfHeight, -p.z * 0.1, 1.0);
      vNormal = rotateCamera(normal);
      vColor = color;
    }
  `;
  const fragmentSource = `
    precision mediump float;
    varying vec3 vNormal;
    varying vec3 vColor;
    void main() {
      float light = max(dot(normalize(vNormal), normalize(vec3(-0.4, 0.7, 1.0))), 0.0);
      gl_FragColor = vec4(vColor * (0.58 + 0.65 * light), 1.0);
    }
  `;

  function shader(type, source) {
    const result = gl.createShader(type);
    gl.shaderSource(result, source);
    gl.compileShader(result);
    if (!gl.getShaderParameter(result, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(result));
    return result;
  }
  const program = gl.createProgram();
  gl.attachShader(program, shader(gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(program, shader(gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(program));
  gl.useProgram(program);
  const uniforms = {
    offset: gl.getUniformLocation(program, 'offset'),
    yaw: gl.getUniformLocation(program, 'yaw'),
    pitch: gl.getUniformLocation(program, 'pitch'),
    halfHeight: gl.getUniformLocation(program, 'halfHeight'),
    aspect: gl.getUniformLocation(program, 'aspect')
  };

  function rotateMesh(mesh) {
    for (let i = 0; i < mesh.length; i += 9) {
      const x = mesh[i], y = mesh[i + 1], nx = mesh[i + 3], ny = mesh[i + 4];
      mesh[i] = y;
      mesh[i + 1] = -x;
      mesh[i + 3] = ny;
      mesh[i + 4] = -nx;
    }
    return mesh;
  }

  function makeBuffer(mesh) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.STATIC_DRAW);
    return { buffer, count: mesh.length / 9 };
  }

  function makeStain(x, angle) {
    const vertices = [];
    const segments = 24;
    const color = [0.25, 0.15, 0.07];
    function point(dx, dAngle) {
      const localX = x + dx;
      const t = (localX / 0.8 / 6) + 0.5;
      const nodes = [0.19, 0.42, 0.65, 0.86];
      const nodeDistance = Math.min(...nodes.map(node => Math.abs(t - node)));
      const ridge = Math.exp(-Math.pow(nodeDistance / 0.004, 2));
      const radius = (0.047 - t * 0.005) * (1 + ridge * 0.12) + 0.0015;
      const a = angle + dAngle;
      return [localX, Math.cos(a) * radius, Math.sin(a) * radius,
        0, Math.cos(a), Math.sin(a), ...color];
    }
    const center = point(0, 0);
    for (let i = 0; i < segments; i++) {
      const a = i * 2 * Math.PI / segments;
      const b = (i + 1) * 2 * Math.PI / segments;
      vertices.push(...center, ...point(0.06 * Math.cos(a), 0.32 * Math.sin(a)),
        ...point(0.06 * Math.cos(b), 0.32 * Math.sin(b)));
    }
    return new Float32Array(vertices);
  }

  const bambooMesh = makeBuffer(rotateMesh(endBamboo.createMesh()));
  const paperFlat = makeBuffer(rotateMesh(sapo.createMesh(0.22)));
  const paperWrapped = makeBuffer(rotateMesh(sapo.createMesh(0)));
  const stainPositions = [
    { x: -2.05, angle: 0.8 }, { x: -1.42, angle: 2.4 },
    { x: -0.75, angle: 1.3 }, { x: -0.15, angle: 0.4 },
    { x: 0.55, angle: 2.0 }, { x: 1.22, angle: 0.6 }, { x: 1.95, angle: 1.7 }
  ];
  const stains = stainPositions.flatMap(stain => [stain, { x: stain.x, angle: stain.angle + Math.PI }])
    .map(stain => ({ ...stain, mesh: makeBuffer(makeStain(stain.x, stain.angle)), removed: false }));
  const pointers = new Map();
  let mode = null;
  let paperX = 0;
  let draggingPaper = false;
  let yaw = 0;
  let pitch = 0.18;
  let zoom = 1;
  let aspect = 1;
  let halfHeight = 3;
  let pinchDistance = 0;
  let clear = false;
  let previousPointer = null;

  function draw(mesh, offset = [0, 0, 0]) {
    gl.bindBuffer(gl.ARRAY_BUFFER, mesh.buffer);
    for (const [name, offsetBytes] of [['position', 0], ['normal', 12], ['color', 24]]) {
      const location = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 36, offsetBytes);
    }
    gl.uniform3fv(uniforms.offset, offset);
    gl.drawArrays(gl.TRIANGLES, 0, mesh.count);
  }

  function render() {
    if (section.hidden) return;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    aspect = width / height;
    halfHeight = Math.max(1.7, 3.2 / aspect) / zoom;
    gl.viewport(0, 0, width, height);
    gl.clearColor(0.32, 0.33, 0.32, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.uniform1f(uniforms.yaw, yaw);
    gl.uniform1f(uniforms.pitch, pitch);
    gl.uniform1f(uniforms.halfHeight, halfHeight);
    gl.uniform1f(uniforms.aspect, aspect);
    draw(bambooMesh);
    for (const stain of stains) {
      if (!stain.removed) draw(stain.mesh);
    }
    draw(draggingPaper ? paperWrapped : paperFlat, [paperX, 0, 0]);
  }

  function project(x, y, z) {
    const cy = Math.cos(yaw), sy = Math.sin(yaw);
    const cp = Math.cos(pitch), sp = Math.sin(pitch);
    const rx = cy * x + sy * z;
    const rz = -sy * x + cy * z;
    const ry = cp * y - sp * rz;
    const rect = canvas.getBoundingClientRect();
    return { x: rect.left + rect.width * (0.5 + rx / (2 * halfHeight * aspect)),
      y: rect.top + rect.height * (0.5 - ry / (2 * halfHeight)) };
  }

  function onPaper(event) {
    const center = project(paperX, 0, 0.278);
    const scale = canvas.clientHeight / (2 * halfHeight);
    return Math.hypot(event.clientX - center.x, event.clientY - center.y) <= Math.max(28, scale * 0.48);
  }

  function dragPaper(dx, dy) {
    const start = project(0, 0, 0);
    const end = project(1, 0, 0);
    const axisX = end.x - start.x, axisY = end.y - start.y;
    const axisLength = axisX * axisX + axisY * axisY;
    if (axisLength < 16) return;
    const previous = paperX;
    paperX = Math.max(-2.4, Math.min(2.4, paperX + (dx * axisX + dy * axisY) / axisLength));
    if (Math.abs(paperX - previous) < 0.0001) return;
    const left = Math.min(previous, paperX) - 0.3;
    const right = Math.max(previous, paperX) + 0.3;
    for (const stain of stains) {
      if (stain.x >= left && stain.x <= right) stain.removed = true;
    }
    if (stains.every(stain => stain.removed)) {
      clear = true;
      draggingPaper = false;
      mode = null;
      document.getElementById('stage2-instruction').hidden = true;
      document.getElementById('stage2-hint').hidden = true;
      document.getElementById('stage2-clear').hidden = false;
    }
  }

  function touchDistance() {
    const [a, b] = Array.from(pointers.values());
    return Math.hypot(a.x - b.x, a.y - b.y);
  }

  canvas.addEventListener('pointerdown', event => {
    if (clear) return;
    event.preventDefault();
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    canvas.setPointerCapture(event.pointerId);
    if (pointers.size === 1) {
      mode = onPaper(event) ? 'paper' : 'orbit';
      draggingPaper = mode === 'paper';
      previousPointer = { x: event.clientX, y: event.clientY };
    } else if (pointers.size === 2) {
      mode = 'pinch';
      draggingPaper = false;
      pinchDistance = touchDistance();
    }
    render();
  });
  canvas.addEventListener('pointermove', event => {
    if (!pointers.has(event.pointerId) || clear) return;
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (mode === 'pinch' && pointers.size === 2) {
      const distance = touchDistance();
      if (pinchDistance > 0) zoom = Math.max(0.7, Math.min(5, zoom * distance / pinchDistance));
      pinchDistance = distance;
    } else if (previousPointer && pointers.size === 1) {
      const dx = event.clientX - previousPointer.x;
      const dy = event.clientY - previousPointer.y;
      if (mode === 'paper') dragPaper(dx, dy);
      if (mode === 'orbit') {
        yaw += dx * 0.008;
        pitch = Math.max(-1.35, Math.min(1.35, pitch + dy * 0.008));
      }
      previousPointer = { x: event.clientX, y: event.clientY };
    }
    render();
  });
  function endPointer(event) {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    draggingPaper = false;
    mode = null;
    previousPointer = null;
    render();
  }
  canvas.addEventListener('pointerup', endPointer);
  canvas.addEventListener('pointercancel', endPointer);
  canvas.addEventListener('lostpointercapture', endPointer);
  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    zoom = Math.max(0.7, Math.min(5, zoom * Math.exp(-event.deltaY * 0.002)));
    render();
  }, { passive: false });
  document.getElementById('stage2-restart').addEventListener('click', () => {
    for (const pointerId of pointers.keys()) {
      if (canvas.hasPointerCapture(pointerId)) canvas.releasePointerCapture(pointerId);
    }
    pointers.clear();
    for (const stain of stains) stain.removed = false;
    mode = null;
    paperX = 0;
    draggingPaper = false;
    yaw = 0;
    pitch = 0.18;
    zoom = 1;
    pinchDistance = 0;
    clear = false;
    previousPointer = null;
    document.getElementById('stage2-instruction').hidden = false;
    document.getElementById('stage2-hint').hidden = false;
    document.getElementById('stage2-clear').hidden = true;
    render();
  });
  document.getElementById('stage2-next-button').addEventListener('click', () => {
    section.hidden = true;
    document.getElementById('next-screen').hidden = false;
  });
  window.addEventListener('resize', render);
  render();
}
