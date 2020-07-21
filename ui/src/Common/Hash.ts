/* eslint-disable @typescript-eslint/no-explicit-any */

// https://stackoverflow.com/a/58208791/1154047
const normalize = (): any => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return function (_: string, value: any) {
    if (typeof value === "object" && !Array.isArray(value)) {
      return Object.entries(value)
        .sort()
        .reduce((acc: any, entry: any) => {
          acc[entry[0]] = entry[1];
          return acc;
        }, {});
    }
    return value;
  };
};

// https://stackoverflow.com/a/15710692/1154047
const hashString = (s: string): number =>
  s.split("").reduce((a, b) => {
    a = (a << 5) - a + b.charCodeAt(0);
    return a & a;
  }, 0);

const hashObject = (o: { [key: string]: any }): number =>
  hashString(JSON.stringify(o, normalize(), 2));

export { normalize, hashString, hashObject };
