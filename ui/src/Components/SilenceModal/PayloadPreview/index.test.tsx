import { render } from "enzyme";

import toDiffableHtml from "diffable-html";

import { SilenceFormStore } from "Stores/SilenceFormStore";
import PayloadPreview from ".";

describe("<PayloadPreview />", () => {
  it("matches snapshot", () => {
    const silenceFormStore = new SilenceFormStore();
    silenceFormStore.data.setStart(new Date(Date.UTC(2000, 1, 1, 0, 0, 0)));
    silenceFormStore.data.setEnd(new Date(Date.UTC(2000, 1, 1, 1, 0, 0)));
    silenceFormStore.data.setAuthor("me@example.com");
    silenceFormStore.data.setComment("PayloadPreview test");

    const tree = render(<PayloadPreview silenceFormStore={silenceFormStore} />);
    expect(toDiffableHtml(tree.html())).toMatchSnapshot();
  });
});
