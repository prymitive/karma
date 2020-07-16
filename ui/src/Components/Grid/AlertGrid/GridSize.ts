import { SizeDetail } from "bricks.js";

// grid sizes, defines how many columns are used depending on the screen width
// this is config as expected by https://github.com/callmecavs/bricks.js#sizes
const GridSizesConfig = (baseWidth: number): SizeDetail[] => {
  const generatedSizes = [];
  for (let i = 2; i < 20; i++) {
    generatedSizes.push({
      mq: `${i * baseWidth}px`,
      columns: i,
      gutter: 0,
    });
  }
  return [...[{ columns: 1, gutter: 0 }], ...generatedSizes];
};

const GetColumnsCount = (canvasWidth: number, baseWidth: number): number =>
  [{ mq: "0px", columns: 1 }, ...GridSizesConfig(baseWidth)]
    .filter((gs) => gs.mq !== undefined)
    .filter((gs) => canvasWidth >= Number.parseInt(gs.mq as string))
    .map((gs) => gs.columns)
    .pop() as number;

const GetGridElementWidth = (
  innerWidth: number,
  outerWidth: number,
  outerPadding: number,
  baseWidth: number
): number =>
  Math.floor(
    (innerWidth - outerPadding) / GetColumnsCount(outerWidth, baseWidth)
  );

export { GridSizesConfig, GetColumnsCount, GetGridElementWidth };
