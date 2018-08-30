import { observable, action } from "mobx";

import { throttle } from "lodash";

import equal from "fast-deep-equal";

import qs from "qs";

// generate URL for the UI with a set of filters
function FormatAPIFilterQuery(filters) {
  return qs.stringify(
    Object.assign(DecodeLocationSearch(window.location.search).params, {
      q: filters
    }),
    {
      encodeValuesOnly: true, // don't encode q[]
      indices: false // go-gin doesn't support parsing q[0]=foo&q[1]=bar
    }
  );
}

// format URI for react UI -> Go backend requests
function FormatUnseeBackendURI(path) {
  const uri = process.env.REACT_APP_BACKEND_URI || ".";
  return `${uri}/${path}`;
}

// takes the '?foo=bar&foo=baz' part of http://example.com?foo=bar&foo=baz
// and decodes it into a dict with some extra metadata
function DecodeLocationSearch(searchString) {
  let defaultsUsed = true;
  let params = { q: [] };

  if (searchString !== "") {
    const parsed = qs.parse(searchString.split("?")[1]);
    params = Object.assign(params, parsed);

    if (parsed.q !== undefined) {
      defaultsUsed = false;
      if (parsed.q === "") {
        params.q = [];
      } else if (Array.isArray(parsed.q)) {
        // filter out empty strings, so 'q=' doesn't end up [""] but rather []
        params.q = parsed.q.filter(v => v !== "");
      } else {
        params.q = [parsed.q];
      }
    }
  }

  return { params: params, defaultsUsed: defaultsUsed };
}

function UpdateLocationSearch(newParams) {
  const baseURLWithoutSearch = window.location.href.split("?")[0];
  const newSearch = FormatAPIFilterQuery(newParams.q || []);
  if (newSearch !== "") {
    window.history.pushState(
      null,
      null,
      `${baseURLWithoutSearch}?${newSearch}`
    );
  } else {
    window.history.pushState(null, null, baseURLWithoutSearch);
  }
}

const AlertStoreStatuses = Object.freeze({
  Idle: Symbol("idle"),
  InProgress: Symbol("in-progres"),
  Failure: Symbol("failure")
});

function NewUnappliedFilter(raw) {
  return {
    applied: false,
    isValid: true,
    raw: raw,
    hits: 0,
    name: "",
    matcher: "",
    value: ""
  };
}

class AlertStore {
  filters = observable(
    {
      values: [],
      addFilter(raw) {
        if (this.values.filter(f => f.raw === raw).length === 0) {
          this.values.push(NewUnappliedFilter(raw));
          UpdateLocationSearch({ q: this.values.map(f => f.raw) });
        }
      },
      removeFilter(raw) {
        if (this.values.filter(f => f.raw === raw).length > 0) {
          this.values = this.values.filter(f => f.raw !== raw);
          UpdateLocationSearch({ q: this.values.map(f => f.raw) });
        }
      },
      replaceFilter(oldRaw, newRaw) {
        const index = this.values.findIndex(e => e.raw === oldRaw);
        if (index >= 0) {
          // first check if we would create a duplicated filter
          if (this.values.findIndex(e => e.raw === newRaw) >= 0) {
            // we already have newRaw, simply drop oldRaw
            this.removeFilter(oldRaw);
          } else {
            // no dups, continue with a swap
            this.values[index] = NewUnappliedFilter(newRaw);
            UpdateLocationSearch({ q: this.values.map(f => f.raw) });
          }
        }
      },
      setFilters(raws) {
        this.values = raws.map(raw => NewUnappliedFilter(raw));
        UpdateLocationSearch({ q: this.values.map(f => f.raw) });
      }
    },
    {
      addFilter: action.bound,
      removeFilter: action.bound,
      replaceFilter: action.bound,
      setFilters: action.bound
    },
    { name: "API Filters" }
  );

  data = observable(
    {
      colors: {},
      counters: {},
      groups: {},
      silences: {},
      upstreams: { instances: [] }
    },
    {},
    { name: "API Response data" }
  );

