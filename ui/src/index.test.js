import { EmptyAPIResponse } from "__mocks__/Fetch";

it("renders without crashing", () => {
  const response = EmptyAPIResponse();
  response.filters = [];
  fetch.mockResponse(JSON.stringify(response));
  const Index = require("./index.js");
  expect(Index).toBeTruthy();
});
