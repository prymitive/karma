import React from "react";

import { render } from "enzyme";

import moment from "moment";

import { SilenceFormStore } from "Stores/SilenceFormStore";
import { SilencePreview } from "./SilencePreview";

describe("<SilencePreview />", () => {
  it("matches snapshot", () => {
    const silenceFormStore = new SilenceFormStore();
    silenceFormStore.data.startsAt = moment([2000, 1, 1, 0, 0, 0]);
    silenceFormStore.data.endsAt = moment([2000, 1, 1, 1, 0, 0]);
    silenceFormStore.data.createdBy = "me@example.com";
    silenceFormStore.data.comment = "SilencePreview test";

    const tree = render(<SilencePreview silenceFormStore={silenceFormStore} />);
    expect(tree).toMatchSnapshot();
  });
});
