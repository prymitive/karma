import { configure, getStorybook, setAddon } from "@storybook/react";

import createPercyAddon from "@percy-io/percy-storybook";

import { advanceTo } from "jest-date-mock";

const { percyAddon, serializeStories } = createPercyAddon();
setAddon(percyAddon);

// mock date so the silence form always shows same preview
advanceTo(new Date(Date.UTC(2018, 7, 14, 17, 36, 40)));

const req = require.context("../src/Components", true, /\.stories\.(js|tsx)$/);

function loadStories() {
  req.keys().forEach(filename => req(filename));
}

configure(loadStories, module);

serializeStories(getStorybook);
