import { observable, action, computed, toJS } from "mobx";

import throttle from "lodash.throttle";

import qs from "qs";

import semverSort from "semver/functions/sort";

import { FetchGet } from "Common/Fetch";
import {
  APIAlertmanagerUpstreamT,
  APILabelColorT,
  APIAlertsResponseT,
  APIAlertsResponseColorsT,
  APILabelCounterT,
  APIGridT,
  APIAlertsResponseSilenceMapT,
  APIAlertsResponseUpstreamsT,
  APIAlertsResponseUpstreamsClusterMapT,
  APISettingsT,
} from "Models/APITypes";

const QueryStringEncodeOptions = {
  encodeValuesOnly: true, // don't encode q[]
  indices: false, // go-gin doesn't support parsing q[0]=foo&q[1]=bar
};

function FormatAlertsQ(filters: string[]): string {
  return qs.stringify({ q: filters }, QueryStringEncodeOptions);
}

// generate URL for the UI with a set of filters
function FormatAPIFilterQuery(filters: string[]): string {
  return qs.stringify(
    Object.assign(DecodeLocationSearch(window.location.search).params, {
      q: filters,
    }),
    QueryStringEncodeOptions
  );
}

// format URI for react UI -> Go backend requests
function FormatBackendURI(path: string): string {
  const uri = process.env.REACT_APP_BACKEND_URI || ".";
  return `${uri}/${path}`;
}

// takes the '?foo=bar&foo=baz' part of http://example.com?foo=bar&foo=baz
// and decodes it into a dict with some extra metadata
interface QueryParamsT {
  q: string[];
}
interface DecodeLocationSearchReturnT {
  params: QueryParamsT;
  defaultsUsed: boolean;
}
function DecodeLocationSearch(
  searchString: string
): DecodeLocationSearchReturnT {
  let defaultsUsed = true;
  let params: QueryParamsT = { q: [] };

  if (searchString !== "") {
    const parsed = qs.parse(searchString.split("?")[1]) as {
      [key: string]: string | string[];
    };
    params = Object.assign(params, parsed);

    if (parsed.q !== undefined) {
      defaultsUsed = false;
      if (parsed.q === "") {
        params.q = [];
      } else if (Array.isArray(parsed.q)) {
        // first filter out duplicates
        // then filter out empty strings, so 'q=' doesn't end up [""] but rather []
        params.q = parsed.q
          .filter((v: string, i: number) => parsed.q.indexOf(v) === i)
          .filter((v: string) => v !== "");
      } else {
        params.q = [parsed.q];
      }
    }
  }

  return { params: params, defaultsUsed: defaultsUsed };
}

function UpdateLocationSearch(newParams: QueryParamsT): void {
  const baseURLWithoutSearch = window.location.href.split("?")[0];
  const newSearch = FormatAPIFilterQuery(newParams.q);
  window.history.pushState(
    null,
    "",
    `${baseURLWithoutSearch}?${newSearch || "q="}`
  );
}

const AlertStoreStatuses = Object.freeze({
  Idle: Symbol("idle"),
  Fetching: Symbol("fetching"),
  Processing: Symbol("processing"),
  Failure: Symbol("failure"),
});

export interface FilterT {
  applied: boolean;
  isValid: boolean;
  raw: string;
  hits: number;
  name: string;
  matcher: string;
  value: string;
}

function NewUnappliedFilter(raw: string): FilterT {
  return {
    applied: false,
    isValid: true,
    raw: raw,
    hits: 0,
    name: "",
    matcher: "",
    value: "",
  };
}

interface AlertStoreFiltersT {
  values: FilterT[];
  addFilter: (raw: string) => void;
  removeFilter: (raw: string) => void;
  replaceFilter: (oldRaw: string, newRaw: string) => void;
  setFilters: (raws: string[]) => void;
  setFilterValues: (v: FilterT[]) => void;
  setWithoutLocation: (raws: string[]) => void;
  applyAllFilters: () => void;
}

