function createBambooSpotTexture(THREE, seed) {
  const canvas = document.createElement("canvas");
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Could not create a bamboo stain texture.");

  let textureSeed = Math.floor(seed * 2147483646) + 1;
  const random = () => {
    textureSeed = (textureSeed * 16807) % 2147483647;
    return (textureSeed - 1) / 2147483646;
  };
  const centerX = 64 + (random() - 0.5) * 10;
  const centerY = 64 + (random() - 0.5) * 8;
  const radiusX = 40 + random() * 8;
  const radiusY = 30 + random() * 8;
  const phases = [random(), random(), random()].map((value) => value * Math.PI * 2);
  const image = context.createImageData(128, 128);

  for (let y = 0; y < 128; y += 1) {
    for (let x = 0; x < 128; x += 1) {
      const normalizedX = (x - centerX) / radiusX;
      const normalizedY = (y - centerY) / radiusY;
      const angle = Math.atan2(normalizedY, normalizedX);
      const pixelIndex = (y * 128 + x) * 4;
      image.data[pixelIndex] = 198;
      image.data[pixelIndex + 1] = 155;
      image.data[pixelIndex + 2] = 105;
      const unevenEdge = (1 + 0.07 * normalizedX) * (
        1
        + 0.08 * Math.sin(angle * 3 + phases[0])
        + 0.04 * Math.cos(angle * 5 + phases[1])
        + 0.025 * Math.sin(angle * 8 + phases[2])
      );
      const distance = Math.hypot(normalizedX, normalizedY) / unevenEdge;
      if (distance >= 1) continue;

      const edgeFade = Math.pow(1 - distance, 0.58);
      const mottling = 0.78
        + 0.13 * Math.sin(x * 0.13 + phases[0]) * Math.cos(y * 0.15 + phases[1])
        + 0.09 * Math.sin((x + y) * 0.11 + phases[2]);
      image.data[pixelIndex] = 46 + Math.round(mottling * 2);
      image.data[pixelIndex + 1] = 26 + Math.round(mottling * 2);
      image.data[pixelIndex + 2] = 15 + Math.round(mottling * 1.5);
      image.data[pixelIndex + 3] = Math.round(255 * 0.8 * edgeFade * mottling);
    }
  }

  context.putImageData(image, 0, 0);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

function updateBambooSpot(THREE, spot, curve, bambooRadius) {
  const point = curve.getPointAt(spot.t);
  const tangent = curve.getTangentAt(spot.t).normalize();
  const radialA = new THREE.Vector3(0, 0, 1).cross(tangent).normalize();
  const radialB = tangent.clone().cross(radialA).normalize();
  const radial = radialA.multiplyScalar(Math.cos(spot.angle))
    .addScaledVector(radialB, Math.sin(spot.angle))
    .normalize();
  const around = radial.clone().cross(tangent).normalize();
  spot.mesh.position.copy(point).addScaledVector(radial, bambooRadius + 0.0015);
  spot.mesh.quaternion.setFromRotationMatrix(
    new THREE.Matrix4().makeBasis(tangent, around, radial)
  );
  spot.mesh.rotateZ(spot.rotation);
  return point;
}

function createBambooSpots(THREE, curve, bambooRadius, opacity) {
  const geometry = new THREE.CircleGeometry(1, 40);
  const total = 8;
  let seed = 57391;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  const spots = [];
  for (let index = 0; index < total; index += 1) {
    const material = new THREE.MeshStandardMaterial({
      map: createBambooSpotTexture(THREE, random()),
      transparent: true,
      opacity,
      depthWrite: false,
      roughness: 0.94,
      metalness: 0
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.scale.set(0.056 + random() * 0.024, 0.018 + random() * 0.012, 1);
    const spot = {
      mesh,
      t: (index + 0.2 + random() * 0.6) / total,
      angle: random() * Math.PI / 4,
      rotation: (random() - 0.5) * 0.38
    };
    updateBambooSpot(THREE, spot, curve, bambooRadius);
    spots.push(spot);
  }
  return spots;
}
