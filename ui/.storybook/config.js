import { configure, getStorybook, setAddon } from "@storybook/react";

import createPercyAddon from "@percy-io/percy-storybook";

const { percyAddon, serializeStories } = createPercyAddon();
setAddon(percyAddon);

const req = require.context("../src/Components", true, /\.stories\.js$/);

function loadStories() {
  req.keys().forEach(filename => req(filename));
}

configure(loadStories, module);

serializeStories(getStorybook);
