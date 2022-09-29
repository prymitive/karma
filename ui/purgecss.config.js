module.exports = {
  content: ["build/index.html", "build/static/js/*.js", "src/**/*.{ts,tsx}"],
  css: ["build/static/css/*.css"],
  output: "build/static/css",
  variables: true,
  fontFace: false,
  keyframes: false,
  safelist: {
    greedy: [
      /^components-/,
      /^firing-[0-9]$/,
      /^alert-history-loading-/,
      /^btn/,
      /^--bs-/,
    ],
  },
};