interface AlertStoreDataT {
  colors: APIAlertsResponseColorsT;
  counters: APILabelCounterT[];
  grids: APIGridT[];
  silences: APIAlertsResponseSilenceMapT;
  upstreams: APIAlertsResponseUpstreamsT;
  receivers: string[];
  readonly gridPadding: number;
  getAlertmanagerByName: (name: string) => APIAlertmanagerUpstreamT | undefined;
  isReadOnlyAlertmanager: (name: string) => boolean;
  getClusterAlertmanagersWithoutReadOnly: (clusterID: string) => string[];
  getMinVersion: (ams: string[]) => string;
  readonly readOnlyAlertmanagers: APIAlertmanagerUpstreamT[];
  readonly readWriteAlertmanagers: APIAlertmanagerUpstreamT[];
  readonly clustersWithoutReadOnly: APIAlertsResponseUpstreamsClusterMapT;
  getColorData: (name: string, value: string) => APILabelColorT | undefined;
  setGrids: (g: APIGridT[]) => void;
  setUpstreams: (u: APIAlertsResponseUpstreamsT) => void;
  setClusters: (c: APIAlertsResponseUpstreamsClusterMapT) => void;
  setSilences: (s: APIAlertsResponseSilenceMapT) => void;
  setCounters: (c: APILabelCounterT[]) => void;
  setReceivers: (r: string[]) => void;
  setColors: (c: APIAlertsResponseColorsT) => void;
  readonly upstreamsWithErrors: APIAlertmanagerUpstreamT[];
}

interface AlertStoreInfoT {
  authentication: {
    enabled: boolean;
    username: string;
  };
  totalAlerts: number;
  version: string;
  upgradeReady: boolean;
  upgradeNeeded: boolean;
  isRetrying: boolean;
  reloadNeeded: boolean;
  setIsRetrying: () => void;
  clearIsRetrying: () => void;
  setUpgradeNeeded: (v: boolean) => void;
  setUpgradeReady: (v: boolean) => void;
  setReloadNeeded: (v: boolean) => void;
  setTotalAlerts: (n: number) => void;
  setAuthentication: (enabled: boolean, username: string) => void;
  setVersion: (v: string) => void;
}

interface AlertStoreSettingsT {
  values: APISettingsT;
  setValues: (v: APISettingsT) => void;
}

interface AlertStoreStatusT {
  value: symbol;
  lastUpdateAt: number | Date;
  error: null | string;
  stopped: boolean;
  paused: boolean;
  setIdle: () => void;
  setFetching: () => void;
  setProcessing: () => void;
  setFailure: (err: string) => void;
  pause: () => void;
  resume: () => void;
  togglePause: () => void;
  stop: () => void;
  setError: (e: null | string) => void;
}

interface AlertStoreUIT {
  isIdle: boolean;
  setIsIdle: (val: boolean) => void;
}

class AlertStore {
  filters: AlertStoreFiltersT;
  data: AlertStoreDataT;
  info: AlertStoreInfoT;
  settings: AlertStoreSettingsT;
  status: AlertStoreStatusT;
  ui: AlertStoreUIT;

