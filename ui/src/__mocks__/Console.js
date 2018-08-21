const ConsoleMock = level =>
  jest.spyOn(console, level).mockImplementation(() => jest.fn());

export { ConsoleMock };
