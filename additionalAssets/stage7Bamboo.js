function createStage7Bamboo(THREE) {
  const bambooAsset = createBamboo(THREE, { cut: true });
  const bamboo = bambooAsset.group;

  const inkAsset = createBambooInk(THREE, bambooAsset, { painted: true });
  const glueAsset = createBambooGlue(THREE, bambooAsset, inkAsset, { painted: true });

  for (let index = 0; index < 2; index += 1) {
    bambooAsset.ends[index].visible = false;
    createBambooRoundedEnd(THREE, bambooAsset, index === 0 ? bambooAsset.start : bambooAsset.end);
  }

  return { group: bamboo, asset: bambooAsset, ink: inkAsset, glue: glueAsset };
}