  constructor(initialFilters: null | string[]) {
    this.filters = observable(
      {
        values: [] as FilterT[],
        addFilter(raw: string) {
          if (this.values.filter((f) => f.raw === raw).length === 0) {
            this.values.push(NewUnappliedFilter(raw));
            UpdateLocationSearch({ q: this.values.map((f) => f.raw) });
          }
        },
        removeFilter(raw: string) {
          if (this.values.filter((f) => f.raw === raw).length > 0) {
            this.values = this.values.filter((f) => f.raw !== raw);
            UpdateLocationSearch({ q: this.values.map((f) => f.raw) });
          }
        },
        replaceFilter(oldRaw: string, newRaw: string) {
          const index = this.values.findIndex((e) => e.raw === oldRaw);
          if (index >= 0) {
            // first check if we would create a duplicated filter
            if (this.values.findIndex((e) => e.raw === newRaw) >= 0) {
              // we already have newRaw, simply drop oldRaw
              this.removeFilter(oldRaw);
            } else {
              // no dups, continue with a swap
              this.values[index] = NewUnappliedFilter(newRaw);
              UpdateLocationSearch({ q: this.values.map((f) => f.raw) });
            }
          }
        },
        setFilters(raws: string[]) {
          this.values = raws.map((raw) => NewUnappliedFilter(raw));
          UpdateLocationSearch({ q: this.values.map((f) => f.raw) });
        },
        setFilterValues(v: FilterT[]) {
          this.values = v;
        },
        setWithoutLocation(raws: string[]) {
          const filtersByRaw: { [key: string]: FilterT } = this.values.reduce(
            function (map: { [key: string]: FilterT }, obj) {
              map[toJS(obj.raw)] = toJS(obj);
              return map;
            },
            {}
          );
          this.values = raws.map((raw) =>
            filtersByRaw[raw] ? filtersByRaw[raw] : NewUnappliedFilter(raw)
          );
        },
        applyAllFilters() {
          for (let i = 0; i < this.values.length; i++) {
            this.values[i].applied = true;
          }
        },
      },
      {
        addFilter: action.bound,
        removeFilter: action.bound,
        replaceFilter: action.bound,
        setFilters: action.bound,
        setFilterValues: action.bound,
        setWithoutLocation: action.bound,
        applyAllFilters: action.bound,
      },
      { name: "API Filters" }
    );

    this.data = observable(
      {
        colors: {} as APIAlertsResponseColorsT,
        counters: [] as APILabelCounterT[],
        grids: [] as APIGridT[],
        silences: {} as APIAlertsResponseSilenceMapT,
        upstreams: {
          counters: { total: 0, healthy: 0, failed: 0 },
          instances: [],
          clusters: {},
        } as APIAlertsResponseUpstreamsT,
        receivers: [] as string[],
        get gridPadding(): number {
          return this.grids.filter((g) => g.labelName !== "").length > 0
            ? 5
            : 0;
        },
        getAlertmanagerByName(
          name: string
        ): APIAlertmanagerUpstreamT | undefined {
          return this.upstreams.instances.find((am) => am.name === name);
        },
        isReadOnlyAlertmanager(name: string): boolean {
          return this.readOnlyAlertmanagers.map((am) => am.name).includes(name);
        },
        getClusterAlertmanagersWithoutReadOnly(clusterID: string): string[] {
          return this.clustersWithoutReadOnly[clusterID] || [];
        },
        get readOnlyAlertmanagers(): APIAlertmanagerUpstreamT[] {
          return this.upstreams.instances.filter((am) => am.readonly === true);
        },
        get readWriteAlertmanagers(): APIAlertmanagerUpstreamT[] {
          return this.upstreams.instances
            .filter((am) => am.readonly === false)
            .map((am) =>
              Object.assign({}, am, {
                clusterMembers: am.clusterMembers.filter(
                  (m) => this.isReadOnlyAlertmanager(m) === false
                ),
              })
            );
        },
        get clustersWithoutReadOnly(): APIAlertsResponseUpstreamsClusterMapT {
          const clusters: APIAlertsResponseUpstreamsClusterMapT = {};
          for (const clusterID of Object.keys(this.upstreams.clusters)) {
            const members = this.upstreams.clusters[clusterID].filter(
              (member) => this.isReadOnlyAlertmanager(member) === false
            );
            if (members.length > 0) {
              clusters[clusterID] = members;
            }
          }
          return clusters;
        },
        getMinVersion(ams: string[]) {
          const versions = semverSort(
            this.upstreams.instances
              .filter((am) => ams.includes(am.name))
              .map((am) => am.version.split("-")[0])
              .map((ver) => (ver ? ver : "0.22.0")), // assume v0.22.0 if not known
            true
          );
          return versions.length > 0 ? versions[0] : "0.22.0";
        },
        getColorData(name: string, value: string): APILabelColorT | undefined {
          if (this.colors[name] !== undefined) {
            return this.colors[name][value];
          }
        },
        setGrids(g: APIGridT[]) {
          this.grids = g;
        },
        setUpstreams(u: APIAlertsResponseUpstreamsT) {
          this.upstreams = u;
        },
        setClusters(c: APIAlertsResponseUpstreamsClusterMapT) {
          this.upstreams.clusters = c;
        },
        setSilences(s: APIAlertsResponseSilenceMapT) {
          this.silences = s;
        },
        setCounters(c: APILabelCounterT[]) {
          this.counters = c;
        },
        setReceivers(r: string[]) {
          this.receivers = r;
        },
        setColors(c: APIAlertsResponseColorsT) {
          this.colors = c;
        },
        get upstreamsWithErrors(): APIAlertmanagerUpstreamT[] {
          return this.upstreams.instances.filter(
            (upstream) => upstream.error !== ""
          );
        },
      },
      {
        gridPadding: computed,
        readOnlyAlertmanagers: computed,
        readWriteAlertmanagers: computed,
        clustersWithoutReadOnly: computed,
        setGrids: action.bound,
        setUpstreams: action.bound,
        setClusters: action.bound,
        setSilences: action.bound,
        setCounters: action.bound,
        setReceivers: action.bound,
        setColors: action.bound,
      },
      { name: "API Response data" }
    );

    this.info = observable(
      {
        authentication: {
          enabled: false as boolean,
          username: "",
        },
        totalAlerts: 0,
        version: "unknown",
        upgradeReady: false as boolean,
        upgradeNeeded: false as boolean,
        isRetrying: false as boolean,
        reloadNeeded: false as boolean,
        setIsRetrying() {
          this.isRetrying = true;
        },
        clearIsRetrying() {
          this.isRetrying = false;
        },
        setUpgradeNeeded(v: boolean) {
          this.upgradeNeeded = v;
        },
        setUpgradeReady(v: boolean) {
          this.upgradeReady = v;
        },
        setReloadNeeded(v: boolean) {
          this.reloadNeeded = v;
        },
        setTotalAlerts(n: number) {
          this.totalAlerts = n;
        },
        setAuthentication(enabled: boolean, username: string) {
          this.authentication.enabled = enabled;
          this.authentication.username = username;
        },
        setVersion(v: string) {
          this.version = v;
        },
      },
      {
        setIsRetrying: action.bound,
        clearIsRetrying: action.bound,
        setReloadNeeded: action.bound,
        setUpgradeNeeded: action.bound,
        setTotalAlerts: action.bound,
        setAuthentication: action.bound,
        setVersion: action.bound,
      },
      { name: "API response info" }
    );

    this.settings = observable(
      {
        values: {
          staticColorLabels: [] as string[],
          annotationsDefaultHidden: false as boolean,
          annotationsHidden: [] as string[],
          annotationsVisible: [] as string[],
          annotationsEnableHTML: false as boolean,
          sorting: {
            grid: {
              order: "startsAt",
              reverse: false as boolean,
              label: "alertname",
            },
            valueMapping: {},
          },
          silenceForm: {
            strip: {
              labels: [] as string[],
            },
          },
          alertAcknowledgement: {
            enabled: false as boolean,
            durationSeconds: 900,
            author: "karma / author missing",
            comment: "ACK! This alert was acknowledged using karma",
          },
          historyEnabled: true,
        } as APISettingsT,
        setValues(v: APISettingsT) {
          this.values = v;
        },
      },
      {
        setValues: action.bound,
      },
      {
        name: "Global settings",
      }
    );

    this.status = observable(
      {
        value: AlertStoreStatuses.Idle,
        lastUpdateAt: 0 as number | Date,
        error: null as null | string,
        stopped: false as boolean,
        paused: false as boolean,
        setIdle() {
          this.value = AlertStoreStatuses.Idle;
          this.error = null;
          this.lastUpdateAt = new Date();
        },
        setFetching() {
          this.value = AlertStoreStatuses.Fetching;
        },
        setProcessing() {
          this.value = AlertStoreStatuses.Processing;
          this.error = null;
        },
        setFailure(err: string) {
          this.value = AlertStoreStatuses.Failure;
          this.error = err;
          this.lastUpdateAt = new Date();
        },
        pause() {
          this.paused = true;
        },
        resume() {
          this.paused = this.stopped ? true : false;
        },
        togglePause() {
          this.paused = this.stopped ? true : !this.paused;
        },
        stop() {
          this.paused = true;
          this.stopped = true;
        },
        setError(e: null | string) {
          this.error = e;
        },
      },
      {
        setIdle: action,
        setFetching: action,
        setProcessing: action,
        setFailure: action,
        pause: action.bound,
        resume: action.bound,
        togglePause: action.bound,
        stop: action.bound,
        setError: action.bound,
      },
      { name: "Store status" }
    );

    this.ui = observable(
      {
        isIdle: false as boolean,
        setIsIdle(val: boolean) {
          this.isIdle = val;
        },
      },
      {
        setIsIdle: action.bound,
      }
    );

    if (initialFilters !== null) this.filters.setFilters(initialFilters);
  }

