import React from "react";

import { render } from "enzyme";

import toDiffableHtml from "diffable-html";

import moment from "moment";

import { SilenceFormStore } from "Stores/SilenceFormStore";
import { PayloadPreview } from ".";

describe("<PayloadPreview />", () => {
  it("matches snapshot", () => {
    const silenceFormStore = new SilenceFormStore();
    silenceFormStore.data.startsAt = moment.utc([2000, 1, 1, 0, 0, 0]);
    silenceFormStore.data.endsAt = moment.utc([2000, 1, 1, 1, 0, 0]);
    silenceFormStore.data.createdBy = "me@example.com";
    silenceFormStore.data.comment = "PayloadPreview test";

    const tree = render(<PayloadPreview silenceFormStore={silenceFormStore} />);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });
});
