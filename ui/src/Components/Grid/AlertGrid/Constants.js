// grid sizes, defines how many columns are used depending on the screen width
// this is config as expected by https://github.com/callmecavs/bricks.js#sizes
const GridSizesConfig = [
  { columns: 1, gutter: 0 },
  { mq: "800px", columns: 2, gutter: 0 },
  { mq: "1400px", columns: 3, gutter: 0 },
  { mq: "2100px", columns: 4, gutter: 0 },
  { mq: "2800px", columns: 5, gutter: 0 },
  { mq: "3500px", columns: 6, gutter: 0 },
  { mq: "4200px", columns: 7, gutter: 0 },
  { mq: "4900px", columns: 7, gutter: 0 },
  { mq: "5600px", columns: 8, gutter: 0 }
];

const GetGridElementWidth = canvasWidth =>
  Math.floor(
    canvasWidth < 800
      ? canvasWidth
      : canvasWidth < 1400
      ? canvasWidth / 2
      : canvasWidth < 2100
      ? canvasWidth / 3
      : canvasWidth < 2800
      ? canvasWidth / 4
      : canvasWidth < 3500
      ? canvasWidth / 5
      : canvasWidth < 4200
      ? canvasWidth / 6
      : canvasWidth < 5600
      ? canvasWidth / 7
      : canvasWidth / 8
  );

export { GridSizesConfig, GetGridElementWidth };
