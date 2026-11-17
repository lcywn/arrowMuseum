'use strict';

const canvas = document.getElementById('preview');
const gl = canvas.getContext('webgl', { antialias: true });

if (!gl) {
  document.getElementById('error').textContent = '3D 화면을 표시할 수 없습니다. 브라우저에서 WebGL을 활성화해 주세요.';
} else {
  try {
    startPreview(gl);
  } catch (error) {
    console.error(error);
    document.getElementById('error').textContent = '3D 화면을 만들지 못했습니다. 브라우저 콘솔에서 오류를 확인해 주세요.';
  }
}

function startPreview(gl) {
  const vertexSource = `
    attribute vec3 position;
    attribute vec3 normal;
    attribute vec3 color;
    uniform float rotationX;
    uniform float rotationY;
    uniform float aspect;
    uniform float scale;
    varying vec3 vNormal;
    varying vec3 vColor;
    vec3 rotate(vec3 v) {
      float cy = cos(rotationY), sy = sin(rotationY);
      float cx = cos(rotationX), sx = sin(rotationX);
      v = vec3(cy * v.x + sy * v.z, v.y, -sy * v.x + cy * v.z);
      return vec3(v.x, cx * v.y - sx * v.z, sx * v.y + cx * v.z);
    }
    void main() {
      vec3 p = rotate(position);
      gl_Position = vec4(p.x * scale / aspect, p.y * scale, -p.z * 0.1, 1.0);
      vNormal = rotate(normal);
      vColor = color;
    }
  `;
  const fragmentSource = `
    precision mediump float;
    varying vec3 vNormal;
    varying vec3 vColor;
    void main() {
      vec3 light = normalize(vec3(-0.5, 0.8, 1.0));
      float diffuse = max(dot(normalize(vNormal), light), 0.0);
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
  const mesh = hearth.createMesh();
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, mesh, gl.STATIC_DRAW);
  for (const [name, offset] of [['position', 0], ['normal', 12], ['color', 24]]) {
    const location = gl.getAttribLocation(program, name);
    gl.enableVertexAttribArray(location);
    gl.vertexAttribPointer(location, 3, gl.FLOAT, false, 36, offset);
  }

  const uniforms = {
    rotationX: gl.getUniformLocation(program, 'rotationX'),
    rotationY: gl.getUniformLocation(program, 'rotationY'),
    aspect: gl.getUniformLocation(program, 'aspect'),
    scale: gl.getUniformLocation(program, 'scale')
  };
  let rotationX = 0.22;
  let rotationY = -0.3;
  let zoom = 1;
  let dragging = false;
  let lastX = 0;
  let lastY = 0;

  function render() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(canvas.clientWidth * ratio));
    const height = Math.max(1, Math.round(canvas.clientHeight * ratio));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    gl.viewport(0, 0, width, height);
    gl.clearColor(0.133, 0.145, 0.137, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    gl.uniform1f(uniforms.rotationX, rotationX);
    gl.uniform1f(uniforms.rotationY, rotationY);
    gl.uniform1f(uniforms.aspect, width / height);
    gl.uniform1f(uniforms.scale, zoom * 0.53 * Math.min(1, width / height));
    gl.drawArrays(gl.TRIANGLES, 0, mesh.length / 9);
  }

  canvas.addEventListener('pointerdown', event => {
    dragging = true;
    lastX = event.clientX;
    lastY = event.clientY;
    canvas.setPointerCapture(event.pointerId);
  });
  canvas.addEventListener('pointermove', event => {
    if (!dragging) return;
    rotationY += (event.clientX - lastX) * 0.01;
    rotationX += (event.clientY - lastY) * 0.01;
    lastX = event.clientX;
    lastY = event.clientY;
    render();
  });
  canvas.addEventListener('pointerup', () => { dragging = false; });
  canvas.addEventListener('pointercancel', () => { dragging = false; });
  canvas.addEventListener('wheel', event => {
    event.preventDefault();
    zoom = Math.max(0.5, Math.min(3, zoom * Math.exp(-event.deltaY * 0.001)));
    render();
  }, { passive: false });
  document.getElementById('reset').addEventListener('click', () => {
    rotationX = 0.22;
    rotationY = -0.3;
    zoom = 1;
    render();
  });
  window.addEventListener('resize', render);
  render();
}
