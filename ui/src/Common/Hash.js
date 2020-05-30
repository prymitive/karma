// https://stackoverflow.com/a/58208791/1154047
const normalize = (sortingFunction) => {
  return function (key, value) {
    if (typeof value === "object" && !Array.isArray(value)) {
      return Object.entries(value)
        .sort(sortingFunction || undefined)
        .reduce((acc, entry) => {
          acc[entry[0]] = entry[1];
          return acc;
        }, {});
    }
    return value;
  };
};

// https://stackoverflow.com/a/15710692/1154047
const hashString = (s) =>
  s.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);

const hashObject = (o) => hashString(JSON.stringify(o, normalize(), 2));

export { normalize, hashString, hashObject };