  fetch = action(
    async (
      gridLabel: string,
      gridSortReverse: boolean,
      sortOrder: string,
      sortLabel: string,
      sortReverse: string
    ) => {
      this.status.setFetching();

      const args = [
        `gridLabel=${gridLabel}`,
        `gridSortReverse=${gridSortReverse ? "1" : "0"}`,
        `sortOrder=${sortOrder}`,
        `sortLabel=${sortLabel}`,
        `sortReverse=${sortReverse}`,
      ];

      const alertsURI =
        FormatBackendURI(`alerts.json?&${args.join("&")}&`) +
        FormatAPIFilterQuery(this.filters.values.map((f) => f.raw));

      return await FetchGet(alertsURI, {}, this.info.setIsRetrying)
        .then((result) => {
          // we're sending requests with mode=cors so the response should also be type=cors
          // after a few failures in the retry loop we will switch to no-cors
          // if that request comes back as type=opaque then we might be getting
          // redirected by an auth proxy
          if (result.type === "opaque") {
            this.info.setReloadNeeded(true);
          }
          this.info.clearIsRetrying();
          this.status.setProcessing();
          return result.json();
        })
        .then((result) => {
          return this.parseAPIResponse(result);
        })
        .catch((err) => {
          console.trace(err);
          return this.handleFetchError(
            `Can't connect to the API, last error was "${err.message}"`
          );
        });
    }
  );

