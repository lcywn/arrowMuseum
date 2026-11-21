function getBambooCutPosition(length) {
  return length / 2 - length / 12;
}

function createBambooBodyGeometry(THREE, start, end, radius) {
  return new THREE.TubeGeometry(
    new THREE.LineCurve3(
      new THREE.Vector3(start, 0, 0),
      new THREE.Vector3(end, 0, 0)
    ),
    64, radius, 16, false
  );
}

function createBambooCutFaceMaterial(THREE) {
  return new THREE.MeshStandardMaterial({
    color: 0xc5ad78,
    roughness: 0.78,
    metalness: 0
  });
}

function createBambooCutFace(THREE, radius, material, x) {
  const cap = new THREE.Mesh(
    new THREE.CylinderGeometry(radius, radius, 0.018, 24),
    material
  );
  cap.position.x = x;
  cap.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(1, 0, 0)
  );
  return cap;
}

function createBamboo(THREE, { cut = false } = {}) {
  const length = 3.5;
  const radius = 0.044;
  const end = cut ? getBambooCutPosition(length) : length / 2;
  const start = -end;
  const material = new THREE.MeshStandardMaterial({
    color: 0xc69b69,
    roughness: 0.52,
    metalness: 0.02
  });
  const group = new THREE.Group();
  const body = new THREE.Mesh(
    createBambooBodyGeometry(THREE, start, end, radius),
    material
  );
  body.castShadow = true;
  body.receiveShadow = true;
  group.add(body);

  const cutFaceMaterial = cut ? createBambooCutFaceMaterial(THREE) : null;
  const ends = [start, end].map((x) => {
    const cap = cut
      ? createBambooCutFace(THREE, radius, cutFaceMaterial, x)
      : new THREE.Mesh(new THREE.SphereGeometry(radius, 16, 12), material);
    if (!cut) {
      cap.position.x = x;
      cap.castShadow = true;
    }
    group.add(cap);
    return cap;
  });

  return { group, body, ends, length, radius, start, end };
}

function createBambooRoundedEnd(THREE, bamboo, x) {
  const end = new THREE.Mesh(
    new THREE.SphereGeometry(bamboo.radius, 18, 12),
    bamboo.body.material
  );
  end.position.x = x;
  end.castShadow = true;
  end.receiveShadow = true;
  bamboo.group.add(end);
  return end;
}

function createBambooInk(THREE, bamboo, { painted = false } = {}) {
  const width = 0.09;
  const centers = [bamboo.start + 0.24, bamboo.end - 0.24];
  const segmentCount = 48;
  const segmentAngle = Math.PI * 2 / segmentCount;
  const material = new THREE.MeshStandardMaterial({
    color: 0x12130f,
    roughness: 0.88,
    metalness: 0
  });
  const axis = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(1, 0, 0)
  );
  const areas = centers.map((center) => {
    const segments = [];
    for (let index = 0; index < segmentCount; index += 1) {
      const mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.045, 0.045, width, 1, 1, true,
          index * segmentAngle, segmentAngle),
        material
      );
      mesh.position.x = center;
      mesh.quaternion.copy(axis);
      mesh.visible = painted;
      mesh.receiveShadow = true;
      bamboo.group.add(mesh);
      segments.push(mesh);
    }
    return segments;
  });
  return { width, centers, segmentCount, segmentAngle, areas };
}

function createBambooGlue(THREE, bamboo, ink, { painted = false } = {}) {
  const material = new THREE.MeshStandardMaterial({
    color: 0x89502d,
    roughness: 0.72,
    metalness: 0
  });
  const ends = [bamboo.start, bamboo.end].map((x) => {
    const end = new THREE.Mesh(new THREE.SphereGeometry(bamboo.radius, 18, 12), material);
    end.position.x = x;
    end.visible = painted;
    end.castShadow = true;
    end.receiveShadow = true;
    bamboo.group.add(end);
    return end;
  });
  const bounds = [
    [bamboo.start, ink.centers[0] - ink.width / 2],
    [ink.centers[1] + ink.width / 2, bamboo.end]
  ];
  const axis = new THREE.Quaternion().setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(1, 0, 0)
  );
  const bands = bounds.map(([start, end]) => {
    const band = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, end - start, 32, 1),
      material
    );
    band.position.x = (start + end) / 2;
    band.quaternion.copy(axis);
    band.visible = painted;
    band.castShadow = true;
    band.receiveShadow = true;
    bamboo.group.add(band);
    return band;
  });
  return { material, ends, bounds, bands };
}
