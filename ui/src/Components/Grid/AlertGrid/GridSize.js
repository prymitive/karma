const baseWidth = 400;

const MinWidth = canvasWidth =>
  Math.floor(
    baseWidth + (canvasWidth / Math.min(canvasWidth, baseWidth * 2)) * 10
  );

// grid sizes, defines how many columns are used depending on the screen width
// this is config as expected by https://github.com/callmecavs/bricks.js#sizes
const GridSizesConfig = canvasWidth => {
  const generatedSizes = [];
  for (let i = 2; i < 20; i++) {
    generatedSizes.push({
      mq: `${i * MinWidth(i * baseWidth)}px`,
      columns: i,
      gutter: 0
    });
  }
  //console.info(JSON.stringify(generatedSizes));
  return [...[{ columns: 1, gutter: 0 }], ...generatedSizes];
};

const GetGridElementWidth = canvasWidth => {
  const mw = MinWidth(canvasWidth);
  return Math.floor(
    Math.min(
      mw + (canvasWidth % mw) / Math.floor(canvasWidth / mw),
      canvasWidth
    )
  );
};

export { MinWidth, GridSizesConfig, GetGridElementWidth };