  fetchWithThrottle = throttle(this.fetch, 300);

  parseAPIResponse = action((result: APIAlertsResponseT) => {
    if (result.error) {
      this.handleFetchError(result.error);
      return;
    }

    const queryFilters = Array.from(
      new Set(
        this.filters.values
          .map((f) => f.raw)
          .slice()
          .sort()
      )
    );
    const responseFilters = Array.from(
      new Set(result.filters.map((m) => m.text).sort())
    );
    if (JSON.stringify(queryFilters) !== JSON.stringify(responseFilters)) {
      console.info(
        `Got response with filters '${responseFilters}' while expecting results for '${queryFilters}', ignoring`
      );
      return;
    }

    for (const filter of result.filters) {
      const storedIndex = this.filters.values.findIndex(
        (f) => f.raw === filter.text
      );
      this.filters.values[storedIndex] = Object.assign(
        this.filters.values[storedIndex],
        {
          applied: true,
          isValid: filter.isValid,
          hits: filter.hits,
          name: filter.name,
          matcher: filter.matcher,
          value: filter.value,
        }
      );
    }

    const updates: Partial<APIAlertsResponseT> = {};
    updates.colors = result.colors;
    updates.counters = result.counters;
    updates.grids = result.grids;
    updates.silences = result.silences;
    updates.upstreams = result.upstreams;
    updates.receivers = result.receivers;
    this.data = Object.assign(this.data, updates);

    // before storing new version check if we need to reload
    if (
      this.info.version !== "unknown" &&
      this.info.version !== result.version
    ) {
      this.info.setUpgradeReady(true);
      this.status.stop();
    }
    // update extra root level keys that are stored under 'info'
    this.info.totalAlerts = result.totalAlerts;
    this.info.version = result.version;
    this.info.authentication = result.authentication;

    // settings exported via API
    this.settings.values = result.settings;

    this.status.setIdle();
  });

  handleFetchError = action((err: string) => {
    this.status.setFailure(err);

    // reset alert counter since we won't be rendering any alerts
    this.info.totalAlerts = 0;

    // all unapplied filters should be marked applied to reset progress indicator
    this.filters.applyAllFilters();

    return { error: err };
  });
}

export {
  AlertStore,
  AlertStoreStatuses,
  FormatBackendURI,
  FormatAPIFilterQuery,
  FormatAlertsQ,
  DecodeLocationSearch,
  UpdateLocationSearch,
  NewUnappliedFilter,
};
