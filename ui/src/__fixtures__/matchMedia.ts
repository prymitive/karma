interface mapOfMediaT {
  matches: boolean;
  media: string;
}

const mockMatchMedia = (mapOfMedia: {
  [query: string]: mapOfMediaT;
}): jest.MockedFunction<typeof window.matchMedia> => {
  return jest.fn().mockImplementation((query) => {
    return {
      matches: mapOfMedia[query] ? mapOfMedia[query].matches : false,
      media: mapOfMedia[query] ? mapOfMedia[query].media : "not all",
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    };
  });
};

export { mockMatchMedia };
