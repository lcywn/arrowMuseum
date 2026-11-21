// stage7Bamboo.js - Stage 7의 완성된 대나무 에셋
// stage7에서 쇠심줄 감기 완료 후의 대나무 상태를 저장하는 에셋

function createStage7Bamboo(THREE) {
  // Check if Bamboo.js functions are available
  if (typeof createBamboo === 'undefined') {
    console.error('createBamboo is not defined. Make sure Bamboo.js is loaded.');
    return null;
  }
  
  // stage7 완료 후의 대나무 상태를 생성합니다.
  // 모든 wrapping이 완료된 상태입니다.
  
  const bambooAsset = createBamboo(THREE, { cut: true });
  const inkAsset = createBambooInk(THREE, bambooAsset, { painted: true });
  const glueAsset = createBambooGlue(THREE, bambooAsset, inkAsset, { painted: true });
  
  // Create wrap groups (sheath wrapping) for both sides
  const wrapGroups = [];
  for (let index = 0; index < 2; index++) {
    const wrapGroup = new THREE.Group();
    
    const start = bambooAsset.start;
    const end = bambooAsset.end;
    const color = 0xc49b61;
    
    const threadGeometry = new THREE.TubeGeometry(
      new THREE.LineCurve3(
        new THREE.Vector3(start + 0.03, 0, 0),
        new THREE.Vector3(end - 0.03, 0, 0)
      ),
      8,
      0.004,
      3,
      false
    );
    const threadMaterial = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.5,
      metalness: 0.3
    });
    const thread = new THREE.Mesh(threadGeometry, threadMaterial);
    thread.castShadow = true;
    thread.receiveShadow = true;
    wrapGroup.add(thread);
    
    // Create multiple wrap lines along the bamboo
    const wrapCount = 12;
    for (let i = 1; i < wrapCount; i++) {
      const t = i / wrapCount;
      const angle = t * Math.PI * 2 * 3;
      const x = start + (end - start) * t;
      const radius = 0.055;
      const y = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      
      const wrapGeometry = new THREE.TubeGeometry(
        new THREE.LineCurve3(
          new THREE.Vector3(x - 0.01, y, z),
          new THREE.Vector3(x + 0.01, y, z)
        ),
        4,
        0.003,
        2,
        false
      );
      const wrap = new THREE.Mesh(wrapGeometry, threadMaterial);
      wrap.castShadow = true;
      wrap.receiveShadow = true;
      wrapGroup.add(wrap);
    }
    
    wrapGroups.push(wrapGroup);
  }
  
  const group = bambooAsset.group;
  
  // Add wraps to bamboo
  for (const wrapGroup of wrapGroups) {
    group.add(wrapGroup);
  }
  
  return {
    group: group,
    asset: bambooAsset,
    ink: inkAsset,
    glue: glueAsset,
    wrap: wrapGroups
  };
}

(function() {
  window.stage7BambooResult = {
    group: null,
    asset: null,
    ink: null,
    glue: null,
    wrap: null
  };
})();


