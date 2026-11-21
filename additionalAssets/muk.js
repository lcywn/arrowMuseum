function createMuk(THREE) {
  const length = 0.4;
  const width = 0.055;
  const thickness = 0.012;
  const inkLength = 0.035;
  const tipSlant = 0.014;
  const start = -length / 2;
  const end = length / 2;
  const inkStart = end - inkLength;
  const group = new THREE.Group();

  const bambooMaterial = new THREE.MeshStandardMaterial({
    color: 0xc69b69,
    roughness: 0.52,
    metalness: 0.02
  });
  const inkMaterial = new THREE.MeshStandardMaterial({
    color: 0x191914,
    roughness: 0.88,
    metalness: 0
  });

  function addSection(points, material) {
    const shape = new THREE.Shape();
    shape.moveTo(points[0][0], points[0][1]);
    for (const point of points.slice(1)) shape.lineTo(point[0], point[1]);
    shape.closePath();
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: thickness,
      bevelEnabled: false
    });
    geometry.rotateX(-Math.PI / 2);
    geometry.translate(0, -thickness / 2, 0);
    const mesh = new THREE.Mesh(geometry, material);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
  }

  addSection([
    [start, -width / 2], [inkStart, -width / 2],
    [inkStart, width / 2], [start, width / 2]
  ], bambooMaterial);
  addSection([
    [inkStart, -width / 2], [end - tipSlant, -width / 2],
    [end, width / 2], [inkStart, width / 2]
  ], inkMaterial);

  return { group, length, width, thickness };
}
