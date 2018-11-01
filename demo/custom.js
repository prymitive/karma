// https://developers.google.com/analytics/devguides/collection/analyticsjs/
(function(i, s, o, g, r, a, m) {
  i["GoogleAnalyticsObject"] = r;
  (i[r] =
    i[r] ||
    function() {
      (i[r].q = i[r].q || []).push(arguments);
    }),
    (i[r].l = 1 * new Date());
  (a = s.createElement(o)), (m = s.getElementsByTagName(o)[0]);
  a.async = 1;
  a.src = g;
  m.parentNode.insertBefore(a, m);
})(
  window,
  document,
  "script",
  "https://www.google-analytics.com/analytics.js",
  "ga"
);

ga("create", "UA-128338979-1", "auto");
ga("send", "pageview");

function getSearch() {
  return window.location.search;
}

let search = getSearch();

function updateSearch() {
  let newSearch = getSearch();
  if (newSearch !== search) {
    search = newSearch;
    ga("set", "page", window.location.pathname + window.location.search);
  }
}

setInterval(function() {
  updateSearch();
  ga("send", {
    hitType: "event",
    eventCategory: "heartbeat",
    eventAction: "ping"
  });
}, 15 * 1000);