  info = observable(
    {
      totalAlerts: 0,
      version: "unknown"
    },
    {},
    { name: "API response info" }
  );

  settings = observable(
    {
      values: {
        staticColorLabels: [],
        annotationsDefaultHidden: false,
        annotationsHidden: [],
        annotationsVisible: []
      }
    },
    {},
    {
      name: "Global settings"
    }
  );

  status = observable(
    {
      value: AlertStoreStatuses.Idle,
      error: null,
      setIdle() {
        this.value = AlertStoreStatuses.Idle;
        this.error = null;
      },
      setInProgress() {
        this.value = AlertStoreStatuses.InProgress;
        this.error = null;
      },
      setFailure(err) {
        this.value = AlertStoreStatuses.Failure;
        this.error = err;
      }
    },
    {
      setIdle: action,
      setInProgress: action,
      setFailure: action
    },
    { name: "Store status" }
  );

  constructor(initialFilters) {
    this.filters.setFilters(initialFilters);
  }

  fetch = action(() => {
    this.status.setInProgress();

    const alertsURI =
      FormatUnseeBackendURI("alerts.json?") +
      FormatAPIFilterQuery(this.filters.values.map(f => f.raw));

    return fetch(alertsURI)
      .then(result => result.json())
      .then(result => {
        return this.parseAPIResponse(result);
      })
      .catch(err => {
        console.trace(err);
        return this.handleFetchError(
          `Request for ${alertsURI} failed with "${err.message}"`
        );
      });
  });

  fetchWithThrottle = throttle(this.fetch, 300);

  parseAPIResponse = action(result => {
    if (result.error) {
      this.handleFetchError(result.error);
      return;
    }

    const queryFilters = [
      ...new Set(
        this.filters.values
          .map(f => f.raw)
          .slice()
          .sort()
      )
    ];
    const responseFilters = [
      ...new Set(result.filters.map(m => m.text).sort())
    ];
    if (JSON.stringify(queryFilters) !== JSON.stringify(responseFilters)) {
      console.info(
        `Got response with filters '${responseFilters}' while expecting results for '${queryFilters}', ignoring`
      );
      return;
    }

    for (const filter of result.filters) {
      const storedIndex = this.filters.values.findIndex(
        f => f.raw === filter.text
      );
      this.filters.values[storedIndex] = Object.assign(
        this.filters.values[storedIndex],
        {
          applied: true,
          isValid: filter.isValid,
          hits: filter.hits,
          name: filter.name,
          matcher: filter.matcher,
          value: filter.value
        }
      );
    }

    let updates = {};
    // update data dicts if they changed
    for (const key of [
      "colors",
      "counters",
      "groups",
      "silences",
      "upstreams"
    ]) {
      if (!equal(this.data[key], result[key])) {
        updates[key] = result[key];
      }
    }
    if (Object.keys(updates).length > 0) {
      this.data = Object.assign(this.data, updates);
    }

    // update extra root level keys that are stored under 'info'
    for (const key of ["totalAlerts", "version"]) {
      if (this.info[key] !== result[key]) {
        this.info[key] = result[key];
      }
    }

    // settings exported via API
    if (!equal(this.settings, result.settings)) {
      this.settings.values = result.settings;
    }

    this.status.setIdle();
  });

  handleFetchError = action(err => {
    this.status.setFailure(err);

    // reset alert counter since we won't be rendering any alerts
    this.info.totalAlerts = 0;

    // all unapplied filters should be marked applied to reset progress indicator
    for (const [index, filter] of this.filters.values.entries()) {
      if (!filter.applied) {
        this.filters.values[index].applied = true;
      }
    }

    return { error: err };
  });
}

export {
  AlertStore,
  AlertStoreStatuses,
  FormatUnseeBackendURI,
  FormatAPIFilterQuery,
  DecodeLocationSearch,
  NewUnappliedFilter
};
