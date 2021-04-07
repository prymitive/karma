import { mount } from "enzyme";

import addSeconds from "date-fns/addSeconds";
import subSeconds from "date-fns/subSeconds";

import { DateFromNow } from ".";

describe("<DateFromNow />", () => {
  it("renders 'just now' for now", () => {
    const tree = mount(<DateFromNow timestamp={new Date().toISOString()} />);
    expect(tree.text()).toBe("just now");
  });

  it("renders 'a few seconds ago' for 35 seconds old timestamp", () => {
    const tree = mount(
      <DateFromNow timestamp={subSeconds(new Date(), 35).toISOString()} />
    );
    expect(tree.text()).toBe("a few seconds ago");
  });

  it("renders 'in a few seconds' for a timestamp 35 seconds away", () => {
    const tree = mount(
      <DateFromNow timestamp={addSeconds(new Date(), 35).toISOString()} />
    );
    expect(tree.text()).toBe("in a few seconds");
  });

  it("renders '1 minute ago' for 65 seconds old timestamp", () => {
    const tree = mount(
      <DateFromNow timestamp={subSeconds(new Date(), 65).toISOString()} />
    );
    expect(tree.text()).toBe("1 minute ago");
  });

  it("renders 'in 1 minute' for a timestamp 65 seconds away", () => {
    const tree = mount(
      <DateFromNow timestamp={addSeconds(new Date(), 65).toISOString()} />
    );
    expect(tree.text()).toBe("in 1 minute");
  });
});
