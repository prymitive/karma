module.exports = {
  addons: ["@storybook/preset-create-react-app"],
  stories: ["../src/**/*.stories.tsx"],
  // https://github.com/styleguidist/react-docgen-typescript/issues/356
  typescript: {
    reactDocgen: "none",
  },
  core: {
    builder: "webpack5",
    disableTelemetry: true,
  },
  staticDirs: ["../public"],
};
