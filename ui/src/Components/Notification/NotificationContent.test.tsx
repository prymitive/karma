import { mount } from "enzyme";

import { NotificationContent } from "./NotificationContent";

describe("<NotificationContent />", () => {
  const mockTimestamp = new Date("2023-01-01T12:00:00Z");

  it("renders with basic props", () => {
    const wrapper = mount(
      <NotificationContent
        title="Test Title"
        message="Test message"
        timestamp={mockTimestamp}
      />,
    );

    expect(wrapper.find("h6").html()).toContain("Test Title");
    expect(wrapper.find("small").html()).toContain("Test message");
    expect(wrapper.find("DateFromNow")).toHaveLength(1);
  });

  it("renders HTML content in title and message", () => {
    const wrapper = mount(
      <NotificationContent
        title='Cluster <code class="bg-secondary text-white px-1 rounded">test</code> is unreachable'
        message='Instance <code class="bg-secondary text-white px-1 rounded">am1</code> failing'
        timestamp={mockTimestamp}
      />,
    );

    const titleHtml = wrapper.find("h6").html();
    const messageHtml = wrapper.find("small").html();

    expect(titleHtml).toContain(
      '<code class="bg-secondary text-white px-1 rounded">test</code>',
    );
    expect(messageHtml).toContain(
      '<code class="bg-secondary text-white px-1 rounded">am1</code>',
    );
  });

  it("uses default occurrenceCount of 1 when not provided", () => {
    const wrapper = mount(
      <NotificationContent
        title="Test Title"
        message="Test message"
        timestamp={mockTimestamp}
      />,
    );

    // Should not show occurrence count badge for default count of 1
    expect(wrapper.find(".badge")).toHaveLength(0);
  });

  it("does not show occurrence count badge when count is 1", () => {
    const wrapper = mount(
      <NotificationContent
        title="Test Title"
        message="Test message"
        timestamp={mockTimestamp}
        occurrenceCount={1}
      />,
    );

    expect(wrapper.find(".badge")).toHaveLength(0);
  });

  it("shows occurrence count badge when count is greater than 1", () => {
    const wrapper = mount(
      <NotificationContent
        title="Test Title"
        message="Test message"
        timestamp={mockTimestamp}
        occurrenceCount={3}
      />,
    );

    const badge = wrapper.find(".badge");
    expect(badge).toHaveLength(1);
    expect(badge.text()).toBe("3x");
    expect(badge.hasClass("bg-secondary")).toBe(true);
    expect(badge.hasClass("text-white")).toBe(true);
  });

  it("formats timestamp correctly using DateFromNow", () => {
    const wrapper = mount(
      <NotificationContent
        title="Test Title"
        message="Test message"
        timestamp={mockTimestamp}
      />,
    );

    const dateFromNow = wrapper.find("DateFromNow");
    expect(dateFromNow.prop("timestamp")).toBe(mockTimestamp.toISOString());
  });

  it("applies correct CSS classes", () => {
    const wrapper = mount(
      <NotificationContent
        title="Test Title"
        message="Test message"
        timestamp={mockTimestamp}
        occurrenceCount={2}
      />,
    );

    // Check main container has flex-grow-1 class
    expect(wrapper.find("div").first().hasClass("flex-grow-1")).toBe(true);

    // Check header structure
    expect(wrapper.find(".d-flex.align-items-center")).toHaveLength(1);
    expect(wrapper.find("h6.alert-heading.mb-1.flex-grow-1")).toHaveLength(1);

    // Check message styling
    expect(wrapper.find("small.mb-1.d-block")).toHaveLength(1);

    // Check timestamp styling
    expect(wrapper.find(".text-white-50")).toHaveLength(1);

    // Check occurrence count badge
    expect(wrapper.find(".badge.bg-secondary.ms-2.text-white")).toHaveLength(1);
  });

  it("handles different occurrence count values", () => {
    // Test with count of 5
    const wrapper = mount(
      <NotificationContent
        title="Test Title"
        message="Test message"
        timestamp={mockTimestamp}
        occurrenceCount={5}
      />,
    );

    expect(wrapper.find(".badge").text()).toBe("5x");
  });

  it("matches snapshot with default occurrenceCount", () => {
    const wrapper = mount(
      <NotificationContent
        title="Test notification title"
        message="Test notification message"
        timestamp={mockTimestamp}
      />,
    );

    expect(wrapper).toMatchSnapshot();
  });

  it("matches snapshot with custom occurrenceCount", () => {
    const wrapper = mount(
      <NotificationContent
        title="Test notification title"
        message="Test notification message"
        timestamp={mockTimestamp}
        occurrenceCount={3}
      />,
    );

    expect(wrapper).toMatchSnapshot();
  });
});
