'use strict';

const startScreen = document.getElementById('start-screen');
const gameScreen = document.getElementById('game');
const canvas = document.getElementById('game-canvas');
const errorMessage = document.getElementById('error');

document.getElementById('next-button').addEventListener('click', () => {
  gameScreen.hidden = true;
  document.getElementById('stage2').hidden = false;
  startStage2();
});

document.getElementById('start-button').addEventListener('click', () => {
  startScreen.hidden = true;
  gameScreen.hidden = false;
  try {
    const gl = canvas.getContext('webgl', { antialias: true });
    if (!gl) throw new Error('이 브라우저에서 WebGL을 사용할 수 없습니다.');
    startGame(gl);
  } catch (error) {
    console.error(error);
    errorMessage.textContent = `게임 화면을 시작하지 못했습니다: ${error.message}`;
    errorMessage.hidden = false;
  }
}, { once: true });

function startGame(gl) {
  const vertexSource = `
    attribute vec3 position;
    attribute vec3 normal;
    attribute vec3 color;
    attribute float curveOffset;
    uniform mat4 model;
    uniform float aspect;
    uniform float halfHeight;
    uniform float browning;
    varying vec3 vNormal;
    varying vec3 vColor;
    void main() {
      vec3 straightenedPosition = position - vec3(curveOffset * browning, 0.0, 0.0);
      vec3 world = (model * vec4(straightenedPosition, 1.0)).xyz;
      vec3 relative = world - vec3(0.0, -0.3, 0.9);
      float viewY = relative.y * 0.8253356 - relative.z * 0.5646425;
      float depth = relative.y * 0.5646425 + relative.z * 0.8253356;
      gl_Position = vec4(relative.x / (halfHeight * aspect), viewY / halfHeight, -depth * 0.05, 1.0);
      vNormal = mat3(model) * normal;
      vColor = color * mix(vec3(1.0), vec3(0.82, 0.70, 0.60), browning);
    }
  `;
  const fragmentSource = `
    precision mediump float;
    varying vec3 vNormal;
    varying vec3 vColor;
    void main() {
      float diffuse = max(dot(normalize(vNormal), normalize(vec3(-0.5, 0.8, 1.0))), 0.0);
      gl_FragColor = vec4(vColor * (0.55 + 0.65 * diffuse), 1.0);
    }
  `;

  function compileShader(type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader));
    }
    return shader;
  }

  const program = gl.createProgram();
  gl.attachShader(program, compileShader(gl.VERTEX_SHADER, vertexSource));
  gl.attachShader(program, compileShader(gl.FRAGMENT_SHADER, fragmentSource));
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    throw new Error(gl.getProgramInfoLog(program));
  }
  gl.useProgram(program);
  const uniforms = {
    model: gl.getUniformLocation(program, 'model'),
    aspect: gl.getUniformLocation(program, 'aspect'),
    halfHeight: gl.getUniformLocation(program, 'halfHeight'),
    browning: gl.getUniformLocation(program, 'browning')
  };

  function createBuffer(mesh) {
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.STATIC_DRAW);
    return { buffer, count: mesh.length / 9 };
  }

  const floorColor = [0.42, 0.43, 0.42];
  const floorPoints = [[-20, -1.1, -20], [20, -1.1, -20], [20, -1.1, 20],
    [-20, -1.1, -20], [20, -1.1, 20], [-20, -1.1, 20]];
  const floorMesh = new Float32Array(floorPoints.flatMap(point => [...point, 0, 1, 0, ...floorColor]));
  const floor = createBuffer(floorMesh);
  const hearthMesh = createBuffer(hearth.createMesh());
  const bambooVertices = bamboo.createMesh();
  const bambooMesh = createBuffer(bambooVertices);
  const curveOffsets = new Float32Array(bambooVertices.length / 9);
  for (let i = 0; i < curveOffsets.length; i++) {
    curveOffsets[i] = bamboo.centerOffset(bambooVertices[i * 9 + 1]);
  }
  const curveBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, curveBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, curveOffsets, gl.STATIC_DRAW);
  const curveLocation = gl.getAttribLocation(program, 'curveOffset');
  const identity = new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
  const rodScale = 0.8;
  const rodHalfLength = 3 * rodScale;
  const hearthHalfDepth = 0.635;
  const hearthHalfWidth = 1.07;
  const tunnelClearance = 0.17;
  const timerDuration = 3000;
  const movementWindow = 250;
  const minimumMovement = 10;
  const clock = document.getElementById('clock');
  const timer = document.getElementById('timer');
  const timerMessage = document.getElementById('timer-message');
  const clearMessage = document.getElementById('clear');
  const instruction = document.getElementById('instruction');
  const rod = { x: 0, y: -1.04, z: 2.5, active: false };
  const sinAngle = Math.sin(0.6);
  const cosAngle = Math.cos(0.6);
  let aspect = 1;
  let halfHeight = 4;
  let dragging = false;
  let pointerId = null;
  let lastPointer = null;
  let movements = [];
  let elapsed = 0;
  let lastFrame = 0;
  let cleared = false;

  function modelForRod() {
    if (cleared) {
      const angle = Math.PI / 6;
      const c = Math.cos(angle);
      const s = Math.sin(angle);
      const centerZ = 4;
      const centerY = -0.3 + (centerZ - 0.9) * Math.tan(0.6);
      return new Float32Array([
        s, -c * sinAngle, -c * cosAngle, 0,
        rodScale * c, rodScale * s * cosAngle, -rodScale * s * sinAngle, 0,
        0, sinAngle, cosAngle, 0,
        0, centerY, centerZ, 1
      ]);
    }
    
    const rotation = rod.active
      ? [1, 0, 0, 0, 0, 0, rodScale, 0, 0, -1, 0, 0]
      : [0, -1, 0, 0, rodScale, 0, 0, 0, 0, 0, 1, 0];
    return new Float32Array([...rotation, rod.x, rod.y, rod.z, 1]);
  }

  function draw(object, model, browning = 0) {
    gl.bindBuffer(gl.ARRAY_BUFFER, object.buffer);
    for (const [name, offset] of [['position', 0], ['normal', 12], ['color', 24]]) {
      const location = gl.getAttribLocation(program, name);
      gl.enableVertexAttribArray(location);
      gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 36, offset);
    }
    if (object === bambooMesh) {
      gl.bindBuffer(gl.ARRAY_BUFFER, curveBuffer);
      gl.enableVertexAttribArray(curveLocation);
      gl.vertexAttribPointer(curveLocation, 1, gl.FLOAT, false, 0, 0);
    } else {
      gl.disableVertexAttribArray(curveLocation);
      gl.vertexAttrib1f(curveLocation, 0);
    }
    gl.uniformMatrix4fv(uniforms.model, false, model);
    gl.uniform1f(uniforms.browning, browning);
    gl.drawArrays(gl.TRIANGLES, 0, object.count);
  }

  function render() {
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    aspect = width / height;
    halfHeight = Math.max(3.4, 3.8 / aspect);
    gl.viewport(0, 0, width, height);
    gl.clearColor(0.24, 0.26, 0.25, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.uniform1f(uniforms.aspect, aspect);
    gl.uniform1f(uniforms.halfHeight, halfHeight);
    draw(floor, identity);
    draw(hearthMesh, identity);
    draw(bambooMesh, modelForRod(), Math.min(1, elapsed / timerDuration));
    const hearthRight = project(1, 0, 0);
    const gameRect = gameScreen.getBoundingClientRect();
    const instructionBottom = instruction.getBoundingClientRect().bottom - gameRect.top;
    const clockSize = canvas.clientHeight / (2 * halfHeight) * (64 * 6.8 / 700);
    timer.style.setProperty('--clock-size', `${clockSize}px`);
    timer.style.left = `${hearthRight.x - gameRect.left + clockSize * 0.15}px`;
    timer.style.top = `${Math.max(hearthRight.y - gameRect.top, instructionBottom + clockSize / 2 + 8)}px`;
  }

  function project(x, y, z) {
    const rect = canvas.getBoundingClientRect();
    const viewY = (y + 0.3) * cosAngle - (z - 0.9) * sinAngle;
    return {
      x: rect.left + rect.width * (0.5 + x / (2 * halfHeight * aspect)),
      y: rect.top + rect.height * (0.5 - viewY / (2 * halfHeight))
    };
  }

  function pointerOnPlane(event) {
    const rect = canvas.getBoundingClientRect();
    const viewX = ((event.clientX - rect.left) / rect.width * 2 - 1) * halfHeight * aspect;
    const viewY = (1 - (event.clientY - rect.top) / rect.height * 2) * halfHeight;
    return { x: viewX, z: 0.9 + ((rod.y + 0.3) * cosAngle - viewY) / sinAngle };
  }

  function isOnRod(event) {
    const a = rod.active ? project(rod.x, rod.y, rod.z - rodHalfLength) : project(rod.x - rodHalfLength, rod.y, rod.z);
    const b = rod.active ? project(rod.x, rod.y, rod.z + rodHalfLength) : project(rod.x + rodHalfLength, rod.y, rod.z);
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const lengthSquared = dx * dx + dy * dy;
    const t = lengthSquared ? Math.max(0, Math.min(1, ((event.clientX - a.x) * dx + (event.clientY - a.y) * dy) / lengthSquared)) : 0;
    return Math.hypot(event.clientX - (a.x + t * dx), event.clientY - (a.y + t * dy)) <= 24;
  }

  function intersectsHearth(z) {
    return Math.abs(z) < hearthHalfDepth + rodHalfLength;
  }

  function isInside() {
    return intersectsHearth(rod.z) && Math.abs(rod.x) <= tunnelClearance;
  }

  function isBlocked(x, z) {
    return intersectsHearth(z) && Math.abs(x) > tunnelClearance && Math.abs(x) < hearthHalfWidth;
  }

  function moveRod(dx, dz) {
    const steps = Math.max(1, Math.ceil(Math.max(Math.abs(dx), Math.abs(dz)) / 0.04));
    const stepX = dx / steps;
    const stepZ = dz / steps;
    const oldX = rod.x;
    const oldZ = rod.z;
    for (let i = 0; i < steps; i++) {
      if (!isBlocked(rod.x + stepX, rod.z)) rod.x += stepX;
      if (!isBlocked(rod.x, rod.z + stepZ)) rod.z += stepZ;
    }
    return Math.hypot(rod.x - oldX, rod.z - oldZ);
  }

  function updateTimer(now) {
    if (!dragging || cleared) return;
    const previousElapsed = elapsed;
    movements = movements.filter(movement => now - movement.time <= movementWindow);
    const distance = movements.reduce((total, movement) => total + movement.distance, 0);
    if (!isInside()) {
      timerMessage.textContent = '화로에 대나무를 넣어주세요';
    } else if (distance < minimumMovement) {
      timerMessage.textContent = '대나무를 움직여주세요';
    } else {
      elapsed += Math.max(0, now - lastFrame);
      timerMessage.textContent = '';
      if (elapsed >= timerDuration) {
        cleared = true;
        elapsed = timerDuration;
        dragging = false;
        pointerId = null;
        lastPointer = null;
        movements = [];
        timer.hidden = true;
        instruction.hidden = true;
        clearMessage.hidden = false;
      }
    }
    lastFrame = now;
    clock.textContent = String(Math.max(0, Math.ceil((timerDuration - elapsed) / 1000)));
    const elapsedAngle = cleared ? 360 : (elapsed % 1000) / 1000 * 360;
    clock.style.setProperty('--elapsed-angle', `${elapsedAngle}deg`);
    timerMessage.hidden = !timerMessage.textContent;
    if (elapsed !== previousElapsed) render();
  }

  function tick(now) {
    updateTimer(now);
    requestAnimationFrame(tick);
  }
  // 1단계끝

  canvas.addEventListener('pointerdown', event => {
    if (cleared || dragging || !isOnRod(event)) return;
    event.preventDefault();
    rod.active = true;
    rod.y = -0.22;
    dragging = true;
    pointerId = event.pointerId;
    lastPointer = pointerOnPlane(event);
    movements = [];
    lastFrame = performance.now();
    if (!cleared) {
      timer.hidden = false;
      updateTimer(lastFrame);
    }
    canvas.setPointerCapture(pointerId);
    render();
  });
  canvas.addEventListener('pointermove', event => {
    if (!dragging || event.pointerId !== pointerId) return;
    const current = pointerOnPlane(event);
    const now = performance.now();
    updateTimer(now);
    if (cleared) return;
    const before = project(rod.x, rod.y, rod.z);
    moveRod(current.x - lastPointer.x, current.z - lastPointer.z);
    const after = project(rod.x, rod.y, rod.z);
    const distance = Math.hypot(after.x - before.x, after.y - before.y);
    if (distance > 0.0001) {
      movements.push({ time: now, distance });
    }
    lastPointer = current;
    updateTimer(now);
    render();
  });
  function stopDragging(event) {
    if (event.pointerId !== pointerId) return;
    updateTimer(performance.now());
    if (cleared) return;
    dragging = false;
    pointerId = null;
    lastPointer = null;
    rod.x = 0;
    rod.y = -1.04;
    rod.z = 2.5;
    rod.active = false;
    timer.hidden = true;
    timerMessage.hidden = true;
    movements = [];
    render();
  }
  canvas.addEventListener('pointerup', stopDragging);
  canvas.addEventListener('pointercancel', stopDragging);
  canvas.addEventListener('lostpointercapture', stopDragging);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && dragging && !cleared) {
      movements = [];
    }
  });
  window.addEventListener('resize', render);
  render();
  requestAnimationFrame(tick);
}
